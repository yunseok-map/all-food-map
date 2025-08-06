/**
 * @file api.js
 * @description Supabase 및 외부 API와의 모든 통신을 담당합니다.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY, GEMINI_API_KEY } from './config.js';

export let supabase;
export let currentUserId;

/**
 * Supabase 클라이언트를 초기화합니다.
 */
export function initializeSupabase() {
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("Supabase client initialized successfully.");
    } catch (error) {
        console.error("Supabase Initialization Error:", error);
    }
}

/**
 * 사용자를 익명으로 인증하고 사용자 ID를 설정합니다.
 * @returns {Promise<string>} 현재 사용자의 ID
 */
export async function authenticateUser() {
    if (!supabase) return;
    let { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        const { data: signInData } = await supabase.auth.signInAnonymously();
        user = signInData?.user;
    }
    currentUserId = user?.id;
    console.log('Current User ID:', currentUserId);
    return currentUserId;
}

/**
 * 모든 맛집 데이터를 가져옵니다.
 * @returns {Promise<Array>} 맛집 데이터 배열
 */
export const fetchAllRestaurantData = async () => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('restaurants').select('*').order('created_at', { ascending: false });
    if (error) {
        console.error('Error fetching restaurants:', error);
        return [];
    }
    return data;
};

/**
 * 특정 장소 목록에 대한 사용자 인터랙션(좋아요/싫어요) 데이터를 가져옵니다.
 * @param {Array<string>} placeIds - 장소 ID 배열
 * @param {string} pageType - 페이지 타입 ('sikdae', 'gangnam', 'pub')
 * @returns {Promise<Object>} Supabase 응답 객체
 */
export const fetchInteractions = (placeIds, pageType) => {
    if (!supabase) return Promise.resolve({ data: [], error: null });
    return supabase.from('user_place_interactions').select('*').in('place_id', placeIds).eq('place_type', pageType);
}

/**
 * 특정 맛집의 모든 리뷰를 가져옵니다.
 * @param {string} restaurantId - 맛집 ID
 * @returns {Promise<Object>} Supabase 응답 객체
 */
export const fetchReviews = (restaurantId) => {
    if (!supabase) return Promise.resolve({ data: [], error: null });
    return supabase.from('restaurant_reviews').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false });
}

/**
 * 새로운 리뷰를 등록합니다.
 * @param {Object} reviewData - 리뷰 데이터
 * @returns {Promise<Object>} Supabase 응답 객체
 */
export const postReview = (reviewData) => {
    if (!supabase) return Promise.resolve({ data: null, error: { message: 'Supabase not initialized' } });
    return supabase.from('restaurant_reviews').insert([reviewData]).select();
}

/**
 * 리뷰를 삭제합니다.
 * @param {string} reviewId - 리뷰 ID
 * @returns {Promise<Object>} Supabase 응답 객체
 */
export const deleteReviewAPI = (reviewId) => {
    if (!supabase) return Promise.resolve({ error: { message: 'Supabase not initialized' } });
    return supabase.from('restaurant_reviews').delete().eq('id', reviewId);
}

/**
 * 특정 게시판의 댓글들을 페이지네이션하여 가져옵니다.
 * @param {string} boardType - 게시판 타입
 * @param {number} from - 시작 인덱스
 * @param {number} to - 끝 인덱스
 * @returns {Promise<Object>} Supabase 응답 객체 (count 포함)
 */
export const fetchComments = (boardType, from, to) => {
    if (!supabase) return Promise.resolve({ data: [], error: null, count: 0 });
    return supabase.from('comments').select('*', { count: 'exact' }).eq('board_type', boardType).is('parent_id', null).order('created_at', { ascending: false }).range(from, to);
}

/**
 * 부모 댓글에 속한 모든 답글들을 가져옵니다.
 * @param {Array<string>} rootCommentIds - 부모 댓글 ID 배열
 * @returns {Promise<Object>} Supabase 응답 객체
 */
export const fetchReplies = (rootCommentIds) => {
    if (!supabase) return Promise.resolve({ data: [], error: null });
    return supabase.from('comments').select('*').in('parent_id', rootCommentIds).order('created_at', { ascending: true });
}

/**
 * 새로운 댓글을 등록합니다.
 * @param {Object} commentData - 댓글 데이터
 * @returns {Promise<Object>} Supabase 응답 객체
 */
export const postCommentAPI = (commentData) => {
    if (!supabase) return Promise.resolve({ data: null, error: { message: 'Supabase not initialized' } });
    return supabase.from('comments').insert([commentData]).select();
}

/**
 * 댓글을 삭제합니다.
 * @param {string} commentId - 댓글 ID
 * @returns {Promise<Object>} Supabase 응답 객체
 */
export const deleteCommentAPI = (commentId) => {
    if (!supabase) return Promise.resolve({ error: { message: 'Supabase not initialized' } });
    return supabase.from('comments').delete().eq('id', commentId);
}

/**
 * 다가오는 가장 가까운 기념일을 가져오는 함수
 * @returns {Promise<Object>} Supabase 응답 객체 (가장 가까운 기념일 데이터)
 */
export const fetchNextSpecialDay = async () => {
    if (!supabase) return Promise.resolve({ data: null, error: { message: 'Supabase not initialized' } });

    // *** FIX: 실제 컬럼 이름(title, description)을 사용하도록 수정 ***
    const { data: allDays, error } = await supabase.from('special_days').select('date_md, title, description');
    if (error) return { data: null, error };

    const now = new Date();
    const currentYear = now.getFullYear();
    now.setHours(0, 0, 0, 0); // 시간 정보는 무시

    const upcomingDays = allDays
        .map(day => {
            const [month, date] = day.date_md.split('.').map(Number);
            // 월은 0부터 시작하므로 -1
            const eventDate = new Date(currentYear, month - 1, date);
            
            // 이미 지난 날짜면 내년으로 설정
            if (eventDate < now) {
                eventDate.setFullYear(currentYear + 1);
            }
            return { ...day, eventDate };
        })
        .sort((a, b) => a.eventDate - b.eventDate);

    // 가장 가까운 미래의 이벤트 반환
    return { data: upcomingDays[0] || null, error: null };
};


/**
 * Gemini AI를 통해 맛집 추천을 받습니다.
 * @param {string} prompt - 사용자 입력 프롬프트
 * @param {Array<Object>} data - 맛집 데이터
 * @returns {Promise<string>} HTML 형식의 추천 결과
 */
export async function getAiRecommendation(prompt, data) {
    const simplifiedList = data.map(r => ({ name: r.name, category: r.category ? r.category.split(' ')[0] : '', menu: r.menu, comment: r.comment }));
    const restaurantListString = JSON.stringify(simplifiedList);
    const apiPrompt = `당신은 서울 강남의 직장인들을 위한 맛집 추천 AI입니다. 사용자의 요청에 가장 적합한 식당을 아래 리스트에서 최대 3개까지 추천해주세요. 각 식당을 추천하는 창의적이고 설득력 있는 이유를 함께 제시해야 합니다. 응답은 반드시 HTML <ul> 리스트 형식으로 작성해주세요.\n\n사용자 요청: "${prompt}"\n\n맛집 리스트:\n${restaurantListString}\n\nHTML 응답 예시:\n<ul>\n  <li><strong>식당 이름 1:</strong> 이 식당을 추천하는 재치 있는 이유.</li>\n  <li><strong>식당 이름 2:</strong> 이 식당을 추천하는 또 다른 재치 있는 이유.</li>\n</ul>`;
    
    const chatHistory = [{ role: "user", parts: [{ text: apiPrompt }] }];
    const payload = { contents: chatHistory };
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const result = await response.json();
        if (result.candidates && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
            let text = result.candidates[0].content.parts[0].text;
            return text.replace(/```html/g, '').replace(/```/g, '').trim();
        } else {
            return '<p>추천 맛집을 찾지 못했어요. 다른 키워드로 시도해보세요.</p>';
        }
    } catch (error) {
        console.error("AI Recommendation Error:", error);
        return '<p>오류가 발생했어요. 잠시 후 다시 시도해주세요.</p>';
    }
}

/**
 * 실시간 데이터 변경에 대한 구독을 설정합니다.
 * @param {string} table - 구독할 테이블 이름
 * @param {Function} callback - 변경이 발생했을 때 실행할 콜백 함수
 */
export const setupSubscription = (table, callback) => {
    if (!supabase) return;
    supabase.channel(`public:${table}`).on('postgres_changes', { event: '*', schema: 'public', table }, callback).subscribe();
}

/**
 * 현재 접속자 수에 대한 실시간 구독을 설정합니다.
 * @param {Function} callback - 접속자 수가 변경될 때 실행할 콜백 함수
 */
export const setupPresence = (callback) => {
    if (!supabase) return;
    const presenceChannel = supabase.channel('online-users');
    presenceChannel.on('presence', { event: 'sync' }, () => {
        const userCount = Object.keys(presenceChannel.presenceState()).length;
        callback(userCount);
    }).subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await presenceChannel.track({ online_at: new Date().toISOString() });
    });
};
