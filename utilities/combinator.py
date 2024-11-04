import os
import json
import argparse

def combine_json_files(folder_path, output_file):
    combined_data = {}

    for file_name in os.listdir(folder_path):
        if file_name.endswith('.json'):
            file_path = os.path.join(folder_path, file_name)
            with open(file_path, 'r') as json_file:
                data = json.load(json_file)
                combined_data.update(data)
    
    with open(output_file, 'w') as output_json_file:
        json.dump(combined_data, output_json_file, indent=4)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Combine JSON files into one master JSON.')
    parser.add_argument('base_path', type=str, help='Base path for the JSON files.')
    args = parser.parse_args()

    folder_path = os.path.join(args.base_path, 'jsonOutput')
    output_file = os.path.join(args.base_path, 'masterJSON', 'masterJSONData.json')

    combine_json_files(folder_path, output_file)
    print(f"Combined JSON saved to {output_file}")
