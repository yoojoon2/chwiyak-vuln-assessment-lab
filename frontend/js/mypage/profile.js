// 구매자 프로필 관리 페이지 스크립트

const API_BASE = "";
function getToken() {
  // 토큰은 httpOnly 쿠키로 관리
  return "";
}

// 뒤로가기
window.goBack = function() {
  window.history.back();
};

// 이름 변경
window.changeBuyerName = async function() {
  const nameInput = document.getElementById('buyer-name-input');
  const newName = nameInput ? nameInput.value.trim() : '';
  
  if (!newName) {
    alert('이름을 입력해주세요.');
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE}/api/users/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: newName })
    });
    
    if (!res.ok) {
      throw new Error('이름 변경 실패');
    }
    
    alert('이름이 변경되었습니다.');
  } catch (err) {
    console.error(err);
    alert('이름 변경에 실패했습니다.');
  }
};

// 이메일 변경
window.changeEmail = async function() {
  const emailInput = document.getElementById('email-input');
  const newEmail = emailInput ? emailInput.value.trim() : '';
  
  if (!newEmail) {
    alert('이메일을 입력해주세요.');
    return;
  }
  
  // 이메일 형식 검증
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    alert('올바른 이메일 형식이 아닙니다.');
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE}/api/users/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: newEmail })
    });
    
    if (res.status === 409) {
      alert('이미 사용 중인 이메일입니다.');
      return;
    }
    
    if (!res.ok) {
      throw new Error('이메일 변경 실패');
    }
    
    alert('이메일이 변경되었습니다.');
  } catch (err) {
    console.error(err);
    alert('이메일 변경에 실패했습니다.');
  }
};

// 연락처 변경
window.changeContact = async function() {
  const contactInput = document.getElementById('contact-input');
  const newContact = contactInput ? contactInput.value.trim() : '';
  
  if (!newContact) {
    alert('연락처를 입력해주세요.');
    return;
  }
  
  // 연락처 형식 검증
  if (!/^\d{2,3}-?\d{3,4}-?\d{4}$/.test(newContact)) {
    alert('연락처 형식이 올바르지 않습니다. (예: 010-1234-5678)');
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE}/api/users/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ phone: newContact })
    });
    
    if (!res.ok) {
      throw new Error('연락처 변경 실패');
    }
    
    alert('연락처가 변경되었습니다.');
  } catch (err) {
    console.error(err);
    alert('연락처 변경에 실패했습니다.');
  }
};

// 아이디 변경
window.changeUsername = async function() {
  const usernameInput = document.getElementById('username-input');
  const newUsername = usernameInput ? usernameInput.value.trim() : '';
  
  if (!newUsername) {
    alert('아이디를 입력해주세요.');
    return;
  }
  
  // 아이디 형식 검증
  const usernameRegex = /^[a-zA-Z0-9_]{4,20}$/;
  if (!usernameRegex.test(newUsername)) {
    alert('아이디는 영문/숫자/_(언더바) 4~20자여야 합니다.');
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE}/api/users/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username: newUsername })
    });
    
    if (res.status === 409) {
      alert('이미 사용 중인 아이디입니다.');
      return;
    }
    
    if (!res.ok) {
      throw new Error('아이디 변경 실패');
    }
    
    alert('아이디가 변경되었습니다.');
    // 로컬 스토리지 업데이트
    localStorage.setItem('username', newUsername);
  } catch (err) {
    console.error(err);
    alert('아이디 변경에 실패했습니다.');
  }
};

// 비밀번호 변경
window.changePassword = function() {
  window.location.href = '../../pages/mypage/password.html';
};

// 프로필 이미지 업로드
window.uploadProfileImage = function() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 파일 크기 체크 (5MB 이하)
      if (file.size > 5 * 1024 * 1024) {
        alert('이미지 파일 크기는 5MB 이하여야 합니다.');
        return;
      }
      
      // 이미지 미리보기
      const reader = new FileReader();
      reader.onload = function(event) {
        const img = document.querySelector('.w-24.h-24.rounded-full');
        if (img) {
          img.style.backgroundImage = `url(${event.target.result})`;
          img.style.backgroundSize = 'cover';
          img.style.backgroundPosition = 'center';
        }
      };
      reader.readAsDataURL(file);
      
      console.log('이미지 선택:', file.name);
      // TODO: 서버에 이미지 업로드
      alert('이미지가 선택되었습니다. 저장 버튼을 눌러주세요.');
    }
  };
  input.click();
};

// 프로필 이미지 삭제
window.deleteProfileImage = function() {
  if (confirm('프로필 이미지를 삭제하시겠습니까?')) {
    const img = document.querySelector('.w-24.h-24.rounded-full');
    if (img) {
      img.style.backgroundImage = '';
      img.classList.add('bg-gray-300');
    }
    console.log('이미지 삭제');
    // TODO: 서버에서 이미지 삭제
    alert('이미지가 삭제되었습니다.');
  }
};

// 프로필 저장
window.saveProfile = async function() {
  // 입력값 가져오기
  const nameInput = document.getElementById('buyer-name-input');
  const buyerName = nameInput ? nameInput.value.trim() : '';
  const contactInput = document.getElementById('contact-input');
  const contact = contactInput ? contactInput.value.trim() : '';
  const emailInput = document.getElementById('email-input');
  const email = emailInput ? emailInput.value.trim() : '';
  
  // 유효성 검사
  if (!buyerName.trim()) {
    alert('이름을 입력해주세요.');
    return;
  }
  
  if (contact && !/^\d{2,3}-?\d{3,4}-?\d{4}$/.test(contact)) {
    alert('연락처 형식이 올바르지 않습니다. (예: 010-1234-5678)');
    return;
  }
  
  try {
    const payload = {
      name: buyerName,
      phone: contact,
      email: email
    };
    
    const res = await fetch(`${API_BASE}/api/users/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    
    if (res.status === 409) {
      alert('이미 사용 중인 아이디 또는 이메일입니다.');
      return;
    }
    
    if (!res.ok) {
      throw new Error('프로필 저장 실패');
    }
    
    alert('프로필이 저장되었습니다.');
    window.location.href = './mypage.html';
  } catch (err) {
    console.error(err);
    alert('프로필 저장에 실패했습니다.');
  }
};

// 계정 탈퇴
window.deleteAccount = async function() {
  if (confirm('정말로 계정을 탈퇴하시겠습니까?\n\n탈퇴 시 다음 정보가 삭제됩니다:\n- 모든 주문 정보\n- 장바구니\n- 위시리스트\n- 프로필 정보\n\n이 작업은 복구할 수 없습니다.')) {
    // 비밀번호 확인
    const password = prompt('계정 탈퇴를 위해 비밀번호를 입력해주세요:');
    
    if (password) {
      if (password.length > 0) {
        try {
          const res = await fetch(`${API_BASE}/api/users/account`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ password })
          });
          
          if (!res.ok) {
            const data = await res.json().catch(() => ({ message: '계정 탈퇴에 실패했습니다.' }));
            alert(data.message || '계정 탈퇴에 실패했습니다.');
            return;
          }
          
          const data = await res.json();
          
          alert('계정 탈퇴가 완료되었습니다.\n그동안 이용해 주셔서 감사합니다.');
          
          // 로컬 스토리지 정리
          localStorage.removeItem('userType');
          localStorage.removeItem('username');
          
          // 로그인 페이지로 이동
          window.location.href = '../../pages/login&signup/login.html';
        } catch (err) {
          console.error('계정 탈퇴 오류:', err);
          alert('계정 탈퇴 중 오류가 발생했습니다. 서버가 실행 중인지 확인해주세요.');
        }
      } else {
        alert('비밀번호를 입력해주세요.');
      }
    }
  }
};

// 프로필 불러오기
async function loadProfile() {
  try {
    const res = await fetch(`${API_BASE}/api/users/profile`, {
      credentials: 'include'
    });
    
    if (!res.ok) {
      throw new Error('프로필 조회 실패');
    }
    
    const user = await res.json();
    
    // 이름
    const nameInput = document.getElementById('buyer-name-input');
    if (nameInput) {
      nameInput.value = user.name || '';
    }
    
    // 아이디
    const usernameInput = document.getElementById('username-input');
    if (usernameInput) {
      usernameInput.value = user.username || '';
    }
    
    // 이메일
    const emailInput = document.getElementById('email-input');
    if (emailInput) {
      emailInput.value = user.email || '';
    }
    
    // 연락처
    const telInput = document.getElementById('contact-input');
    if (telInput) {
      telInput.value = user.phone || '';
    }
    
  } catch (err) {
    console.error(err);
  }
}

// 페이지 로드 시
document.addEventListener('DOMContentLoaded', function() {
  
  // 로그인 확인 및 프로필 불러오기
  if (!localStorage.getItem("userType")) {
    alert('로그인이 필요합니다.');
    window.location.href = '../../pages/login&signup/login.html';
    return;
  }
  
  loadProfile();
  
  // 연락처 자동 포맷
  const telInput = document.getElementById('contact-input');
  if (telInput) {
    telInput.addEventListener('input', function(e) {
      let value = e.target.value.replace(/[^0-9]/g, '');
      
      if (value.length <= 3) {
        e.target.value = value;
      } else if (value.length <= 7) {
        e.target.value = value.slice(0, 3) + '-' + value.slice(3);
      } else {
        e.target.value = value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7, 11);
      }
    });
  }
});
