import argparse
import re
import json
from collections import OrderedDict

def update_link_map(html_file, chapter_name, file_path):
    """
    Reads the main HTML file, extracts the quizLinkMap, updates it
    with the new chapter, and writes the modified content back.
    
    :param html_file: The path to the main HTML file (e.g., 'science.html').
    :param chapter_name: The name of the chapter (e.g., '11. Sound').
    :param file_path: The relative path to the new quiz file 
                      (e.g., 'science/physics/sound_quiz.html').
    """
    
    print(f"Attempting to update links for chapter: '{chapter_name}' at path: './{file_path}'")
    
    try:
        with open(html_file, 'r') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: Main HTML file not found at '{html_file}'. Aborting update.")
        return

    # 1. Define the regex for the JavaScript variable block
    # This regex is specifically looking for the content inside the {} of quizLinkMap
    map_pattern = re.compile(
        r'(const\s+quizLinkMap\s*=\s*\{.*?\});', 
        re.DOTALL
    )
    
    match = map_pattern.search(content)
    if not match:
        print("Error: Could not find 'const quizLinkMap = {...}' in the HTML file.")
        return
        
    js_map_block = match.group(1).strip() # Full matched block
    
    # 2. Extract and parse existing links
    current_links = OrderedDict()
    try:
        # Extract content between { and }
        map_data_string = js_map_block.strip().strip(';').replace('const quizLinkMap = ', '').strip().strip('{').strip('}')
        
        # Split by line/comma and parse key: value pairs
        for item in map_data_string.split(','):
            item = item.strip()
            if not item:
                continue
                
            parts = item.split(':', 1)
            if len(parts) == 2:
                # Clean up quotes and trim whitespace
                key = parts[0].strip().strip("'").strip('"')
                value = parts[1].strip().strip("'").strip('"')
                if key and value:
                    current_links[key] = value
                    
    except Exception as e:
        print(f"Warning: Failed to fully parse existing quizLinkMap. Error: {e}. Proceeding with new link.")
        # If parsing fails, we ensure the new link is added.

    # 3. Add the new entry and manually rebuild the string
    current_links[chapter_name] = f'./{file_path}'

    # 4. Rebuild the new JavaScript content string (sorted for clean diffs)
    new_js_content = "const quizLinkMap = {\n"
    for chapter, path in sorted(current_links.items()): # Sort for consistency
        # Use single quotes for JavaScript string keys/values
        new_js_content += f"    '{chapter}': '{path}',\n" 
    new_js_content = new_js_content.rstrip(',\n') + "\n};" # Remove last comma, close brace

    # 5. Replace the old block with the new one
    new_html_content = map_pattern.sub(new_js_content, content, count=1)
    
    # 6. Write the updated HTML back to the file
    with open(html_file, 'w') as f:
        f.write(new_html_content)
        
    print(f"Successfully updated '{html_file}' with new link for '{chapter_name}'.")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Update quiz links in science.html.")
    parser.add_argument('--html-file', required=True, help='Path to the main HTML file.')
    parser.add_argument('--chapter-name', required=True, help='Title of the new quiz chapter.')
    parser.add_argument('--file-path', required=True, help='Relative path to the new quiz file.')
    
    args = parser.parse_args()
    
    update_link_map(args.html_file, args.chapter_name, args.file_path)
