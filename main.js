/**
 * @file main.js
 * @description 애플리케이션의 메인 진입점입니다.
 * DOM이 로드되면 events.js의 initializeApp 함수를 호출하여 앱을 시작합니다.
 */

import { initializeApp } from './events.js';

// DOM 콘텐츠가 모두 로드되면 애플리케이션 초기화 함수를 실행합니다.
document.addEventListener('DOMContentLoaded', initializeApp);
