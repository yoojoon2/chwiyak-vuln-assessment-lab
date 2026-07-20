// 금액 포맷 함수
const fmtKRW = (n) => {
  const num = Number(n);
  return Number.isFinite(num)
    ? new Intl.NumberFormat("ko-KR", { style: "decimal" }).format(num) + " 원"
    : n || "";
};

const resolveWishlistImage = (raw) => {
  if (!raw) return '/frontend/public/placeholder.webp';

  // 1) 이미 절대 URL이면 그대로 사용 (S3 등)
  // if (/^https?:\/\//i.test(raw)) return raw;

  // 2) 문자열 안에 '/uploads/'가 들어있으면 그 부분부터 잘라 상대경로로 통일
  const idx = raw.indexOf('/uploads/');
  if (idx >= 0) return raw.slice(idx);          // => "/uploads/…"

  // 3) 키만 들어온 경우 보정
  return `/uploads/${raw.replace(/^\/?uploads\/?/, '')}`;
};

// 마이페이지 스크립트
document.addEventListener("DOMContentLoaded", async () => {
  
  // ✅ 토큰 확인
  const userType = localStorage.getItem('userType');
  if (!userType) {
    alert('로그인이 필요합니다.');
    window.location.href = '../login&signup/login.html';
    return;
  }

  // ✅ API에서 사용자 정보 가져오기
  try {
    const response = await fetch('/api/users/mypage/summary', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('인증 실패');
    }

    const data = await response.json();
    console.log('📦 마이페이지 통합 데이터:', data);
    
    // ✅ 사용자 정보 표시
    const nameElement = document.querySelector('section h3');
    const emailElement = document.querySelector('section p');
    if (nameElement) nameElement.textContent = data.user.name;
    if (emailElement) emailElement.textContent = data.user.email;

    // ✅ 주문 통계 업데이트
    const orderGrid = document.getElementById('order-status-grid');
    if (orderGrid) {
      orderGrid.innerHTML = `
        <div class="order-status-tab text-center py-8 cursor-pointer hover:bg-gray-100 transition" data-status="결제완료">
          <p class="text-sm font-medium text-gray-700 mb-2">결제완료</p>
          <p class="text-2xl text-gray-900">${data.stats?.orderCounts?.결제완료 || 0}</p>
        </div>
        <div class="order-status-tab text-center py-8 cursor-pointer hover:bg-gray-100 transition" data-status="상품 준비중">
          <p class="text-sm font-medium text-gray-700 mb-2">상품 준비중</p>
          <p class="text-2xl text-gray-900">${data.stats?.orderCounts?.['상품 준비중'] || 0}</p>
        </div>
        <div class="order-status-tab text-center py-8 cursor-pointer hover:bg-gray-100 transition" data-status="배송중">
          <p class="text-sm font-medium text-gray-700 mb-2">배송중</p>
          <p class="text-2xl text-gray-900">${data.stats?.orderCounts?.배송중 || 0}</p>
        </div>
        <div class="order-status-tab text-center py-8 cursor-pointer hover:bg-gray-100 transition" data-status="배송완료">
          <p class="text-sm font-medium text-gray-700 mb-2">배송완료</p>
          <p class="text-2xl text-gray-900">${data.stats?.orderCounts?.배송완료 || 0}</p>
        </div>
      `;
    }

    // ✅ 포인트 별도 조회 (통합 API에 포인트가 없거나 0일 경우 대비)
    let totalPoints = 0;
    try {
      console.log('💰 포인트 별도 조회 시작...');
      // ✅ 수정: /api/buyer-points → /api/buyer/points
      const pointResponse = await fetch('/api/buyer/points/balance', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (pointResponse.ok) {
        const pointData = await pointResponse.json();
        console.log('💰 포인트 API 응답:', pointData);
        totalPoints = pointData.total_points || 0;
      } else {
        console.warn('⚠️ 포인트 API 실패, summary 데이터 사용');
        totalPoints = data.stats?.points || 0;
      }
    } catch (err) {
      console.error('❌ 포인트 조회 실패:', err);
      // summary API의 포인트 사용
      totalPoints = data.stats?.points || 0;
    }

    console.log('💰 최종 포인트:', totalPoints);

    // ✅ 쿠폰/포인트/리뷰 통계 업데이트
    const statsGrid = document.getElementById('stats-grid');
    if (statsGrid) {
      statsGrid.innerHTML = `
        <div class="stat-item text-center py-4 cursor-pointer transition hover:bg-gray-50" data-type="쿠폰">
          <p class="text-sm font-medium text-gray-700 mb-1">쿠폰</p>
          <p class="text-xl text-gray-900">${data.stats?.couponCount || 0}</p>
        </div>
        <div class="stat-item text-center py-4 cursor-pointer transition hover:bg-gray-50" data-type="포인트">
          <p class="text-sm font-medium text-gray-700 mb-1">포인트</p>
          <p class="text-xl text-gray-900">${totalPoints.toLocaleString()}</p>
        </div>
        <div class="stat-item text-center py-4 cursor-pointer transition hover:bg-gray-50" data-type="리뷰">
          <p class="text-sm font-medium text-gray-700 mb-1">리뷰</p>
          <p class="text-xl text-gray-900">${data.stats?.reviewCount || 0}</p>
        </div>
      `;
    }

    // ✅ 위시리스트 표시
    const wishlistContainer = document.getElementById("wishlist-container");
    if (wishlistContainer && data.wishlist && data.wishlist.length > 0) {
      const sortedWishlist = [...data.wishlist].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      const wishlistCards = sortedWishlist.map(item => {
        const productId = item.productId ?? item.product_id ?? item.id;
        // const price = typeof item.price === 'number' ? item.price.toLocaleString() : item.price;
        const price = fmtKRW(item.price);
        const imageUrl = resolveWishlistImage(item.thumbnailUrl || item.imageUrl || item.image);
        const imageMarkup = imageUrl
          ? `<img src="${imageUrl}" alt="${item.name}" />`
          : `<span class="text-gray-500 text-sm">이미지</span>`;

        return `
          <div class="wishlist-card bg-gray-50 cursor-pointer hover:shadow-lg transition" data-product-id="${productId ?? ''}">
            <div class="wishlist-image flex items-center justify-center">${imageMarkup}</div>
            <div class="p-3 bg-white">
              <p class="text-sm font-medium truncate">${item.name}</p>
              <p class="text-sm font-bold mt-2">${price}</p>
            </div>
          </div>
        `;
      }).join('');

      wishlistContainer.innerHTML = wishlistCards;
    } else if (wishlistContainer) {
      wishlistContainer.innerHTML = `
        <div class="w-full text-center py-8 text-gray-500">
          <p>위시리스트가 비어있습니다.</p>
        </div>
      `;
    }

    // 주문 내역 탭 클릭 이벤트 재등록
    const orderTabs = document.querySelectorAll('.order-status-tab');
    orderTabs.forEach(tab => {
      tab.addEventListener("click", function() {
        const status = this.getAttribute('data-status');
        window.location.href = `./orderlist.html?status=${encodeURIComponent(status)}`;
      });
    });

    // 쿠폰/포인트/리뷰 클릭 이벤트 재등록
    const statItems = document.querySelectorAll('.stat-item');
    statItems.forEach((item) => {
      item.addEventListener("click", () => {
        const type = item.getAttribute('data-type');
        if (type === '쿠폰') window.location.href = './coupon.html';
        else if (type === '포인트') window.location.href = './point.html';
        else if (type === '리뷰') window.location.href = './review.html';
      });
    });

    // 위시리스트 카드 클릭 이벤트
    if (wishlistContainer) {
      wishlistContainer.addEventListener("click", (e) => {
        const imageArea = e.target.closest('.wishlist-image');
        const card = e.target.closest('.wishlist-card');
        if (imageArea && card) {
          const productId = card.getAttribute('data-product-id') || '105';
          window.location.href = `../category/product.html?id=${encodeURIComponent(productId)}`;
        }
      });
    }

  } catch (error) {
    console.error('❌ API 에러:', error);
    alert('사용자 정보를 불러오는데 실패했습니다.');
    
    window.location.href = '../login&signup/login.html';
  }

  // 위시리스트 슬라이더 함수
  window.slideLeft = function() {
    const container = document.getElementById("wishlist-container");
    if (container) container.scrollBy({ left: -220, behavior: "smooth" });
  };

  window.slideRight = function() {
    const container = document.getElementById("wishlist-container");
    if (container) container.scrollBy({ left: 220, behavior: "smooth" });
  };

  // 회원정보 수정 버튼
  const profileManageBtn = document.getElementById("profile-manage-btn");
  if (profileManageBtn) {
    profileManageBtn.addEventListener("click", () => {
      window.location.href = './profile.html';
    });
  }
  
  // 회원 탈퇴 버튼
  const withdrawBtn = document.getElementById("withdraw-btn");
  if (withdrawBtn) {
    withdrawBtn.addEventListener("click", () => {
      if (confirm("정말 회원 탈퇴하시겠습니까?")) {
        
        localStorage.removeItem('userType');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        alert("회원 탈퇴 처리되었습니다.");
        window.location.href = '../main.html';
      }
    });
  }

  // 위시리스트 전체보기
  window.goToWishlist = function() {
    window.location.href = './wishlist.html';
  };
});