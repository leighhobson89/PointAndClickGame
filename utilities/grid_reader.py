from PIL import Image
import json
import argparse

# Define the base color mappings
COLOR_MAP = {
    (255, 0, 0): 'n',  # Red (non-walkable)
    (255, 255, 0): 'e',  # Yellow (exit)
}

# Function to convert green color to zPos (0,100,0 -> 0,255,0)
def green_to_zPos(color):
    # Extract the green component
    r, g, b = color
    if r == 0 and b == 0 and 100 <= g <= 255:
        # Map the green channel to zPos (from 100 to 255 to zPos 100 to zPos 255)
        return f'w{g}'
    return None

# Function to convert colors with green=0 and blue in range 100-255 to bPos
def blue_to_bPos(color):
    # Extract the RGB components
    r, g, b = color
    if g == 0 and 100 <= b <= 255:
        # Map the blue channel to bPos (from 100 to 255 to b100 to b255)
        return f'b{b}'
    return None

def process_image(image_path):
    image = Image.open(image_path)
    width, height = image.size
    
    # Determine the grid size and scale factor based on the image dimensions
    if width == 800 and height == 600:
        grid_width = 80
        grid_height = 60
        scale_factor = 10  # Scaling factor for 800x600
    elif width == 1600 and height == 600:
        grid_width = 160
        grid_height = 60
        scale_factor = 10  # Scaling factor for 1600x600
    else:
        raise ValueError(f"Unsupported image dimensions: {width}x{height}. Supported sizes are 800x600 and 1600x600.")
    
    grid = []
    
    for y in range(grid_height):
        row = []
        for x in range(grid_width):
            # Calculate the pixel position in the scaled image
            pixel_x = x * scale_factor
            pixel_y = y * scale_factor
            
            # Get the pixel color at the calculated position
            pixel = image.getpixel((pixel_x, pixel_y))
            
            # First check if it's a standard mapped color (red, yellow)
            cell_value = COLOR_MAP.get(pixel, None)
            
            # If it's not a standard color, check if it's green (walkable)
            if cell_value is None:
                cell_value = green_to_zPos(pixel)
            
            # If it's not a green color, check if it's blue (b-values)
            if cell_value is None:
                cell_value = blue_to_bPos(pixel)
            
            # If it's still unknown, mark it as 'unknown'
            if cell_value is None:
                cell_value = 'unknown'
            
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

    #MAIN PC
    # image_path = 'C:\\Users\\Leigh\\Desktop\\Development\\PointAndClickGame\\PointAndClickGame\\utilities\\grid-assets\\barn.png'
    # output_path = 'C:\\Users\\Leigh\\Desktop\\Development\\PointAndClickGame\\PointAndClickGame\\utilities\\jsonOutput\\barn.json'

    #LAPTOP
    image_path = 'C:\\Users\\leigh\\WebstormProjects\\PointAndClickGame\\PointAndClickGame\\utilities\\grid-assets\\researchRoom.png'
    output_path = 'C:\\Users\\leigh\\WebstormProjects\\PointAndClickGame\\PointAndClickGame\\utilities\\jsonOutput\\researchRoom.json'

    grid = process_image(image_path)
    
    # Identify and label exit zones
    grid_with_zones = identify_exit_zones(grid)
    
    save_to_json(args.screen_name, grid_with_zones, output_path)
    print("Grid saved to JSON with exit zones labeled.")
