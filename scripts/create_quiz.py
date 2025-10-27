import argparse
import pathlib # <-- CRUCIAL IMPORT for using pathlib.Path
import shutil
import re

# --- Configuration: Base template variables ---
# These are the strings the script will look for and replace in the template file.
OLD_TITLE = "Force and Laws of Motion Quiz"
OLD_TABLE = "force"
TEMPLATE_PATH = 'science/physics/force_quiz.html' 
TARGET_DIR = 'science/physics'

def create_quiz_file(new_title, new_table, filename):
    """
    Reads a template, performs text replacements for title and table, 
    and writes the new HTML file to the target directory.
    """
    try:
        # 1. Ensure the filename ends with .html
        if not filename.lower().endswith('.html'):
            filename = f"{filename}.html"
            
        # 2. Determine the full output path (This should fix line 34)
        output_path = pathlib.Path(TARGET_DIR) / filename
        
        # 3. Read the template content
        with open(TEMPLATE_PATH, "r") as f:
            content = f.read()
        
        # 4. Perform replacements
        # Replace the human-readable title
        content = content.replace(OLD_TITLE, new_title)
        
        # Replace the Firestore table name (used in the JavaScript)
        # Using re.escape in case table names contain special regex characters
        content = re.sub(re.escape(OLD_TABLE), new_table, content)
        
        # 5. Write the new file
        output_path.parent.mkdir(parents=True, exist_ok=True) # Ensure directory exists
        with open(output_path, "w") as f:
            f.write(content)
            
        print(f"Successfully created new quiz file: {output_path}")

    except FileNotFoundError:
        print(f"Error: Template file not found at ({TEMPLATE_PATH})")
        return
    except Exception as e:
        print(f"An unexpected error occurred during file creation: {e}")
        return

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate a new quiz HTML file from a template.")
    parser.add_argument("--title", required=True, help="New title for the quiz (e.g., '9. Gravitation').")
    parser.add_argument("--table", required=True, help="Firestore table name (e.g., 'gravitation').")
    parser.add_argument("--output", required=True, help="Output filename base (e.g., 'gravitation_quiz').")
    
    args = parser.parse_args()
    
    # Assuming all necessary files exist and paths are correct.
    create_quiz_file(
        new_title=args.title, 
        new_table=args.table,
        filename=args.output
    )
