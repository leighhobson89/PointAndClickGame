# Completed art redesign production sections

This is the completed side of [art-redesign-production-plan.md](../art-redesign-production-plan.md).

## 2026-09-14 — Section 1: Den camera and room package

Created a non-shipping Den background candidate that changes the room from its close, oversized camera to the standard eye-height interior camera while preserving its recognisable identity: the central exit doorway, symmetrical work benches, dark masonry, dense clocks/gears/pipes, circular upper-right feature, and clandestine workshop mood.

The generated source uses the current Den as its strict composition reference and Kitchen as its strict interior style/camera reference. It was exported through a centred, aspect-preserving source crop to an exact 832 x 448 review image. The result has a horizon near mid-frame, a clear lower-half walk plane, one warm upper-left key light, cool ambient shadows, no characters, no puzzle-state sprites, no text, and no watermark.

Delivered review files:

- `resources/redesign/section-01-den/den-background-source.png` — untouched 1709 x 920 built-in generation output.
- `resources/redesign/section-01-den/den-background-candidate.png` — exact 832 x 448 review export.
- `resources/redesign/section-01-den/README.md` — purpose, references, prompt, status, and the matching door/crowbar asset brief.

This completes the first **generation section**, not the master-checklist painting task. The candidate is deliberately not wired into `screenNavigation.json`, not copied over `resources/backgrounds/den.png`, and not added to the shipped manifest. Leigh's visual approval, the matching door/crowbar assets, a human paint-over decision, provenance/licence review, grid/hotspot work, scale calibration, WebP export, and in-game acceptance remain required before BUG-041 or BUG-042 can close.
