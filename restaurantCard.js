/**
 * @file restaurantCard.js
 * @description 맛집 카드 및 관련 UI 컴포넌트 생성 로직
 */

import { currentUserId } from '../api.js';

/**
 * 맛집 카드 HTML 요소를 생성합니다.
 * @param {Object} r - 맛집 데이터
 * @param {string} pageType - 페이지 타입 ('sikdae', 'gangnam', 'pub', 'community')
 * @param {Object} interactionData - 좋아요/싫어요 데이터
 * @returns {HTMLElement} 생성된 카드 요소
 */
export function createRestaurantCard(r, pageType, interactionData) {
    const item = document.createElement('div');
    item.className = 'theme-bg-card rounded-2xl shadow-sm border theme-border';
    item.dataset.restaurantId = r.id;

    // --- 이미지 데이터 추출 및 슬라이더 HTML 생성 ---
    const images = [r.image_url, r.image_url2, r.image_url3, r.image_url4, r.image_url5].filter(Boolean);
    let imageSliderHTML = '';
    if (images.length > 0) {
        imageSliderHTML = `
            <div class="slider-container relative w-full aspect-video rounded-lg overflow-hidden">
                <div class="slider-track flex h-full" style="transform: translateX(0%);" data-current-slide="0">
                    ${images.map(url => `
                        <div class="slider-slide flex-shrink-0 w-full h-full">
                            <img src="${url}" alt="${r.name} 이미지" class="w-full h-full object-cover lightbox-trigger cursor-pointer" loading="lazy" onerror="this.style.display='none'">
                        </div>
                    `).join('')}
                </div>
                ${images.length > 1 ? `
                    <button class="slider-btn prev absolute top-1/2 left-2 transform -translate-y-1/2">&lt;</button>
                    <button class="slider-btn next absolute top-1/2 right-2 transform -translate-y-1/2">&gt;</button>
                ` : ''}
            </div>
        `;
    }

    const isLiked = interactionData.currentUserInteraction === 'like';
    const isDisliked = interactionData.currentUserInteraction === 'dislike';
    const likeButtonClass = `flex items-center space-x-1 px-3 py-1 rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 ${isLiked ? 'bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`;
    const dislikeButtonClass = `flex items-center space-x-1 px-3 py-1 rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 ${isDisliked ? 'bg-red-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`;

    const cardHeaderHTML = `
        <div class="p-4 flex justify-between items-center cursor-pointer card-header">
            <div class="flex items-center">
                <h3 class="font-semibold text-md theme-text-body mr-2">${r.name}</h3>
                <p class="text-sm theme-text-strong">${r.category || ''}</p>
                <span class="text-xs ml-3 theme-text-subtitle">
                    <i class="fas fa-thumbs-up text-blue-400"></i><span class="header-like-count"> ${interactionData.likes}</span>
                    <i class="fas fa-thumbs-down text-red-400 ml-1"></i><span class="header-dislike-count"> ${interactionData.dislikes}</span>
                </span>
            </div>
            <svg class="w-5 h-5 theme-text-strong transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
    `;

    const detailsHTML = `
        <div class="details accordion-content">
            <div class="px-4 border-t theme-border pt-2 pb-3 space-y-4">
                <div class="grid grid-cols-1 ${images.length > 0 ? 'md:grid-cols-2' : ''} gap-6 py-3">
                    <div>
                        <div class="grid grid-cols-3 gap-y-2 text-sm">
                            <strong class="col-span-1 theme-text-strong font-bold">추천 메뉴</strong><span class="col-span-2 theme-text-body">${r.menu || '-'}</span>
                            <strong class="col-span-1 theme-text-strong font-bold">맛</strong><span class="col-span-2 theme-text-body">${r.rating || '-'}</span>
                            <strong class="col-span-1 theme-text-strong font-bold">가격대</strong><span class="col-span-2 theme-text-body">${r.price || '-'}</span>
                        </div>
                        <div class="py-2">
                            <strong class="text-sm theme-text-strong font-bold">코멘트</strong>
                            <p class="mt-1 text-sm theme-text-body">${r.comment || '-'}</p>
                        </div>
                        <div class="py-2">
                            <strong class="text-sm theme-text-strong font-bold">지도</strong>
                            <a href="${r.mapLink || '#'}" target="_blank" class="mt-1 text-sm map-link block">지도에서 보기 &rarr;</a>
                        </div>
                    </div>
                    ${imageSliderHTML ? `<div>${imageSliderHTML}</div>` : ''}
                </div>

                <div class="flex justify-around items-center border-t theme-border pt-4">
                    <button class="${likeButtonClass} like-button" data-place-id="${r.id}" data-place-type="${pageType}">
                        <i class="fas fa-thumbs-up"></i> <span class="like-count">${interactionData.likes}</span>
                    </button>
                    <button class="${dislikeButtonClass} dislike-button" data-place-id="${r.id}" data-place-type="${pageType}">
                        <i class="fas fa-thumbs-down"></i> <span class="dislike-count">${interactionData.dislikes}</span>
                    </button>
                </div>

                <div class="review-section p-3 rounded-xl theme-bg-card border theme-border">
                    <h4 class="font-semibold text-md theme-text-body mb-2">리뷰 남기기</h4>
                    <input type="text" class="review-nickname-input w-full p-2 rounded-md border text-sm comment-input" placeholder="닉네임">
                    <div class="rating-input-container flex items-center mt-2 mb-2">
                        <span class="mr-2 text-sm theme-text-body">별점:</span>
                        <div class="stars-input flex" data-restaurant-id="${r.id}"></div>
                    </div>
                    <textarea class="review-text-input w-full p-2 rounded-md border text-sm comment-input" placeholder="한줄평" rows="2"></textarea>
                    <button class="post-review-btn w-full px-4 py-2 rounded-md font-semibold text-sm comment-post-btn mt-2" data-restaurant-id="${r.id}">리뷰 등록</button>
                    <div class="reviews-list mt-4 space-y-2"></div>
                </div>
            </div>
        </div>
    `;

    item.innerHTML = cardHeaderHTML + detailsHTML;
    return item;
}

export async function fetchAndRenderReviews(restaurantId, reviewsListElement) {
    const { fetchReviews } = await import('../api.js');
    const { data: reviews, error } = await fetchReviews(restaurantId);
    if (error) {
        console.error('Error fetching reviews:', error.message);
        reviewsListElement.innerHTML = '<p class="text-sm text-red-500">리뷰 로딩 실패</p>';
        return;
    }
    reviewsListElement.innerHTML = '';
    if (reviews.length === 0) {
        reviewsListElement.innerHTML = '<p class="text-sm theme-text-subtitle text-center">아직 리뷰가 없습니다.</p>';
    } else {
        reviews.forEach(review => {
            const reviewItem = document.createElement('div');
            reviewItem.className = 'review-item bg-black bg-opacity-10 p-3 rounded-md';
            reviewItem.innerHTML = `
                <div class="flex justify-between items-center mb-1">
                    <div class="flex items-center space-x-2">
                        <span class="nickname-tag">${review.nickname || '익명'}</span>
                        <div>${renderDisplayedStars(review.rating)}</div>
                    </div>
                    ${currentUserId === review.user_id ? `<button class="text-xs text-red-400 hover:text-red-200 font-semibold review-delete-btn" data-review-id="${review.id}">삭제</button>` : ''}
                </div>
                <p class="text-sm theme-text-body mt-2 whitespace-pre-wrap">${review.review_text}</p>
            `;
            reviewsListElement.appendChild(reviewItem);
        });
    }
}

export function renderStarRatingInput(container, restaurantId) {
    if (!container) return;
    container.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('span');
        star.className = 'text-xl cursor-pointer text-gray-400 hover:text-yellow-300';
        star.innerHTML = '&#9733;';
        star.dataset.rating = i;
        container.appendChild(star);
    }
    container.dataset.currentRating = 0;
}

function renderDisplayedStars(rating) {
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
        starsHtml += `<span class="text-yellow-400 text-sm">${i <= rating ? '&#9733;' : '&#9734;'}</span>`;
    }
    return starsHtml;
}


