// 주문 내역 페이지 스크립트

// 뒤로가기
window.goBack = function() {
  window.history.back();
};

// 홈으로
window.goHome = function() {
  window.location.href = '../main.html';
};

// SHOP 바로가기
window.goShopping = function() {
  window.location.href = '../main.html';
};

// 리뷰 쓰기
window.writeReview = function(orderId) {
  window.location.href = `./review-write.html?orderId=${orderId}`;
};

// *** [추가] 주문번호 포맷 함수
/**
 * 날짜와 주문 ID를 조합하여 YYYYMMDDID 형식의 주문번호를 생성합니다.
 * @param {string} createdAt - (예: "2025-10-31T10:00:00Z")
 * @param {number | string} orderId - (예: 12)
 * @returns {string} (예: "2025103112")
 */
function formatOrderNumber(createdAt, orderId) {
  if (!createdAt || !orderId) {
    return orderId || 'N/A'; // Fallback
  }
  try {
    const date = new Date(createdAt);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    // YYYYMMDD + orderId
    return `${year}${month}${day}${orderId}`;
  } catch (e) {
    console.error("주문번호 포맷 오류:", e);
    return orderId; // 오류 발생 시 order_id만 반환
  }
}

// 상태 매핑 (4가지만)
const STATUS_MAP = {
  'PAID': '결제완료',
  'PROCESSING': '상품 준비중',
  'SHIPPED': '배송중',
  'DELIVERED': '배송완료'
};

const STATUS_MAP_REVERSE = {
  '결제완료': 'PAID',
  '상품 준비중': 'PREPARING',
  '배송중': 'SHIPPED',
  '배송완료': 'DELIVERED'
};

document.addEventListener("DOMContentLoaded", async () => {
  const userType = localStorage.getItem('userType');
  
  if (!userType) {
    alert('로그인이 필요합니다.');
    window.location.href = '../login&signup/login.html';
    return;
  }

  // ✅ tabs 변수를 먼저 선언
  const tabs = document.querySelectorAll('.order-tab');
  
  // ✅ 전체 주문 데이터 로드
  let allOrders = [];
  try {
    console.log('📦 주문 데이터 로딩 시작...');
    const response = await fetch('/api/buyer/orders', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });

    if (response.ok) {
      allOrders = await response.json();
      console.log('📦 전체 주문 데이터:', allOrders);
      
      // ✅ 상태별 카운트 업데이트 (tabs가 이미 선언된 이후)
      updateStatusCounts(allOrders, tabs);
    } else {
      console.error('❌ 주문 내역 조회 실패:', response.status);
      const orderList = document.getElementById('order-list');
      orderList.innerHTML = `
        <div class="empty-state bg-white rounded-lg shadow p-8">
          <p class="text-gray-500 mb-6">주문 내역을 불러오는데 실패했습니다.</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('❌ 주문 내역 로드 오류:', error);
    const orderList = document.getElementById('order-list');
    orderList.innerHTML = `
      <div class="empty-state bg-white rounded-lg shadow p-8">
        <p class="text-gray-500 mb-6">주문 내역을 불러오는데 실패했습니다.</p>
      </div>
    `;
  }

  // URL 파라미터에서 상태 가져오기
  const urlParams = new URLSearchParams(window.location.search);
  const statusParam = urlParams.get('status');
  
  // 초기 로드 시 URL 파라미터에 맞는 탭 활성화
  if (statusParam) {
    tabs.forEach(tab => {
      const tabStatus = tab.getAttribute('data-status');
      if (tabStatus === statusParam) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    loadOrders(statusParam, allOrders);
  } else {
    // 기본값: 결제완료
    tabs.forEach(tab => {
      if (tab.getAttribute('data-status') === '결제완료') {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    loadOrders('결제완료', allOrders);
  }
  
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      const status = this.getAttribute('data-status');
      console.log(`${status} 탭 선택됨`);
      loadOrders(status, allOrders);
    });
  });
  
  // ✅ 상태별 카운트 업데이트 (tabs를 파라미터로 받음)
  function updateStatusCounts(orders, tabElements) {
    console.log('🔢 카운트 업데이트 시작...');
    
    const counts = {
      '결제완료': 0,
      '상품 준비중': 0,
      '배송중': 0,
      '배송완료': 0
    };

    orders.forEach(order => {
      const statusKr = order.status_kr || STATUS_MAP[order.status] || order.status;
      console.log(`주문 상태: ${order.status} → ${statusKr}`);
      
      if (counts.hasOwnProperty(statusKr)) {
        counts[statusKr]++;
      }
    });

    console.log('🔢 최종 카운트:', counts);

    // HTML 업데이트
    tabElements.forEach(tab => {
      const status = tab.getAttribute('data-status');
      const countEl = tab.querySelector('.count');
      if (countEl && counts.hasOwnProperty(status)) {
        countEl.textContent = counts[status];
        console.log(`✅ ${status} 탭 카운트: ${counts[status]}`);
      }
    });
  }
  
  // ✅ 주문 내역 불러오기 (실제 데이터)
  function loadOrders(statusKr, orders) {
    console.log(`📋 ${statusKr} 주문 로딩...`);
    const orderList = document.getElementById('order-list');
    
    // 해당 상태의 주문 필터링
    const filteredOrders = orders.filter(order => {
      const orderStatusKr = order.status_kr || STATUS_MAP[order.status] || order.status;
      return orderStatusKr === statusKr;
    });

    console.log(`📋 ${statusKr} 주문 개수:`, filteredOrders.length);

    if (filteredOrders.length === 0) {
      orderList.innerHTML = `
        <div class="empty-state bg-white rounded-lg shadow p-8">
          <p class="text-gray-500 mb-6">${statusKr} 내역이 없습니다.</p>
          <button onclick="goShopping()" class="px-6 py-2.5 border-2 border-gray-900 rounded-full hover:bg-gray-900 hover:text-white transition font-medium">
            SHOP 바로가기
          </button>
        </div>
      `;
      return;
    }

    orderList.innerHTML = filteredOrders.map(order => {
      // 첫 번째 상품 정보 (여러 상품일 경우 "외 N건" 표시)
      const firstItem = order.items && order.items[0];
      const remainingCount = order.items ? order.items.length - 1 : 0;
      
      const imageUrl = firstItem?.imageUrl 
        ? (firstItem.imageUrl.startsWith('/uploads') 
            ? `${firstItem.imageUrl}` 
            : firstItem.imageUrl)
        : '';

      const statusColor = getStatusColor(statusKr);
      const buttons = getStatusButtons(statusKr, order);
      
      // *** [수정] 포맷 함수를 사용하여 주문번호 생성
      const customOrderNumber = formatOrderNumber(order.created_at, order.order_id);

      return `
        <div class="bg-white rounded-lg shadow mb-4">
          <div class="p-4 border-b border-gray-200">
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm text-gray-600">${order.created_at_formatted || formatDate(order.created_at)}</span>
              <span class="text-sm font-medium ${statusColor}">${statusKr}</span>
            </div>
            <!-- *** [수정] 주문번호 표시 -->
            <p class="text-xs text-gray-500">주문번호: ${customOrderNumber}</p>
          </div>
          
          <div class="p-4">
            <div class="flex gap-4">
              <!-- 상품 이미지 -->
              <div class="w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                ${imageUrl ? `<img src="${imageUrl}" alt="${firstItem?.product_name || '상품'}" class="w-full h-full object-cover">` : ''}
              </div>
              
              <!-- 상품 정보 -->
              <div class="flex-1">
                <p class="font-semibold mb-1">${firstItem?.product_name || '상품명'}</p>
                ${firstItem?.brand ? `<p class="text-sm text-gray-600 mb-2">${firstItem.brand}</p>` : ''}
                ${remainingCount > 0 ? `<p class="text-xs text-gray-500 mb-2">외 ${remainingCount}건</p>` : ''}
                <p class="text-lg font-bold">₩${Number(order.total_price || 0).toLocaleString()}</p>
              </div>
            </div>
            
            <!-- 버튼 -->
            <div class="mt-4 flex gap-2">
              ${buttons}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 상태별 색상
  function getStatusColor(status) {
    switch(status) {
      case '결제완료': return 'text-blue-600';
      case '상품 준비중': return 'text-orange-600';
      case '배송중': return 'text-purple-600';
      case '배송완료': return 'text-green-600';
      default: return 'text-gray-600';
    }
  }

  // 상태별 버튼
  function getStatusButtons(status, order) {
    const detailBtn = `<button onclick="goToOrderDetail(${order.order_id})" class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm">주문 상세</button>`;

    if (status === '배송완료') {
      // order_items 테이블 스키마에 review_id가 없으므로, reviews 테이블을 JOIN한 결과(order.items[n].review_id)를 사용합니다.
      const pendingItem = Array.isArray(order.items) ? order.items.find(item => !item.review_id) : null;
      if (pendingItem) {
        // *** [수정] order_items 테이블의 PK (5item_id) -> item_id로 수정 (스키마 기반)
        const reviewBtn = `<button onclick="goToReviewWrite(${order.order_id}, ${pendingItem.item_id}, ${pendingItem.product_id})" class="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm">리뷰 쓰기</button>`;
        return detailBtn + reviewBtn;
      }
      const completeBtn = `<button disabled class="flex-1 px-4 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-400 text-sm cursor-not-allowed">리뷰 완료</button>`;
      return detailBtn + completeBtn;
    }

    return detailBtn;
  }

  // ✅ 주문 상세 페이지로 이동 함수 추가
  window.goToOrderDetail = function(orderId) {
    window.location.href = `./order-detail.html?orderId=${orderId}`;
  };

  window.goToReviewWrite = function(orderId, orderItemId, productId) {
    // *** [수정] order_items 테이블의 PK (5item_id) -> item_id로 수정 (스키마 기반)
    const params = new URLSearchParams({ orderId, orderItemId, productId });
    window.location.href = `./review-write.html?${params.toString()}`;
  };


  // 날짜 포맷팅
  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  }

  // 필터 드롭다운 이벤트
  const filterSelect = document.querySelector('select');
  if (filterSelect) {
    filterSelect.addEventListener('change', function() {
      const filterValue = this.value;
      console.log(`필터 변경: ${filterValue}`);
      
      // 현재 활성화된 탭의 상태 가져오기
      const activeTab = document.querySelector('.order-tab.active');
      const currentStatus = activeTab ? activeTab.getAttribute('data-status') : '결제완료';
      
      // 해당 상태의 주문 필터링
      let filteredOrders = allOrders.filter(order => {
        const orderStatusKr = order.status_kr || STATUS_MAP[order.status] || order.status;
        return orderStatusKr === currentStatus;
      });
      
      // 정렬 적용
      filteredOrders = sortOrders(filteredOrders, filterValue);
      
      // 화면 업데이트
      renderOrders(currentStatus, filteredOrders);
    });
  }
  
  // ✅ 정렬 함수
  function sortOrders(orders, sortType) {
    const sorted = [...orders]; // 원본 배열 보존
    
    switch(sortType) {
      case 'recent':
        // 최근순 (날짜 내림차순)
        sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'oldest':
        // 오래된순 (날짜 오름차순)
        sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'price-high':
        // 가격 높은순
        sorted.sort((a, b) => Number(b.total_price || 0) - Number(a.total_price || 0));
        break;
      case 'price-low':
        // 가격 낮은순
        sorted.sort((a, b) => Number(a.total_price || 0) - Number(b.total_price || 0));
        break;
      case 'all':
      default:
        // 전체 (기본: 최근순)
        sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
    }
    
    return sorted;
  }
  
  // ✅ 주문 렌더링 함수 (기존 loadOrders 로직 분리)
  function renderOrders(statusKr, orders) {
    console.log(`📋 ${statusKr} 주문 렌더링... (${orders.length}건)`);
    const orderList = document.getElementById('order-list');

    if (orders.length === 0) {
      orderList.innerHTML = `
        <div class="empty-state bg-white rounded-lg shadow p-8">
          <p class="text-gray-500 mb-6">${statusKr} 내역이 없습니다.</p>
          <button onclick="goShopping()" class="px-6 py-2.5 border-2 border-gray-900 rounded-full hover:bg-gray-900 hover:text-white transition font-medium">
            SHOP 바로가기
          </button>
        </div>
      `;
      return;
    }

    orderList.innerHTML = orders.map(order => {
      const firstItem = order.items && order.items[0];
      const remainingCount = order.items ? order.items.length - 1 : 0;
      
      const imageUrl = firstItem?.imageUrl 
        ? (firstItem.imageUrl.startsWith('/uploads') 
            ? `${firstItem.imageUrl}` 
            : firstItem.imageUrl)
        : '';

      const statusColor = getStatusColor(statusKr);
      // *** [수정] getStatusButtons에 order 객체 전체를 전달
      const buttons = getStatusButtons(statusKr, order);
      
      // *** [수정] 포맷 함수를 사용하여 주문번호 생성
      const customOrderNumber = formatOrderNumber(order.created_at, order.order_id);

      return `
        <div class="bg-white rounded-lg shadow mb-4">
          <div class="p-4 border-b border-gray-200">
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm text-gray-600">${order.created_at_formatted || formatDate(order.created_at)}</span>
              <span class="text-sm font-medium ${statusColor}">${statusKr}</span>
            </div>
            <!-- *** [수정] 주문번호 표시 -->
            <p class="text-xs text-gray-500">주문번호: ${customOrderNumber}</p>
          </div>
          
          <div class="p-4">
            <div class="flex gap-4">
              <div class="w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                ${imageUrl ? `<img src="${imageUrl}" alt="${firstItem?.product_name || '상품'}" class="w-full h-full object-cover">` : ''}
              </div>
              
              <div class="flex-1">
                <p class="font-semibold mb-1">${firstItem?.product_name || '상품명'}</p>
                ${firstItem?.brand ? `<p class="text-sm text-gray-600 mb-2">${firstItem.brand}</p>` : ''}
                ${remainingCount > 0 ? `<p class="text-xs text-gray-500 mb-2">외 ${remainingCount}건</p>` : ''}
                <p class="text-lg font-bold">₩${Number(order.total_price || 0).toLocaleString()}</p>
              </div>
            </div>
            
            <div class="mt-4 flex gap-2">
              ${buttons}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
  
});
