import os
import shutil
import subprocess
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
    'builds',
    '.git',
    'node_modules',
    'pointAndClickDesktop'
]

def clean_build_directory(builds_dir):
    """Delete everything in the builds directory."""
    if os.path.exists(builds_dir):
        logging.info(f"Cleaning build directory: {builds_dir}")
        shutil.rmtree(builds_dir)  # Remove the entire builds directory
    os.makedirs(builds_dir, exist_ok=True)  # Recreate it

def copy_files_to_desktop(src_dir, dest_dir):
    """Copy files from src_dir to dest_dir, ignoring files in the IGNORE_LIST."""
    logging.info(f"Copying files from {src_dir} to {dest_dir}")

    for root, dirs, files in os.walk(src_dir):
        # Update directories to ignore
        dirs[:] = [d for d in dirs if d not in IGNORE_LIST]
        for file_name in files:
            if file_name in IGNORE_LIST:
                logging.info(f"Ignoring file: {os.path.join(root, file_name)}")
                continue

            # Create source file path
            src_file_path = os.path.join(root, file_name)

            # Calculate relative path from the src_dir directly, not including pointAndClickDesktop
            rel_path = os.path.relpath(root, start=src_dir)  # Relative to the parent directory of utilities

            # Construct the destination file path without including 'utilities'
            # Ensure that the destination doesn't prepend 'pointAndClickDesktop' again
            if rel_path.startswith(".."):  # Handle any relative paths that go upwards
                dest_file_path = os.path.join(dest_dir, file_name)  # Just copy the file without path
            else:
                dest_file_path = os.path.join(dest_dir, rel_path, file_name)

            # Ensure the destination directory exists
            os.makedirs(os.path.dirname(dest_file_path), exist_ok=True)

            logging.info(f"Copying {src_file_path} to {dest_file_path}")
            shutil.copy2(src_file_path, dest_file_path)  # This will overwrite if it exists

import os
import subprocess
import logging

def run_npm_build(project_dir):
    """Run npm build in the specified project directory."""
    logging.info(f"Running npm build in {project_dir}")

    # Check if package.json exists
    package_json_path = os.path.join(project_dir, 'package.json')
    if not os.path.isfile(package_json_path):
        logging.error(f"package.json not found in {project_dir}. Please check your project structure.")
        return

    # Log the current working directory to confirm
    logging.info(f"Current working directory before build: {os.getcwd()}")

    try:
        # Attempt to run the npm build command
        result = subprocess.run(["npm", "run", "build"], cwd=project_dir, check=True, shell=True)
        logging.info("NPM build completed successfully.")
    except subprocess.CalledProcessError as e:
        logging.error(f"NPM build failed with error: {e}")
    except FileNotFoundError:
        logging.error("npm is not found. Please ensure that Node.js is installed and added to your PATH.")


def main():
    # Set up argument parsing
    parser = argparse.ArgumentParser(description='Build the Electron application.')
    parser.add_argument('build_name', type=str, help='The argument to include in the build process.')

    args = parser.parse_args()

    # Define paths
    current_dir = os.getcwd()
    builds_dir = os.path.join(current_dir, '../pointAndClickDesktop/builds')
    src_dir = os.path.dirname(current_dir)  # Parent directory
    dest_dir = os.path.join(current_dir, '../pointAndClickDesktop')

    # Clean the builds directory
    clean_build_directory(builds_dir)

    # Copy files to the Electron project directory
    copy_files_to_desktop(src_dir, dest_dir)

    # Run npm build
    run_npm_build(dest_dir)

if __name__ == '__main__':
    main()