// 판매 정산 계좌 관리 스크립트

window.goBack = function() {
  window.history.back();
};

// 폼 유효성 검사 및 버튼 활성화
function validateForm() {
  const bank = document.getElementById('bank-select')?.value;
  const accountNumber = document.getElementById('account-number')?.value;
  const accountHolder = document.getElementById('account-holder')?.value;
  const saveBtn = document.getElementById('save-btn');
  
  if (!saveBtn) return; // 요소가 없으면 종료
  
  // 모든 필드가 입력되었는지 확인
  if (bank && accountNumber && accountHolder) {
    saveBtn.disabled = false;
    saveBtn.classList.remove('bg-gray-300');
    saveBtn.classList.add('bg-black', 'hover:bg-gray-800');
  } else {
    saveBtn.disabled = true;
    saveBtn.classList.remove('bg-black', 'hover:bg-gray-800');
    saveBtn.classList.add('bg-gray-300');
  }
}

window.saveAccount = function() {
  const bankSelect = document.getElementById('bank-select');
  const accountNumberInput = document.getElementById('account-number');
  const accountHolderInput = document.getElementById('account-holder');
  
  if (!bankSelect || !accountNumberInput || !accountHolderInput) {
    console.error('필수 입력 요소를 찾을 수 없습니다.');
    return;
  }
  
  const accountData = {
    bank: bankSelect.value,
    accountNumber: accountNumberInput.value.trim(),
    accountHolder: accountHolderInput.value.trim()
  };
  
  // 빈 값 검사
  if (!accountData.bank || !accountData.accountNumber || !accountData.accountHolder) {
    alert('모든 항목을 입력해주세요.');
    return;
  }
  
  // 계좌번호 형식 검사 (숫자만, 10-14자리)
  if (!/^\d{10,14}$/.test(accountData.accountNumber)) {
    alert('계좌번호는 10-14자리 숫자만 입력해주세요.');
    accountNumberInput.focus();
    return;
  }
  
  // 예금주 검사 (한글, 영문, 공백만, 2-20자)
  if (!/^[가-힣a-zA-Z\s]{2,20}$/.test(accountData.accountHolder)) {
    alert('예금주명은 한글 또는 영문 2-20자로 입력해주세요.');
    accountHolderInput.focus();
    return;
  }
  
  // TODO: 서버에 계좌 정보 저장
  // fetch('/api/seller/settlement/account', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(accountData)
  // })
  // .then(response => response.json())
  // .then(data => {
  //   alert('정산 계좌가 저장되었습니다.');
  //   window.history.back();
  // })
  // .catch(error => {
  //   console.error('저장 실패:', error);
  //   alert('저장에 실패했습니다. 다시 시도해주세요.');
  // });
  
  console.log('계좌 정보 저장:', accountData);
  alert('정산 계좌가 저장되었습니다.');
  window.history.back();
};

// 계좌번호 포맷팅 (선택사항)
function formatAccountNumber(value) {
  // 숫자만 추출
  const numbers = value.replace(/[^\d]/g, '');
  return numbers;
}

// 페이지 로드 시 기존 계좌 정보 불러오기
document.addEventListener('DOMContentLoaded', () => {
  const bankSelect = document.getElementById('bank-select');
  const accountNumberInput = document.getElementById('account-number');
  const accountHolderInput = document.getElementById('account-holder');
  
  // 요소 존재 확인
  if (!bankSelect || !accountNumberInput || !accountHolderInput) {
    console.error('필수 입력 요소를 찾을 수 없습니다.');
    return;
  }
  
  // 입력 필드에 이벤트 리스너 추가
  bankSelect.addEventListener('change', validateForm);
  accountNumberInput.addEventListener('input', validateForm);
  accountHolderInput.addEventListener('input', validateForm);
  
  // 계좌번호 입력 시 숫자만 입력되도록
  accountNumberInput.addEventListener('input', (e) => {
    e.target.value = formatAccountNumber(e.target.value);
  });
  
  // 예금주 입력 시 한글/영문/공백만 입력되도록
  accountHolderInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^가-힣a-zA-Z\s]/g, '');
  });
  
  // 기존 계좌 정보 불러오기
  loadAccountInfo();
});

async function loadAccountInfo() {
  try {
    // TODO: 서버에서 계좌 정보 불러오기
    // const response = await fetch('/api/seller/settlement/account');
    // const savedAccount = await response.json();
    
    console.log('계좌 정보 로드');
    
    // 임시 데이터 (테스트용)
    const savedAccount = null; // 실제로는 서버 응답 데이터
    
    // 데이터가 있으면 폼에 채우기
    if (savedAccount && savedAccount.bank) {
      const bankSelect = document.getElementById('bank-select');
      const accountNumberInput = document.getElementById('account-number');
      const accountHolderInput = document.getElementById('account-holder');
      
      if (bankSelect) bankSelect.value = savedAccount.bank;
      if (accountNumberInput) accountNumberInput.value = savedAccount.accountNumber;
      if (accountHolderInput) accountHolderInput.value = savedAccount.accountHolder;
      
      validateForm();
    }
  } catch (error) {
    console.error('계좌 정보 로드 실패:', error);
  }
}