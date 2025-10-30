import { getInitializedClients } from './config.js'; // Import the safe client getter

const DEFAULT_QUIZ_TABLE = 'quizzes';

/**
 * Fetches the required mix of questions (10 MCQ, 5 AR, 5 Case) from the appropriate Supabase table.
 * * CRITICAL LOGIC: If topicSlug is 'motion', it queries the dedicated 'motion' table 
 * and applies the 'difficulty' filter, but omits the 'topic_slug' filter.
 * * For all other topics, it queries the 'quizzes' table and applies both 'topic_slug' and 'difficulty' filters.
 * @param {string} topicSlug - The topic identifier (e.g., 'motion').
 * @param {string} difficulty - The difficulty level (e.g., 'medium').
 * @returns {Promise<Array>} - A promise that resolves to an array of raw question objects.
 */
export async function fetchQuestions(topicSlug, difficulty) {
    let allQuestions = [];
    
    try {
        const { supabase } = getInitializedClients(); 

        if (!supabase) {
            console.error("[API FATAL] Supabase client is not initialized.");
            throw new Error("Data service not ready. Please try refreshing."); 
        }

        // --- CORE LOGIC: Determine the table name and filtering strategy ---
        let currentTableName = DEFAULT_QUIZ_TABLE;
        const isMotionChapter = topicSlug === 'motion';

        if (isMotionChapter) {
            currentTableName = 'motion';
            console.log(`[API] Using dedicated table: ${currentTableName} for topic: '${topicSlug}'. Applying DIFFICULTY filter only.`);
        } else {
            console.log(`[API] Fetching questions from table: ${currentTableName} for topic_slug: '${topicSlug}' and difficulty: ${difficulty}`);
        }
        // --- END CORE LOGIC ---

        const questionsToFetch = [
            { type: 'mcq', limit: 10 },
            { type: 'assertion_reasoning', limit: 5 },
            { type: 'case_study', limit: 5 },
        ];

        // Use Promise.all to fetch all types concurrently for speed
        const fetchPromises = questionsToFetch.map(async ({ type, limit }) => {
            
            // 1. Build the base query (always filter by question type and limit)
            let query = supabase
                .from(currentTableName) // Use the determined table name
                .select('*')
                .eq('question_type', type)
                .limit(limit)
                .order('id', { ascending: true }); 

            // 2. Conditionally apply the required filters based on the table/topic
            if (isMotionChapter) {
                // For the dedicated 'motion' table, only apply the difficulty filter
                query = query.eq('difficulty', difficulty);
            } else {
                // For the default 'quizzes' table, apply both topic_slug and difficulty
                query = query.eq('topic_slug', topicSlug);
                query = query.eq('difficulty', difficulty);
            }

            const { data, error } = await query;
            
            if (error) {
                console.error(`Supabase Query Error for ${type} from table ${currentTableName}:`, error.message);
                return []; 
            }
            console.log(`Fetched ${data.length} ${type} questions.`);
            return data;
        });
        
        const results = await Promise.all(fetchPromises);
        allQuestions = results.flat();

        if (allQuestions.length === 0) {
            console.warn(`[API WARNING] No questions found for topic '${topicSlug}' from table '${currentTableName}' at difficulty '${difficulty}'.`);
            throw new Error(`No questions found for topic '${topicSlug}' at difficulty '${difficulty}'. Check database content.`);
        }

        // Shuffle the combined array for a non-sequential quiz experience
        return allQuestions.sort(() => Math.random() - 0.5);

    } catch (e) {
        console.error("[API FATAL] General error in fetchQuestions:", e);
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
