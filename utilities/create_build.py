import os
import zipfile
import argparse
import logging
import subprocess  # Import subprocess to run terminal commands

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# List of files and directories to ignore
IGNORE_LIST = [
    '.gitignore',
    'utilities',
    'package.json',
    'package-lock.json',
    '.vscode',
    'builds',
    '.git'
]

def create_build_zip(zip_name):
    # Create a 'builds' directory in the parent directory if it does not exist
    builds_dir = os.path.join(os.path.dirname(os.getcwd()), 'builds')
    os.makedirs(builds_dir, exist_ok=True)

    zip_path = os.path.join(builds_dir, zip_name)
    
    # Create a zip file
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for root, dirs, files in os.walk(os.path.dirname(os.getcwd())):  # Walk the parent directory
            # Create a new list of directories to traverse
            dirs[:] = [d for d in dirs if d not in IGNORE_LIST]
            for file_name in files:
                # Check if the file should be ignored
                if file_name in IGNORE_LIST:
                    logging.info(f"Ignoring file: {os.path.join(root, file_name)}")
                    continue

                file_path = os.path.join(root, file_name)
                logging.info(f"About to add {file_path} to zip")
                zip_file.write(file_path, os.path.relpath(file_path, os.path.dirname(os.getcwd())))
                logging.info(f"Added to zip: {file_path}")

    logging.info(f"Zip file created: {zip_path}")
    return zip_path  # Return the zip path for further use

def main():
    # Set up argument parsing
    parser = argparse.ArgumentParser(description='Create a zip file of the game directory.')
    parser.add_argument('build_name', type=str, help='The argument to include in the zip file name.')

    args = parser.parse_args()

    # Construct the zip file name
    zip_file_name = f"pointAndClickGame_Build_{args.build_name}.zip"
    zip_path = create_build_zip(zip_file_name)  # Store the zip path

    # Prompt the user if they want to push the build
    push_response = input("Do you want to push the build to itch.io right now? (Y/N): ").strip().upper()
    
    if push_response == 'Y':
        # Construct the butler command
        butler_command = f"butler push {zip_path} leighhobson89/pointandclickadventure:browser"
        
        try:
            # Execute the butler command
            logging.info(f"Executing command: {butler_command}")
            result = subprocess.run(butler_command, shell=True, check=True)
            logging.info("Build pushed successfully!")
        except subprocess.CalledProcessError as e:
            logging.error(f"An error occurred while pushing the build: {e}")
    else:
        logging.info("Build not pushed.")

if __name__ == '__main__':
    main()