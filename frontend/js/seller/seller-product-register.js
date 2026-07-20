// /frontend/js/seller-product-register.js

// 전역: '등록 취소(X)' 버튼에서 사용
window.cancelRegister = function cancelRegister() {
  window.location.href = '/frontend/pages/seller/seller.html';
};

document.addEventListener('DOMContentLoaded', () => {
  // 아이콘 렌더
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }

  // 헬퍼
  const qs  = (sel) => document.querySelector(sel);
  const qsa = (sel) => document.querySelectorAll(sel);
  const show = (el) => el && el.classList.remove('hidden');
  const hide = (el) => el && el.classList.add('hidden');

  // 스텝 요소
  const step1 = qs('#step1');
  const step2 = qs('#step2');
  const step3 = qs('#step3');

  // 버튼
  const toStep2 = qs('#toStep2');
  const backTo1 = qs('#backTo1');
  const toStep3 = qs('#toStep3');
  const backTo2 = qs('#backTo2');
  const submitAll = qs('#submitAll');

  // 입력 & 에러
  const productName = qs('#productName');
  const productPrice = qs('#productPrice');
  const productCategory = qs('#productCategory');
  const errName = qs('#errName');
  const errCategory = qs('#errCategory');
  const errPrice = qs('#errPrice');

  // 카테고리 선택
  const categoryButtons = qsa('.cat-btn');
  const selectedClasses = ['bg-sky-100','border','border-sky-300','text-sky-700'];
  const defaultClasses  = ['bg-gray-100','border','border-transparent','text-gray-800'];

  categoryButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      categoryButtons.forEach((b) => {
        b.classList.remove(...selectedClasses);
        defaultClasses.forEach((c) => b.classList.add(c));
      });
      defaultClasses.forEach((c) => btn.classList.remove(c));
      btn.classList.add(...selectedClasses);
      if (productCategory) productCategory.value = btn.dataset.category || '';
    });
  });

  // 이미지 업로드
  const mainInput = qs('#mainImage');
  const mainPreviewWrap = qs('#mainPreviewWrap');
  const mainPreview = qs('#mainPreview');
  const errMainImage = qs('#errMainImage');

  if (mainInput) {
    mainInput.addEventListener('change', () => {
      const file = mainInput.files && mainInput.files[0];
      if (!file) {
        mainPreviewWrap && mainPreviewWrap.classList.add('hidden');
        return;
      }

      // JPG/JPEG 확장자 검사
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext !== 'jpg' && ext !== 'jpeg') {
        alert('JPG 형식의 이미지 파일만 업로드할 수 있습니다.');
        mainInput.value = ''; // 파일 선택 초기화
        mainPreviewWrap && mainPreviewWrap.classList.add('hidden');
        return;
      }

      // ✅ 미리보기 표시
      const reader = new FileReader();
      reader.onload = (e) => {
        if (mainPreview) mainPreview.src = e.target.result;
        mainPreviewWrap && mainPreviewWrap.classList.remove('hidden');
        hide(errMainImage);
        mainPreviewWrap && mainPreviewWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      };
      reader.readAsDataURL(file);
    });
  }


  const detailInput = qs('#detailImages');
  const detailCount = qs('#detailCount');
  if (detailInput && detailCount) {
    detailInput.addEventListener('change', () => {
      const count = detailInput.files ? detailInput.files.length : 0;
      if (count > 0) {
        detailCount.textContent = `${count}개의 상세 이미지가 선택되었습니다.`;
        detailCount.classList.remove('hidden');
      } else {
        detailCount.classList.add('hidden');
      }
    });
  }

  // STEP1 -> STEP2
  toStep2 && toStep2.addEventListener('click', () => {
    const name = (productName?.value || '').trim();
    const category = (productCategory?.value || '').trim();
    const priceNum = Number(productPrice?.value);

    let ok = true;
    name ? hide(errName) : (ok = false, show(errName));
    category ? hide(errCategory) : (ok = false, show(errCategory));
    priceNum > 0 ? hide(errPrice) : (ok = false, show(errPrice));
    if (!ok) return;

    step1?.classList.add('opacity-0','-translate-x-full');
    setTimeout(() => { step1?.classList.add('hidden'); step2?.classList.remove('hidden'); }, 200);
    setTimeout(() => {
      step2?.classList.remove('translate-x-full','opacity-0');
      step2?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 220);
  });

  // STEP2 -> 이전
  backTo1 && backTo1.addEventListener('click', () => {
    step2?.classList.add('opacity-0','translate-x-full');
    setTimeout(() => { step2?.classList.add('hidden'); step1?.classList.remove('hidden'); }, 200);
    setTimeout(() => {
      step1?.classList.remove('-translate-x-full','opacity-0');
      step1?.scrollIntoView({ behavior: 'smooth' });
    }, 220);
  });

  // STEP2 -> STEP3
  toStep3 && toStep3.addEventListener('click', () => {
    const hasMain = mainInput?.files && mainInput.files[0];
    if (!hasMain) { show(errMainImage); return; }

    step2?.classList.add('opacity-0','-translate-x-full');
    setTimeout(() => { step2?.classList.add('hidden'); step3?.classList.remove('hidden'); }, 200);
    setTimeout(() => {
      step3?.classList.remove('translate-x-full','opacity-0');
      step3?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 220);
  });

  // STEP3 -> 이전
  backTo2 && backTo2.addEventListener('click', () => {
    step3?.classList.add('opacity-0','translate-x-full');
    setTimeout(() => { step3?.classList.add('hidden'); step2?.classList.remove('hidden'); }, 200);
    setTimeout(() => {
      step2?.classList.remove('-translate-x-full','opacity-0');
      step2?.scrollIntoView({ behavior: 'smooth' });
    }, 220);
  });

  // 최종 제출
  submitAll && submitAll.addEventListener('click', async () => {
    // FormData는 그대로 사용합니다.
    const fd = new FormData();
    fd.append('name', (productName?.value || '').trim());
    fd.append('category', (productCategory?.value || '').trim());
    fd.append('price', (productPrice?.value || '').trim());
    const productDesc = qs('#productDesc');
    if (productDesc) fd.append('description', productDesc.value.trim());

    if (mainInput?.files?.[0]) {
      fd.append('mainImage', mainInput.files[0]);
    } else {
      alert('메인 이미지를 선택해주세요.');
      return;
    }
    
    // 상세 이미지는 현재 백엔드 로직에서 처리하지 않으므로 주석 처리
    // if (detailInput?.files?.length) {
    //   Array.from(detailInput.files).forEach((f) => fd.append('detailImages', f, f.name));
    // }

    // --- 🔽 [수정] 실제 API 연결 🔽 ---
    try {
      const userType = localStorage.getItem('userType');
      if (!userType) {
        alert('로그인이 필요합니다.');
        window.location.href = '/frontend/pages/login&signup/login.html';
        return;
      }

      // FormData는 Content-Type을 지정하지 않아야 브라우저가 자동으로 설정해줍니다.
      const res = await fetch('/api/sellerProducts', {
        method: 'POST',
        credentials: 'include',
        body: fd 
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || '등록 실패');
      
      alert('상품 등록이 완료되었습니다.');
      window.location.href = '/frontend/pages/seller/seller.html';

    } catch (e) {
      console.error('상품 등록 오류:', e);
      alert(`상품 등록 중 오류가 발생했습니다: ${e.message}`);
      return;
    }
    // --- 🔼 API 연결 끝 🔼 ---
  });
});
