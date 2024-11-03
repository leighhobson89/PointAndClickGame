import os
import zipfile
import argparse
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# List of files and directories to ignore
IGNORE_LIST = [
    '.gitignore',
    'utilities',
    'package.json',
    'package-lock.json',
    '.vscode',
    '.builds',
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
            for dir_name in dirs:
                # Check if the directory should be ignored
                if dir_name in IGNORE_LIST:
                    logging.info(f"Ignoring directory: {os.path.join(root, dir_name)}")
                    dirs.remove(dir_name)  # Remove from dirs to skip zipping it
            
            for file_name in files:
                # Check if the file should be ignored
                if file_name in IGNORE_LIST:
                    logging.info(f"Ignoring file: {os.path.join(root, file_name)}")
                    continue

                file_path = os.path.join(root, file_name)
                zip_file.write(file_path, os.path.relpath(file_path, os.path.dirname(os.getcwd())))
                logging.info(f"Added to zip: {file_path}")

    logging.info(f"Zip file created: {zip_path}")

def main():
    # Set up argument parsing
    parser = argparse.ArgumentParser(description='Create a zip file of the game directory.')
    parser.add_argument('build_name', type=str, help='The argument to include in the zip file name.')

    args = parser.parse_args()

    # Construct the zip file name
    zip_file_name = f"pointAndClickGame_Build_{args.build_name}.zip"
    create_build_zip(zip_file_name)

if __name__ == '__main__':
    main()