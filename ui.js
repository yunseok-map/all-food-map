<<<<<<< HEAD
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
        filteredData = filteredData.filter(r => {
            if (!r.price) return false; 
            const priceRange = parsePriceStringForRange(r.price);
            const [filterType, ...values] = priceFilter.split('-');
            
            if (filterType === 'under') {
                const maxVal = parseInt(values.join(''));
                return priceRange.max < maxVal;
            }
            if (filterType === 'over') {
                const minVal = parseInt(values.join(''));
                return priceRange.min >= minVal;
            }
            const [minVal, maxVal] = priceFilter.split('-').map(Number);
            return priceRange.min >= minVal && priceRange.max < maxVal;
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

    categoryOrder.forEach(categoryName => {
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

// --- 게시판 UI ---

/**
 * 댓글 또는 답글에 대한 HTML 요소를 생성합니다.
 * @param {Object} comment - 댓글 데이터
 * @param {Array<Object>} replies - 해당 댓글의 답글 목록
 * @param {boolean} isReply - 현재 렌더링하는 것이 답글인지 여부
 * @returns {HTMLElement} 생성된 댓글 요소
 */
export function renderComment(comment, replies = [], isReply = false) {
    const item = document.createElement('div');
    const isMyComment = comment.user_id === currentUserId;
    item.className = `comment-item ${isReply ? 'reply-item' : ''} ${isMyComment ? 'my-comment' : ''}`;
    item.dataset.commentId = comment.id;

    // 댓글 내용 부분
    const commentContent = document.createElement('div');
    commentContent.innerHTML = `
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
    item.appendChild(commentContent);

    // 답글 입력 폼 (최상위 댓글에만 추가)
    if (!isReply) {
        const replyFormContainer = document.createElement('div');
        replyFormContainer.className = 'reply-form-container mt-3 p-3 rounded-md theme-bg-card border theme-border';
        replyFormContainer.innerHTML = `
            <input type="text" class="reply-nickname-input w-full p-2 rounded-md border text-sm comment-input" placeholder="닉네임">
            <textarea class="reply-text-input w-full p-2 rounded-md border text-sm comment-input mt-2" placeholder="답글을 남겨주세요..." rows="2"></textarea>
            <button type="button" class="post-reply-btn w-full px-4 py-2 rounded-md font-semibold text-sm comment-post-btn mt-2">답글 등록</button>
        `;
        item.appendChild(replyFormContainer);
    }
    
    // *** FIX: 답글 보기/숨기기 버튼 및 컨테이너 추가 ***
    if (!isReply && replies.length > 0) {
        const repliesToggleBtn = document.createElement('button');
        repliesToggleBtn.className = 'text-sm text-blue-400 hover:text-blue-200 font-semibold mt-3 toggle-replies-btn';
        repliesToggleBtn.textContent = `답글 ${replies.length}개 보기`;

        const repliesContainer = document.createElement('div');
        // replies-container는 초기에 max-height: 0으로 숨겨져 있음
        repliesContainer.className = 'replies-container'; 
        
        const repliesList = document.createElement('div');
        // 이 div는 open 클래스가 추가될 때 보여질 실제 리스트
        repliesList.className = 'mt-3 space-y-2 pl-6 border-l-2 theme-border';

        replies.forEach(reply => {
            // 재귀적으로 renderComment 호출하여 각 답글 생성
            repliesList.appendChild(renderComment(reply, [], true));
        });

        repliesContainer.appendChild(repliesList);
        item.appendChild(repliesToggleBtn);
        item.appendChild(repliesContainer);
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
    applyAuroraMode(savedAuroraMode);
    switchTab('community');
}

export function switchTab(mainTab) {
    const currentSubTab = document.querySelector('.sub-tab-btn.active')?.dataset.subTab || 'sikdae';
    const theme = mainTab === 'integrated-map' ? currentSubTab : 'community';
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
    document.body.className = `theme-${subTab}`;
    if (localStorage.getItem('auroraModeEnabled') === 'true') {
        document.body.classList.add('aurora-mode');
    }

    document.querySelectorAll('.sub-tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.subTab === subTab));
    document.querySelectorAll('.sub-page-content').forEach(content => content.classList.toggle('hidden', content.id !== `${subTab}-sub-content`));
}

export function toggleAuroraMode() {
    const isEnabled = document.body.classList.toggle('aurora-mode');
    localStorage.setItem('auroraModeEnabled', isEnabled);
    applyAuroraMode(isEnabled);
}

function applyAuroraMode(isEnabled) {
    const auroraToggleBtn = document.getElementById('aurora-toggle-btn');
    if(auroraToggleBtn) auroraToggleBtn.textContent = isEnabled ? '🎨' : '✨';
}

=======
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
        filteredData = filteredData.filter(r => {
            if (!r.price) return false; 
            const priceRange = parsePriceStringForRange(r.price);
            const [filterType, ...values] = priceFilter.split('-');
            
            if (filterType === 'under') {
                const maxVal = parseInt(values.join(''));
                return priceRange.max < maxVal;
            }
            if (filterType === 'over') {
                const minVal = parseInt(values.join(''));
                return priceRange.min >= minVal;
            }
            const [minVal, maxVal] = priceFilter.split('-').map(Number);
            return priceRange.min >= minVal && priceRange.max < maxVal;
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

    categoryOrder.forEach(categoryName => {
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

// --- 게시판 UI ---

/**
 * 댓글 또는 답글에 대한 HTML 요소를 생성합니다.
 * @param {Object} comment - 댓글 데이터
 * @param {Array<Object>} replies - 해당 댓글의 답글 목록
 * @param {boolean} isReply - 현재 렌더링하는 것이 답글인지 여부
 * @returns {HTMLElement} 생성된 댓글 요소
 */
export function renderComment(comment, replies = [], isReply = false) {
    const item = document.createElement('div');
    const isMyComment = comment.user_id === currentUserId;
    item.className = `comment-item ${isReply ? 'reply-item' : ''} ${isMyComment ? 'my-comment' : ''}`;
    item.dataset.commentId = comment.id;

    // 댓글 내용 부분
    const commentContent = document.createElement('div');
    commentContent.innerHTML = `
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
    item.appendChild(commentContent);

    // 답글 입력 폼 (최상위 댓글에만 추가)
    if (!isReply) {
        const replyFormContainer = document.createElement('div');
        replyFormContainer.className = 'reply-form-container mt-3 p-3 rounded-md theme-bg-card border theme-border';
        replyFormContainer.innerHTML = `
            <input type="text" class="reply-nickname-input w-full p-2 rounded-md border text-sm comment-input" placeholder="닉네임">
            <textarea class="reply-text-input w-full p-2 rounded-md border text-sm comment-input mt-2" placeholder="답글을 남겨주세요..." rows="2"></textarea>
            <button type="button" class="post-reply-btn w-full px-4 py-2 rounded-md font-semibold text-sm comment-post-btn mt-2">답글 등록</button>
        `;
        item.appendChild(replyFormContainer);
    }
    
    // *** FIX: 답글 보기/숨기기 버튼 및 컨테이너 추가 ***
    if (!isReply && replies.length > 0) {
        const repliesToggleBtn = document.createElement('button');
        repliesToggleBtn.className = 'text-sm text-blue-400 hover:text-blue-200 font-semibold mt-3 toggle-replies-btn';
        repliesToggleBtn.textContent = `답글 ${replies.length}개 보기`;

        const repliesContainer = document.createElement('div');
        // replies-container는 초기에 max-height: 0으로 숨겨져 있음
        repliesContainer.className = 'replies-container'; 
        
        const repliesList = document.createElement('div');
        // 이 div는 open 클래스가 추가될 때 보여질 실제 리스트
        repliesList.className = 'mt-3 space-y-2 pl-6 border-l-2 theme-border';

        replies.forEach(reply => {
            // 재귀적으로 renderComment 호출하여 각 답글 생성
            repliesList.appendChild(renderComment(reply, [], true));
        });

        repliesContainer.appendChild(repliesList);
        item.appendChild(repliesToggleBtn);
        item.appendChild(repliesContainer);
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
    applyAuroraMode(savedAuroraMode);
    switchTab('community');
}

export function switchTab(mainTab) {
    const currentSubTab = document.querySelector('.sub-tab-btn.active')?.dataset.subTab || 'sikdae';
    const theme = mainTab === 'integrated-map' ? currentSubTab : 'community';
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
    document.body.className = `theme-${subTab}`;
    if (localStorage.getItem('auroraModeEnabled') === 'true') {
        document.body.classList.add('aurora-mode');
    }

    document.querySelectorAll('.sub-tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.subTab === subTab));
    document.querySelectorAll('.sub-page-content').forEach(content => content.classList.toggle('hidden', content.id !== `${subTab}-sub-content`));
}

export function toggleAuroraMode() {
    const isEnabled = document.body.classList.toggle('aurora-mode');
    localStorage.setItem('auroraModeEnabled', isEnabled);
    applyAuroraMode(isEnabled);
}

function applyAuroraMode(isEnabled) {
    const auroraToggleBtn = document.getElementById('aurora-toggle-btn');
    if(auroraToggleBtn) auroraToggleBtn.textContent = isEnabled ? '🎨' : '✨';
}

>>>>>>> 8a516bf (실시간 반영 수정)
