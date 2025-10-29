import { getInitializedClients } from './config.js'; // Import the safe client getter

const QUIZZES_TABLE = 'quizzes';

/**
 * Fetches the required mix of questions (10 MCQ, 5 AR, 5 Case) from the unified 'quizzes' table.
 * @param {string} topicSlug - The topic identifier (e.g., 'gravitation').
 * @param {string} difficulty - The difficulty level (e.g., 'medium').
 * @returns {Promise<Array>} - A promise that resolves to an array of raw question objects.
 */
export async function fetchQuestions(topicSlug, difficulty) {
    let allQuestions = [];
    
    try {
        // Safely retrieve the Supabase client
        const { supabase } = getInitializedClients(); 

        if (!supabase) {
            console.error("[API FATAL] Supabase client is not initialized.");
            throw new Error("Supabase client not available.");
        }
        
        console.log(`[API] Fetching questions from table: '${topicSlug}' for difficulty: ${difficulty}`);

        const questionsToFetch = [
            { type: 'mcq', limit: 10 },
            { type: 'assertion_reasoning', limit: 5 },
            { type: 'case_study', limit: 5 },
        ];

        // Use Promise.all to fetch all types concurrently for speed
        const fetchPromises = questionsToFetch.map(async ({ type, limit }) => {
            const { data, error } = await supabase
                .from(QUIZZES_TABLE)
                .select('*')
                .eq('topic_slug', topicSlug)
                .eq('difficulty', difficulty)
                .eq('question_type', type)
                .limit(limit)
                .order('id', { ascending: true }); // Ensure predictable ordering

            if (error) {
                console.error(`Supabase Query Error for ${type}:`, error.message);
                return []; // Return empty array on error to allow other types to load
            }
            console.log(`Fetched ${data.length} ${type} questions.`);
            return data;
        });
        
        const results = await Promise.all(fetchPromises);
        allQuestions = results.flat();

        // Shuffle the combined array for a non-sequential quiz experience
        return allQuestions.sort(() => Math.random() - 0.5);

    } catch (e) {
        console.error("[API FATAL] General error in fetchQuestions:", e);
        // Re-throw a generic, user-friendly error message
        throw new Error("Data retrieval failed due to an internal error."); 
    }
}

// Placeholder functions for other required modules
export async function countQuestions(topicSlug) { 
    // This function would fetch the total count if needed
    return 20; 
}

export async function saveResult(quizResult) { 
    // Implement result saving logic here (e.g., to a 'quiz_results' table)
    console.log("Saving result:", quizResult);
    return { success: true };
}
```eof

### Next Step

1.  Confirm that you have implemented the changes in **`config.js`** to use `document.addEventListener('DOMContentLoaded', initServices)` and export the **`getInitializedClients`** function.
2.  Replace the content of your **`js/api.js`** file with the code above.

This combination ensures the Supabase client is initialized *before* it's accessed, which should finally resolve the `TypeError: Cannot read properties of undefined (reading 'from')` error and allow data to load.
