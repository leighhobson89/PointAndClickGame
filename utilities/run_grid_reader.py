import subprocess
import os
import shutil

def run_grid_reader(screen_names):
    for screen_name in screen_names:
        # Construct the command to run grid_reader.py with the screen name
        command = ['python', 'grid_reader.py', screen_name]
        
        # Run the command
        try:
            print(f"Processing {screen_name}...")
            subprocess.run(command, check=True)  # This will run the command and raise an error if it fails
        except subprocess.CalledProcessError as e:
            print(f"Error processing {screen_name}: {e}")

def run_combinator():
    # Construct the command to run combinator.py
    command = ['python', 'combinator.py']
    
    # Run the command
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
    
    # Convert relative paths to absolute paths for better compatibility
    master_json_path = os.path.abspath(master_json_path)
    backup_json_path = os.path.abspath(backup_json_path)
    new_master_json_path = os.path.abspath(new_master_json_path)
    
    # Delete the existing backup if it exists
    if os.path.exists(backup_json_path):
        try:
            os.remove(backup_json_path)
            print(f"Deleted existing backup: {backup_json_path}")
        except Exception as e:
            print(f"Error deleting existing backup: {e}")

    # Attempt to back up the existing master JSON file
    if os.path.exists(master_json_path):
        try:
            os.rename(master_json_path, backup_json_path)
            print(f"Backup created: {backup_json_path}")
        except Exception as e:
            print(f"Error creating backup: {e}")
    
    # Always attempt to copy the new master JSON file
    if os.path.exists(new_master_json_path):
        shutil.copy(new_master_json_path, master_json_path)
        print(f"New master JSON copied to: {master_json_path}")
    else:
        print(f"New master JSON file not found: {new_master_json_path}")

if __name__ == '__main__':
    # Hardcoded array of screen names
    screen_names = ['debugRoom', 'libraryFoyer', 'marketStreet', 'researchRoom', 'seedyGuyAlley', 'carpenter', 
                    'den', 'house', 'barn', 'deadTree', 'cowPath', 'roadIntoTown', 'stinkingDump', 
                    'largePileOfPoo', 'riverCrossing', 'stables', 'sewer', 'kitchen']

    run_grid_reader(screen_names)
    run_combinator()
    backup_and_copy_master_json()
