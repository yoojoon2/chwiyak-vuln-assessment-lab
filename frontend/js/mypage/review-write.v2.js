// js/mypage/review-write.js (전체 교체)

const API_BASE = '';

// 뒤로가기
window.goBack = function() {
  window.history.back();
};

// 홈으로
window.goHome = function() {
  window.location.href = '../../pages/main.html';
};

document.addEventListener("DOMContentLoaded", async () => {
  let selectedRating = 0;
  // *** [수정] 파일 객체(신규)와 URL(기존)을 모두 다루기 위해 변경
  let existingImageUrls = []; // 기존 이미지 URL
  let newImageFiles = []; // 새로 추가된 File 객체
  const maxPhotos = 5;

  const state = {
    orderId: null,
    orderItemId: null,
    productId: null,
    reviewId: null, // *** [추가]
    orderName: null,
    isEditMode: false // *** [추가]
  };

  const userType = localStorage.getItem('userType');
  if (!userType) {
    alert('로그인이 필요합니다.');
    window.location.href = '../login&signup/login.html';
    return;
  }

  // UI 요소 캐싱
  const titleElement = document.getElementById('page-title');
  const starButtons = document.querySelectorAll('.star-btn');
  const ratingText = document.getElementById('rating-text');
  const reviewContent = document.getElementById('review-content');
  const charCount = document.getElementById('char-count');
  const photoUpload = document.getElementById('photo-upload');
  const photoPreviewContainer = document.getElementById('photo-preview-container');
  const submitBtn = document.getElementById('submit-review');

  const urlParams = new URLSearchParams(window.location.search);
  state.reviewId = urlParams.get('reviewId');
  state.orderId = urlParams.get('orderId');
  state.orderItemId = urlParams.get('orderItemId');
  state.productId = urlParams.get('productId');

  // *** [수정] 수정 모드와 생성 모드 분기
  try {
    if (state.reviewId) {
      // === 수정 모드 ===
      state.isEditMode = true;
      titleElement.textContent = '리뷰 수정';
      submitBtn.textContent = '리뷰 수정';
      await loadReviewForEdit(state.reviewId);
    } else if (state.orderId && state.orderItemId) {
      // === 생성 모드 ===
      state.isEditMode = false;
      titleElement.textContent = '리뷰 쓰기';
      submitBtn.textContent = '리뷰 등록';
      await loadOrderForCreate(state.orderId, state.orderItemId);
    } else {
      throw new Error('필요한 정보(주문 또는 리뷰 ID)가 없습니다.');
    }
  } catch (err) {
    console.error('페이지 초기화 실패:', err);
    alert(err.message || '정보를 불러오지 못했습니다. 이전 페이지로 돌아갑니다.');
    window.location.href = './review.html';
    return;
  }

  // === 공통 로직 (이벤트 리스너) ===

  // 별점 이벤트
  starButtons.forEach((btn) => {
    btn.addEventListener('click', function() {
      selectedRating = parseInt(this.getAttribute('data-rating'));
      updateStars(selectedRating);
      updateRatingText(selectedRating);
    });

    btn.addEventListener('mouseenter', function() {
      const hoverRating = parseInt(this.getAttribute('data-rating'));
      updateStars(hoverRating);
    });
  });

  const starContainer = starButtons[0]?.parentElement;
  if (starContainer) {
    starContainer.addEventListener('mouseleave', function() {
      updateStars(selectedRating);
    });
  }

  // 텍스트 카운트
  reviewContent.addEventListener('input', function() {
    const length = this.value.length;
    charCount.textContent = length;
    if (length > 500) {
      this.value = this.value.substring(0, 500);
      charCount.textContent = 500;
    }
  });

  // 사진 첨부
  photoUpload.addEventListener('change', function(e) {
    const files = Array.from(e.target.files);
    let totalPhotos = existingImageUrls.length + newImageFiles.length;

    files.forEach(file => {
      if (totalPhotos >= maxPhotos) {
        alert(`최대 ${maxPhotos}장까지만 첨부할 수 있습니다.`);
        return;
      }
      if (file.type.startsWith('image/')) {
        newImageFiles.push(file);
        displayPhoto(file); // File 객체 전달
        totalPhotos++; // 총 사진 수 증가
      }
    });
    this.value = ''; // input 초기화
  });

  // 제출 버튼
  submitBtn.addEventListener('click', async function() {
    if (selectedRating === 0) {
      alert('별점을 선택해주세요.');
      return;
    }
    const content = reviewContent.value.trim();
    if (content.length < 10) {
      alert('리뷰는 최소 10자 이상 작성해주세요.');
      reviewContent.focus();
      return;
    }

    // 전송할 리뷰 데이터 (텍스트)
    const reviewData = {
      rating: selectedRating,
      content: content,
    };

    submitBtn.disabled = true;
    submitBtn.textContent = '처리 중...';

    if (state.isEditMode) {
      // === 수정 로직 ===
      reviewData.review_id = state.reviewId;
      await submitUpdateReview(reviewData);
    } else {
      // === 생성 로직 ===
      reviewData.product_id = Number(state.productId);
      reviewData.order_item_id = Number(state.orderItemId);
      await submitCreateReview(reviewData);
    }

    submitBtn.disabled = false;
  });

  // === 함수 정의 ===

  // [수정] 수정 모드 데이터 로드
  async function loadReviewForEdit(reviewId) {
    const response = await fetch(`${API_BASE}/api/reviews/${reviewId}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || '리뷰 정보를 불러오지 못했습니다.');
    }

    const review = await response.json();
    
    // state 업데이트
    state.orderId = review.order_id;
    state.orderItemId = review.order_item_id;
    state.productId = review.product_id;
    state.orderName = review.order_name;

    // 상품 정보 렌더링
    renderProductInfo(review); // review 객체에 product_name 등이 포함되어 있음

    // 폼 채우기
    selectedRating = review.rating;
    updateStars(selectedRating);
    updateRatingText(selectedRating);

    reviewContent.value = review.content || '';
    reviewContent.dispatchEvent(new Event('input')); // 글자 수 업데이트

    // 기존 사진 렌더링
    if (Array.isArray(review.image_urls)) {
      existingImageUrls = review.image_urls;
      existingImageUrls.forEach(url => displayPhoto(url)); // URL 문자열 전달
    }
  }

  // [수정] 생성 모드 데이터 로드
  async function loadOrderForCreate(orderId, orderItemId) {
    const response = await fetch(`${API_BASE}/api/buyer/orders/${orderId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || '주문 정보를 불러오지 못했습니다.');
    }

    const order = await response.json();
    state.orderName = order.order_name || order.order_id;

    const targetItem = Array.isArray(order.items)
      ? order.items.find(it => String(it.item_id) === String(orderItemId))
      : null;

    if (!targetItem) {
      throw new Error('선택한 주문 상품을 찾을 수 없습니다.');
    }

    if (!state.productId) {
      state.productId = targetItem.product_id;
    }

    renderProductInfo(targetItem); // targetItem 객체 전달
  }

  // [수정] 리뷰 생성 제출 (FormData 사용)
  async function submitCreateReview(reviewData) {
    // reviewData는 { rating, content, product_id, order_item_id }
    
    // 1. FormData 생성
    const formData = new FormData();
    formData.append('rating', reviewData.rating);
    formData.append('content', reviewData.content);
    formData.append('product_id', reviewData.product_id);
    formData.append('order_item_id', reviewData.order_item_id);

    // 2. 새로 추가된 파일(File 객체)들 'images' 필드에 추가
    newImageFiles.forEach(file => {
      formData.append('images', file); // 'images'는 routes.js의 upload.array()와 일치
    });
    
    try {
      // 3. fetch 요청 (Content-Type 헤더 제거!)
      const response = await fetch(`${API_BASE}/api/reviews`, {
        method: 'POST',
        credentials: 'include',
        body: formData // JSON.stringify가 아닌 formData 객체
      });

      const result = await response.json();
      if (response.ok) {
        alert('리뷰가 등록되었습니다!');
        window.location.href = './review.html';
      } else {
        alert(result.message || '리뷰 등록에 실패했습니다.');
        submitBtn.textContent = '리뷰 등록';
      }
    } catch (error) {
      console.error('리뷰 등록 오류:', error);
      alert('리뷰 등록 중 오류가 발생했습니다.');
      submitBtn.textContent = '리뷰 등록';
    }
  }

  // [수정] 리뷰 수정 제출 (FormData 사용)
  async function submitUpdateReview(reviewData) {
    // reviewData는 { rating, content, review_id }
    
    // 1. FormData 생성
    const formData = new FormData();
    formData.append('rating', reviewData.rating);
    formData.append('content', reviewData.content);
    
    // 2. '유지할' 기존 이미지 URL 목록 (JSON 문자열로 전송)
    // 백엔드(controller)에서 'existingImageUrls' 키로 받기로 함
    formData.append('existingImageUrls', JSON.stringify(existingImageUrls));

    // 3. 새로 추가된 파일(File 객체)들 'images' 필드에 추가
    newImageFiles.forEach(file => {
      formData.append('images', file); // 'images'는 routes.js의 upload.array()와 일치
    });

    try {
      // 4. fetch 요청 (Content-Type 헤더 제거!)
      const response = await fetch(`${API_BASE}/api/reviews/${state.reviewId}`, {
        method: 'PUT',
        credentials: 'include',
        body: formData // JSON.stringify가 아닌 formData 객체
      });

      const result = await response.json();
      if (response.ok) {
        alert('리뷰가 수정되었습니다!');
        window.location.href = './review.html';
      } else {
        alert(result.message || '리뷰 수정에 실패했습니다.');
        submitBtn.textContent = '리뷰 수정';
      }
    } catch (error) {
      console.error('리뷰 수정 오류:', error);
      alert('리뷰 수정 중 오류가 발생했습니다.');
      submitBtn.textContent = '리뷰 수정';
    }
  }

  // 별점 UI 업데이트
  function updateStars(rating) {
    starButtons.forEach((btn, index) => {
      if (index < rating) {
        btn.classList.remove('text-gray-300');
        btn.classList.add('text-yellow-400');
      } else {
        btn.classList.remove('text-yellow-400');
        btn.classList.add('text-gray-300');
      }
    });
  }

  // 별점 텍스트 업데이트
  function updateRatingText(rating) {
    const texts = {
      1: '별로예요',
      2: '그저 그래요',
      3: '보통이에요',
      4: '좋아요',
      5: '최고예요!'
    };
    ratingText.textContent = texts[rating] || '별점을 선택해주세요';
  }

  // [수정] 사진 미리보기 (URL 또는 File 객체 처리)
  function displayPhoto(photo) {
    const photoDiv = document.createElement('div');
    photoDiv.className = 'relative w-24 h-24 flex-shrink-0';

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-photo absolute -top-2 -right-2 w-6 h-6 bg-gray-900 text-white rounded-full text-xs hover:bg-gray-700 transition z-10';
    removeBtn.innerHTML = '✕';
    
    photoDiv.appendChild(removeBtn);
    photoPreviewContainer.appendChild(photoDiv);

    if (typeof photo === 'string') {
      // === 기존 이미지 (URL) ===
      const finalUrl = photo.startsWith('/uploads') ? `${API_BASE}${photo}` : photo;
      const img = document.createElement('img');
      img.src = finalUrl;
      img.className = "w-full h-full object-cover rounded-lg";
      img.alt = "리뷰 사진";
      photoDiv.prepend(img);
      
      removeBtn.addEventListener('click', function() {
        // '유지할' URL 목록에서 제거
        const index = existingImageUrls.indexOf(photo);
        if (index > -1) {
          existingImageUrls.splice(index, 1);
        }
        photoDiv.remove();
      });

    } else if (photo instanceof File) {
      // === 새 이미지 (File) ===
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.className = "w-full h-full object-cover rounded-lg";
        img.alt = "리뷰 사진";
        photoDiv.prepend(img);
      };
      reader.readAsDataURL(photo);

      removeBtn.addEventListener('click', function() {
        // '새로 올릴' File 목록에서 제거
        const index = newImageFiles.indexOf(photo);
        if (index > -1) {
          newImageFiles.splice(index, 1);
        }
        photoDiv.remove();
      });
    }
  }

  // [수정] 상품 정보 렌더링 (범용)
  function renderProductInfo(data) {
    const imageWrapper = document.getElementById('review-product-image');
    const nameEl = document.getElementById('review-product-name');
    const brandEl = document.getElementById('review-product-brand');
    const orderNumberEl = document.getElementById('review-order-number');

    // data 객체는 'item' 또는 'review' 객체일 수 있음
    const imageUrl = data.imageUrl || data.product_image;
    const finalImageUrl = imageUrl
      ? (imageUrl.startsWith('/uploads') ? `${API_BASE}${imageUrl}` : imageUrl)
      : null;

    if (imageWrapper) {
      if (finalImageUrl) {
        imageWrapper.innerHTML = `<img src="${finalImageUrl}" alt="${data.product_name || '상품 이미지'}" class="w-full h-full object-cover" />`;
      } else {
        imageWrapper.innerHTML = '<div class="w-full h-full bg-gray-200"></div>';
      }
    }

    if (nameEl) nameEl.textContent = data.product_name || '상품명 정보 없음';
    if (brandEl) brandEl.textContent = data.brand || '브랜드 미표시';
    if (orderNumberEl) orderNumberEl.textContent = state.orderName || data.order_name || data.order_id || '-';
  }
});