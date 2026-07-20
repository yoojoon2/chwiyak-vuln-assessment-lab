// 주문 상세 페이지 스크립트

const API_BASE = '';

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

// 뒤로가기
window.goBack = function() {
   window.history.back();
};

// 쇼핑 계속하기
window.goShopping = function() {
  window.location.href = '../main.html';
};

document.addEventListener('DOMContentLoaded', async () => {
  const userType = localStorage.getItem('userType');
  
  if (!userType) {
    alert('로그인이 필요합니다.');
    window.location.href = '../login&signup/login.html';
    return;
  }

  // URL에서 주문 ID 가져오기
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('orderId');

  if (!orderId) {
    alert('주문 정보를 찾을 수 없습니다.');
    window.location.href = './orderlist.html';
    return;
  }

  // 주문 상세 정보 로드
  await loadOrderDetail(orderId);
});

async function loadOrderDetail(orderId) {
  try {
    console.log('📦 주문 상세 조회:', orderId);
    
    const response = await fetch(`${API_BASE}/api/buyer/orders/${orderId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('주문 상세 조회 실패');
    }

    const order = await response.json();
    console.log('📦 주문 상세 데이터:', order);

    // 주문 정보 표시
    displayOrderInfo(order);
    displayProducts(order.items || []);
    displayPaymentInfo(order);
    displayShippingInfo(order.shipping_address || {});

  } catch (error) {
    console.error('❌ 주문 상세 로드 오류:', error);
    alert('주문 상세 정보를 불러오는데 실패했습니다.');
    window.location.href = './orderlist.html';
  }
}

// 주문 정보 표시
function displayOrderInfo(order) {
  const statusMap = {
    'PAID': '결제완료',
    'PREPARING': '상품 준비중', // 'PROCESSING'이 아닌 'PREPARING'으로 수정 (orderlist.js 기반)
    'SHIPPED': '배송중',
    'DELIVERED': '배송완료'
  };
  
  const statusKr = order.status_kr || statusMap[order.status] || order.status;
  const statusColor = 'bg-gray-100 text-gray-600';

  // *** [수정] 포맷 함수를 사용하여 주문번호 생성
  const customOrderNumber = formatOrderNumber(order.created_at, order.order_id);

  document.getElementById('order-status').textContent = `주문 ${statusKr}`;
  // *** [수정] 주문번호 표시
  document.getElementById('order-number').textContent = customOrderNumber;
  
  // 날짜 포맷
  if (order.created_at) {
    const date = new Date(order.created_at);
    document.getElementById('order-date').textContent = date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  const statusBadge = document.getElementById('status-badge');
  statusBadge.textContent = statusKr;
  statusBadge.className = `px-4 py-2 ${statusColor} rounded-full font-medium`;
}

// 주문 상품 표시
function displayProducts(items) {
  const container = document.getElementById('order-products');
  
  if (items.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-center py-8">상품 정보가 없습니다.</p>';
    return;
  }

  container.innerHTML = items.map(item => {
    const imageUrl = item.imageUrl 
      ? (item.imageUrl.startsWith('/uploads') 
          ? `${API_BASE}${item.imageUrl}` 
          : item.imageUrl)
      : '';

    return `
      <div class="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
        <div class="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
          ${imageUrl ? `<img src="${imageUrl}" alt="${item.product_name}" class="w-full h-full object-cover">` : ''}
        </div>
        <div class="flex-1">
          <p class="font-semibold mb-1">${item.product_name || '상품명'}</p>
          ${item.brand ? `<p class="text-sm text-gray-600">${item.brand}</p>` : ''}
        </div>
        <div class="text-right">
          <p class="text-sm text-gray-600">수량: ${item.quantity || 1}개</p>
          <p class="font-bold">₩${Number(item.unit_price || 0).toLocaleString()}</p>
        </div>
      </div>
    `;
  }).join('');
}

// 결제 정보 표시
function displayPaymentInfo(order) {
  const productAmount = Number(order.product_amount || order.total_price || 0);
  const deliveryFee = Number(order.delivery_fee || 5000);
  const couponDiscount = Number(order.coupon_discount || 0);
  const pointUsage = Number(order.point_usage || 0);
  const totalAmount = Number(order.total_price || 0);

  document.getElementById('product-amount').textContent = `₩${productAmount.toLocaleString()}`;
  document.getElementById('delivery-fee').textContent = `₩${deliveryFee.toLocaleString()}`;
  document.getElementById('coupon-discount').textContent = couponDiscount > 0 ? `-₩${couponDiscount.toLocaleString()}` : '-₩0';
  document.getElementById('point-usage').textContent = pointUsage > 0 ? `-₩${pointUsage.toLocaleString()}` : '-₩0';
  document.getElementById('total-amount').textContent = `₩${totalAmount.toLocaleString()}`;
  
  // 결제 수단
  const paymentMethodMap = {
    'card': '카드 결제',
    'check': '계좌 이체',
    'virtual': '가상계좌'
  };
  const paymentMethod = paymentMethodMap[order.payment_method] || '카드 결제';
  document.getElementById('payment-method').textContent = paymentMethod;
}

// 배송 정보 표시
function displayShippingInfo(shippingAddress) {
  document.getElementById('recipient-name').textContent = shippingAddress.recipient_name || '수령인';
  document.getElementById('recipient-phone').textContent = shippingAddress.recipient_phone || '-';
  document.getElementById('zipcode').textContent = shippingAddress.zipcode || '-';
  
  const fullAddress = `${shippingAddress.address || ''} ${shippingAddress.address_detail || ''}`.trim() || '-';
  document.getElementById('address').textContent = fullAddress;
  
  document.getElementById('delivery-message').textContent = shippingAddress.delivery_message || '요청사항 없음';
}
