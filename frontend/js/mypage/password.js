// 비밀번호 변경 페이지 스크립트

const API_BASE = "";
function getUserType() {
  return localStorage.getItem("userType") || "";
}

// 뒤로가기
window.goBack = function() {
  window.history.back();
};

// 홈으로
window.goHome = function() {
  window.location.href = '../../pages/login&signup/main.html';
};

// 비밀번호 표시/숨기기 토글
window.togglePassword = function(inputId) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
  } else {
    input.type = 'password';
  }
};

// 비밀번호 변경 함수
window.changePassword = function() {
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  // 빈 값 체크
  if (!currentPassword || !newPassword || !confirmPassword) {
    alert('모든 항목을 입력해주세요.');
    return;
  }

  // 새 비밀번호 일치 확인
  if (newPassword !== confirmPassword) {
    alert('새 비밀번호가 일치하지 않습니다.');
    return;
  }

  // 비밀번호 길이 확인 (최소 8자)
  if (newPassword.length < 8) {
    alert('비밀번호는 최소 8자 이상이어야 합니다.');
    return;
  }

  // 기존 비밀번호와 새 비밀번호 동일 여부 확인
  if (currentPassword === newPassword) {
    alert('새 비밀번호는 기존 비밀번호와 달라야 합니다.');
    return;
  }

  if (!getUserType()) {
    alert('로그인이 필요합니다.');
    window.location.href = '../../pages/login&signup/login.html';
    return;
  }

  // 서버에 비밀번호 변경 요청
  fetch(`${API_BASE}/api/users/password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    body: JSON.stringify({ oldPassword: currentPassword, newPassword })
  })
  .then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.message || '비밀번호 변경에 실패했습니다.';
      throw new Error(msg);
    }
    return data;
  })
  .then(() => {
    alert('비밀번호가 변경되었습니다. 다시 로그인 해주세요.');
    // 토큰 및 사용자 정보 제거 후 로그인 페이지로 이동
    
    localStorage.removeItem('userType');
    localStorage.removeItem('username');
    window.location.href = '../../pages/login&signup/login.html';
  })
  .catch((err) => {
    alert(err?.message || '비밀번호 변경에 실패했습니다.');
  });
};

// 입력 필드 변경 감지 - 모든 필드가 채워지면 버튼 활성화
document.addEventListener('DOMContentLoaded', function() {
  const currentPassword = document.getElementById('currentPassword');
  const newPassword = document.getElementById('newPassword');
  const confirmPassword = document.getElementById('confirmPassword');
  const submitBtn = document.getElementById('submitBtn');

  function checkFields() {
    if (currentPassword.value && newPassword.value && confirmPassword.value) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('bg-gray-200', 'text-gray-400');
      submitBtn.classList.add('bg-gray-900', 'text-white', 'hover:bg-gray-800', 'cursor-pointer');
    } else {
      submitBtn.disabled = true;
      submitBtn.classList.add('bg-gray-200', 'text-gray-400');
      submitBtn.classList.remove('bg-gray-900', 'text-white', 'hover:bg-gray-800', 'cursor-pointer');
    }
  }

  currentPassword.addEventListener('input', checkFields);
  newPassword.addEventListener('input', checkFields);
  confirmPassword.addEventListener('input', checkFields);
});