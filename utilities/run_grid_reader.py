import subprocess
import os
import shutil
import argparse

def run_grid_reader(screen_names, base_path):
    for screen_name in screen_names:
        command = ['python', 'grid_reader.py', screen_name, base_path]
        try:
            print(f"Processing main grid for {screen_name}...")
            subprocess.run(command, check=True)
        except subprocess.CalledProcessError as e:
            print(f"Error processing main grid for {screen_name}: {e}")

def run_combinator(base_path):
    command = ['python', 'combinator.py', base_path]
    try:
        print("Combining main grid JSON files...")
        subprocess.run(command, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error running main grid combinator: {e}")

def run_foreground_grid_reader(screen_names_foregrounds):
    for screen_name in screen_names_foregrounds:
        command = ['python', 'foreground_grid_reader.py', screen_name]
        try:
            print(f"Processing foreground grid for {screen_name}...")
            subprocess.run(command, check=True)
        except subprocess.CalledProcessError as e:
            print(f"Error processing foreground grid for {screen_name}: {e}")

def run_combinator_foregrounds():
    command = ['python', 'combinator_foregrounds.py']
    try:
        print("Combining foreground JSON files...")
        subprocess.run(command, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error running foreground combinator: {e}")

def backup_and_copy_master_json():
    # Define paths for main and foreground JSONs
    resources_dir = os.path.abspath('../resources/screenWalkableJSONS')
    master_json_path = os.path.join(resources_dir, 'masterJSONData.json')
    backup_json_path = os.path.join(resources_dir, 'masterJSONLastOneBackup.json')
    new_master_json_path = os.path.abspath('./masterJSON/masterJSONData.json')
    
    # Paths for foreground JSONs
    master_foreground_json_path = os.path.join(resources_dir, 'masterForegroundData.json')
    backup_foreground_json_path = os.path.join(resources_dir, 'masterForegroundLastOneBackup.json')
    new_master_foreground_json_path = os.path.abspath('./masterJSON/masterForegroundData.json')
    
    # Backup and replace main JSON
    if os.path.exists(backup_json_path):
        try:
            os.remove(backup_json_path)
            print(f"Deleted existing main grid backup: {backup_json_path}")
        except Exception as e:
            print(f"Error deleting main grid backup: {e}")

    if os.path.exists(master_json_path):
        try:
            os.rename(master_json_path, backup_json_path)
            print(f"Main grid backup created: {backup_json_path}")
        except Exception as e:
            print(f"Error creating main grid backup: {e}")

    if os.path.exists(new_master_json_path):
        shutil.copy(new_master_json_path, master_json_path)
        print(f"New main JSON copied to: {master_json_path}")
    else:
        print(f"New main JSON file not found: {new_master_json_path}")

    # Backup and replace foreground JSON
    if os.path.exists(backup_foreground_json_path):
        try:
            os.remove(backup_foreground_json_path)
            print(f"Deleted existing foreground grid backup: {backup_foreground_json_path}")
        except Exception as e:
            print(f"Error deleting foreground grid backup: {e}")

    if os.path.exists(master_foreground_json_path):
        try:
            os.rename(master_foreground_json_path, backup_foreground_json_path)
            print(f"Foreground grid backup created: {backup_foreground_json_path}")
        except Exception as e:
            print(f"Error creating foreground grid backup: {e}")

    if os.path.exists(new_master_foreground_json_path):
        shutil.copy(new_master_foreground_json_path, master_foreground_json_path)
        print(f"New foreground JSON copied to: {master_foreground_json_path}")
    else:
        print(f"New foreground JSON file not found: {new_master_foreground_json_path}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Run grid reader and combinator scripts.")
    parser.add_argument('machine_type', type=str, choices=['desktop', 'laptop'], help="Specify the machine type for paths.")
    args = parser.parse_args()

    # Define base paths for each machine type
    if args.machine_type == 'desktop':
        base_path = 'C:\\Users\\Leigh\\Desktop\\Development\\PointAndClickGame\\PointAndClickGame\\utilities\\'
    else:  # laptop
        base_path = 'C:\\Users\\leigh\\WebstormProjects\\PointAndClickGame\\PointAndClickGame\\utilities\\'
    
    # List of screen names for the original grid
    screen_names = [
        'libraryFoyer', 'marketStreet', 'researchRoom', 'alley', 'carpenter',
        'den', 'house', 'barn', 'deadTree', 'cowPath', 'roadIntoTown', 'stinkingDump',
        'largePileOfPoo', 'riverCrossing', 'riverCrossingBridgeHalfComplete', 'riverCrossingBridgeComplete', 'stables', 'sewer', 'kitchen'
    ]

    # List of screen names for the foreground grid (currently same as the original screen names)
    screen_names_foregrounds = [
        'libraryFoyer', 'marketStreet', 'riverCrossing', 'riverCrossingBridgeHalfComplete', 'riverCrossingBridgeComplete', 'stables', 'sewer'
    ]

    # Run main grid reader and combinator
    run_grid_reader(screen_names, base_path)
    run_combinator(base_path)

    # Run foreground grid reader and combinator
    run_foreground_grid_reader(screen_names_foregrounds)
    run_combinator_foregrounds()

    # Backup and copy both master JSONs
    backup_and_copy_master_json()
