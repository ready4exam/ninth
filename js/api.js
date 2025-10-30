// js/api.js
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
            // Throw a generic error to the UI
            throw new Error("Data service not ready. Please try refreshing."); 
        }
        
        console.log(`[API] Fetching questions from table: ${QUIZZES_TABLE} for topic: '${topicSlug}' and difficulty: ${difficulty}`);

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
                .eq('topic', topicSlug)
                .eq('difficulty', difficulty)
                .eq('type', type)
                .limit(limit)
                .order('id', { ascending: true }); // Ensure predictable ordering

            if (error) {
                console.error(`Supabase Query Error for ${type}:`, error.message);
                // Return empty array on error
                return []; 
            }
            console.log(`Fetched ${data.length} ${type} questions.`);
            return data;
        });
        
        const results = await Promise.all(fetchPromises);
        allQuestions = results.flat();

        // Check if we successfully got any questions at all
        if (allQuestions.length === 0) {
            // DO NOT throw an error here. Return an empty array.
            console.warn(`[API WARNING] No questions found for topic '${topicSlug}' at difficulty '${difficulty}'. Returning empty array.`);
            return [];
        }

        // Shuffle the combined array for a non-sequential quiz experience
        return allQuestions.sort(() => Math.random() - 0.5);

    } catch (e) {
        console.error("[API FATAL] General error in fetchQuestions:", e);
        // Re-throw if it's a critical error (like Supabase not initialized)
        throw e; 
    }
}

// Placeholder functions for other required modules
export async function countQuestions(topicSlug) { 
    // This function would fetch the total count if needed
    return 20; 
}

export async function saveResult(quizResult) { 
    // Implement result saving logic here (e.g., to a 'quiz_results' table)
    console.log("[API] Saving result:", quizResult);
    // Placeholder implementation
    return { success: true };
}
