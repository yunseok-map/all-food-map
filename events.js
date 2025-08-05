/**
 * @file events.js
 * @description 사용자 상호작용(이벤트)을 처리하고, 앱의 주요 로직과 상태를 관리합니다.
 * All user interactions are handled here using event delegation.
 */

import * as api from './api.js';
import * as ui from './ui.js';
import { sikdaeCategoryOrder, gangnamCategoryOrder, pubCategoryOrder, COMMENTS_PER_PAGE } from './config.js';
import { fetchAndRenderReviews, renderStarRatingInput, createRestaurantCard } from './restaurantCard.js';

let allRestaurantsData = [];
let generalCommentsCurrentPage = 1;
let restaurantCommentsCurrentPage = 1;

// 라이트박스 상태 변수
let lightboxImages = [];
let currentLightboxIndex = 0;
let lightboxZoom = 1;


// --- Initialization ---

export async function initializeApp() {
    api.initializeSupabase();
    await api.authenticateUser();
    ui.initializeUI();
    initializeEventListeners();
    allRestaurantsData = await api.fetchAllRestaurantData();
    loadInitialData();
    setupRealtimeSubscriptions();
}

function initializeEventListeners() {
    // 정적 요소 이벤트 리스너
    const menuContainer = document.getElementById('menu-container');
    menuContainer.addEventListener('mouseenter', () => document.getElementById('menu-panel').classList.add('open'));
    menuContainer.addEventListener('mouseleave', () => document.getElementById('menu-panel').classList.remove('open'));

    document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => {
        ui.switchTab(btn.dataset.tab);
        document.getElementById('menu-panel').classList.remove('open');
    }));

    document.querySelectorAll('.sub-tab-btn').forEach(btn => btn.addEventListener('click', () => {
        ui.switchSubTab(btn.dataset.subTab);
        updateListForActiveTab();
    }));

    document.getElementById('aurora-toggle-btn').addEventListener('click', ui.toggleAuroraMode);
    document.getElementById('community-draw-btn').addEventListener('click', handleDrawButtonClick);
    
    document.getElementById('notification-bell-icon').addEventListener('click', handleNotificationBellClick);

    // 라이트박스 이벤트 리스너
    document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
    document.getElementById('lightbox-prev').addEventListener('click', showPrevLightboxImage);
    document.getElementById('lightbox-next').addEventListener('click', showNextLightboxImage);
    document.getElementById('image-lightbox').addEventListener('click', (e) => {
        if (e.target.id === 'image-lightbox') {
            closeLightbox();
        }
    });
    document.getElementById('lightbox-image').addEventListener('wheel', handleLightboxZoom);
    document.addEventListener('keydown', handleLightboxKeyPress);

    // 동적 콘텐츠에 대한 이벤트 위임
    document.querySelector('body').addEventListener('click', handleDynamicContentClick);
    
    // AI 추천 및 필터링 리스너
    ['sikdae', 'gangnam', 'pub'].forEach(pageType => {
        setupAiButtonListener(pageType);
        setupFilterListeners(pageType, updateListForActiveTab);
    });
}

async function loadInitialData() {
    updateSikdaeList();
    updateGangnamList();
    updatePubList();
    fetchAndRenderBoardComments('general_comments', 1);
    fetchAndRenderBoardComments('restaurant_comments', 1);
    
    const banner = document.getElementById('special-day-banner');
    const bannerText = document.getElementById('special-day-text');
    const { data: nextSpecialDay, error } = await api.fetchNextSpecialDay();
    
    if (error) {
        console.error("Error fetching special day:", error.message);
        banner.classList.add('hidden');
    } else if (nextSpecialDay && nextSpecialDay.title) {
        const description = nextSpecialDay.description || '';
        bannerText.textContent = `다음 기념일은 ${nextSpecialDay.date_md} [${nextSpecialDay.title}] ${description}`;
        banner.classList.remove('hidden');
    } else {
        bannerText.textContent = "다음 기념일을 준비 중입니다~~";
        banner.classList.remove('hidden');
    }
}

function setupRealtimeSubscriptions() {
    api.setupSubscription('comments', () => {
        fetchAndRenderBoardComments('general_comments', generalCommentsCurrentPage);
        fetchAndRenderBoardComments('restaurant_comments', restaurantCommentsCurrentPage);
    });
    api.setupSubscription('restaurant_reviews', (payload) => {
        const restaurantId = payload.new.restaurant_id || payload.old.restaurant_id;
        if (restaurantId) {
            const reviewsList = document.querySelector(`[data-restaurant-id="${restaurantId}"] .reviews-list`);
            if (reviewsList) {
                fetchAndRenderReviews(restaurantId, reviewsList);
            }
        }
    });
    // '좋아요'/'싫어요' 변경이 감지되면 updateCardInteraction 함수를 호출
    api.setupSubscription('user_place_interactions', (payload) => {
        console.log('Realtime update received:', payload); // 실시간 신호 수신 확인용 로그
        const record = payload.new.id ? payload.new : payload.old;
        if (record && record.place_id && record.place_type) {
            updateCardInteraction(record.place_id, record.place_type);
        }
    });
    api.setupPresence(userCount => {
        const counter = document.getElementById('presence-counter');
        if (counter) counter.textContent = `현재 ${userCount}명 접속 중`;
    });
}

// --- 중앙 이벤트 핸들러 (이벤트 위임) ---

async function handleDynamicContentClick(e) {
    // ... (다른 이벤트 핸들러들은 이전과 동일) ...

    // 5. 상호작용 버튼 (좋아요/싫어요)
    const interactionBtn = e.target.closest('.like-button, .dislike-button');
    if (interactionBtn) {
        const type = interactionBtn.classList.contains('like-button') ? 'like' : 'dislike';
        await handleInteraction(interactionBtn, type);
        return;
    }
    // ... (다른 이벤트 핸들러들은 이전과 동일) ...
}

// --- 핸들러 구현 ---

// *** FIX: handleInteraction 함수를 DB 작업만 하도록 단순화 ***
async function handleInteraction(button, interactionType) {
    if (!api.currentUserId) return ui.showCustomConfirm('로그인이 필요합니다.');
    button.disabled = true; // 중복 클릭 방지
    const placeId = button.dataset.placeId;
    const placeType = button.dataset.placeType;

    try {
        const { data: existing } = await api.supabase
            .from('user_place_interactions')
            .select('id, interaction_type')
            .eq('user_id', api.currentUserId)
            .eq('place_id', placeId)
            .eq('place_type', placeType)
            .single();
        
        if (existing) {
            if (existing.interaction_type === interactionType) {
                if (await ui.showCustomConfirm('취소하시겠습니까?')) {
                    await api.supabase.from('user_place_interactions').delete().eq('id', existing.id);
                }
            } else {
                if (await ui.showCustomConfirm('변경하시겠습니까?')) {
                    await api.supabase.from('user_place_interactions').update({ interaction_type: interactionType }).eq('id', existing.id);
                }
            }
        } else {
            await api.supabase.from('user_place_interactions').insert({ user_id: api.currentUserId, place_id: placeId, place_type: placeType, interaction_type: interactionType });
        }
    } catch (error) {
        console.error("Interaction Error:", error);
    } finally {
        // UI 업데이트는 실시간 구독 기능이 처리하므로, 여기서는 버튼만 다시 활성화합니다.
        // 바로 활성화하면 DB 반영 전에 또 누를 수 있으므로 약간의 딜레이를 줍니다.
        setTimeout(() => {
            button.disabled = false;
        }, 500);
    }
}


// *** FIX: 특정 카드 UI만 업데이트하는 함수 (안정성 개선) ***
async function updateCardInteraction(placeId, placeType) {
    try {
        // 1. 최신 '좋아요'/'싫어요' 개수 가져오기
        const { data: updatedCounts, error: countError } = await api.supabase
            .from('user_place_interactions')
            .select('interaction_type', { count: 'exact' })
            .eq('place_id', placeId)
            .eq('place_type', placeType);

        if (countError) throw countError;

        const likes = updatedCounts.filter(i => i.interaction_type === 'like').length;
        const dislikes = updatedCounts.filter(i => i.interaction_type === 'dislike').length;

        // 2. 현재 사용자의 상호작용 정보 가져오기 (버튼 색상 변경용)
        const { data: userInteraction, error: userInteractionError } = await api.supabase
            .from('user_place_interactions')
            .select('interaction_type')
            .eq('user_id', api.currentUserId)
            .eq('place_id', placeId)
            .eq('place_type', placeType)
            .single();
        
        // single()은 데이터가 없으면 에러를 발생시키므로, 에러를 정상 처리합니다.
        if (userInteractionError && userInteractionError.code !== 'PGRST116') {
            throw userInteractionError;
        }
    
        // 3. 페이지에 있는 모든 관련 카드를 찾아서 UI 업데이트
        const cardsToUpdate = document.querySelectorAll(`[data-restaurant-id="${placeId}"]`);
        
        for (const card of cardsToUpdate) {
            const likeCountSpan = card.querySelector('.like-count');
            const dislikeCountSpan = card.querySelector('.dislike-count');
            const likeButton = card.querySelector('.like-button');
            const dislikeButton = card.querySelector('.dislike-button');
            const headerLikeCountSpan = card.querySelector('.header-like-count');
            const headerDislikeCountSpan = card.querySelector('.header-dislike-count');

            // 버튼 안의 숫자 업데이트
            if (likeCountSpan) likeCountSpan.textContent = likes;
            if (dislikeCountSpan) dislikeCountSpan.textContent = dislikes;
            
            // 카드 헤더의 숫자도 업데이트
            if (headerLikeCountSpan) headerLikeCountSpan.textContent = ` ${likes}`;
            if (headerDislikeCountSpan) headerDislikeCountSpan.textContent = ` ${dislikes}`;

            // 버튼 스타일 업데이트
            if (likeButton && dislikeButton) {
                const isLiked = userInteraction?.interaction_type === 'like';
                const isDisliked = userInteraction?.interaction_type === 'dislike';

                likeButton.className = `flex items-center space-x-1 px-3 py-1 rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 ${isLiked ? 'bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`;
                dislikeButton.className = `flex items-center space-x-1 px-3 py-1 rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 ${isDisliked ? 'bg-red-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`;
            }
        }
    } catch (error) {
        console.error('Failed to update card interaction UI:', error);
    }
}

// ... (나머지 모든 함수는 이전과 동일하게 유지) ...
// (handleDrawButtonClick, handleBoardTabClick, postReview 등 모든 함수는 여기에 그대로 있어야 합니다)

// --- (이 아래로 나머지 모든 함수들을 붙여넣으세요) ---
// (이전 코드에서 복사해서 사용하시면 됩니다)

// --- 개별 이벤트 핸들러 ---

function handleSlider(button) {
    const track = button.closest('.slider-container').querySelector('.slider-track');
    const slides = track.querySelectorAll('.slider-slide');
    const totalSlides = slides.length;
    let currentIndex = parseInt(track.dataset.currentSlide || 0);

    if (button.classList.contains('next')) {
        currentIndex = (currentIndex + 1) % totalSlides;
    } else {
        currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
    }

    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    track.dataset.currentSlide = currentIndex;
}

async function handleReviewEvents(e) {
    const postReviewBtn = e.target.closest('.post-review-btn');
    if (postReviewBtn) {
        await postReview(postReviewBtn);
        return true;
    }
    const deleteReviewBtn = e.target.closest('.review-delete-btn');
    if (deleteReviewBtn) {
        await deleteReview(deleteReviewBtn);
        return true;
    }
    const stars = e.target.closest('.stars-input span');
    if (stars) {
        handleStarClick(stars);
        return true;
    }
    return false;
}

async function handleBoardEvents(e) {
    const boardTab = e.target.closest('.board-tab');
    if (boardTab) {
        handleBoardTabClick(boardTab);
        return true;
    }
    const postCommentBtn = e.target.closest('#general-comment-post-btn, #restaurant-comment-post-btn');
    if (postCommentBtn) {
        await postBoardComment(postCommentBtn);
        return true;
    }
    const deleteCommentBtn = e.target.closest('.comment-delete-btn');
    if(deleteCommentBtn) {
        await deleteComment(deleteCommentBtn);
        return true;
    }
    const replyBtn = e.target.closest('.reply-btn');
    if(replyBtn) {
        const form = replyBtn.closest('.comment-item').querySelector('.reply-form-container');
        form?.classList.toggle('open');
        return true;
    }
    const postReplyBtn = e.target.closest('.post-reply-btn');
    if(postReplyBtn) {
        await postBoardComment(postReplyBtn, true);
        return true;
    }
    const paginationBtn = e.target.closest('.pagination-btn');
    if(paginationBtn) {
        const page = parseInt(paginationBtn.dataset.page);
        const boardType = paginationBtn.dataset.boardType;
        if (boardType === 'general_comments') generalCommentsCurrentPage = page;
        else restaurantCommentsCurrentPage = page;
        await fetchAndRenderBoardComments(boardType, page);
        return true;
    }
    return false;
}


// --- 핸들러 구현 ---

async function handleDrawButtonClick(e) {
    const btn = e.currentTarget;
    const resultContainer = document.getElementById('community-result-container');
    btn.disabled = true;
    resultContainer.innerHTML = '<p class="text-lg theme-text-subtitle col-span-2 text-center">오늘의 운명을 뽑는 중... 🎲</p>';

    if (allRestaurantsData.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const restaurants = allRestaurantsData.filter(item => item.source_tab !== 'pub');
    if (restaurants.length < 2) {
        resultContainer.innerHTML = '<p class="col-span-2 text-center">추천할 맛집이 부족해요. 😢</p>';
        btn.disabled = false;
        return;
    }

    const selected = [...restaurants].sort(() => 0.5 - Math.random()).slice(0, 2);
    resultContainer.innerHTML = '';

    const placeIds = selected.map(r => r.id);
    const { data: interactions } = await api.fetchInteractions(placeIds, 'community');
    const interactionsMap = new Map();

    if (interactions) {
        interactions.forEach(interaction => {
            if (!interactionsMap.has(interaction.place_id)) {
                interactionsMap.set(interaction.place_id, { likes: 0, dislikes: 0, currentUserInteraction: null });
            }
            const counts = interactionsMap.get(interaction.place_id);
            if (interaction.interaction_type === 'like') counts.likes++;
            else if (interaction.interaction_type === 'dislike') counts.dislikes++;
            if (api.currentUserId && interaction.user_id === api.currentUserId) {
                counts.currentUserInteraction = interaction.interaction_type;
            }
        });
    }

    selected.forEach((r, index) => {
        const interactionData = interactionsMap.get(r.id) || { likes: 0, dislikes: 0, currentUserInteraction: null };
        const card = createRestaurantCard(r, 'community', interactionData);
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('card-enter');
        resultContainer.appendChild(card);
    });

    btn.disabled = false;
}


function handleBoardTabClick(tab) {
    document.querySelectorAll('.board-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const boardType = tab.dataset.board;
    document.querySelectorAll('.board-content').forEach(content => {
        content.classList.toggle('hidden', content.id !== `${boardType}-board-content`);
    });
}

async function postReview(button) {
    const reviewSection = button.closest('.review-section');
    const restaurantId = button.dataset.restaurantId;
    const nicknameInput = reviewSection.querySelector('.review-nickname-input');
    const reviewTextInput = reviewSection.querySelector('.review-text-input');
    const starsInputContainer = reviewSection.querySelector('.stars-input');
    
    const nickname = nicknameInput.value.trim();
    const reviewText = reviewTextInput.value.trim();
    const rating = parseInt(starsInputContainer.dataset.currentRating || 0);

    if (!reviewText || rating === 0) return alert('별점과 한줄평을 모두 입력해주세요.');
    
    await api.postReview({ restaurant_id: restaurantId, nickname: nickname || '익명', rating, review_text: reviewText, user_id: api.currentUserId });
    
    nicknameInput.value = '';
    reviewTextInput.value = '';
    renderStarRatingInput(starsInputContainer, restaurantId);
    await fetchAndRenderReviews(restaurantId, reviewSection.querySelector('.reviews-list'));
}

async function deleteReview(button) {
    const reviewId = button.dataset.reviewId;
    const card = button.closest('[data-restaurant-id]');
    const restaurantId = card.dataset.restaurantId;
    if (await ui.showCustomConfirm('정말로 이 리뷰를 삭제하시겠습니까?')) {
        await api.deleteReviewAPI(reviewId);
        await fetchAndRenderReviews(restaurantId, card.querySelector('.reviews-list'));
    }
}

function handleStarClick(starElement) {
    const container = starElement.parentElement;
    const rating = starElement.dataset.rating;
    container.dataset.currentRating = rating;
    container.querySelectorAll('span').forEach((star, index) => {
        star.classList.toggle('text-yellow-400', index < rating);
        star.classList.toggle('text-gray-400', index >= rating);
    });
}

async function fetchAndRenderBoardComments(boardType, page) {
    const listEl = document.getElementById(`${boardType.split('_')[0]}-comment-list`);
    if (!listEl) return;
    const from = (page - 1) * COMMENTS_PER_PAGE;
    const to = from + COMMENTS_PER_PAGE - 1;
    const { data, error, count } = await api.fetchComments(boardType, from, to);
    if (error) return listEl.innerHTML = `<p>오류: ${error.message}</p>`;

    const rootCommentIds = data.map(c => c.id);
    const { data: replies } = rootCommentIds.length > 0 ? await api.fetchReplies(rootCommentIds) : { data: [] };
    
    listEl.innerHTML = data.length === 0 ? '<p class="text-center theme-text-subtitle">첫 댓글을 남겨보세요!</p>' : '';
    data.forEach(comment => {
        const commentReplies = replies.filter(r => r.parent_id === comment.id);
        const commentEl = ui.renderComment(comment, commentReplies);
        listEl.appendChild(commentEl);
    });
    ui.renderPaginationControls(boardType, count, page, COMMENTS_PER_PAGE);
}

async function postBoardComment(button, isReply = false) {
    const form = button.closest(isReply ? '.reply-form-container' : '.comment-form');
    const boardContent = button.closest('.board-content');
    
    const boardType = boardContent.id.startsWith('general') ? 'general_comments' : 'restaurant_comments';
    const nickInput = form.querySelector(isReply ? '.reply-nickname-input' : `#${boardType.split('_')[0]}-nickname-input`);
    const commentInput = form.querySelector(isReply ? '.reply-text-input' : `#${boardType.split('_')[0]}-comment-input`);
    const parentId = isReply ? button.closest('.comment-item').dataset.commentId : null;
    
    const text = commentInput.value.trim();
    if (text) {
        await api.postCommentAPI({ nickname: nickInput.value.trim() || '익명', text, parent_id: parentId, board_type: boardType, user_id: api.currentUserId });
        commentInput.value = '';
        if (isReply) form.classList.remove('open');
    }
}

async function deleteComment(button) {
    const commentItem = button.closest('.comment-item');
    const commentId = commentItem.dataset.commentId;
    if (await ui.showCustomConfirm('정말로 이 댓글을 삭제하시겠습니까?')) {
        await api.deleteCommentAPI(commentId);
    }
}

function handleNotificationBellClick() {
    const panel = document.getElementById('notification-panel');
    panel.classList.toggle('open');
}

// --- 라이트박스 함수 ---
function openLightbox(images, startIndex) {
    const lightbox = document.getElementById('image-lightbox');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');

    lightboxImages = images;
    currentLightboxIndex = startIndex;
    lightboxZoom = 1;

    if (lightboxImages.length <= 1) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    } else {
        prevBtn.style.display = 'block';
        nextBtn.style.display = 'block';
    }

    updateLightboxImage();
    lightbox.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    const lightbox = document.getElementById('image-lightbox');
    lightbox.classList.add('hidden');
    const img = document.getElementById('lightbox-image');
    img.style.transform = 'scale(1)';
    document.body.style.overflow = '';
}

function updateLightboxImage() {
    const img = document.getElementById('lightbox-image');
    img.src = lightboxImages[currentLightboxIndex];
    img.style.transform = 'scale(1)';
    lightboxZoom = 1;
}

function showNextLightboxImage() {
    if (lightboxImages.length === 0) return;
    currentLightboxIndex = (currentLightboxIndex + 1) % lightboxImages.length;
    updateLightboxImage();
}

function showPrevLightboxImage() {
    if (lightboxImages.length === 0) return;
    currentLightboxIndex = (currentLightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
    updateLightboxImage();
}

function handleLightboxZoom(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    lightboxZoom = Math.max(0.5, Math.min(3, lightboxZoom + delta));
    document.getElementById('lightbox-image').style.transform = `scale(${lightboxZoom})`;
}

function handleLightboxKeyPress(e) {
    const lightbox = document.getElementById('image-lightbox');
    if (lightbox.classList.contains('hidden')) {
        return;
    }

    if (e.key === 'Escape') {
        closeLightbox();
    } else if (e.key === 'ArrowRight') {
        showNextLightboxImage();
    } else if (e.key === 'ArrowLeft') {
        showPrevLightboxImage();
    }
}


// --- UI 업데이트 헬퍼 ---

function updateListForActiveTab() {
    const activeSubTab = document.querySelector('.sub-tab-btn.active')?.dataset.subTab;
    if (!activeSubTab) return;
    if (activeSubTab === 'sikdae') updateSikdaeList();
    if (activeSubTab === 'gangnam') updateGangnamList();
    if (activeSubTab === 'pub') updatePubList();
}

const updateSikdaeList = () => {
    const search = document.getElementById('sikdae-search-input').value;
    const price = document.getElementById('sikdae-price-filter').value;
    const sort = document.getElementById('sikdae-sort-order').value;
    ui.renderRestaurantList(document.getElementById('sikdae-restaurant-sections'), allRestaurantsData.filter(r => r.source_tab === 'sikdae'), sikdaeCategoryOrder, 'sikdae', search, price, sort);
};

const updateGangnamList = () => {
    const search = document.getElementById('gangnam-search-input').value;
    const price = document.getElementById('gangnam-price-filter').value;
    const sort = document.getElementById('gangnam-sort-order').value;
    ui.renderRestaurantList(document.getElementById('gangnam-restaurant-sections'), allRestaurantsData.filter(r => r.source_tab === 'gangnam'), gangnamCategoryOrder, 'gangnam', search, price, sort);
};

const updatePubList = () => {
    const search = document.getElementById('pub-search-input').value;
    const price = document.getElementById('pub-price-filter').value;
    const sort = document.getElementById('pub-sort-order').value;
    ui.renderRestaurantList(document.getElementById('pub-restaurant-sections'), allRestaurantsData.filter(r => r.source_tab === 'pub'), pubCategoryOrder, 'pub', search, price, sort);
};

function setupAiButtonListener(pageType) {
    const btn = document.getElementById(`${pageType}-ai-recommend-btn`);
    const promptInput = document.getElementById(`${pageType}-ai-prompt-input`);
    const resultContainer = document.getElementById(`${pageType}-ai-result-container`);
    if(!btn || !promptInput || !resultContainer) return;

    const recommend = async () => {
        const prompt = promptInput.value.trim();
        if (!prompt) {
            resultContainer.innerHTML = '<p>추천받고 싶은 음식이나 상황을 입력해주세요!</p>';
            return;
        }
        btn.innerHTML = '🤖 생각 중...';
        btn.disabled = true;
        resultContainer.innerHTML = '<p>최적의 맛집을 찾고 있어요...</p>';
        
        const recommendationHtml = await api.getAiRecommendation(prompt, allRestaurantsData.filter(r => r.source_tab === pageType));
        resultContainer.innerHTML = recommendationHtml;

        btn.innerHTML = '추천받기';
        btn.disabled = false;
    };

    btn.addEventListener('click', recommend);
    promptInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') recommend();
    });
}

function setupFilterListeners(pageType, updateFunction) {
    const searchInput = document.getElementById(`${pageType}-search-input`);
    const priceFilter = document.getElementById(`${pageType}-price-filter`);
    const sortOrder = document.getElementById(`${pageType}-sort-order`);
    if(searchInput) searchInput.addEventListener('input', updateFunction);

    if(priceFilter) priceFilter.addEventListener('change', updateFunction);
    if(sortOrder) sortOrder.addEventListener('change', updateFunction);
}
