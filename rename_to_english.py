#!/usr/bin/env python3
"""
Script to rename all fiche_produits folders and files to English
Removes accents, special characters, converts to lowercase with underscores
"""

import os
import re
import shutil
from pathlib import Path

# Configuration
FICHE_DIR = 'fiche_produits'
DRY_RUN = False  # Set to False to actually rename

# Folder name translations (French → English)
FOLDER_TRANSLATIONS = {
    'Fleur séchées Indica 3.5g': 'dried_flower_indica_35g',
    'Fleur séchées Sativa 3.5g': 'dried_flower_sativa_35g',
    'Fleur séchées Hybride 3.5g': 'dried_flower_hybrid_35g',
    'Fleur séchés Rotation 3.5g': 'dried_flower_rotation_35g',
    'Fleur séchées 1g': 'dried_flower_1g',
    'Fleurs Séchées 15-28g': 'dried_flower_15_28g',
    'Pré-roulés Indica': 'pre_rolls_indica',
    'Pré-roulés Sativa': 'pre_rolls_sativa',
    'Pré-roulés Hybride': 'pre_rolls_hybrid',
    'Pré-Roulés en Rotation-Mélange': 'pre_rolls_rotation_mix',
    'Pré-roulés Concentrés': 'pre_rolls_concentrates',
    'Hashish': 'hashish',
    'Capsules': 'capsules',
    'Huiles': 'oils',
    'Atomiseurs': 'atomizers',
    'Boissons': 'beverages',
    'Bouchées': 'edibles_bites',
    'Autres Comestibles': 'other_edibles',
    'Moulu': 'milled',
    'Kief': 'kief',
    'Résine Rosine': 'rosin',
    'Thés - Tisanes': 'teas',
    'Planogramme 2024': 'planogram_2024'
}

def normalize_filename(name):
    """
    Normalize filename: lowercase, underscores, no special chars
    Keeps extension intact
    """
    # Split name and extension
    base, ext = os.path.splitext(name)

    # Convert to lowercase
    base = base.lower()

    # Remove/replace special characters
    base = base.replace(' - ', '_')  # " - " → "_"
    base = base.replace('-', '_')     # "-" → "_"
    base = base.replace(' ', '_')     # " " → "_"
    base = base.replace("'", '')      # Remove apostrophes
    base = base.replace('#', '')      # Remove hash
    base = base.replace('/', '_')     # "/" → "_"
    base = base.replace('(', '')      # Remove parentheses
    base = base.replace(')', '')
    base = base.replace(',', '')      # Remove commas

    # Remove multiple consecutive underscores
    base = re.sub(r'_+', '_', base)

    # Remove leading/trailing underscores
    base = base.strip('_')

    # Keep extension lowercase
    ext = ext.lower()

    return base + ext

def get_all_folders(base_dir):
    """Get all folders in fiche_produits directory"""
    folders = []
    if not os.path.exists(base_dir):
        return folders

    for item in os.listdir(base_dir):
        item_path = os.path.join(base_dir, item)
        if os.path.isdir(item_path):
            folders.append(item)

    return sorted(folders)

def rename_folders(base_dir, translations):
    """Rename all folders according to translation map"""
    renamed = []

    for old_name, new_name in translations.items():
        old_path = os.path.join(base_dir, old_name)
        new_path = os.path.join(base_dir, new_name)

        if not os.path.exists(old_path):
            print(f"  ⚠ Folder not found: {old_name}")
            continue

        if old_path == new_path:
            print(f"  ✓ Already correct: {old_name}")
            continue

        print(f"  📁 RENAME FOLDER:")
        print(f"     Old: {old_name}")
        print(f"     New: {new_name}")

        if not DRY_RUN:
            try:
                os.rename(old_path, new_path)
                print(f"     ✓ Renamed!")
                renamed.append((old_name, new_name))
            except Exception as e:
                print(f"     ✗ Error: {e}")
        else:
            renamed.append((old_name, new_name))

    return renamed

def rename_files_in_folder(folder_path, folder_name):
    """Rename all files in a folder"""
    if not os.path.exists(folder_path):
        return 0, 0

    files = [f for f in os.listdir(folder_path) if os.path.isfile(os.path.join(folder_path, f))]

    renamed_count = 0
    skipped_count = 0

    for filename in files:
        new_filename = normalize_filename(filename)

        if filename == new_filename:
            skipped_count += 1
            continue

        old_path = os.path.join(folder_path, filename)
        new_path = os.path.join(folder_path, new_filename)

        print(f"    • {filename}")
        print(f"      → {new_filename}")

        if not DRY_RUN:
            try:
                os.rename(old_path, new_path)
                renamed_count += 1
            except Exception as e:
                print(f"      ✗ Error: {e}")
        else:
            renamed_count += 1

    return renamed_count, skipped_count

def main():
    print("=" * 70)
    print("SQDC Fiche English Rename Script")
    print("=" * 70)
    print(f"Mode: {'DRY RUN (no changes)' if DRY_RUN else 'LIVE (will rename)'}")
    print()

    # Check if fiche_produits exists
    if not os.path.exists(FICHE_DIR):
        print(f"✗ Error: {FICHE_DIR} directory not found!")
        return

    # Step 1: Rename folders
    print("STEP 1: Renaming Folders")
    print("-" * 70)
    renamed_folders = rename_folders(FICHE_DIR, FOLDER_TRANSLATIONS)
    print()

    # Step 2: Rename files in each folder
    print("STEP 2: Renaming Files")
    print("-" * 70)

    total_files_renamed = 0
    total_files_skipped = 0

    # Get current folder names (after renaming)
    current_folders = get_all_folders(FICHE_DIR)

    for folder_name in current_folders:
        folder_path = os.path.join(FICHE_DIR, folder_name)

        # Count files
        file_count = len([f for f in os.listdir(folder_path)
                         if os.path.isfile(os.path.join(folder_path, f))])

        if file_count == 0:
            continue

        print(f"\n  📂 {folder_name} ({file_count} files)")

        renamed, skipped = rename_files_in_folder(folder_path, folder_name)
        total_files_renamed += renamed
        total_files_skipped += skipped

        if renamed > 0:
            print(f"     ✓ Renamed: {renamed}, Skipped: {skipped}")

    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Folders renamed: {len(renamed_folders)}")
    print(f"Files renamed: {total_files_renamed}")
    print(f"Files already correct: {total_files_skipped}")
    print()

    if DRY_RUN and (renamed_folders or total_files_renamed > 0):
        print("⚠ This was a DRY RUN. No changes were made.")
        print("  Set DRY_RUN = False in the script to apply changes.")
        print()

    if renamed_folders and not DRY_RUN:
        print("📝 IMPORTANT: Update app.js folder paths to use new English names!")
        print()
        print("   Folder mapping:")
        for old, new in renamed_folders:
            print(f"   '{old}' → '{new}'")

if __name__ == '__main__':
    main()
