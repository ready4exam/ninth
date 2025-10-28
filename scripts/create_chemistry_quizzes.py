import os
import re
from bs4 import BeautifulSoup

# --- Configuration ---
# Chemistry Chapters (UNIT III)
CHEMISTRY_CHAPTERS = [
    '1. Matter in Our Surroundings',
    '2. Is Matter Around Us Pure',
    '3. Atoms and Molecules',
    '4. Structure of the Atom',
]

# Paths relative to the repository root (assuming CWD is root in GitHub Actions)
QUIZ_TEMPLATE_PATH = 'sound_quiz.html'
MAIN_SCIENCE_HTML_PATH = 'science (2).html'
OUTPUT_DIR_BASE = 'science/chemistry' 

# --- Utility Functions ---

def normalize_chapter_name(chapter_name):
    """
    Converts a chapter name into a Supabase table name (first word) 
    and a unique file name (full name).
    """
    # 1. Remove leading number and dot (e.g., '1. ')
    name = re.sub(r'^\d+\.\s*', '', chapter_name).strip()
    
    # 2. Extract the FIRST WORD for the Supabase Table Name (User Requirement)
    first_word = name.split(' ')[0]
    # Table names are simple, lowercase, first word only
    table_name = first_word.lower().replace('\'', '') 
    
    # 3. Use the FULL chapter name for the File Name (for uniqueness and readability)
    full_name_snake = name.lower().replace(' ', '_').replace('\'', '')
    file_name = f"{full_name_snake}_quiz.html"

    # Examples:
    # '1. Matter in Our Surroundings' -> table_name: 'matter', file_name: 'matter_in_our_surroundings_quiz.html'
    # '3. Atoms and Molecules' -> table_name: 'atoms', file_name: 'atoms_and_molecules_quiz.html'
    
    return name, table_name, file_name


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
        
    # 4. Update the JavaScript configuration for SUPABASE_TABLE (First Word Only)
    script_tag = soup.find_all('script')[-1] 
    script_content = script_tag.string
    
    updated_script_content = re.sub(
        r"const SUPABASE_TABLE = 'sound';", 
        f"const SUPABASE_TABLE = '{table_name}';", # <-- Uses the single word
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
    
    map_block_content = content[start_index : end_index + len(map_end_tag)]
    
    # Extract existing non-Chemistry links
    existing_links = {}
    for match in re.finditer(r"'([^']+)': '([^']+)',", map_block_content):
        chapter, link = match.groups()
        if 'chemistry' not in link:
             existing_links[chapter] = link
    
    # Combine all links 
    all_links = {}
    all_links.update(existing_links)
    all_links.update(new_chemistry_links)
    
    sorted_links = sorted(all_links.items())

    # Construct the new map content (including the JS wrapper)
    new_map_entries = "       const quizLinkMap = {\n"
    for chapter, link in sorted_links:
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
    
    if not os.path.exists(QUIZ_TEMPLATE_PATH):
        raise FileNotFoundError(f"Template file not found: {QUIZ_TEMPLATE_PATH}")
        
    if not os.path.exists(MAIN_SCIENCE_HTML_PATH):
        raise FileNotFoundError(f"Main HTML file not found: {MAIN_SCIENCE_HTML_PATH}")

    with open(QUIZ_TEMPLATE_PATH, 'r', encoding='utf-8') as f:
        template_content = f.read()

    new_quiz_links = {}

    print("--- Starting Chemistry Quiz Generation ---")
    
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
