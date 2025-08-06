/**
 * @file restaurantCard.js
 * @description Creates and manages individual restaurant card components, including reviews and star ratings.
 */

import * as api from './api.js';

/**
 * Creates the main HTML structure for a single restaurant card.
 * @param {object} r - The restaurant data object.
 * @param {string} pageType - The type of page ('sikdae', 'gangnam', 'pub', 'community').
 * @param {object} interactionData - The like/dislike counts and user's interaction status.
 * @returns {HTMLElement} The created restaurant card element.
 */
export function createRestaurantCard(r, pageType, interactionData) {
    const card = document.createElement('div');
    card.className = 'theme-bg-card p-3 md:p-4 rounded-lg shadow-md transition-all duration-300';
    card.dataset.restaurantId = r.id;

    // 데이터에서 image_url1 ~ 5를 배열로 만들고, 유효한 URL만 필터링합니다.
    const images = [r.image_url1, r.image_url2, r.image_url3, r.image_url4, r.image_url5].filter(url => url);

    const { likes = 0, dislikes = 0, currentUserInteraction = null } = interactionData;

    const isLiked = currentUserInteraction === 'like';
    const isDisliked = currentUserInteraction === 'dislike';

    // 사용자의 인터랙션 상태에 따라 버튼에 적용될 클래스를 정의합니다.
    const likeButtonClass = `like-button flex items-center space-x-1 px-3 py-1 rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 ${isLiked ? 'bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`;
    const dislikeButtonClass = `dislike-button flex items-center space-x-1 px-3 py-1 rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 ${isDisliked ? 'bg-red-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`;

    card.innerHTML = `
        <div class="card-header flex justify-between items-center cursor-pointer p-1">
            <div class="flex-grow">
                <h3 class="font-bold text-lg theme-text-title">${r.name}</h3>
                <p class="text-sm theme-text-subtitle">${r.menu || ''}</p>
            </div>
            <!-- 수정된 헤더 추천/비추천 아이콘 -->
            <div class="flex items-center space-x-3 text-sm font-semibold">
                <span class="flex items-center text-blue-400"><i class="fas fa-thumbs-up mr-1"></i><span class="header-like-count">${likes}</span></span>
                <span class="flex items-center text-red-400"><i class="fas fa-thumbs-down mr-1"></i><span class="header-dislike-count">${dislikes}</span></span>
                <svg class="w-5 h-5 ml-2 transition-transform transform theme-text-body" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
        </div>
        <div class="details">
            <div class="p-2 space-y-4">
                <!-- 수정된 좌/우 분리 레이아웃 -->
                <div class="flex flex-col md:flex-row md:space-x-6">
                    <!-- 왼쪽: 정보 섹션 -->
                    <div class="flex-grow space-y-3">
                        <div class="text-sm theme-text-body">
                            <p>${r.comment || ''}</p>
                            ${r.price ? `<p class="mt-2 font-semibold">가격대: ${r.price}</p>` : ''}
                            <a href="${r.map_link}" target="_blank" class="map-link font-bold hover:underline mt-2 inline-block">네이버 지도에서 보기 🗺️</a>
                        </div>
                    </div>
                    <!-- 오른쪽: 이미지 슬라이더 섹션 -->
                    ${images.length > 0 ? `
                    <div class="md:w-1/2 flex-shrink-0 mt-4 md:mt-0">
                        <div class="slider-container rounded-lg overflow-hidden">
                            <div class="slider-track" data-current-slide="0">
                                ${images.map(img => `<div class="slider-slide"><img src="${img}" alt="${r.name}" class="w-full h-48 object-cover lightbox-trigger cursor-pointer"></div>`).join('')}
                            </div>
                            ${images.length > 1 ? `
                            <button class="slider-btn prev">&#10094;</button>
                            <button class="slider-btn next">&#10095;</button>` : ''}
                        </div>
                    </div>` : ''}
                </div>

                <!-- 하단 인터랙션 버튼 -->
                <div class="flex items-center justify-end space-x-3 mt-4 border-t theme-border pt-4">
                    <button class="${likeButtonClass}" data-place-id="${r.id}" data-place-type="${pageType}">
                        <i class="fas fa-thumbs-up"></i>
                        <span class="like-count">${likes}</span>
                    </button>
                    <button class="${dislikeButtonClass}" data-place-id="${r.id}" data-place-type="${pageType}">
                        <i class="fas fa-thumbs-down"></i>
                        <span class="dislike-count">${dislikes}</span>
                    </button>
                </div>
                
                <!-- Review Section -->
                <div class="review-section border-t theme-border pt-4 mt-4">
                    <h4 class="font-bold theme-text-strong mb-3">한줄평</h4>
                    <div class="reviews-list space-y-3 mb-4">
                        <p class="text-center theme-text-subtitle">리뷰를 불러오는 중...</p>
                    </div>
                    <div class="review-form space-y-2">
                        <div class="flex items-center space-x-2">
                            <span class="theme-text-subtitle">별점:</span>
                            <div class="stars-input" data-restaurant-id="${r.id}" data-current-rating="0"></div>
                        </div>
                        <input type="text" class="review-nickname-input w-full p-2 rounded-md border text-sm comment-input" placeholder="닉네임 (기본: 익명)">
                        <textarea class="review-text-input w-full p-2 rounded-md border text-sm comment-input" placeholder="이 곳에서의 경험을 공유해주세요!" rows="2"></textarea>
                        <button class="post-review-btn w-full px-4 py-2 rounded-md font-semibold text-sm comment-post-btn" data-restaurant-id="${r.id}">한줄평 등록</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    return card;
}

/**
 * Fetches and renders reviews for a specific restaurant.
 * @param {string} restaurantId - The ID of the restaurant.
 * @param {HTMLElement} reviewsListElement - The container element to render reviews into.
 */
export async function fetchAndRenderReviews(restaurantId, reviewsListElement) {
    if (!reviewsListElement) return;
    const { data: reviews, error } = await api.fetchReviews(restaurantId);

    if (error) {
        reviewsListElement.innerHTML = `<p>리뷰를 불러오는데 실패했습니다.</p>`;
        return;
    }

    if (reviews.length === 0) {
        reviewsListElement.innerHTML = `<p class="text-center theme-text-subtitle text-sm">아직 작성된 한줄평이 없습니다.</p>`;
        return;
    }

    reviewsListElement.innerHTML = '';
    reviews.forEach(review => {
        const isMyReview = review.user_id && review.user_id === api.currentUserId;
        const reviewItem = document.createElement('div');
        reviewItem.className = 'review-item flex flex-col theme-border';
        reviewItem.innerHTML = `
            <div class="flex justify-between items-center mb-1">
                <div class="flex items-center space-x-2">
                    <span class="font-bold theme-text-strong text-sm">${review.nickname || '익명'}</span>
                    <div class="text-yellow-400 text-xs">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="text-xs theme-text-subtitle">${new Date(review.created_at).toLocaleDateString('ko-KR')}</span>
                    ${isMyReview ? `<button class="review-delete-btn text-xs text-red-400" data-review-id="${review.id}">삭제</button>` : ''}
                </div>
            </div>
            <p class="text-sm theme-text-body">${review.review_text}</p>
        `;
        reviewsListElement.appendChild(reviewItem);
    });
}

/**
 * Renders the interactive star rating input.
 * @param {HTMLElement} container - The container element for the stars.
 */
export function renderStarRatingInput(container) {
    if (!container) return;
    container.innerHTML = '';
    container.dataset.currentRating = '0';
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('span');
        star.className = 'cursor-pointer text-2xl text-gray-400';
        star.textContent = '★';
        star.dataset.rating = i;
        container.appendChild(star);
    }
}
