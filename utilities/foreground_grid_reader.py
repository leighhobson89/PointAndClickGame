from PIL import Image
import json
import os
import argparse

def process_foreground_image(image_path, alpha_threshold=50):
    image = Image.open(image_path)
    width, height = image.size
    
    # Determine the grid size and scale factor based on the image dimensions
    if width == 800 and height == 600:
        grid_width = 80
        grid_height = 60
    elif width == 1600 and height == 600:
        grid_width = 160
        grid_height = 60
    else:
        raise ValueError(f"Unsupported image dimensions: {width}x{height}. Supported sizes are 800x600 and 1600x600.")
    
    grid = []
    
    for y in range(grid_height):
        row = []
        for x in range(grid_width):
            # Calculate the center pixel of the current cell
            pixel_x = x * 10 + 5
            pixel_y = y * 10 + 5
            
            # Get the pixel data
            pixel = image.getpixel((pixel_x, pixel_y))
            
            # Determine if the pixel is opaque or sufficiently visible foreground
            if len(pixel) == 4:
                # Check alpha transparency threshold
                if pixel[3] > alpha_threshold:  # Only pixels with alpha above the threshold are considered as foreground
                    row.append("f")
                else:
                    row.append("-")
            else:
                row.append("-")
        
        grid.append(row)
    
    return grid

# Flood-fill algorithm to find contiguous foreground zones
def flood_fill(grid, x, y, zone_id, visited, zone_sizes):
    grid_height = len(grid)
    grid_width = len(grid[0])
    
    # Stack for flood fill (could also use recursion, but stack is safer for large grids)
    stack = [(x, y)]
    zone_size = 0
    while stack:
        cx, cy = stack.pop()
        
        # Check bounds and if already visited or not an 'f' cell
        if cx < 0 or cy < 0 or cx >= grid_width or cy >= grid_height or visited[cy][cx] or grid[cy][cx] != 'f':
            continue
        
        # Mark as visited and assign zone ID
        visited[cy][cx] = True
        grid[cy][cx] = zone_id
        zone_size += 1
        
        # Push neighboring cells onto the stack (4-way connectivity)
        stack.append((cx + 1, cy))
        stack.append((cx - 1, cy))
        stack.append((cx, cy + 1))
        stack.append((cx, cy - 1))

    zone_sizes[zone_id] = zone_size
    return zone_size

def identify_foreground_zones(grid):
    visited = [[False for _ in range(len(grid[0]))] for _ in range(len(grid))]
    zone_counter = 1
    zone_sizes = {}  # Dictionary to store zone sizes

    # Perform flood-fill to identify all foreground zones
    for y in range(len(grid)):
        for x in range(len(grid[0])):
            if grid[y][x] == 'f' and not visited[y][x]:
                # Found an unvisited foreground 'f', start a flood fill
                zone_id = f'f{zone_counter}'
                flood_fill(grid, x, y, zone_id, visited, zone_sizes)
                zone_counter += 1

    # Now handle zones with only 1 cell and renumber other zones
    zone_counter = 1  # Reuse the zone_counter for renumbering
    for zone_id in sorted(zone_sizes, key=zone_sizes.get):  # Sort zones by size
        if zone_sizes[zone_id] == 1:
            # Replace zones with only 1 cell with "-"
            zone_id_to_replace = zone_id
            # Find the zone_id in the grid and change it to '-'
            for y in range(len(grid)):
                for x in range(len(grid[0])):
                    if grid[y][x] == zone_id_to_replace:
                        grid[y][x] = "-"
        else:
            # Renumber other zones
            for y in range(len(grid)):
                for x in range(len(grid[0])):
                    if grid[y][x] == zone_id:
                        grid[y][x] = f'f{zone_counter}'
            zone_counter += 1

    return grid

def save_foreground_grid_to_json(name, grid):
    output_dir = "./foreGroundJsonOutput"
    os.makedirs(output_dir, exist_ok=True)  # Create the directory if it doesn't exist
    output_path = os.path.join(output_dir, f"{name}_foreground.json")
    
    data = {name: grid}
    with open(output_path, 'w') as json_file:
        json.dump(data, json_file, indent=4)
    print(f"Saved grid for {name} to {output_path}")

def main():
    parser = argparse.ArgumentParser(description="Generate foreground JSON grids from images.")
    parser.add_argument("name", type=str, help="Name of the foreground image (without extension).")
    parser.add_argument("--alpha_threshold", type=int, default=50, help="Alpha threshold for foreground detection (default is 50).")
    args = parser.parse_args()
    
    image_path = os.path.join("..", "resources", "foregrounds", "grids", f"{args.name}.png")
    
    if not os.path.isfile(image_path):
        print(f"Image file not found: {image_path}")
        return
    
    grid = process_foreground_image(image_path, alpha_threshold=args.alpha_threshold)
    grid_with_zones = identify_foreground_zones(grid)
    save_foreground_grid_to_json(args.name, grid_with_zones)

if __name__ == "__main__":
    main()
