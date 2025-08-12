/**
 * @file ui.js
 * @description DOM 조작, UI 렌더링, 시각적 효과 등 모든 UI 관련 로직을 담당합니다.
 */

import { currentUserId, fetchInteractions } from './api.js';
import { createRestaurantCard } from './restaurantCard.js';

// --- Utility Functions ---

export function showCustomConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-confirm-modal');
        const msgEl = document.getElementById('confirm-message');
        const yesBtn = document.getElementById('confirm-yes-btn');
        const noBtn = document.getElementById('confirm-no-btn');

        msgEl.textContent = message;
        modal.classList.remove('hidden');

        const clickHandler = (e) => {
            modal.classList.add('hidden');
            yesBtn.removeEventListener('click', clickHandler);
            noBtn.removeEventListener('click', clickHandler);
            resolve(e.target === yesBtn);
        };

        yesBtn.addEventListener('click', clickHandler);
        noBtn.addEventListener('click', clickHandler);
    });
}

function parsePriceStringForRange(priceStr) {
    if (!priceStr) return { min: 0, max: Infinity };
    priceStr = priceStr.trim();
    if (priceStr.includes('미만')) {
        const value = parseInt(priceStr.replace(/[^\d]/g, '')) * (priceStr.includes('만원') ? 10000 : 1000);
        return { min: 0, max: value - 1 };
    } else if (priceStr.includes('이상')) {
        const value = parseInt(priceStr.replace(/[^\d]/g, '')) * (priceStr.includes('만원') ? 10000 : 1000);
        return { min: value, max: Infinity };
    } else if (priceStr.includes('~')) {
        const parts = priceStr.split('~').map(s => parseInt(s.replace(/[^\d]/g, '')) * (s.includes('만원') ? 10000 : 1000));
        return { min: parts[0], max: parts[1] - 1 };
    }
    return { min: 0, max: Infinity };
}

// --- Main UI Rendering ---

export async function renderRestaurantList(sectionsElement, data, categoryOrder, pageType, searchTerm = '', priceFilter = 'all', sortOrder = 'category') {
    let filteredData = data;

    if (searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        filteredData = filteredData.filter(r =>
            (r.name && r.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
            (r.menu && r.menu.toLowerCase().includes(lowerCaseSearchTerm))
        );
    }

    if (priceFilter !== 'all') {
        const priceRangeFilter = parsePriceStringForRange(priceFilter);
        filteredData = filteredData.filter(r => {
            if (!r.price) return false;
            const itemPriceRange = parsePriceStringForRange(r.price);
            return itemPriceRange.min >= priceRangeFilter.min && itemPriceRange.max <= priceRangeFilter.max;
        });
    }
    
    if (sortOrder === 'name-asc') {
        filteredData.sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));
    }

    sectionsElement.innerHTML = '';

    const placeIds = filteredData.map(r => r.id);
    const interactionsMap = new Map();
    if (placeIds.length > 0) {
        const { data: interactions, error } = await fetchInteractions(placeIds, pageType);
        if (!error) {
            interactions.forEach(interaction => {
                if (!interactionsMap.has(interaction.place_id)) {
                    interactionsMap.set(interaction.place_id, { likes: 0, dislikes: 0, currentUserInteraction: null });
                }
                const counts = interactionsMap.get(interaction.place_id);
                if (interaction.interaction_type === 'like') counts.likes++;
                else if (interaction.interaction_type === 'dislike') counts.dislikes++;
                if (currentUserId && interaction.user_id === currentUserId) {
                    counts.currentUserInteraction = interaction.interaction_type;
                }
            });
        }
    }

    const grouped = filteredData.reduce((acc, restaurant) => {
        const groupName = restaurant.category || '기타';
        if (!acc[groupName]) acc[groupName] = [];
        acc[groupName].push(restaurant);
        return acc;
    }, {});

    const categoryOrderWithEtc = [...categoryOrder, ...Object.keys(grouped).filter(g => !categoryOrder.includes(g))];

    categoryOrderWithEtc.forEach(categoryName => {
        if (grouped[categoryName] && grouped[categoryName].length > 0) {
            const sectionWrapper = document.createElement('div');
            sectionWrapper.className = 'theme-bg-header rounded-2xl shadow-lg overflow-hidden';
            
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'p-4 md:p-5 flex justify-between items-center cursor-pointer category-group-header';
            categoryHeader.innerHTML = `
                <h2 class="text-xl md:text-2xl font-bold theme-text-header">${categoryName}</h2>
                <svg class="w-5 h-5 md:w-6 md:h-6 theme-text-header transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            `;
            
            const listContainer = document.createElement('div');
            listContainer.className = 'accordion-content';
            const innerList = document.createElement('div');
            innerList.className = 'space-y-3 p-3 md:p-4 border-t theme-border';
            
            grouped[categoryName].forEach(r => {
                const interactionData = interactionsMap.get(r.id) || { likes: 0, dislikes: 0, currentUserInteraction: null };
                const card = createRestaurantCard(r, pageType, interactionData);
                innerList.appendChild(card);
            });

            listContainer.appendChild(innerList);
            sectionWrapper.appendChild(categoryHeader);
            sectionWrapper.appendChild(listContainer);
            sectionsElement.appendChild(sectionWrapper);
        }
    });

    if (sectionsElement.innerHTML === '') {
        sectionsElement.innerHTML = '<p class="text-center text-lg theme-text-subtitle mt-8">검색 결과가 없습니다.</p>';
    }
}

/**
 * 커뮤니티 '오늘의 메뉴 뽑기' 결과를 화면에 렌더링합니다.
 * @param {Array} restaurants - 선택된 레스토랑 데이터 배열
 * @param {Map} interactionsMap - 상호작용 데이터 맵
 */
export function renderCommunityDrawResults(restaurants, interactionsMap) {
    const resultContainer = document.getElementById('community-result-container');
    resultContainer.innerHTML = '';

    restaurants.forEach((r, index) => {
        const interactionData = interactionsMap.get(r.id) || { likes: 0, dislikes: 0, currentUserInteraction: null };
        const card = createRestaurantCard(r, 'community', interactionData);
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('card-enter');
        resultContainer.appendChild(card);
    });
}


// --- 게시판 UI ---

export function renderComment(comment, replies = [], isReply = false) {
    const item = document.createElement('div');
    const isMyComment = comment.user_id === currentUserId;
    item.className = `comment-item ${isReply ? 'reply-item' : ''} ${isMyComment ? 'my-comment' : ''}`;
    item.dataset.commentId = comment.id;

    item.innerHTML = `
        <div class="flex justify-between items-center mb-2">
            <div class="flex items-center space-x-2">
                <span class="nickname-tag">${comment.nickname || '익명'}</span>
                <p class="text-xs theme-text-subtitle">${new Date(comment.created_at).toLocaleString('ko-KR')}</p>
            </div>
            <div class="actions flex space-x-2">
                ${!isReply ? '<button class="text-xs text-blue-400 hover:text-blue-200 font-semibold reply-btn">답글</button>' : ''}
                ${isMyComment ? '<button class="text-xs text-red-400 hover:text-red-200 font-semibold comment-delete-btn">삭제</button>' : ''}
            </div>
        </div>
        <p class="text-sm theme-text-body whitespace-pre-wrap">${comment.text}</p>
    `;

    if (!isReply) {
        const replyFormContainer = document.createElement('div');
        replyFormContainer.className = 'reply-form-container mt-3 p-3 rounded-md theme-bg-card border theme-border';
        replyFormContainer.innerHTML = `
            <input type="text" class="reply-nickname-input w-full p-2 rounded-md border text-sm comment-input" placeholder="닉네임">
            <textarea class="reply-text-input w-full p-2 rounded-md border text-sm comment-input mt-2" placeholder="답글을 남겨주세요..." rows="2"></textarea>
            <button type="button" class="post-reply-btn w-full px-4 py-2 rounded-md font-semibold text-sm comment-post-btn mt-2">답글 등록</button>
        `;
        item.appendChild(replyFormContainer);
        
        if (replies.length > 0) {
            const repliesToggleBtn = document.createElement('button');
            repliesToggleBtn.className = 'text-sm text-blue-400 hover:text-blue-200 font-semibold mt-3 toggle-replies-btn';
            repliesToggleBtn.textContent = `답글 ${replies.length}개 보기`;

            const repliesContainer = document.createElement('div');
            repliesContainer.className = 'replies-container'; 
            
            const repliesList = document.createElement('div');
            repliesList.className = 'replies-list mt-3 space-y-2 pl-6 border-l-2 theme-border';

            replies.forEach(reply => {
                repliesList.appendChild(renderComment(reply, [], true));
            });

            repliesContainer.appendChild(repliesList);
            item.appendChild(repliesToggleBtn);
            item.appendChild(repliesContainer);
        }
    }
    return item;
}


export function renderPaginationControls(boardType, totalComments, currentPage, commentsPerPage) {
    const paginationEl = document.getElementById(`${boardType.split('_')[0]}-pagination`);
    if (!paginationEl) return;
    paginationEl.innerHTML = '';
    const totalPages = Math.ceil(totalComments / commentsPerPage);

    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = `pagination-btn w-8 h-8 rounded-md font-semibold text-sm ${i === currentPage ? 'active' : ''}`;
        pageBtn.dataset.page = i;
        pageBtn.dataset.boardType = boardType;
        paginationEl.appendChild(pageBtn);
    }
}

// --- 초기화 및 탭 관리 ---

export function initializeUI() {
    const savedAuroraMode = localStorage.getItem('auroraModeEnabled') === 'true';
    document.body.classList.toggle('aurora-mode', savedAuroraMode);
    applyAuroraMode(savedAuroraMode);
    switchTab('community');
}

export function switchTab(mainTab) {
    const currentSubTab = document.querySelector('.sub-tab-btn.active')?.dataset.subTab || 'sikdae';

    let theme = 'community'; // 기본 테마
    if (mainTab === 'integrated-map') {
        theme = currentSubTab;
    } else if (mainTab === 'review-collection') {
        theme = 'review-collection';
    } else if (mainTab === 'lab') {
        theme = 'lab';
    }


    document.body.className = `theme-${theme}`;
    if (localStorage.getItem('auroraModeEnabled') === 'true') {
        document.body.classList.add('aurora-mode');
    }

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === mainTab));
    document.querySelectorAll('.page-content').forEach(content => content.classList.toggle('hidden', content.id !== `${mainTab}-content`));

    if (mainTab === 'integrated-map') {
        switchSubTab(currentSubTab);
    }
}

export function switchSubTab(subTab) {
    const aurora = document.body.classList.contains('aurora-mode');
    document.body.className = `theme-${subTab}`;
    if (aurora) document.body.classList.add('aurora-mode');

    document.querySelectorAll('.sub-tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.subTab === subTab));
    document.querySelectorAll('.sub-page-content').forEach(content => content.classList.toggle('hidden', content.id !== `${subTab}-sub-content`));
}

// <!-- fix: Start of changes -->
export function switchLabSubTab(labTab) {
    document.querySelectorAll('.lab-sub-tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.labTab === labTab));
    document.querySelectorAll('.lab-sub-page-content').forEach(content => {
        content.classList.toggle('hidden', content.id !== `${labTab}-content`);
    });
}
// <!-- fix: End of changes -->

export function toggleAuroraMode() {
    const isEnabled = document.body.classList.toggle('aurora-mode');
    localStorage.setItem('auroraModeEnabled', isEnabled);
    applyAuroraMode(isEnabled);
}

function applyAuroraMode(isEnabled) {
    const auroraToggleBtn = document.getElementById('aurora-toggle-btn');
    if(auroraToggleBtn) auroraToggleBtn.textContent = isEnabled ? '🎨' : '✨';
}

// --- '리뷰 모아보기' 탭을 위한 새로운 함수 (게시판 스타일) ---

export function renderAllReviewsList(container, reviews) {
    if (!container) return;

    if (reviews.length === 0) {
        container.innerHTML = '<p class="text-center text-lg theme-text-subtitle mt-8">아직 작성된 리뷰가 없습니다.</p>';
        return;
    }

    const renderStars = (rating) => {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += `<span class="text-yellow-400 text-sm">${i <= rating ? '★' : '☆'}</span>`;
        }
        return stars;
    };

    const reviewBoardHTML = `
        <div class="review-board-container">
            <div class="review-board-header">
                <div class="review-board-cell restaurant">가게 이름</div>
                <div class="review-board-cell review-content">리뷰 내용</div>
                <div class="review-board-cell author">작성자</div>
                <div class="review-board-cell date">작성일</div>
            </div>
            <div class="review-board-body">
                ${reviews.map(review => {
                    const restaurantName = review.restaurants ? review.restaurants.name : '삭제된 가게';
                    return `
                        <div class="review-board-row">
                            <div class="review-board-cell restaurant font-bold">${restaurantName}</div>
                            <div class="review-board-cell review-content">
                                <div class="flex items-center space-x-2 mb-1">
                                    ${renderStars(review.rating)}
                                </div>
                                <p class="text-sm theme-text-body">${review.review_text}</p>
                            </div>
                            <div class="review-board-cell author">${review.nickname || '익명'}</div>
                            <div class="review-board-cell date">${new Date(review.created_at).toLocaleDateString('ko-KR')}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    container.innerHTML = reviewBoardHTML;
}

// <!-- fix -->
// --- 알람 UI 렌더링 함수 ---
export function renderNotifications(notifications) {
    const listContent = document.getElementById('notification-list-content');
    const countBadge = document.getElementById('notification-count');

    if (!listContent || !countBadge) return;

    if (notifications.length === 0) {
        listContent.innerHTML = '<p class="text-center text-sm theme-text-subtitle py-4">새로운 알림이 없습니다.</p>';
        countBadge.classList.add('hidden');
        return;
    }

    countBadge.textContent = notifications.length;
    countBadge.classList.remove('hidden');

    listContent.innerHTML = '';
    notifications.forEach(noti => {
        const item = document.createElement('div');
        // 각 알람 아이템에 고유 ID를 데이터 속성으로 심어줍니다. (삭제할 때 사용)
        item.className = 'notification-item';
        item.dataset.notificationId = noti.id; 
        
        item.innerHTML = `
            <p class="notification-item-text">${noti.text}</p>
            <p class="notification-item-time">${new Date(noti.createdAt).toLocaleString('ko-KR')}</p>
        `;
        listContent.appendChild(item);
    });
}
// <!-- end fix -->
