import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://fwguhpotzrwlklnrdvpx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Z3VocG90enJ3bGtsbnJkdnB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMzU3MTUsImV4cCI6MjA2NzcxMTcxNX0.sprNAKUIcPphbcvk9Q3ZEvTUmezCkB1yfOr64ksauAM';

export let supabase;
export let currentUserId;

export function initializeSupabase() {
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("Supabase client initialized successfully.");
    } catch (error) {
        console.error("Supabase Initialization Error:", error);
    }
}

export async function authenticateUser() {
    let { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        const { data: signInData } = await supabase.auth.signInAnonymously();
        user = signInData?.user;
    }
    currentUserId = user?.id;
    console.log('Current User ID:', currentUserId);
    return currentUserId;
}

export async function fetchAllRestaurantData() {
    try {
        const { data, error } = await supabase.from('restaurants').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    } catch (err) {
        console.error('Error fetching restaurant data:', err);
        return [];
    }
}

// Add other API-related functions (fetchComments, postComment, etc.) here...
