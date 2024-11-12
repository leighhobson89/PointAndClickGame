from PIL import Image
import json
import os
import argparse

def process_foreground_image(image_path):
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
            
            # Determine if the cell is opaque
            if len(pixel) == 4 and pixel[3] > 0:  # Alpha > 0 for non-transparent
                row.append("f")
            else:
                row.append("-")
        
        grid.append(row)
    
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
    args = parser.parse_args()
    
    image_path = os.path.join("..", "resources", "foregrounds", "grids", f"{args.name}.png")
    
    if not os.path.isfile(image_path):
        print(f"Image file not found: {image_path}")
        return
    
    grid = process_foreground_image(image_path)
    save_foreground_grid_to_json(args.name, grid)

if __name__ == "__main__":
    main()
