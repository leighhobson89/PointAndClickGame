from PIL import Image
import json
import argparse

# Define the color mappings
COLOR_MAP = {
    (0, 255, 0): 'w',  # Green (walkable)
    (255, 0, 0): 'n',  # Red (non-walkable)
    (255, 255, 0): 'e'  # Yellow (exit)
}

def process_image(image_path):
    image = Image.open(image_path)
    width, height = image.size
    
    # Define the grid size
    grid_width = 80
    grid_height = 60
    scale_factor = 10  # Scaling factor for 800x600 to 80x60
    
    grid = []
    
    for y in range(grid_height):
        row = []
        for x in range(grid_width):
            # Calculate the pixel position in the scaled image
            pixel_x = x * scale_factor
            pixel_y = y * scale_factor
            
            # Get the pixel color at the calculated position
            pixel = image.getpixel((pixel_x, pixel_y))
            cell_value = COLOR_MAP.get(pixel, 'unknown')  # Default to 'unknown' if color not found
            row.append(cell_value)
        grid.append(row)

    return grid

# Flood-fill algorithm to find contiguous exit zones
def flood_fill(grid, x, y, zone_id, visited):
    grid_height = len(grid)
    grid_width = len(grid[0])
    
    # Stack for flood fill (could also use recursion, but stack is safer for large grids)
    stack = [(x, y)]
    while stack:
        cx, cy = stack.pop()
        
        # Check bounds and if already visited or not an 'e' cell
        if cx < 0 or cy < 0 or cx >= grid_width or cy >= grid_height or visited[cy][cx] or grid[cy][cx] != 'e':
            continue
        
        # Mark as visited and assign zone ID
        visited[cy][cx] = True
        grid[cy][cx] = zone_id
        
        # Push neighboring cells onto the stack (4-way connectivity)
        stack.append((cx + 1, cy))
        stack.append((cx - 1, cy))
        stack.append((cx, cy + 1))
        stack.append((cx, cy - 1))

def identify_exit_zones(grid):
    visited = [[False for _ in range(len(grid[0]))] for _ in range(len(grid))]
    zone_counter = 1

    for y in range(len(grid)):
        for x in range(len(grid[0])):
            if grid[y][x] == 'e' and not visited[y][x]:
                # Found an unvisited exit 'e', start a flood fill
                zone_id = f'e{zone_counter}'
                flood_fill(grid, x, y, zone_id, visited)
                zone_counter += 1

    return grid

def save_to_json(screen_name, grid, output_path):
    data = {screen_name: grid}
    with open(output_path, 'w') as json_file:
        json.dump(data, json_file, indent=4)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Process a grid image and convert it to JSON.')
    parser.add_argument('screen_name', type=str, help='The name of the screen to use in the JSON output.')
    args = parser.parse_args()

    image_path = 'C:\\Users\\Leigh\\Desktop\\Development\\PointAndClickGame\\PointAndClickGame\\utilities\\grid-assets\\libraryFoyer.png'
    output_path = 'C:\\Users\\Leigh\\Desktop\\Development\\PointAndClickGame\\PointAndClickGame\\utilities\\jsonOutput\\libraryFoyer.json'

    grid = process_image(image_path)
    
    # Identify and label exit zones
    grid_with_zones = identify_exit_zones(grid)
    
    save_to_json(args.screen_name, grid_with_zones, output_path)
    print("Grid saved to JSON with exit zones labeled.")
