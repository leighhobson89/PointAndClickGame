from PIL import Image
import json

# Define the color mappings
COLOR_MAP = {
    (0, 255, 0): 'walkable',  # Green
    (255, 0, 0): 'non_walkable'  # Red
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

def save_to_json(grid, output_path):
    with open(output_path, 'w') as json_file:
        json.dump(grid, json_file, indent=4)

if __name__ == '__main__':
    image_path = 'C:\\Users\\Leigh\\Desktop\\Development\\PointAndClickGame\\PointAndClickGame\\utilities\\grid-assets\\test.png'
    output_path = 'C:\\Users\\Leigh\\Desktop\\Development\\PointAndClickGame\\PointAndClickGame\\utilities\\jsonOutput\\test.json'

    grid = process_image(image_path)
    save_to_json(grid, output_path)
    print("Grid saved to JSON.")
