# ... (imports and other functions)

def create_quiz_file(template_path, target_dir, new_title, new_table, filename):
    """
    Reads template, performs find/replace, and writes the new file.
    """
    # 1. Ensure the filename ends with .html
    if not filename.lower().endswith('.html'):
        filename = f"{filename}.html"
        
    output_path = pathlib.Path(target_dir) / filename
    
    # ... (rest of your file creation logic using output_path)
    
# ... (rest of the script including argparse)
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate a new quiz HTML file from a template.")
    parser.add_argument("--title", required=True, help="New title for the quiz.")
    parser.add_argument("--table", required=True, help="Firestore table name for the quiz data.")
    parser.add_argument("--output", required=True, help="Output filename (e.g., 'gravitation_quiz').")
    
    args = parser.parse_args()
    
    template = 'science/physics/force_quiz.html' # Assuming this is your template
    target = 'science/physics' # Assuming this is the target directory
    
    create_quiz_file(
        template_path=template, 
        target_dir=target, 
        new_title=args.title, 
        new_table=args.table,
        filename=args.output  # The script will now add .html if missing
    )
```

---

#### 2. The GitHub Actions Workflow (`.github/workflows/create_quiz.yml`)

The YAML file is what actually runs the Python script and passes the arguments. You need to ensure the **`--output`** value you pass is just the base name, and rely on the updated Python script to add the extension.

**In your workflow file (e.g., where you run the step named "Run Quiz Creation Script"):**

```yaml
# Hypothetical YAML structure
- name: Run Quiz Creation Script
  run: |
    python scripts/create_quiz.py \
      --title "9. Gravitation" \
      --table "gravitation" \
      --output "gravitation_quiz" # <--- Pass ONLY the base name here
