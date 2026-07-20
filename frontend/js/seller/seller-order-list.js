// 판매자 주문자 조회 페이지 스크립트

const API_BASE = "";

function getToken() {
  // 토큰은 httpOnly 쿠키로 관리
  return "";
}

window.goBack = function() {
  window.location.href = './seller.html';
};

// 주문 상태 변경
window.updateOrderStatus = async function(orderId, newStatus) {
  const statusText = {
    'processing': '처리중',
    'shipping': '배송중',
    'completed': '배송완료'
  };
  
  if (confirm(`주문 상태를 "${statusText[newStatus]}"로 변경하시겠습니까?`)) {
    try {
      const response = await fetch(`${API_BASE}/api/seller/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      console.log('서버 응답:', data);

      if (response.ok) {
        alert('상태가 변경되었습니다.');
        location.reload();
      } else {
        console.error('에러 상세:', data);
        alert(`상태 변경 실패: ${data.message || data.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('상태 변경 오류:', error);
      alert('상태 변경 중 오류가 발생했습니다.');
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  if (!localStorage.getItem("userType")) {
    alert('로그인이 필요합니다.');
    window.location.href = '../login&signup/login.html';
    return;
  }

  // ✅ URL에서 status 파라미터 읽기
  const urlParams = new URLSearchParams(window.location.search);
  const initialStatus = urlParams.get('status') || 'all';

  const statusFilter = document.querySelector('select:first-of-type');
  const sortFilter = document.querySelector('select:last-of-type');
  
  // ✅ 셀렉트 박스 초기값 설정
  if (statusFilter && initialStatus !== 'all') {
    statusFilter.value = initialStatus;
  }
  
  if (statusFilter) {
    statusFilter.addEventListener('change', function() {
      loadOrders(this.value, sortFilter.value);
    });
  }
  
  if (sortFilter) {
    sortFilter.addEventListener('change', function() {
      loadOrders(statusFilter.value, this.value);
    });
  }
  
  // ✅ URL 파라미터로 받은 상태로 로드
  loadOrders(initialStatus, 'recent');
});

async function loadOrders(status, sort) {
  try {
    console.log(`📦 주문 조회 - 상태: ${status}, 정렬: ${sort}`);
    
    const response = await fetch(`${API_BASE}/api/seller/orders?status=${status}&sort=${sort}`, {
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error('주문 조회 실패');
    }

    const orders = await response.json();
    console.log('📦 주문 데이터:', orders);
    
    renderOrders(orders);
  } catch (error) {
    console.error('주문 조회 오류:', error);
    const container = document.querySelector('main section.bg-white');
    if (container) {
      container.innerHTML = `
        <div class="p-8 text-center text-gray-500">
          <p>주문 내역을 불러오는데 실패했습니다.</p>
        </div>
      `;
    }
  }
}

function renderOrders(orders) {
  const container = document.querySelector('main section.bg-white');
  
  if (!container) return;

  if (orders.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center text-gray-500">
        <p>주문 내역이 없습니다.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = orders.map(order => {
    const firstItem = order.items && order.items[0];
    const remainingCount = order.items ? order.items.length - 1 : 0;
    
    const imageUrl = firstItem?.imageUrl 
      ? (firstItem.imageUrl.startsWith('/uploads') 
          ? `${API_BASE}${firstItem.imageUrl}` 
          : firstItem.imageUrl)
      : '';

    const statusColor = getStatusColor(order.status_kr);
    const statusBg = getStatusBg(order.status_kr);
    const buttons = getStatusButtons(order.status, order.order_id);
    const originalTotal = Array.isArray(order.items)
      ? order.items.reduce((sum, item) => sum + Number(item.unit_price || 0) * Number(item.quantity || 0), 0)
      : Number(order.total_price || 0);
    const displayTotal = originalTotal > 0 ? originalTotal : Number(order.total_price || 0);

    return `
      <div class="border-b border-gray-200 p-6 hover:bg-gray-50 transition">
        <div class="flex gap-4 mb-4">
          <div class="w-20 h-20 bg-gray-300 rounded-lg flex-shrink-0 overflow-hidden">
            ${imageUrl ? `<img src="${imageUrl}" alt="${firstItem?.product_name}" class="w-full h-full object-cover">` : ''}
          </div>
          <div class="flex-1">
            <h3 class="font-semibold text-lg mb-1">${firstItem?.product_name || '상품명'}${remainingCount > 0 ? ` 외 ${remainingCount}건` : ''}</h3>
            <p class="text-sm text-gray-600 mb-2">주문번호: ${order.order_name || order.order_id}</p>
            <div class="flex items-center gap-2">
              <span class="px-3 py-1 ${statusBg} ${statusColor} text-xs rounded-full font-medium">${order.status_kr}</span>
              <span class="text-sm text-gray-500">${order.created_at_formatted || ''}</span>
            </div>
          </div>
          <div class="text-right">
            <p class="text-xl font-bold mb-2">₩${displayTotal.toLocaleString()}</p>
          </div>
        </div>
        
        <div class="bg-gray-50 rounded-lg p-4 mb-3">
          <h4 class="text-sm font-semibold mb-2">주문자 정보</h4>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span class="text-gray-600">이름:</span>
              <span class="ml-2 font-medium">${order.buyer_name || '-'}</span>
            </div>
            <div>
              <span class="text-gray-600">연락처:</span>
              <span class="ml-2 font-medium">${order.buyer_phone || '-'}</span>
            </div>
            <div class="col-span-2">
              <span class="text-gray-600">주소:</span>
              <span class="ml-2 font-medium">${order.full_address || '-'}</span>
            </div>
            <div class="col-span-2">
              <span class="text-gray-600">이메일:</span>
              <span class="ml-2 font-medium">${order.buyer_email || '-'}</span>
            </div>
          </div>
        </div>
        
        <div class="${statusBg} border ${statusColor.replace('text', 'border')} rounded-lg p-3 mb-3">
          <p class="text-sm font-medium ${statusColor}">현재 상태: ${order.status_kr}</p>
        </div>
        
        ${buttons}
      </div>
    `;
  }).join('');
}

function getStatusColor(status) {
  switch(status) {
    case '주문 대기': return 'text-red-600';
    case '처리중': return 'text-yellow-600';
    case '배송중': return 'text-blue-600';
    case '배송완료': return 'text-green-600';
    default: return 'text-gray-600';
  }
}

function getStatusBg(status) {
  switch(status) {
    case '주문 대기': return 'bg-red-50';
    case '처리중': return 'bg-yellow-50';
    case '배송중': return 'bg-blue-50';
    case '배송완료': return 'bg-green-50';
    default: return 'bg-gray-50';
  }
}

function getStatusButtons(dbStatus, orderId) {
  console.log('🔘 버튼 생성:', { dbStatus, orderId });
  
  switch(dbStatus) {
    case 'PAID':
      return `
        <div class="flex gap-2">
          <button onclick="updateOrderStatus('${orderId}', 'processing')" class="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition font-medium">
            처리 시작
          </button>
        </div>
      `;
    case 'PROCESSING':
      return `
        <div class="flex gap-2">
          <button onclick="updateOrderStatus('${orderId}', 'shipping')" class="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition font-medium">
            배송 시작
          </button>
        </div>
      `;
    case 'SHIPPED':
      return `
        <div class="flex gap-2">
          <button onclick="updateOrderStatus('${orderId}', 'completed')" class="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition font-medium">
            배송 완료
          </button>
        </div>
      `;
    case 'DELIVERED':
      return '';
    default:
      console.warn('⚠️ 알 수 없는 상태:', dbStatus);
      return '';
  }
}