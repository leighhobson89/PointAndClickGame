param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),

    # The art canvas every runtime frame is baked onto. Width is deliberately
    # wider than the player's logical box: a side-on stride is far wider than a
    # front-on one, and the canvas has to hold the widest pose at full height.
    # See the registration note below for why that matters.
    [int]$CanvasWidth = 280,
    [int]$CanvasHeight = 375,

    # The character's standing height in canvas pixels, and the row its feet
    # rest on. Every frame is scaled to this height so the character never
    # changes size between frames.
    [int]$SubjectHeight = 365,
    [int]$Baseline = 371,

    # Report the registration each frame would get, without writing any frames.
    # Use this after changing the source sheets to check the widest pose still
    # fits the canvas before committing to a rebuild.
    [switch]$Measure
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# ---------------------------------------------------------------------------
# Why registration is height-only
#
# An earlier version of this script scaled each frame with
# min(SubjectHeight / bounds.Height, MaxWidth / bounds.Width). The width term
# only ever bit on the side views, because a side-on stride spreads the arms
# and legs across roughly twice the width of a front-on one. Whenever it bit it
# shrank the whole figure, so the character's on-screen height swung between
# 302 and 365 px across a single walk cycle while the front and back walks held
# a steady 365. That is what read in game as the character pumping in size when
# it walked sideways, and it is why the same nine-frame playback code looked
# fine going up and down.
#
# Scale is therefore derived from height alone, and the canvas is made wide
# enough to hold the result. A pose that will not fit is a hard failure rather
# than something to silently scale away.
# ---------------------------------------------------------------------------

$csharp = @'
using System;

public static class PlayerFrameOps
{
    // Pixels are packed BGRA, which is the in-memory order of Format32bppArgb
    // on a little-endian machine.
    private const int AlphaFloor = 16;

    public static void ChromaKey(byte[] p)
    {
        for (int i = 0; i < p.Length; i += 4)
        {
            int b = p[i];
            int g = p[i + 1];
            int r = p[i + 2];

            int dominance = g - Math.Max(r, b);
            bool isGreen = g > 96 && g > (r * 1.15) && g > (b * 1.15);

            if (!isGreen || dominance <= 28) continue;

            if (dominance >= 130)
            {
                p[i + 3] = 0;
            }
            else
            {
                int alpha = (int)Math.Round(255.0 * (130 - dominance) / 102.0);
                if (alpha < 0) alpha = 0;
                if (alpha > 255) alpha = 255;
                p[i + 3] = (byte)alpha;
                // Despill: pull the green channel back down to the level of the
                // strongest of the other two so the surviving edge pixel reads
                // as a dark contour rather than a green one.
                p[i + 1] = (byte)Math.Min(g, Math.Max(r, b) + 10);
            }
        }
    }

    // Neutralises leftover green spill across the whole frame.
    //
    // Keying alpha is not the same as removing the colour. Pixels where the
    // green only slightly outweighed the subject — the anti-aliased rim of a
    // boot, the outside of a dark contour — stay fully opaque and stay tinted,
    // which is the green edge that survived the first pass of this pipeline.
    //
    // This is safe only because of what the character is wearing. Beige tunic,
    // brown belt, coral trousers, ochre boots, blond hair and skin: not one of
    // those has a green channel above both of the others, so clamping green to
    // the stronger of red and blue cannot touch the artwork, and lands only on
    // pixels the chroma background contaminated. A costume with green in it
    // would need a keyed-region mask instead.
    public static void Despill(byte[] p)
    {
        for (int i = 0; i < p.Length; i += 4)
        {
            int ceiling = Math.Max(p[i], p[i + 2]);
            if (p[i + 1] > ceiling) p[i + 1] = (byte)ceiling;
        }
    }

    // Erases anything that is not part of the character.
    //
    // The chroma sheets carry scattered debris — flecks of boot and shadow that
    // the generator left lying on the ground away from the figure. They matter
    // out of all proportion to their size, because registration measures the
    // subject's bounding box: a fleck below the boots becomes the lowest opaque
    // pixel, so the box is measured to the fleck, the figure is scaled to fit a
    // box taller than it is, and its feet are then planted above the baseline.
    // In the right-facing set that left the character hovering over its own
    // shadow for six frames of the nine.
    //
    // Everything that is not the largest connected region, or close to it in
    // size, is removed. The count of erased pixels is reported per frame so a
    // rebuild that starts eating real limbs is visible rather than silent.
    public static int RemoveDetachedParts(byte[] p, int width, int height, double keepFraction)
    {
        int count = width * height;
        int[] label = new int[count];
        int[] stack = new int[count];
        System.Collections.Generic.List<int> areas = new System.Collections.Generic.List<int>();
        areas.Add(0);
        int current = 0;

        for (int start = 0; start < count; start++)
        {
            if (label[start] != 0) continue;
            if (p[(start * 4) + 3] < AlphaFloor) { label[start] = -1; continue; }

            current++;
            int area = 0;
            int sp = 0;
            stack[sp++] = start;
            label[start] = current;

            while (sp > 0)
            {
                int index = stack[--sp];
                area++;
                int x = index % width;
                int y = index / width;

                for (int dy = -1; dy <= 1; dy++)
                {
                    int ny = y + dy;
                    if (ny < 0 || ny >= height) continue;
                    for (int dx = -1; dx <= 1; dx++)
                    {
                        int nx = x + dx;
                        if (nx < 0 || nx >= width) continue;
                        int n = (ny * width) + nx;
                        if (label[n] != 0) continue;
                        if (p[(n * 4) + 3] < AlphaFloor) { label[n] = -1; continue; }
                        label[n] = current;
                        stack[sp++] = n;
                    }
                }
            }

            areas.Add(area);
        }

        int best = 0;
        int bestArea = 0;
        for (int i = 1; i < areas.Count; i++)
        {
            if (areas[i] > bestArea) { bestArea = areas[i]; best = i; }
        }
        if (best == 0) return 0;

        int threshold = (int)(bestArea * keepFraction);
        int dropped = 0;
        for (int i = 0; i < count; i++)
        {
            int l = label[i];
            if (l <= 0 || l == best) continue;
            if (areas[l] >= threshold) continue;
            p[(i * 4) + 3] = 0;
            dropped++;
        }
        return dropped;
    }

    // Pushes the colour of opaque pixels outward into the transparent margin
    // without touching alpha. The frames are downscaled with bicubic sampling,
    // and bicubic reads colour from neighbouring pixels regardless of their
    // alpha. Left alone, the transparent pixels still hold the original chroma
    // green, so every downscaled edge picks up a green fringe. Bleeding real
    // colour outward first means the filter has something correct to read.
    public static void BleedEdges(byte[] p, int width, int height, int passes)
    {
        int count = width * height;
        bool[] solid = new bool[count];
        for (int i = 0; i < count; i++) solid[i] = p[(i * 4) + 3] >= AlphaFloor;

        for (int pass = 0; pass < passes; pass++)
        {
            bool[] added = new bool[count];
            bool changed = false;

            for (int y = 0; y < height; y++)
            {
                for (int x = 0; x < width; x++)
                {
                    int index = (y * width) + x;
                    if (solid[index]) continue;

                    int sumB = 0, sumG = 0, sumR = 0, n = 0;
                    for (int dy = -1; dy <= 1; dy++)
                    {
                        int ny = y + dy;
                        if (ny < 0 || ny >= height) continue;
                        for (int dx = -1; dx <= 1; dx++)
                        {
                            int nx = x + dx;
                            if (nx < 0 || nx >= width) continue;
                            int neighbour = (ny * width) + nx;
                            if (!solid[neighbour]) continue;
                            int o = neighbour * 4;
                            sumB += p[o];
                            sumG += p[o + 1];
                            sumR += p[o + 2];
                            n++;
                        }
                    }

                    if (n == 0) continue;
                    int t = index * 4;
                    p[t] = (byte)(sumB / n);
                    p[t + 1] = (byte)(sumG / n);
                    p[t + 2] = (byte)(sumR / n);
                    added[index] = true;
                    changed = true;
                }
            }

            if (!changed) break;
            for (int i = 0; i < count; i++) if (added[i]) solid[i] = true;
        }
    }

    // Reduces invisible/high-frequency channel noise before PNG encoding.
    // Generated paint and bicubic sampling can produce thousands of colours
    // that differ by only one or two channel values; PNG then spends bytes on
    // differences the eye cannot resolve at gameplay scale. Four-value colour
    // buckets have a maximum per-channel error of two, while eight-value alpha
    // buckets leave solid paint solid and keep the soft shadow gradient.
    public static void QuantiseForPng(byte[] p)
    {
        for (int i = 0; i < p.Length; i += 4)
        {
            int alpha = p[i + 3];
            if (alpha == 0)
            {
                p[i] = p[i + 1] = p[i + 2] = 0;
                continue;
            }

            for (int channel = 0; channel < 3; channel++)
            {
                int value = p[i + channel];
                p[i + channel] = (byte)Math.Min(255, ((value + 2) / 4) * 4);
            }
            p[i + 3] = alpha >= 252 ? (byte)255 : (byte)Math.Min(248, ((alpha + 4) / 8) * 8);
        }
    }

    // minX, minY, maxX, maxY. Returns nulls as -1 when the frame is empty.
    public static int[] Bounds(byte[] p, int width, int height)
    {
        int minX = width, minY = height, maxX = -1, maxY = -1;
        for (int y = 0; y < height; y++)
        {
            for (int x = 0; x < width; x++)
            {
                if (p[(((y * width) + x) * 4) + 3] < AlphaFloor) continue;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
        return new int[] { minX, minY, maxX, maxY };
    }

    // The horizontal median of the opaque pixels between two rows.
    //
    // This is the registration anchor, and it replaces centring the bounding
    // box. A walk cycle's bounding box is defined by whichever limb is thrown
    // furthest out, so its centre slides back and forth as the arms and legs
    // swing; pinning it made the body drift horizontally inside the frame every
    // step. Taking the median across the head and torso band instead pins the
    // part of the character that genuinely holds still, and a median rather
    // than a mean keeps a thin swinging arm from dragging the anchor with it.
    public static int MedianX(byte[] p, int width, int height, int fromY, int toY)
    {
        if (fromY < 0) fromY = 0;
        if (toY >= height) toY = height - 1;

        int[] tally = new int[width];
        int total = 0;
        for (int y = fromY; y <= toY; y++)
        {
            for (int x = 0; x < width; x++)
            {
                if (p[(((y * width) + x) * 4) + 3] < AlphaFloor) continue;
                tally[x]++;
                total++;
            }
        }

        if (total == 0) return -1;

        int half = total / 2;
        int running = 0;
        for (int x = 0; x < width; x++)
        {
            running += tally[x];
            if (running > half) return x;
        }
        return width - 1;
    }

    // minX, maxX of the opaque pixels between two rows, for measuring the
    // stance the contact shadow has to sit under.
    public static int[] SpanX(byte[] p, int width, int height, int fromY, int toY)
    {
        if (fromY < 0) fromY = 0;
        if (toY >= height) toY = height - 1;

        int minX = width, maxX = -1;
        for (int y = fromY; y <= toY; y++)
        {
            for (int x = 0; x < width; x++)
            {
                if (p[(((y * width) + x) * 4) + 3] < AlphaFloor) continue;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
            }
        }
        return new int[] { minX, maxX };
    }
}
'@

if (-not ('PlayerFrameOps' -as [type])) {
    Add-Type -TypeDefinition $csharp -ReferencedAssemblies 'System.Drawing'
}

function Get-Pixels {
    param([System.Drawing.Bitmap]$Bitmap)

    $rect = New-Object System.Drawing.Rectangle 0, 0, $Bitmap.Width, $Bitmap.Height
    $locked = $Bitmap.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
        $packed = New-Object byte[] ($Bitmap.Width * $Bitmap.Height * 4)
        $rowBytes = $Bitmap.Width * 4
        for ($y = 0; $y -lt $Bitmap.Height; $y++) {
            $scan = [IntPtr]::Add($locked.Scan0, $y * $locked.Stride)
            [System.Runtime.InteropServices.Marshal]::Copy($scan, $packed, $y * $rowBytes, $rowBytes)
        }
        # The leading comma matters. Without it PowerShell unrolls the array
        # into the pipeline, the caller receives a boxed Object[], and every
        # later call that takes a byte[] silently works on a fresh copy -- so
        # the chroma key would appear to run and change nothing.
        return , $packed
    } finally {
        $Bitmap.UnlockBits($locked)
    }
}

function New-BitmapFromPixels {
    param([byte[]]$Pixels, [int]$Width, [int]$Height)

    $bitmap = New-Object System.Drawing.Bitmap $Width, $Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $rect = New-Object System.Drawing.Rectangle 0, 0, $Width, $Height
    $locked = $bitmap.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
        $rowBytes = $Width * 4
        for ($y = 0; $y -lt $Height; $y++) {
            $scan = [IntPtr]::Add($locked.Scan0, $y * $locked.Stride)
            [System.Runtime.InteropServices.Marshal]::Copy($Pixels, $y * $rowBytes, $scan, $rowBytes)
        }
    } finally {
        $bitmap.UnlockBits($locked)
    }
    return $bitmap
}

function Add-ContactShadow {
    param(
        [System.Drawing.Graphics]$Graphics,
        [int]$CentreX,
        [int]$BaselineY,
        [int]$StanceWidth
    )

    # The shadow tracks the stance — the spread of the boots — rather than the
    # whole frame's width. Sizing it from the frame meant a thrown-out arm grew
    # the shadow, so it swelled and shrank out of step with the feet.
    $shadowWidth = [Math]::Max(46, [Math]::Min(150, [int]($StanceWidth * 1.05)))
    $shadowHeight = [Math]::Max(5, [int]($shadowWidth * 0.15))
    foreach ($layer in @(
        @{ Inflate = 6; Alpha = 10 },
        @{ Inflate = 3; Alpha = 14 },
        @{ Inflate = 0; Alpha = 18 }
    )) {
        $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($layer.Alpha, 26, 18, 12))
        $width = $shadowWidth + (2 * $layer.Inflate)
        $height = $shadowHeight + $layer.Inflate
        $Graphics.FillEllipse($brush, $CentreX - ($width / 2), $BaselineY - ($height / 2), $width, $height)
        $brush.Dispose()
    }
}

$sourceRoot = Join-Path $ProjectRoot 'resources\redesign\section-02-player\source-sheets'
$poseRoot = Join-Path $ProjectRoot 'resources\redesign\section-02-player\source-poses'
$frameRoot = Join-Path $ProjectRoot 'resources\redesign\section-02-player\frames'
$sheetRoot = Join-Path $ProjectRoot 'resources\redesign\section-02-player\processed-sheets'
if (-not $Measure) {
    New-Item -ItemType Directory -Force -Path $frameRoot, $sheetRoot | Out-Null
}

function New-FrameMap {
    param([string[]]$Names, [int[]]$SourceIndices, [bool[]]$FlipX)

    $frames = @()
    for ($i = 0; $i -lt $Names.Count; $i++) {
        $frames += @{
            Name = $Names[$i]
            SourceIndex = if ($SourceIndices.Count -gt $i) { $SourceIndices[$i] } else { $i }
            FlipX = if ($FlipX.Count -gt $i) { $FlipX[$i] } else { $false }
        }
    }
    return $frames
}

$walkNames = 1..9 | ForEach-Object { "move$($_)" }

# The generated source sheets contain useful poses, but their row-major order
# is not consistently chronological. In particular, the front and back sheets
# swap which boot leads from one cell to the next, which reads as skating even
# when the runtime advances the file names in perfect numerical order.
#
# Rebuild those views around one coherent half-step: contact -> recoil ->
# passing -> high point -> narrow stance, then mirror the first four poses for
# the opposite leg. The source indices below were selected from the measured
# boot separation in the current sheets; the order makes that separation close
# smoothly towards the passing pose and open again. The result is deterministic
# and reproducible from the retained source art.
$downIndices = @(3, 6, 0, 5, 4, 5, 0, 6, 3)
$upIndices = @(3, 5, 2, 1, 4, 1, 2, 5, 3)
$sideIndices = @(0, 1, 2, 4, 4, 5, 6, 7, 8)
$secondHalfMirrored = @($false, $false, $false, $false, $false, $true, $true, $true, $true)

$jobs = @(
    @{ Sheet = 'walk-down-chroma.png'; Columns = 3; Rows = 3; Frames = New-FrameMap ($walkNames | ForEach-Object { "${_}_down" }) $downIndices $secondHalfMirrored },
    @{ Sheet = 'walk-left-chroma.png'; Columns = 3; Rows = 3; Frames = New-FrameMap ($walkNames | ForEach-Object { "${_}_left" }) $sideIndices $noFlips },
    @{ Sheet = 'walk-up-chroma.png'; Columns = 3; Rows = 3; Frames = New-FrameMap ($walkNames | ForEach-Object { "${_}_up" }) $upIndices $secondHalfMirrored },
    # The independently generated right sheet repeats the same planted leg in
    # eight of its nine cells. Mirroring the approved left cycle gives both
    # lateral directions identical timing, stride and character construction.
    @{ Sheet = 'walk-left-chroma.png'; Columns = 3; Rows = 3; Frames = New-FrameMap ($walkNames | ForEach-Object { "${_}_right" }) $sideIndices (1..9 | ForEach-Object { $true }) },
    @{ Sheet = 'idle-chroma.png'; Columns = 2; Rows = 2; Frames = New-FrameMap @('still_down', 'still_left', 'still_up', 'still_right') (0..3) @($false, $false, $false, $false) },
    # The lateral sheet never contained a genuine passing pose: even its
    # narrowest cell left a wide V between the legs. This retained transparent
    # pose supplies the missing crossover at the middle of both side cycles.
    # Right is derived from the same art so timing and silhouette stay exact.
    @{ Root = $poseRoot; Sheet = 'walk-left-passing-transparent.png'; SkipProcessed = $true; Columns = 1; Rows = 1; Frames = New-FrameMap @('move5_left', 'move5_right') @(0, 0) @($false, $true) }
)

# The band of the figure the anchor is measured across, as a fraction of its
# height: the head and torso, stopping above the hips so the legs never vote.
$AnchorFromFraction = 0.10
$AnchorToFraction = 0.55
# The band the stance is measured across, taken up from the soles.
$StanceFraction = 0.055

$canvasCentre = [int]($CanvasWidth / 2)
$diagnostics = @()

foreach ($job in $jobs) {
    $jobRoot = if ($job.Root) { $job.Root } else { $sourceRoot }
    $sourcePath = Join-Path $jobRoot $job.Sheet
    $source = [System.Drawing.Bitmap]::FromFile($sourcePath)
    $sheetWidth = $source.Width
    $sheetHeight = $source.Height

    $pixels = Get-Pixels -Bitmap $source
    $source.Dispose()

    [PlayerFrameOps]::ChromaKey($pixels)
    [PlayerFrameOps]::Despill($pixels)

    if (-not $Measure -and -not $job.SkipProcessed) {
        # The diagnostic sheet is written before the edge bleed so it still
        # shows the true keyed result. The bleed is an extraction aid, and
        # smeared colour in the margin would only make the sheet harder to read.
        $keyedSheet = New-BitmapFromPixels -Pixels $pixels -Width $sheetWidth -Height $sheetHeight
        $keyedSheet.Save((Join-Path $sheetRoot ($job.Sheet -replace '-chroma', '-transparent')), [System.Drawing.Imaging.ImageFormat]::Png)
        $keyedSheet.Dispose()
    }

    $keyedSheet = New-BitmapFromPixels -Pixels $pixels -Width $sheetWidth -Height $sheetHeight

    for ($index = 0; $index -lt $job.Frames.Count; $index++) {
        $frameSpec = $job.Frames[$index]
        $name = $frameSpec.Name
        $sourceIndex = $frameSpec.SourceIndex
        $column = $sourceIndex % $job.Columns
        $row = [Math]::Floor($sourceIndex / $job.Columns)
        $x0 = [int][Math]::Round($column * $sheetWidth / $job.Columns)
        $x1 = [int][Math]::Round(($column + 1) * $sheetWidth / $job.Columns)
        $y0 = [int][Math]::Round($row * $sheetHeight / $job.Rows)
        $y1 = [int][Math]::Round(($row + 1) * $sheetHeight / $job.Rows)
        $cellWidth = $x1 - $x0
        $cellHeight = $y1 - $y0

        $cell = New-Object System.Drawing.Bitmap $cellWidth, $cellHeight, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $cellGraphics = [System.Drawing.Graphics]::FromImage($cell)
        $cellGraphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $cellGraphics.DrawImage(
            $keyedSheet,
            (New-Object System.Drawing.Rectangle 0, 0, $cellWidth, $cellHeight),
            (New-Object System.Drawing.Rectangle $x0, $y0, $cellWidth, $cellHeight),
            [System.Drawing.GraphicsUnit]::Pixel
        )
        $cellGraphics.Dispose()

        if ($frameSpec.FlipX) {
            $cell.RotateFlip([System.Drawing.RotateFlipType]::RotateNoneFlipX)
        }

        $cellPixels = Get-Pixels -Bitmap $cell
        $cell.Dispose()

        # Order matters here. Debris has to go before the bounds are measured,
        # or it drags the registration with it, and before the edge bleed, or
        # its colour is what gets smeared into the margin.
        $dropped = [PlayerFrameOps]::RemoveDetachedParts($cellPixels, $cellWidth, $cellHeight, 0.05)
        [PlayerFrameOps]::BleedEdges($cellPixels, $cellWidth, $cellHeight, 6)
        $cell = New-BitmapFromPixels -Pixels $cellPixels -Width $cellWidth -Height $cellHeight

        $b = [PlayerFrameOps]::Bounds($cellPixels, $cellWidth, $cellHeight)
        if ($b[2] -lt $b[0] -or $b[3] -lt $b[1]) {
            throw "Chroma removal produced an empty frame for $name."
        }
        $boundsX = $b[0]
        $boundsY = $b[1]
        $boundsWidth = $b[2] - $b[0] + 1
        $boundsHeight = $b[3] - $b[1] + 1

        $anchorFrom = $boundsY + [int]($boundsHeight * $AnchorFromFraction)
        $anchorTo = $boundsY + [int]($boundsHeight * $AnchorToFraction)
        $anchorX = [PlayerFrameOps]::MedianX($cellPixels, $cellWidth, $cellHeight, $anchorFrom, $anchorTo)
        if ($anchorX -lt 0) { $anchorX = $boundsX + [int]($boundsWidth / 2) }

        $stanceFrom = $b[3] - [int]($boundsHeight * $StanceFraction)
        $stance = [PlayerFrameOps]::SpanX($cellPixels, $cellWidth, $cellHeight, $stanceFrom, $b[3])
        $stanceMin = $stance[0]
        $stanceMax = $stance[1]

        # Height alone sets the scale. Nothing else is allowed to shrink a frame.
        $scale = $SubjectHeight / [double]$boundsHeight
        $drawWidth = [int][Math]::Round($boundsWidth * $scale)
        $drawHeight = $SubjectHeight

        # Place the anchor on the canvas centre, then let the pose fall where it
        # will either side of it.
        $anchorOffset = ($anchorX - $boundsX) * $scale
        $drawX = [int][Math]::Round($canvasCentre - $anchorOffset)
        $drawY = $Baseline - $drawHeight

        $leftExtent = $canvasCentre - $drawX
        $rightExtent = ($drawX + $drawWidth) - $canvasCentre
        $overflowLeft = [Math]::Max(0, -$drawX)
        $overflowRight = [Math]::Max(0, ($drawX + $drawWidth) - $CanvasWidth)

        $stanceCentre = $drawX + [int][Math]::Round(((($stanceMin + $stanceMax) / 2.0) - $boundsX) * $scale)
        $stanceWidth = [int][Math]::Round(($stanceMax - $stanceMin + 1) * $scale)

        $bytes = 0
        if (-not $Measure) {
            if ($overflowLeft -gt 0 -or $overflowRight -gt 0) {
                throw ("$name does not fit the ${CanvasWidth}x${CanvasHeight} canvas at full height " +
                    "(overflow left $overflowLeft px, right $overflowRight px). Widen -CanvasWidth and " +
                    'update the art aspect in game.js, scripts/art-calibration.mjs and scripts/export-assets.mjs to match.')
            }

            $frame = New-Object System.Drawing.Bitmap $CanvasWidth, $CanvasHeight, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
            $graphics = [System.Drawing.Graphics]::FromImage($frame)
            $graphics.Clear([System.Drawing.Color]::Transparent)
            $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
            Add-ContactShadow -Graphics $graphics -CentreX $stanceCentre -BaselineY ($Baseline - 1) -StanceWidth $stanceWidth
            $graphics.DrawImage(
                $cell,
                (New-Object System.Drawing.Rectangle $drawX, $drawY, $drawWidth, $drawHeight),
                (New-Object System.Drawing.Rectangle $boundsX, $boundsY, $boundsWidth, $boundsHeight),
                [System.Drawing.GraphicsUnit]::Pixel
            )
            $graphics.Dispose()

            $framePixels = Get-Pixels -Bitmap $frame
            [PlayerFrameOps]::QuantiseForPng($framePixels)
            $frame.Dispose()
            $frame = New-BitmapFromPixels -Pixels $framePixels -Width $CanvasWidth -Height $CanvasHeight

            $framePath = Join-Path $frameRoot "$name.png"
            $frame.Save($framePath, [System.Drawing.Imaging.ImageFormat]::Png)
            $frame.Dispose()
            $bytes = (Get-Item $framePath).Length
        }

        $cell.Dispose()

        # A retained single-pose source may intentionally replace a sheet cell
        # with the same runtime name. Keep only the final registration record.
        $diagnostics = @($diagnostics | Where-Object { $_.Frame -ne $name })
        $diagnostics += [pscustomobject]@{
            Frame = $name
            SourceWidth = $boundsWidth
            SourceHeight = $boundsHeight
            Scale = [Math]::Round($scale, 5)
            OutputWidth = $drawWidth
            OutputHeight = $drawHeight
            LeftExtent = $leftExtent
            RightExtent = $rightExtent
            Overflow = $overflowLeft + $overflowRight
            StanceWidth = $stanceWidth
            Dropped = $dropped
            Baseline = $Baseline
            Bytes = $bytes
        }
    }

    $keyedSheet.Dispose()
}

$sorted = $diagnostics | Sort-Object Frame

if ($Measure) {
    $widest = ($diagnostics | Measure-Object -Property OutputWidth -Maximum).Maximum
    $needed = (($diagnostics | Measure-Object -Property LeftExtent -Maximum).Maximum +
        ($diagnostics | Measure-Object -Property RightExtent -Maximum).Maximum)
    Write-Output "Widest scaled pose: $widest px"
    Write-Output "Canvas width required to hold every pose about the anchor: $needed px (current $CanvasWidth px)"
    $overflowing = @($diagnostics | Where-Object { $_.Overflow -gt 0 })
    if ($overflowing.Count -gt 0) {
        Write-Output "Frames that would overflow: $($overflowing.Count)"
        $overflowing | Sort-Object Frame | Format-Table Frame, OutputWidth, LeftExtent, RightExtent, Overflow -AutoSize
    } else {
        Write-Output 'Every frame fits the current canvas.'
    }
    return $sorted
}

$sorted | Export-Csv -NoTypeInformation -Encoding UTF8 (Join-Path $ProjectRoot 'resources\redesign\section-02-player\frame-geometry.csv')
$sorted
