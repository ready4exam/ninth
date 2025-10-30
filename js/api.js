import { getInitializedClients } from './config.js'; // Import the safe client getter

const QUIZZES_TABLE = 'quizzes';

/**
 * Fetches the required mix of questions (10 MCQ, 5 AR, 5 Case) from the unified 'quizzes' table.
 * * CRITICAL FIX: The database column for filtering by chapter is 'topic_slug', not 'topic'.
 * * This change corrects the query to match the provided schema.
 * @param {string} topicSlug - The topic identifier (e.g., 'motion').
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
        
        // Console log updated to reflect the correct column name 'topic_slug'
        console.log(`[API] Fetching questions from table: ${QUIZZES_TABLE} for topic_slug: '${topicSlug}' and difficulty: ${difficulty}`);

        const questionsToFetch = [
            { type: 'mcq', limit: 10 },
            { type: 'assertion_reasoning', limit: 5 },
            { type: 'case_study', limit: 5 },
        ];

        // Use Promise.all to fetch all types concurrently for speed
        const fetchPromises = questionsToFetch.map(async ({ type, limit }) => {
            // Build the query
            const query = supabase
                .from(QUIZZES_TABLE)
                .select('*')
                // **FIXED HERE: Using 'topic_slug' as per the schema**
                .eq('topic_slug', topicSlug)
                .eq('difficulty', difficulty)
                .eq('question_type', type)
                .limit(limit)
                .order('id', { ascending: true }); // Ensure predictable ordering

            const { data, error } = await query;
            
            if (error) {
                // Log the specific error message from Supabase
                console.error(`Supabase Query Error for ${type}:`, error.message);
                return []; // Return empty array on error to allow other types to load
            }
            console.log(`Fetched ${data.length} ${type} questions.`);
            return data;
        });
        
        const results = await Promise.all(fetchPromises);
        allQuestions = results.flat();

        // Check if we successfully got any questions at all
        if (allQuestions.length === 0) {
            console.warn(`[API WARNING] No questions found for topic '${topicSlug}' at difficulty '${difficulty}'. Returning empty array.`);
            // Throw a new Error if absolutely no questions are found.
            throw new Error(`No questions found for topic '${topicSlug}' at difficulty '${difficulty}'. Check database content.`);
        }

        // Shuffle the combined array for a non-sequential quiz experience
        return allQuestions.sort(() => Math.random() - 0.5);

    } catch (e) {
        console.error("[API FATAL] General error in fetchQuestions:", e);
        // Re-throw a generic, user-friendly error message
        throw e; // Propagate the error up to loadQuiz
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
