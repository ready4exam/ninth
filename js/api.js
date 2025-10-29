
// js/api.js
// Data Access Layer: Handles all fetching from Supabase and saving to Firestore.

// Define a placeholder for the application ID for public data paths (optional for now)
const APP_ID = "ready4exam";

/**
 * Maps URL topic names to Supabase table names.
 * For example, 'atoms_and_molecules' in the URL maps to 'atoms_molecules' table.
 * If the names match, the mapping is implied.
 */
const TABLE_MAP = {
    'atoms_and_molecules': 'atoms_molecules',
    // Add more complex mappings here as needed.
};

/**
 * Fetches quiz questions from the specified Supabase table based on topic and difficulty.
 * @param {string} topic - The topic name from the URL (e.g., 'gravitation').
 * @param {string} difficulty - The difficulty level (e.g., 'Simple', 'Medium', 'Advanced').
 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of question objects.
 */
export async function fetchQuestions(topic, difficulty) {
    // 1. Determine the actual Supabase table name
    const tableName = TABLE_MAP[topic] || topic.toLowerCase();
    
    console.log(`[API] Fetching questions from table: '${tableName}' for difficulty: ${difficulty}`);

    try {
        // Assume 'supabase' client is globally available via js/config.js
        const { data, error } = await window.supabase
            .from(tableName)
            .select('*')
            // Filter by difficulty column (assuming it's named 'difficulty')
            .eq('difficulty', difficulty)
            // Limit to a reasonable number, e.g., 20 questions
            .limit(20); 

        if (error) {
            console.error("[API ERROR] Supabase fetch failed:", error);
            throw new Error(`Failed to fetch questions for ${topic}: ${error.message}`);
        }
        
        // Shuffle the questions before returning
        const shuffledData = data.sort(() => 0.5 - Math.random());
        return shuffledData;

    } catch (e) {
        console.error("[API FATAL] General error in fetchQuestions:", e);
        // Return empty array to gracefully handle UI failure
        return []; 
    }
}

/**
 * Counts available questions for a given topic and difficulty.
 * @param {string} topic 
 * @param {string} difficulty 
 * @returns {Promise<number>} - The count of questions.
 */
export async function countQuestions(topic, difficulty) {
    const tableName = TABLE_MAP[topic] || topic.toLowerCase();

    try {
        const { count, error } = await window.supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true })
            .eq('difficulty', difficulty);

        if (error) {
             console.error(`[API ERROR] Supabase count failed for ${topic}/${difficulty}:`, error);
             return 0;
        }
        return count || 0;

    } catch (e) {
        console.error(`[API FATAL] General error in countQuestions for ${topic}/${difficulty}:`, e);
        return 0;
    }
}


/**
 * Saves the user's quiz result to Firestore.
 * @param {string} userId - The Firebase User ID.
 * @param {string} topic - The quiz topic.
 * @param {string} difficulty - The difficulty level.
 * @param {number} score - The number of correct answers.
 * @param {number} total - The total number of questions.
 */
export async function saveResult(userId, topic, difficulty, score, total) {
    if (!window.db || !userId) {
        console.warn("[API] Cannot save result: Firestore not initialized or user not logged in.");
        return;
    }

    try {
        // Firestore Path: /artifacts/{APP_ID}/users/{userId}/quiz_results
        const collectionPath = `artifacts/${APP_ID}/users/${userId}/quiz_results`;
        
        await window.db.collection(collectionPath).add({
            userId: userId,
            topic: topic,
            difficulty: difficulty,
            score: score,
            total: total,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`[API] Quiz result saved successfully for user ${userId}. Score: ${score}/${total}`);
        
    } catch (e) {
        console.error("[API ERROR] Failed to save result to Firestore:", e);
        // In a real app, you might display an error to the user here.
    }
}
