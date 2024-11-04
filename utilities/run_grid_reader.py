import subprocess
import os
import shutil
import argparse

def run_grid_reader(screen_names, base_path):
    for screen_name in screen_names:
        # Pass the base path as an additional argument
        command = ['python', 'grid_reader.py', screen_name, base_path]
        
        try:
            print(f"Processing {screen_name}...")
            subprocess.run(command, check=True)
        except subprocess.CalledProcessError as e:
            print(f"Error processing {screen_name}: {e}")

def run_combinator(base_path):
    command = ['python', 'combinator.py', base_path]
    
    try:
        print("Combining JSON files...")
        subprocess.run(command, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error running combinator: {e}")

def backup_and_copy_master_json():
    # Define relative paths
    master_json_path = '..\\resources\\screenWalkableJSONS\\masterJSONData.json'
    backup_json_path = '..\\resources\\screenWalkableJSONS\\masterJSONLastOneBackup.json'
    new_master_json_path = 'masterJSON\\masterJSONData.json'
    
    # Convert relative paths to absolute paths
    master_json_path = os.path.abspath(master_json_path)
    backup_json_path = os.path.abspath(backup_json_path)
    new_master_json_path = os.path.abspath(new_master_json_path)
    
    if os.path.exists(backup_json_path):
        try:
            os.remove(backup_json_path)
            print(f"Deleted existing backup: {backup_json_path}")
        except Exception as e:
            print(f"Error deleting existing backup: {e}")

    if os.path.exists(master_json_path):
        try:
            os.rename(master_json_path, backup_json_path)
            print(f"Backup created: {backup_json_path}")
        except Exception as e:
            print(f"Error creating backup: {e}")
    
    if os.path.exists(new_master_json_path):
        shutil.copy(new_master_json_path, master_json_path)
        print(f"New master JSON copied to: {master_json_path}")
    else:
        print(f"New master JSON file not found: {new_master_json_path}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Run grid reader and combinator scripts.")
    parser.add_argument('machine_type', type=str, choices=['desktop', 'laptop'], help="Specify the machine type for paths.")
    args = parser.parse_args()

    # Define base paths for each machine type
    if args.machine_type == 'desktop':
        base_path = 'C:\\Users\\Leigh\\Desktop\\Development\\PointAndClickGame\\PointAndClickGame\\utilities\\'
    else:  # laptop
        base_path = 'C:\\Users\\leigh\\WebstormProjects\\PointAndClickGame\\PointAndClickGame\\utilities\\'
    
    screen_names = [
        'libraryFoyer', 'marketStreet', 'researchRoom', 'alley', 'carpenter',
        'den', 'house', 'barn', 'deadTree', 'cowPath', 'roadIntoTown', 'stinkingDump',
        'largePileOfPoo', 'riverCrossing', 'stables', 'sewer', 'kitchen'
    ]

    run_grid_reader(screen_names, base_path)
    run_combinator(base_path)
    backup_and_copy_master_json()