import os
import zipfile
import argparse
import logging
import subprocess
import shutil  # For copying files and cleaning up

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
    'pointAndClickDesktop',
    '.git'
]

def copy_files_to_temp(src_dir, temp_dir):
    """Copy selected files to a temporary directory."""
    for root, dirs, files in os.walk(src_dir):
        dirs[:] = [d for d in dirs if d not in IGNORE_LIST]
        for file_name in files:
            if file_name in IGNORE_LIST:
                continue
            src_path = os.path.join(root, file_name)
            rel_path = os.path.relpath(src_path, src_dir)
            dest_path = os.path.join(temp_dir, rel_path)

            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            shutil.copy2(src_path, dest_path)
            logging.info(f"Copied: {src_path} -> {dest_path}")

def minify_files(root_dir):
    """Minify and obfuscate JS and HTML files in the temp directory."""
    for root, dirs, files in os.walk(root_dir):
        for file_name in files:
            file_path = os.path.join(root, file_name)

            if file_name.endswith('.js'):
                logging.info(f"Minifying JavaScript: {file_path}")
                try:
                    subprocess.run(f"npx terser {file_path} -o {file_path} --compress --mangle", shell=True, check=True)
                except subprocess.CalledProcessError as e:
                    logging.error(f"Error minifying JavaScript: {e}")

            elif file_name.endswith('.html'):
                logging.info(f"Minifying HTML: {file_path}")
                try:
                    subprocess.run(f"npx html-minifier --collapse-whitespace --remove-comments --minify-css true --minify-js true -o {file_path} {file_path}", shell=True, check=True)
                except subprocess.CalledProcessError as e:
                    logging.error(f"Error minifying HTML: {e}")

def create_build_zip(zip_name, temp_dir):
    """Create a zip file from the temporary directory."""
    builds_dir = os.path.join(os.path.dirname(os.getcwd()), 'builds')
    os.makedirs(builds_dir, exist_ok=True)

    zip_path = os.path.join(builds_dir, zip_name)
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for root, dirs, files in os.walk(temp_dir):
            for file_name in files:
                file_path = os.path.join(root, file_name)
                zip_file.write(file_path, os.path.relpath(file_path, temp_dir))
    logging.info(f"Zip file created: {zip_path}")
    return zip_path

def main():
    parser = argparse.ArgumentParser(description='Create a zip file of the game directory.')
    parser.add_argument('build_name', type=str, help='The argument to include in the zip file name.')

    args = parser.parse_args()
    zip_file_name = f"pointAndClickGame_Build_{args.build_name}.zip"

    # Create a temporary directory
    temp_dir = os.path.join(os.getcwd(), 'temp_build')
    os.makedirs(temp_dir, exist_ok=True)

    try:
        # Copy files to temporary directory
        project_root = os.path.dirname(os.getcwd())
        logging.info(f"Copying files to temporary directory: {temp_dir}")
        copy_files_to_temp(project_root, temp_dir)

        # Minify files in the temporary directory
        logging.info("Minifying files in temporary directory...")
        minify_files(temp_dir)

        # Create the zip from the temporary directory
        zip_path = create_build_zip(zip_file_name, temp_dir)

    finally:
        # Clean up temporary directory
        logging.info("Cleaning up temporary directory...")
        shutil.rmtree(temp_dir, ignore_errors=True)

    # Ask user if they want to push the build
    push_response = input("Do you want to push the build to itch.io right now? (Y/N): ").strip().upper()
    if push_response == 'Y':
        butler_command = f"butler push {zip_path} leighhobson89/pointandclickadventure:browser"
        try:
            logging.info(f"Executing command: {butler_command}")
            subprocess.run(butler_command, shell=True, check=True)
            logging.info("Build pushed successfully!")
        except subprocess.CalledProcessError as e:
            logging.error(f"An error occurred while pushing the build: {e}")
    else:
        logging.info("Build not pushed.")

if __name__ == '__main__':
    main()
