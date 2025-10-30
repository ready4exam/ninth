// js/api.js
import { getInitializedClients } from './config.js';
import * as UI from './ui-renderer.js';

// Helper function to get the Supabase client instance
function getSupabaseClient() {
    const { supabase } = getInitializedClients();
    if (!supabase) {
        // This will only happen if the initialization in config.js failed
        throw new Error("Supabase client is not initialized. Check Firebase/Supabase setup in config.js.");
    }
    return supabase;
}

/**
 * Fetches quiz questions based on topic and difficulty from Supabase.
 * @param {string} topic - The database table/collection name (e.g., 'motion').
 * @param {string} difficulty - The difficulty level to filter by (e.g., 'simple').
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of questions.
 */
export async function fetchQuestions(topic, difficulty) {
    const supabase = getSupabaseClient();
    
    // We are using the topic slug as the table name (e.g., 'motion')
    console.log(`[API] Fetching questions for topic: ${topic}, difficulty: ${difficulty}`);

    const { data, error } = await supabase
        .from(topic) 
        .select('*')
        .eq('difficulty', difficulty); // Filter by the requested difficulty

    if (error) {
        console.error("Supabase fetch error:", error);
        UI.updateStatus(`<span class="text-red-500">Database Error:</span> Could not load quiz questions. (Table: ${topic})`);
        throw new Error(error.message);
    }

    if (!data || data.length === 0) {
        const message = `No questions found for topic: ${topic} with difficulty: ${difficulty}.`;
        console.warn(message);
        // Do not throw an error, but let the engine know it received empty data
        UI.updateStatus(`<span class="text-yellow-600">Warning:</span> ${message}`);
    }

    // Sort in memory to avoid needing to create a specific index on 'question_order'
    data.sort((a, b) => (a.question_order || 0) - (b.question_order || 0));

    return data;
}
