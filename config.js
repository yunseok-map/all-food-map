<<<<<<< HEAD
/**
 * @file config.js
 * @description 애플리케이션의 모든 설정 값을 관리합니다.
 * - Supabase 및 외부 API 키
 * - 데이터 정의 (카테고리 순서 등)
 * - 페이지네이션 설정
 */

// Supabase Settings
export const SUPABASE_URL = 'https://fwguhpotzrwlklnrdvpx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Z3VocG90enJ3bGtsbnJkdnB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMzU3MTUsImV4cCI6MjA2NzcxMTcxNX0.sprNAKUIcPphbcvk9Q3ZEvTUmezCkB1yfOr64ksauAM';

// Gemini API Key (User provided key)
export const GEMINI_API_KEY = "AIzaSyADS3LJHxDfisvRMmkVig-W0ppee-TX5xM";

// Data Definitions
export const sikdaeCategoryOrder = ['샐러드 🥗', '한식 🫕', '일식 🍣', '중식 �', '양식 🍔', '아시안음식 🍲', '분식 🥢', '카페/디저트 ☕', '프랜차이즈 🍔', '편의점 🏪'];
export const gangnamCategoryOrder = ['한식 🫕', '일식 🍣', '중식 🍜', '양식 🍔', '아시아 🍲', '샐러드 🥗'];
export const pubCategoryOrder = ['소주 🍶', '맥주 🍺', '막걸리 🍻', '칵테일 🍸', '와인 🍷', '느좋 ✨'];

// Pagination Settings
=======
/**
 * @file config.js
 * @description 애플리케이션의 모든 설정 값을 관리합니다.
 * - Supabase 및 외부 API 키
 * - 데이터 정의 (카테고리 순서 등)
 * - 페이지네이션 설정
 */

// Supabase Settings
export const SUPABASE_URL = 'https://fwguhpotzrwlklnrdvpx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Z3VocG90enJ3bGtsbnJkdnB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMzU3MTUsImV4cCI6MjA2NzcxMTcxNX0.sprNAKUIcPphbcvk9Q3ZEvTUmezCkB1yfOr64ksauAM';

// Gemini API Key (User provided key)
export const GEMINI_API_KEY = "AIzaSyADS3LJHxDfisvRMmkVig-W0ppee-TX5xM";

// Data Definitions
export const sikdaeCategoryOrder = ['샐러드 🥗', '한식 🫕', '일식 🍣', '중식 �', '양식 🍔', '아시안음식 🍲', '분식 🥢', '카페/디저트 ☕', '프랜차이즈 🍔', '편의점 🏪'];
export const gangnamCategoryOrder = ['한식 🫕', '일식 🍣', '중식 🍜', '양식 🍔', '아시아 🍲', '샐러드 🥗'];
export const pubCategoryOrder = ['소주 🍶', '맥주 🍺', '막걸리 🍻', '칵테일 🍸', '와인 🍷', '느좋 ✨'];

// Pagination Settings
>>>>>>> 8a516bf (실시간 반영 수정)
export const COMMENTS_PER_PAGE = 10;