// 구글 스프레드시트 API 스크립트 URL
// 여기에 구글 앱스 스크립트 배포 URL을 넣어주세요
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxVvXS1pgPwBkZ9WpxL9xPY3MiFr45hfDq0IcNvkOq00CdY94ktnfwqLo0oNxLPowbG/exec';

// DOM 요소
const commentForm = document.getElementById('commentForm');
const commentsContainer = document.getElementById('comments');

// 페이지 로드시 댓글 불러오기
document.addEventListener('DOMContentLoaded', () => {
    loadComments();
    
    // 댓글 폼 제출 이벤트 리스너
    commentForm.addEventListener('submit', handleSubmit);
});

// 댓글 제출 처리
async function handleSubmit(e) {
    e.preventDefault();
    
    const nameInput = document.getElementById('name');
    const messageInput = document.getElementById('message');
    
    const name = nameInput.value.trim();
    const message = messageInput.value.trim();
    
    if (!name || !message) {
        alert('이름과 내용을 모두 입력해주세요.');
        return;
    }
    
    // 로딩 상태 표시
    const submitButton = commentForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.textContent = '저장 중...';
    submitButton.disabled = true;
    
    try {
        await submitComment(name, message);
        
        // 폼 초기화
        nameInput.value = '';
        messageInput.value = '';
        
        // 댓글 목록 갱신
        loadComments();
        
    } catch (error) {
        console.error('댓글 저장 오류:', error);
        alert('댓글을 저장하는 중 오류가 발생했습니다.');
    } finally {
        // 버튼 상태 복원
        submitButton.textContent = originalButtonText;
        submitButton.disabled = false;
    }
}

// 댓글 제출 (스프레드시트에 저장)
async function submitComment(name, message) {
    const timestamp = new Date().toISOString();
    
    const formData = new FormData();
    formData.append('action', 'addComment');
    formData.append('name', name);
    formData.append('message', message);
    formData.append('timestamp', timestamp);
    
    const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        throw new Error('서버 응답 오류');
    }
    
    return await response.json();
}

// 댓글 불러오기
async function loadComments() {
    try {
        commentsContainer.innerHTML = '<p>댓글을 불러오는 중...</p>';
        
        const formData = new FormData();
        formData.append('action', 'getComments');
        
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('서버 응답 오류');
        }
        
        const data = await response.json();
        displayComments(data.comments || []);
        
    } catch (error) {
        console.error('댓글 불러오기 오류:', error);
        commentsContainer.innerHTML = '<p>댓글을 불러오는 중 오류가 발생했습니다.</p>';
    }
}

// 댓글 화면에 표시
function displayComments(comments) {
    if (comments.length === 0) {
        commentsContainer.innerHTML = '<p>아직 댓글이 없습니다.</p>';
        return;
    }
    
    commentsContainer.innerHTML = '';
    
    comments.forEach(comment => {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment-item';
        
        const date = new Date(comment.timestamp);
        const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        
        commentDiv.innerHTML = `
            <p><strong>${comment.name}</strong> <span class="date">${formattedDate}</span></p>
            <p>${comment.message}</p>
        `;
        
        commentsContainer.appendChild(commentDiv);
    });
} 