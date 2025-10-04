#!/usr/bin/env python3
"""
Generate files_index.json - lists all files in each fiche_produits folder
This allows the app to do fuzzy search on real files
"""

import os
import json

FICHE_DIR = 'fiche_produits'
OUTPUT_FILE = 'files_index.json'

def get_all_files_by_folder():
    """
    Scan all folders in fiche_produits and list their files
    Returns: dict of {folder_name: [list of filenames]}
    """
    index = {}

    if not os.path.exists(FICHE_DIR):
        print(f"Error: {FICHE_DIR} directory not found!")
        return index

    # Get all folders
    folders = [f for f in os.listdir(FICHE_DIR)
               if os.path.isdir(os.path.join(FICHE_DIR, f))]

    print(f"Found {len(folders)} folders in {FICHE_DIR}")

    for folder in sorted(folders):
        folder_path = os.path.join(FICHE_DIR, folder)

        # Get all files (pdf, png, jpg, jpeg)
        files = []
        for filename in os.listdir(folder_path):
            file_path = os.path.join(folder_path, filename)
            if os.path.isfile(file_path):
                ext = filename.lower().split('.')[-1]
                if ext in ['pdf', 'png', 'jpg', 'jpeg']:
                    files.append(filename)

        index[folder] = sorted(files)
        print(f"  {folder}: {len(files)} files")

    return index

def main():
    print("="*60)
    print("Generating Files Index")
    print("="*60)
    print()

    # Generate index
    index = get_all_files_by_folder()

    if not index:
        print("No files found!")
        return

    # Write to JSON file
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(index, f, indent=2, ensure_ascii=False)

    print()
    print("="*60)
    print(f"✓ Index generated: {OUTPUT_FILE}")
    print(f"  Total folders: {len(index)}")
    print(f"  Total files: {sum(len(files) for files in index.values())}")
    print("="*60)

if __name__ == '__main__':
    main()
