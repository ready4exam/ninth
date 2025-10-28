import os
import re
from bs4 import BeautifulSoup

# --- Configuration ---
# Chapters for Chemistry (UNIT III)
CHEMISTRY_CHAPTERS = [
    '1. Matter in Our Surroundings',
    '2. Is Matter Around Us Pure',
    '3. Atoms and Molecules',
    '4. Structure of the Atom',
]

# Paths relative to the repository root (assuming CWD is root in GitHub Actions)
QUIZ_TEMPLATE_PATH = 'sound_quiz.html'
MAIN_SCIENCE_HTML_PATH = 'science (2).html'
OUTPUT_DIR_BASE = 'science/chemistry' # Output directory for new files

# --- Utility Functions ---

def normalize_chapter_name(chapter_name):
    """
    Converts a chapter name into the required Supabase table name 
    (matter_surroundings, atoms_molecules, etc.) and a unique file name.
    """
    # 1. Remove leading number and dot (e.g., '1. ')
    name_no_num = re.sub(r'^\d+\.\s*', '', chapter_name).strip()
    
    # 2. Derive the NEW Descriptive Table Name (User's requirement)
    
    # We use a specific mapping approach based on the known chapters for reliable output
    name_map = {
        'Matter in Our Surroundings': 'matter_surroundings',
        'Is Matter Around Us Pure': 'matter_pure',
        'Atoms and Molecules': 'atoms_molecules',
        'Structure of the Atom': 'structure_atom',
    }
    
    # Clean the name for lookup (e.g., handles "Is Matter Around Us Pure")
    cleaned_name = name_no_num.strip()
    
    table_name = name_map.get(cleaned_name)
    
    if not table_name:
        # Fallback to general snake_case if a new chapter is added
        print(f"Warning: Specific table name not found for '{cleaned_name}'. Using snake_case fallback.")
        table_name = cleaned_name.lower().replace(' ', '_').replace('\'', '')


    # 3. Use the FULL chapter name for the File Name (for uniqueness)
    full_name_snake = cleaned_name.lower().replace(' ', '_').replace('\'', '')
    file_name = f"{full_name_snake}_quiz.html"

    # Example: '1. Matter in Our Surroundings' -> table_name: 'matter_surroundings', file_name: 'matter_in_our_surroundings_quiz.html'
    
    return chapter_name, table_name, file_name # Return original chapter_name for map key


def inject_firebase_score_logic(script_content):
    """Inserts the Firebase score logging code into the submitQuiz function."""
    
    firebase_logic = """
            // =========================================================
            //  NEW CODE BLOCK FOR FIRESTORE (Score Logging)
            // =========================================================
            const user = firebase.auth().currentUser;
            if (user) {
                // Log the final score to the 'quiz_scores' collection
                db.collection("quiz_scores").add({
                    userId: user.uid,
                    email: user.email || 'N/A', 
                    chapter: document.querySelector('h1').textContent.trim(), 
                    difficulty: selectedDifficulty,
                    score: finalScore,
                    totalQuestions: questions.length,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(), 
                    version: 'perfect_1' 
                })
                .then(() => {
                    console.log("Quiz score logged successfully to quiz_scores.");
                })
                .catch((error) => {
                    console.error("Error logging quiz score:", error);
                });
            } else {
                console.log("Score not saved: User not logged in.");
            }
            // =========================================================
    """
    injection_target = re.compile(r"score\s*=\s*finalScore;")
    
    if injection_target.search(script_content):
        updated_content = injection_target.sub(
            f"{firebase_logic}\n\n            score = finalScore;", 
            script_content, 
            count=1 
        )
        return updated_content
    return script_content


def generate_quiz_file(template_content, chapter_name, file_name, table_name):
    """Generates the content for a new quiz HTML file."""
    
    # 1. Inject Firebase Score Logging 
    template_content = inject_firebase_score_logic(template_content)

    # 2. Use BeautifulSoup to parse and modify the template
    soup = BeautifulSoup(template_content, 'html.parser')
    
    # 3. Update the tags
    if soup.find('title'):
        soup.find('title').string = chapter_name
    if soup.find('h1'):
        soup.find('h1').string = chapter_name
    h2_tag = soup.find('h2', class_='text-2xl')
    if h2_tag:
        h2_tag.string = f"Choose Difficulty for {chapter_name} Chapter"
        
    # 4. Update the JavaScript configuration for SUPABASE_TABLE (New Name)
    script_tag = soup.find_all('script')[-1] 
    script_content = script_tag.string
    
    updated_script_content = re.sub(
        r"const SUPABASE_TABLE = 'sound';", 
        f"const SUPABASE_TABLE = '{table_name}';", # <-- Uses the new descriptive name
        script_content
    )
    script_tag.string = updated_script_content
    
    # 5. Save the new file
    output_path = os.path.join(OUTPUT_DIR_BASE, file_name)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(str(soup))
    
    print(f"✅ Generated quiz file for: {chapter_name} -> {output_path}. Table: '{table_name}'")
    
    # Return the file path relative to the ROOT for the science.html map
    return f"./science/chemistry/{file_name}"

def update_science_html_map(science_html_path, new_chemistry_links):
    """Updates the quizLinkMap in science.html with new chapter links."""
    with open(science_html_path, 'r', encoding='utf-8') as f:
        content = f.read()

    map_start_tag = "// ** THIS BLOCK WILL BE DYNAMICALLY UPDATED BY THE PYTHON SCRIPT **"
    map_end_tag = "// --- END QUIZ NAVIGATION MAP ---"

    start_index = content.find(map_start_tag)
    end_index = content.find(map_end_tag)
    
    if start_index == -1 or end_index == -1:
        print("Error: Dynamic block markers not found in science (2).html. Skipping map update.")
        return

    map_block_content = content[start_index : end_index + len(map_end_tag)]
    
    # Extract existing non-Chemistry links
    existing_links = {}
    for match in re.finditer(r"'([^']+)': '([^']+)',", map_block_content):
        chapter, link = match.groups()
        # Ensure we only keep existing links that are NOT in the 'chemistry' folder
        if 'chemistry' not in link:
             existing_links[chapter] = link
    
    # Combine all links (new chemistry links will overwrite any old chemistry links if they exist)
    all_links = {}
    all_links.update(existing_links)
    all_links.update(new_chemistry_links)
    
    sorted_links = sorted(all_links.items())

    # Construct the new map content (including the JS wrapper)
    new_map_entries = "       const quizLinkMap = {\n"
    for chapter, link in sorted_links:
        # Use .replace to safely handle single quotes in chapter names if they occur
        new_map_entries += f"    '{chapter.replace(\"'\", \"\\'\")}': '{link}',\n"
    new_map_entries += "   };\n"
    
    # Replace the old map block with the new one
    new_map_block = f"{map_start_tag}\n{new_map_entries}        {map_end_tag}"
    
    new_content = content[:start_index] + new_map_block + content[end_index + len(map_end_tag):]

    # Write the updated content back to the main file
    with open(science_html_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
        
    print(f"✅ Successfully updated {science_html_path} with the new quiz map.")


# --- Main Execution ---

def run_chemistry_automation():
    # Set CWD to the repository root for correct relative path resolution
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(os.path.join(script_dir, '..'))
    
    # Check for files relative to the new CWD (root)
    if not os.path.exists(QUIZ_TEMPLATE_PATH):
        raise FileNotFoundError(f"Template file not found: {QUIZ_TEMPLATE_PATH}")
        
    if not os.path.exists(MAIN_SCIENCE_HTML_PATH):
        raise FileNotFoundError(f"Main HTML file not found: {MAIN_SCIENCE_HTML_PATH}")

    with open(QUIZ_TEMPLATE_PATH, 'r', encoding='utf-8') as f:
        template_content = f.read()

    new_quiz_links = {}

    print("--- Starting Chemistry Quiz Generation with Descriptive Table Names ---")
    
    for chapter in CHEMISTRY_CHAPTERS:
        readable_name, table_name, file_name = normalize_chapter_name(chapter)
        
        # 1. Generate the quiz file (returns path relative to root)
        relative_link = generate_quiz_file(
            template_content=template_content,
            chapter_name=chapter,
            file_name=file_name,
            table_name=table_name
        )
        
        # 2. Store the link for the map update
        new_quiz_links[chapter] = relative_link
        
    # 3. Update the main science.html file
    update_science_html_map(MAIN_SCIENCE_HTML_PATH, new_quiz_links)

    print("\n--- Automation Complete for Chemistry ---")

if __name__ == '__main__':
    run_chemistry_automation()
