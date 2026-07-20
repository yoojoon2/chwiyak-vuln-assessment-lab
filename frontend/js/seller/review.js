// 판매자 리뷰 관리 스크립트

const API_BASE = '';

// 뒤로가기
window.goBack = function() {
  window.history.back();
};

let currentFilter = 'all';
let currentSort = 'latest';
let reviewsCache = [];
let currentReplyReviewId = null;

const filterButtons = [];

document.addEventListener('DOMContentLoaded', () => {
  const token = getToken();
  if (!token) {
    alert('로그인이 필요합니다.');
    window.location.href = '../login&signup/login.html';
    return;
  }

  const buttons = document.querySelectorAll('.review-filter-btn');
  buttons.forEach(btn => {
    filterButtons.push(btn);
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderReviews();
    });
  });

  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderReviews();
    });
  }

  loadReviews();
});

function getToken() {
  return localStorage.getItem('token') || '';
}

async function loadReviews() {
  try {
    const res = await fetch(`${API_BASE}/api/reviews/seller`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || '리뷰 데이터를 불러오지 못했습니다.');
    }

    reviewsCache = await res.json();
    updateStats();
    renderReviews();
  } catch (err) {
    console.error('리뷰 로드 실패:', err);
    alert(err.message || '리뷰 데이터를 불러오지 못했습니다.');
  }
}

function updateStats() {
  const totalReviewsEl = document.getElementById('total-reviews');
  if (totalReviewsEl) {
    totalReviewsEl.textContent = reviewsCache.length;
  }

  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let scoreSum = 0;

  reviewsCache.forEach(r => {
    const rating = Number(r.rating) || 0;
    if (counts[rating] !== undefined) counts[rating]++;
    scoreSum += rating;
  });

  const avgScore = reviewsCache.length ? (scoreSum / reviewsCache.length) : 0;
  const avgScoreEl = document.getElementById('review-average-score');
  if (avgScoreEl) avgScoreEl.textContent = avgScore.toFixed(1);

  const starsEl = document.getElementById('review-average-stars');
  if (starsEl) {
    const fullStars = '★★★★★';
    const highlighted = Math.round(avgScore);
    starsEl.innerHTML = fullStars.split('').map((star, idx) => idx < highlighted ? '<span class="text-yellow-400">★</span>' : '<span class="text-gray-300">★</span>').join('');
  }

  const barsEl = document.getElementById('review-rating-bars');
  if (barsEl) {
    const total = reviewsCache.length || 1;
    barsEl.innerHTML = Object.keys(counts).sort((a, b) => b - a).map(score => {
      const count = counts[score];
      const percent = Math.round((count / total) * 100);
      return `
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600" style="width: 3rem;">${score}점</span>
          <div class="flex-1 bg-gray-200 rounded-full" style="height: 0.5rem;">
            <div class="rounded-full" style="width: ${percent}%; height: 0.5rem; background-color: #facc15;"></div>
          </div>
          <span class="text-sm font-medium text-right" style="width: 2rem;">${count}</span>
        </div>
      `;
    }).join('');
  }

  filterButtons.forEach(btn => {
    const filter = btn.dataset.filter;
    const countSpan = btn.querySelector('.count');
    if (!countSpan) return;
    if (filter === 'all') countSpan.textContent = reviewsCache.length;
    else countSpan.textContent = counts[Number(filter)] || 0;
  });
}

function renderReviews() {
  const listEl = document.getElementById('review-list');
  if (!listEl) return;

  const filtered = reviewsCache.filter(r => {
    if (currentFilter === 'all') return true;
    return Number(r.rating) === Number(currentFilter);
  });

  const sorted = filtered.sort((a, b) => {
    const ratingA = Number(a.rating) || 0;
    const ratingB = Number(b.rating) || 0;
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();

    switch (currentSort) {
      case 'latest':
        return dateB - dateA;
      case 'oldest':
        return dateA - dateB;
      case 'rating-high':
        return ratingB - ratingA;
      case 'rating-low':
        return ratingA - ratingB;
      default:
        return 0;
    }
  });

  if (sorted.length === 0) {
    listEl.innerHTML = '<div class="bg-white rounded-lg shadow p-8 text-center text-gray-500">리뷰가 없습니다.</div>';
    return;
  }

  listEl.innerHTML = sorted.map(renderReviewCard).join('');
}

function renderReviewCard(review) {
  const {
    review_id,
    rating,
    content,
    image_urls = [],
    created_at,
    buyer_name,
    product_name,
    product_image,
    brand,
    order_name,
    seller_comment,
    commented_at
  } = review;

  const imgUrl = product_image
    ? (product_image.startsWith('/uploads') ? `${API_BASE}${product_image}` : product_image)
    : null;

  const formattedDate = created_at ? new Date(created_at).toLocaleDateString('ko-KR') : '';
  const ratingStars = '★★★★★'.split('').map((star, idx) => idx < rating ? '<span class="text-yellow-400">★</span>' : '<span class="text-gray-300">★</span>').join('');

  const photos = Array.isArray(image_urls) ? image_urls : [];
  const photoHtml = photos.map(url => {
    const finalUrl = url.startsWith('/uploads') ? `${API_BASE}${url}` : url;
    return `<div class="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden"><img src="${finalUrl}" alt="리뷰 이미지" class="w-full h-full object-cover" /></div>`;
  }).join('');

  const commentSection = seller_comment
    ? `
        <div class="bg-gray-50 rounded-lg p-4">
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm font-semibold text-gray-900">판매자 답변</p>
            <button onclick="editReply(${review_id})" class="text-xs text-gray-600 hover:text-gray-900">수정</button>
          </div>
          <p class="text-sm text-gray-700 whitespace-pre-line">${seller_comment}</p>
          <p class="text-xs text-gray-500 mt-2">${commented_at ? new Date(commented_at).toLocaleString('ko-KR') : ''}</p>
        </div>
      `
    : `
        <div class="border-t border-gray-200 pt-4">
          <button onclick="openReplyModal(${review_id})" class="w-full py-3 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
            답변 작성하기
          </button>
        </div>
      `;

  return `
    <div class="bg-white rounded-lg shadow p-6 review-item" data-rating="${rating}">
      <div class="flex gap-4 mb-4">
        <div class="w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
          ${imgUrl ? `<img src="${imgUrl}" alt="${product_name || '상품'}" class="w-full h-full object-cover">` : ''}
        </div>
        <div class="flex-1">
          <h4 class="font-bold mb-1">${product_name || '상품명 없음'}</h4>
          <p class="text-xs text-gray-500 mb-2">주문번호: ${order_name || '-'}</p>
          <div class="flex items-center gap-2 mb-2">
            <div class="text-yellow-400">${ratingStars}</div>
            <span class="text-sm font-medium">${rating.toFixed(1) || rating}</span>
          </div>
        </div>
      </div>

      <div class="border-t border-gray-100 pt-4">
        <div class="flex items-start justify-between mb-3">
          <div>
            <p class="font-medium mb-1">${buyer_name || '구매자'}</p>
            <p class="text-xs text-gray-500">${formattedDate}</p>
          </div>
          <button onclick="reportReview(${review_id})" class="text-xs text-gray-500 hover:text-red-500">신고</button>
        </div>

        <p class="text-sm text-gray-700 mb-3" style="line-height: 1.625;">${content || ''}</p>

        ${photos.length ? `<div class="flex gap-2 mb-4">${photoHtml}</div>` : ''}

        ${commentSection}
      </div>
    </div>
  `;
}

window.openReplyModal = function(reviewId) {
  const modal = document.getElementById('reply-modal');
  const replyText = document.getElementById('reply-text');
  if (modal && replyText) {
    modal.classList.add('active');
    const target = reviewsCache.find(r => r.review_id === reviewId);
    replyText.value = target?.seller_comment || '';
    modal.dataset.reviewId = reviewId;
    currentReplyReviewId = reviewId;
  }
};

window.closeReplyModal = function() {
  const modal = document.getElementById('reply-modal');
  if (modal) {
    modal.classList.remove('active');
    delete modal.dataset.reviewId;
  }
  currentReplyReviewId = null;
};

window.submitReply = async function() {
  const modal = document.getElementById('reply-modal');
  const replyText = document.getElementById('reply-text');
  if (!modal || !replyText) return;

  const content = replyText.value.trim();
  if (!content) {
    alert('답변 내용을 입력해주세요.');
    return;
  }

  const reviewId = Number(modal.dataset.reviewId || currentReplyReviewId);
  if (!reviewId) {
    alert('리뷰 정보를 찾을 수 없습니다.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/reviews/${reviewId}/comment`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ comment: content })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || '답변 등록에 실패했습니다.');
    }

    const data = await res.json();
    const target = reviewsCache.find(r => r.review_id === reviewId);
    if (target) {
      target.seller_comment = data.comment;
      target.commented_at = data.commented_at;
    }

    renderReviews();
    closeReplyModal();
    alert('답변이 등록되었습니다.');
  } catch (err) {
    console.error('답변 등록 오류:', err);
    alert(err.message || '답변 등록에 실패했습니다.');
  }
};

window.editReply = function(reviewId) {
  if (!confirm('답변을 수정하시겠습니까?')) return;
  openReplyModal(reviewId);
};

window.reportReview = function(reviewId) {
  const reason = prompt('신고 사유를 입력해주세요:\n\n1. 욕설/비방\n2. 허위 사실\n3. 광고/스팸\n4. 기타');
  if (!reason) return;
  console.log('리뷰 신고:', { reviewId, reason });
  alert('신고가 접수되었습니다. 검토 후 조치하겠습니다.');
};

window.loadMoreReviews = function() {
  alert('모든 리뷰를 불러왔습니다.');
};

document.addEventListener('click', (e) => {
  const modal = document.getElementById('reply-modal');
  if (e.target === modal) closeReplyModal();
});