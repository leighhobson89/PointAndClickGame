import os
import json

def combine_foreground_json_files():
    # Define paths relative to the script location
    current_dir = os.path.dirname(os.path.abspath(__file__))
    input_folder = os.path.join(current_dir, 'foreGroundJsonOutput')
    output_folder = os.path.join(current_dir, 'masterJSON')
    output_file = os.path.join(output_folder, 'masterForegroundData.json')

    # Create the output directory if it doesn't exist
    os.makedirs(output_folder, exist_ok=True)

    combined_data = {}

    # Read each JSON file in the input folder and combine their contents
    for file_name in os.listdir(input_folder):
        if file_name.endswith('.json'):
            file_path = os.path.join(input_folder, file_name)
            with open(file_path, 'r') as json_file:
                data = json.load(json_file)
                combined_data.update(data)  # Merge each JSON file's data into the combined dictionary
    
    # Write the combined data to the output JSON file
    with open(output_file, 'w') as output_json_file:
        json.dump(combined_data, output_json_file, indent=4)

    print(f"Combined foreground JSON saved to {output_file}")

if __name__ == '__main__':
    combine_foreground_json_files()
