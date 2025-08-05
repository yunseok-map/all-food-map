import { supabase, initializeSupabase } from './api.js';
import { 
    initializeUI, 
    renderRestaurantList, 
    fetchAndRenderBoardComments, 
    switchTab, 
    updateSikdaeList,
    updateGangnamList,
    updatePubList
} from './ui.js';

// Initialize Supabase
initializeSupabase();

// DOMContentLoaded event listener to initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    if (!supabase) {
        document.getElementById('community-content').innerHTML = `<div class="text-center p-8 theme-bg-header rounded-lg shadow-lg"><h2 class="text-2xl font-bold theme-text-header mb-4">Supabase 연결 오류</h2><p class="theme-text-subtitle">Supabase URL 또는 키를 확인해주세요.</p></div>`;
        return;
    }

    // Initialize UI components and event listeners
    initializeUI();

    // Initial Load
    switchTab('community');
    updateSikdaeList();
    updateGangnamList();
    updatePubList();
    fetchAndRenderBoardComments('general_comments', document.getElementById('general-comment-list'), 1);
    fetchAndRenderBoardComments('restaurant_comments', document.getElementById('restaurant-comment-list'), 1);
});
