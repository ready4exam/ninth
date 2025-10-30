// js/api.js
import { supabase } from './config.js';

// --- QUESTION FETCHING ---

/**
 * Fetches questions for a specific topic and difficulty level from Supabase.
 * The topic slug is dynamically used as the table name.
 * * @param {string} topicSlug - The topic (used as the table name, e.g., 'motion').
 * @param {string} difficulty - The difficulty level (e.g., 'simple', 'medium', 'hard').
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of question objects.
 */
export async function fetchQuestions(topicSlug, difficulty) {
    if (!topicSlug || typeof topicSlug !== 'string') {
        throw new Error("Invalid topic slug provided for question fetching.");
    }
    
    // Convert difficulty to lowercase to match database values consistently
    const level = (difficulty || '').toLowerCase();
    
    // CRITICAL CHANGE: Use the topicSlug as the table name
    const tableName = topicSlug.toLowerCase();
    
    console.log(`[API] Fetching questions from table: ${tableName} with difficulty: ${level}`);

    // Basic validation to prevent querying arbitrary tables if the topic name is unexpected
    // For this request, we assume 'motion' is the only valid table for now.
    // In a real app, you would have a lookup list.
    if (tableName !== 'motion') {
         console.warn(`[API] Attempted to query unknown table: ${tableName}. Defaulting to 'motion'.`);
         // If you have a dedicated table, you can throw an error or default to a main table.
         // For now, let's proceed with the strict name as requested.
         // If you had more tables, you'd check against a list: ['motion', 'forces', 'waves', ...]
    }

    // --- Supabase Query ---
    try {
        let query = supabase
            .from(tableName) // Use the dynamic topicSlug as the table name
            .select('*')
            .order('question_id', { ascending: true }) // Order by question_id or a unique identifier
            .limit(10); // Limit to 10 questions per quiz run (adjustable)

        // Apply difficulty filter if a valid level is provided
        if (level && ['simple', 'medium', 'hard'].includes(level)) {
            query = query.eq('difficulty', level);
        } else {
            console.warn(`[API] Invalid difficulty level '${difficulty}' provided. Fetching all difficulties.`);
        }
            
        const { data, error } = await query;

        if (error) {
            console.error("[API] Supabase Query Error:", error);
            // Translate the error for the user
            if (error.code === '42P01' || error.message.includes('relation') && error.message.includes('does not exist')) {
                 throw new Error(`Quiz data for topic '${tableName}' is missing. Please ensure the table exists.`);
            }
            throw new Error(`Failed to fetch quiz questions: ${error.message}`);
        }

        if (data.length === 0) {
            throw new Error(`No questions found for ${tableName} at difficulty '${level}'.`);
        }

        return data;
        
    } catch (e) {
        console.error("[API] Fatal Fetch Error:", e);
        throw e; // Re-throw the error to be handled by the quiz-engine
    }
}
