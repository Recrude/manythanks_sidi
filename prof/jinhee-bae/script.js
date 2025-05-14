// 구글 스프레드시트 API 스크립트 URL
// 여기에 구글 앱스 스크립트 배포 URL을 넣어주세요
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw7uR1zqagCILFUXxswxbYJRfUR8o2VHvJp6ZdWUXKnmCvzJUeiVxhIQ5zCbnlDsSdl/exec';

// 시트 설정
const SHEET_NAME = 'JinheeBae'; // 이 페이지의 댓글이 저장될 시트 이름

// 페이지 로드시 시트 이름 확인용 로그
console.log('사용할 시트 이름: ' + SHEET_NAME);

// DOM 요소
const commentForm = document.getElementById('commentForm');
const commentsContainer = document.getElementById('comments');
const statusContainer = document.getElementById('status-container');

// 캐싱 설정
const CACHE_KEY = 'comments_cache_jinheebae';
const CACHE_EXPIRY = 300000; // 캐시 유효 시간 (밀리초, 현재는 5분)
let lastFetchTime = 0;
let isLoading = false;

// 페이지 로드시 댓글 불러오기
document.addEventListener('DOMContentLoaded', () => {
    // 캐시된 댓글 즉시 표시
    const cachedComments = getCachedComments();
    if (cachedComments && cachedComments.comments && cachedComments.comments.length > 0) {
        displayComments(cachedComments.comments);
        // 캐시된 댓글을 표시한 후 새로운 댓글도 비동기적으로 로드
        setTimeout(() => loadComments(true), 100);
    } else {
        // 캐시가 없으면 바로 로드
        loadComments();
    }
    
    // 댓글 폼 제출 이벤트 리스너
    commentForm.addEventListener('submit', handleSubmit);
    
    // 로컬 스토리지에 임시 저장된 이름 복원
    restoreName();
    
    // 이름 입력 필드에 변경 이벤트 리스너 추가 (자동 저장)
    const nameInput = document.getElementById('name');
    nameInput.addEventListener('change', () => {
        localStorage.setItem('remembered_name', nameInput.value.trim());
    });
});

// 이름 복원
function restoreName() {
    const savedName = localStorage.getItem('remembered_name');
    if (savedName) {
        const nameInput = document.getElementById('name');
        nameInput.value = savedName;
    }
}

// 캐시에서 댓글 불러오기
function getCachedComments() {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    try {
        const parsedCache = JSON.parse(cached);
        const now = Date.now();
        
        // 캐시가 만료되었는지 확인
        if (parsedCache.timestamp && now - parsedCache.timestamp < CACHE_EXPIRY) {
            return parsedCache;
        }
    } catch (e) {
        console.warn('캐시 파싱 오류:', e);
    }
    
    // 캐시가 없거나 만료되었으면 제거
    localStorage.removeItem(CACHE_KEY);
    return null;
}

// 캐시에 댓글 저장
function cacheComments(data) {
    try {
        const cacheData = {
            comments: data.comments,
            timestamp: Date.now()
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (e) {
        console.warn('캐시 저장 오류:', e);
    }
}

// 상태 메시지 표시
function showStatus(message, type = 'info', duration = 3000) {
    statusContainer.innerHTML = '';
    
    const statusElement = document.createElement('div');
    statusElement.className = `status-message ${type}`;
    statusElement.textContent = message;
    
    statusContainer.appendChild(statusElement);
    
    if (duration > 0) {
        setTimeout(() => {
            statusContainer.removeChild(statusElement);
        }, duration);
    }
    
    return statusElement;
}

// 댓글 제출 처리
async function handleSubmit(e) {
    e.preventDefault();
    
    const nameInput = document.getElementById('name');
    const messageInput = document.getElementById('message');
    
    const name = nameInput.value.trim();
    const message = messageInput.value.trim();
    
    if (!name || !message) {
        showStatus('이름과 내용을 모두 입력해주세요.', 'error');
        return;
    }
    
    // 로딩 상태 표시
    const submitButton = commentForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.textContent = '저장 중...';
    submitButton.disabled = true;
    
    // 사용자 이름을 로컬 스토리지에 저장 (다음 방문시 자동 입력)
    localStorage.setItem('remembered_name', name);
    
    // 즉시 화면에 댓글 추가 (낙관적 UI 업데이트)
    const timestamp = new Date().toISOString();
    addNewCommentToUI(name, message, timestamp);
    
    try {
        // 비동기적으로 서버에 댓글 저장
        await submitComment(name, message, timestamp);
        
        // 폼 초기화 (이름은 유지)
        messageInput.value = '';
        
        // 성공 메시지 표시
        showStatus('댓글이 성공적으로 저장되었습니다.', 'success');
        
        // 캐시 무효화 및 댓글 목록 갱신 (백그라운드로)
        localStorage.removeItem(CACHE_KEY);
        setTimeout(() => loadComments(true), 1000);
        
    } catch (error) {
        console.error('댓글 저장 오류:', error);
        showStatus('댓글을 저장하는 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
        
        // 오류 발생 시 낙관적으로 추가했던 댓글 제거
        const tempCommentId = `temp-${timestamp}`;
        const tempComment = document.getElementById(tempCommentId);
        if (tempComment) {
            tempComment.classList.add('error');
        }
    } finally {
        // 버튼 상태 복원
        submitButton.textContent = originalButtonText;
        submitButton.disabled = false;
    }
}

// 화면에 새 댓글 즉시 추가 (낙관적 UI 업데이트)
function addNewCommentToUI(name, message, timestamp) {
    // 현재 표시된 댓글들을 가져오기
    const existingComments = commentsContainer.querySelectorAll('.comment-item');
    
    // 새 댓글 요소 생성
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment-item';
    commentDiv.id = `temp-${timestamp}`; // 임시 ID 부여
    
    // 날짜 형식 변환
    const date = new Date(timestamp);
    const formattedDate = date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    commentDiv.innerHTML = `
        <p><strong>${name}</strong> <span class="date">${formattedDate}</span></p>
        <p class="comment-message">${message}</p>
    `;
    
    // 첫 번째 댓글로 삽입
    if (existingComments.length > 0) {
        commentsContainer.insertBefore(commentDiv, existingComments[0]);
    } else {
        commentsContainer.innerHTML = '';
        commentsContainer.appendChild(commentDiv);
    }
}

// 댓글 제출 (스프레드시트에 저장)
async function submitComment(name, message, timestamp) {
    const formData = new FormData();
    formData.append('action', 'addComment');
    formData.append('name', name);
    formData.append('message', message);
    formData.append('timestamp', timestamp);
    formData.append('sheet', SHEET_NAME); // 시트 이름 추가
    
    // 요청 타임아웃 설정
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15초 타임아웃
    
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });
        
        if (!response.ok) {
            throw new Error('서버 응답 오류');
        }
        
        return await response.json();
    } finally {
        clearTimeout(timeoutId);
    }
}

// 댓글 불러오기
async function loadComments(silent = false) {
    // 이미 로딩 중이면 중복 요청 방지
    if (isLoading) return;
    
    // 마지막 요청 이후 너무 짧은 시간에 다시 요청하는 것 방지
    const now = Date.now();
    if (now - lastFetchTime < 5000 && !silent) { // 5초 이내 재요청 방지
        return;
    }
    
    isLoading = true;
    
    try {
        if (!silent) {
            commentsContainer.innerHTML = '<div class="loading-indicator">댓글을 불러오는 중...</div>';
        }
        
        const formData = new FormData();
        formData.append('action', 'getComments');
        formData.append('sheet', SHEET_NAME); // 시트 이름 추가
        
        // 요청 타임아웃 설정
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15초 타임아웃
        
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error('서버 응답 오류');
        }
        
        const data = await response.json();
        
        // 댓글 캐싱
        cacheComments(data);
        
        // 댓글 표시
        displayComments(data.comments || []);
        
        // 마지막 요청 시간 기록
        lastFetchTime = now;
        
    } catch (error) {
        console.error('댓글 불러오기 오류:', error);
        if (!silent) {
            commentsContainer.innerHTML = '<p>댓글을 불러오는 중 오류가 발생했습니다. <a href="javascript:void(0)" onclick="loadComments()">다시 시도</a></p>';
        }
    } finally {
        isLoading = false;
    }
}

// 댓글 화면에 표시
function displayComments(comments) {
    if (comments.length === 0) {
        commentsContainer.innerHTML = '<p>아직 댓글이 없습니다.</p>';
        return;
    }
    
    // 현재 DOM 요소 생성 최소화를 위한 DocumentFragment 사용
    const fragment = document.createDocumentFragment();
    
    comments.forEach(comment => {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment-item';
        
        // 날짜 형식 변환 간소화
        let formattedDate;
        try {
            const date = new Date(comment.timestamp);
            formattedDate = date.toLocaleString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            formattedDate = '날짜 정보 없음';
        }
        
        commentDiv.innerHTML = `
            <p><strong>${comment.name}</strong> <span class="date">${formattedDate}</span></p>
            <p class="comment-message">${comment.message}</p>
        `;
        
        fragment.appendChild(commentDiv);
    });
    
    // 한번에 DOM 업데이트
    commentsContainer.innerHTML = '';
    commentsContainer.appendChild(fragment);
} 