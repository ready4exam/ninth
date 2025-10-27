import argparse
import os

# --- Configuration: Base template variables (from force_quiz.html) ---
# NOTE: Using 'force_quiz.html' as the template as it was the final confirmed replica.
OLD_TITLE = "Force and Laws of Motion Quiz" 
OLD_TABLE = "force" 
# ---

def create_quiz_file(template_path, target_dir, new_title, new_table, new_filename):
    """Reads template, performs find/replace, and writes the new file."""
    
    try:
        with open(template_path, 'r') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: Template file not found at {template_path}")
        # The Action will fail here if the template path is wrong.
        return

    # 1. Replace Main Title (e.g., Force and Laws of Motion Quiz -> Electricity Quiz)
    new_content = content.replace(OLD_TITLE, new_title)
    
    # 2. Replace Supabase Table Name (e.g., const SUPABASE_TABLE = 'force'; -> 'electricity')
    new_content = new_content.replace(f"const SUPABASE_TABLE = '{OLD_TABLE}';", f"const SUPABASE_TABLE = '{new_table}';")
    
    # 3. Replace Difficulty Selector Heading (e.g., Choose Difficulty for Force Chapter -> Electricity Chapter)
    old_chapter_name = OLD_TITLE.replace(" Quiz", "")
    new_chapter_name = new_title.replace(" Quiz", "")
    new_content = new_content.replace(f"Choose Difficulty for {old_chapter_name} Chapter", f"Choose Difficulty for {new_chapter_name} Chapter")


    # 4. Write New File
    output_path = os.path.join(target_dir, new_filename)
    # Ensure the target directory exists before writing
    os.makedirs(target_dir, exist_ok=True)
    
    try:
        with open(output_path, 'w') as f:
            f.write(new_content)
        print(f"Successfully created: {output_path}")
    except Exception as e:
        print(f"Error writing file: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Automate creation of new chapter quiz files from a template.")
    parser.add_argument('--title', required=True, help="New chapter title")
    parser.add_argument('--table', required=True, help="New Supabase table name")
    parser.add_argument('--output', required=True, help="New HTML file name")
    
    args = parser.parse_args()

    # Define paths based on your repository structure
    # The file system shows motion_quiz.html and force_quiz.html are siblings.
    # We will use force_quiz.html as the template since it was the perfect replica.
    TEMPLATE_PATH = 'science/physics/force_quiz.html'
    TARGET_DIR = 'science/physics'
    
    create_quiz_file(TEMPLATE_PATH, TARGET_DIR, args.title, args.table, args.output)
