import os
import re
from bs4 import BeautifulSoup

# --- Configuration ---
# The four chemistry chapters and their corresponding file/table names.
# The 'chapter_name' must exactly match the name used in science (2).html links.
CHEMISTRY_CHAPTER_MAP = [
    {
        'chapter_name': '1. Matter in Our Surroundings',
        'file_name': 'matter_surroundings_quiz.html',
        'display_title': 'Matter in Our Surroundings',
        'table_name': 'matter_surroundings',  # Supabase table name for this chapter
    },
    {
        'chapter_name': '2. Is Matter Around Us Pure',
        'file_name': 'is_matter_pure_quiz.html',
        'display_title': 'Is Matter Around Us Pure',
        'table_name': 'matter_pure',
    },
    {
        'chapter_name': '3. Atoms and Molecules',
        'file_name': 'atoms_molecules_quiz.html',
        'display_title': 'Atoms and Molecules',
        'table_name': 'atoms_molecules',
    },
    {
        'chapter_name': '4. Structure of the Atom',
        'file_name': 'structure_atom_quiz.html',
        'display_title': 'Structure of the Atom',
        'table_name': 'structure_atom',
    },
]

# --- File Paths ---
TEMPLATE_PATH = 'sound_quiz.html'
MAIN_HTML_PATH = 'science.html'
OUTPUT_DIR = 'science/chemistry'
LINK_BASE_PATH = './science/chemistry/' # Link relative to science (2).html

def generate_quiz_files(template_content):
    """Generates the four chapter quiz files."""
    print(f"Ensuring output directory exists: {OUTPUT_DIR}")
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    for chapter in CHEMISTRY_CHAPTER_MAP:
        # 1. Start with the template content
        new_quiz_content = template_content
        
        # 2. Replace the HTML <title> tag
        new_quiz_content = new_quiz_content.replace(
            '<title>Sound</title>',
            f'<title>{chapter["display_title"]} Quiz</title>'
        )

        # 3. Replace the main <h1> header (Content inside the h1 tag)
        new_quiz_content = new_quiz_content.replace(
            '<h1 class="text-3xl font-extrabold text-primary-blue mb-4 text-center">\n            Sound\n        </h1>',
            f'<h1 class="text-3xl font-extrabold text-primary-blue mb-4 text-center">\n            {chapter["display_title"]}\n        </h1>'
        )

        # 4. Replace the JavaScript SUPABASE_TABLE constant
        # This is CRITICAL for the quiz page to query the correct database table
        new_quiz_content = new_quiz_content.replace(
            "const SUPABASE_TABLE = 'sound';",
            f"const SUPABASE_TABLE = '{chapter['table_name']}';"
        )

        # 5. Save the new file
        output_file_path = os.path.join(OUTPUT_DIR, chapter['file_name'])
        with open(output_file_path, 'w') as f:
            f.write(new_quiz_content)
            
        print(f"Generated quiz file: {output_file_path}")

def update_main_html_map(main_html_content):
    """Updates the quizLinkMap in science (2).html."""
    
    # Define the new links to be injected
    new_links = {
        chapter['chapter_name']: f"{LINK_BASE_PATH}{chapter['file_name']}"
        for chapter in CHEMISTRY_CHAPTER_MAP
    }
    
    # 1. Load the existing HTML content
    soup = BeautifulSoup(main_html_content, 'html.parser')
    
    # 2. Find the <script> tag that contains the quizLinkMap
    script_tag = soup.find(lambda tag: tag.name == 'script' and 'const quizLinkMap' in tag.text)
    
    if not script_tag:
        print("Error: Could not find the script block containing 'const quizLinkMap'.")
        return main_html_content

    js_content = script_tag.string

    # 3. Use a regex to find and extract the existing quizLinkMap dictionary
    # This pattern captures the content inside the {} of the quizLinkMap variable
    map_pattern = re.compile(r"const quizLinkMap = \{([^}]+)\};", re.DOTALL)
    match = map_pattern.search(js_content)

    if not match:
        print("Error: Could not find the content of 'quizLinkMap'.")
        return main_html_content
        
    # Extract existing map string content
    existing_map_str = match.group(1).strip()
    
    # 4. Parse existing map (safely, handling the JS format) and merge
    # This is simplified: we reconstruct the entire dictionary for robustness
    
    # This list will hold all map entries, including existing Physics/Biology ones
    all_map_entries = []
    
    # Safely parse existing links (non-Chemistry only)
    for line in existing_map_str.splitlines():
        line = line.strip()
        # Keep existing entries that are NOT the old Chemistry placeholder
        if line and not any(old_chem_name in line for old_chem_name in ['Is Matter Around Us Pure']):
            all_map_entries.append(line)
            
    # Add all the new Chemistry links
    for chapter_name, file_path in new_links.items():
        # Ensure chapter_name is properly escaped for the JS string key
        escaped_name = chapter_name.replace("'", "\\'")
        all_map_entries.append(f"'{escaped_name}': '{file_path}',")


    # Add back the other existing entries from the original map (Physics/Biology)
    # The original map has Physics and Biology entries which we want to retain:
    # '10. Work and Energy': './science/physics/work_quiz.html',
    # '11. Sound': './science/physics/sound_quiz.html',
    # '5. The Fundamental Unit of Life': './quizzes/science/biology/cell/cell_quiz.html',
    # '7. Motion': './science/physics/motion_quiz.html',
    # '8. Force and Laws of Motion': './science/physics/force_quiz.html',
    # '9. Gravitation': './science/physics/gravitation_quiz.html',
    
    # To be extremely safe, we should retain all original entries that aren't being replaced.
    original_entries_to_retain = [
        "'10. Work and Energy': './science/physics/work_quiz.html',",
        "'11. Sound': './science/physics/sound_quiz.html',",
        "'7. Motion': './science/physics/motion_quiz.html',",
        "'8. Force and Laws of Motion': './science/physics/force_quiz.html',",
        "'9. Gravitation': './science/physics/gravitation_quiz.html',",
    ]
    
    # Create the complete new dictionary body
    new_map_entries = []
    
    # Keep original physics/biology (ensuring no duplicates with the new chemistry)
    existing_entries_set = {re.sub(r'[\s\'"]', '', line.split(':')[0]) for line in all_map_entries}
    
    for line in original_entries_to_retain:
        chapter_key = re.sub(r'[\s\'"]', '', line.split(':')[0])
        if chapter_key not in existing_entries_set:
            new_map_entries.append(line)
            
    # Add the new chemistry links
    for chapter_name, file_path in new_links.items():
        escaped_name = chapter_name.replace("'", "\\'")
        new_map_entries.append(f"    '{escaped_name}': '{file_path}',")
        
    # Reconstruct the map block
    new_map_str = "{\n" + "\n".join(new_map_entries) + "\n   }"
    
    # Use regex substitution to replace the old map content
    new_js_content = map_pattern.sub(f"const quizLinkMap = {new_map_str};", js_content)
    
    # Replace the old script content with the new one in BeautifulSoup
    # Ensure the script tag's content is replaced correctly
    script_tag.string.replace_with(BeautifulSoup(new_js_content, 'html.parser'))
    
    print("Successfully updated quizLinkMap in science (2).html.")
    return str(soup)


def main():
    # --- 1. Load Template File ---
    try:
        with open(TEMPLATE_PATH, 'r') as f:
            template_content = f.read()
    except FileNotFoundError:
        print(f"Error: Template file not found at {TEMPLATE_PATH}. Ensure the file exists.")
        return

    # --- 2. Generate and Save Quiz Files ---
    generate_quiz_files(template_content)

    # --- 3. Load Main HTML File ---
    try:
        with open(MAIN_HTML_PATH, 'r') as f:
            main_html_content = f.read()
    except FileNotFoundError:
        print(f"Error: Main HTML file not found at {MAIN_HTML_PATH}. Ensure the file exists.")
        return

    # --- 4. Update the Navigation Map in Main HTML ---
    updated_html_content = update_main_html_map(main_html_content)

    # --- 5. Write the Updated Main HTML File ---
    if updated_html_content:
        with open(MAIN_HTML_PATH, 'w') as f:
            f.write(updated_html_content)
        print(f"Successfully wrote changes back to {MAIN_HTML_PATH}.")

if __name__ == '__main__':
    main()
