import os
import json

def combine_json_files(folder_path, output_file):
    combined_data = {}

    # Loop through all files in the given folder
    for file_name in os.listdir(folder_path):
        if file_name.endswith('.json'):  # Process only JSON files
            file_path = os.path.join(folder_path, file_name)
            
            # Open and read the JSON file
            with open(file_path, 'r') as json_file:
                data = json.load(json_file)
                
                # Merge the data (assuming each JSON has one top-level key for the screen name)
                combined_data.update(data)
    
    # Write the combined data to the output file
    with open(output_file, 'w') as output_json_file:
        json.dump(combined_data, output_json_file, indent=4)

if __name__ == '__main__':
    #MAIN PC
    #folder_path = 'C:\\Users\\Leigh\\Desktop\\Development\\PointAndClickGame\\PointAndClickGame\\utilities\\jsonOutput'
    #output_file = 'C:\\Users\\Leigh\\Desktop\\Development\\PointAndClickGame\\PointAndClickGame\\utilities\\masterJSON\\masterJSONData.json'

    #LAPTOP
    folder_path = 'C:\\Users\\leigh\\WebstormProjects\\PointAndClickGame\\PointAndClickGame\\utilities\\jsonOutput'
    output_file = 'C:\\Users\\leigh\\WebstormProjects\\PointAndClickGame\\PointAndClickGame\\utilities\\masterJSON\\masterJSONData.json'

    combine_json_files(folder_path, output_file)
    print(f"Combined JSON saved to {output_file}")
