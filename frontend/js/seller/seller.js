// 판매자 페이지 스크립트

const API_BASE = "";
function getToken() {
  // 토큰은 httpOnly 쿠키로 관리
  return "";
}

window.goBack = function() {
  window.location.href = './main.html';
};

window.goToProductRegister = function() {
  window.location.href = './seller-product-register.html';
};

window.goToProductList = function() {
  window.location.href = './seller-product-list.html';
};

window.goToOrderList = function(status) {
  if (status) {
    window.location.href = `./seller-order-list.html?status=${encodeURIComponent(status)}`;
  } else {
    window.location.href = './seller-order-list.html';
  }
};

// ✅ 주문 대기만 보기
window.goToPendingOrders = function() {
  window.location.href = './seller-order-list.html?status=pending';
};

window.goToReviewList = function() {
  window.location.href = './review.html';
};

window.goToSettlement = function() {
  window.location.href = './seller-settle.html';
};

window.goToSellerProfile = function() {
  window.location.href = './seller-profile.html';
};

// 판매자 프로필 정보 불러오기
async function loadSellerProfile() {
  try {
    const res = await fetch(`${API_BASE}/api/users/profile`, {
      credentials: "include"
    });
    
    if (!res.ok) throw new Error('프로필 조회 실패');
    
    const user = await res.json();
    
    const sellerNameElement = document.querySelector('h2.text-2xl.font-bold');
    if (sellerNameElement) sellerNameElement.textContent = user.name || '판매자명';
    
    const emailElement = document.querySelector('p.text-sm.text-gray-600');
    if (emailElement) emailElement.textContent = user.email || 'seller****@email.com';
    
  } catch (err) {
    console.error('프로필 로드 실패:', err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (!localStorage.getItem("userType")) {
    alert('로그인이 필요합니다.');
    window.location.href = '../login&signup/login.html';
    return;
  }
  
  loadSellerProfile();
  loadSettlementAccount();
  loadSellerStats();
  loadRecentOrders();
});

// ✅ 판매자 통계 불러오기
async function loadSellerStats() {
  try {
    const res = await fetch(`${API_BASE}/api/seller/stats`, {
      credentials: "include"
    });
    
    if (!res.ok) throw new Error('통계 조회 실패');
    
    const stats = await res.json();
    console.log('📊 판매자 통계:', stats);
    
    // 등록 상품 수
    const productCountEl = document.getElementById('seller-product-count');
    if (productCountEl) productCountEl.textContent = stats.productCount ?? 0;
    
    // 주문 대기 수
    const pendingCountEl = document.getElementById('seller-pending-count');
    if (pendingCountEl) pendingCountEl.textContent = stats.pendingOrderCount ?? 0;
    
    // 리뷰 수
    const reviewCountEl = document.getElementById('seller-review-count');
    if (reviewCountEl) reviewCountEl.textContent = stats.reviewCount ?? 0;

    const settlementAmountEl = document.getElementById('settlement-amount');
    if (settlementAmountEl) {
      const amount = Number(stats.pendingSettlementAmount ?? 0);
      settlementAmountEl.textContent = `₩${amount.toLocaleString()}`;
    }

  } catch (err) {
    console.error('통계 로드 실패:', err);
  }
}

// ✅ 최근 주문 불러오기
async function loadRecentOrders() {
  try {
    const res = await fetch(`${API_BASE}/api/seller/orders/recent`, {
      credentials: "include"
    });
    
    if (!res.ok) throw new Error('최근 주문 조회 실패');
    
    const orders = await res.json();
    console.log('📦 최근 주문:', orders);
    
    const container = document.querySelector('.space-y-3');
    if (!container) return;
    
    if (orders.length === 0) {
      container.innerHTML = '<p class="text-center text-gray-500 py-8">최근 주문이 없습니다.</p>';
      return;
    }
    
    container.innerHTML = orders.map(order => {
      const firstItem = order.items && order.items[0];
      const imageUrl = firstItem?.imageUrl 
        ? (firstItem.imageUrl.startsWith('/uploads') 
            ? `${API_BASE}${firstItem.imageUrl}` 
            : firstItem.imageUrl)
        : '';
      
      const statusColor = getStatusColorClass(order.status_kr);
      const originalTotal = Array.isArray(order.items)
        ? order.items.reduce((sum, item) => sum + Number(item.unit_price || 0) * Number(item.quantity || 0), 0)
        : Number(order.total_price || 0);
      const displayTotal = originalTotal > 0 ? originalTotal : Number(order.total_price || 0);
      
      return `
        <div class="flex items-center gap-4 p-4 border border-gray-100 rounded-lg hover:border-gray-300 transition cursor-pointer" onclick="goToOrderList()">
          <div class="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
            ${imageUrl ? `<img src="${imageUrl}" alt="${firstItem?.product_name}" class="w-full h-full object-cover">` : ''}
          </div>
          <div class="flex-1">
            <h4 class="font-bold mb-1">${firstItem?.product_name || '상품명'}</h4>
            <p class="text-xs text-gray-600 mb-1">주문자: ${order.buyer_name || '-'}</p>
            <p class="text-xs text-gray-500">${order.created_at_formatted || ''}</p>
          </div>
          <div class="text-right">
            <p class="font-bold text-lg mb-2">₩${displayTotal.toLocaleString()}</p>
            <span class="inline-block px-3 py-1 ${statusColor} text-xs font-semibold rounded">${order.status_kr}</span>
          </div>
        </div>
      `;
    }).join('');
    
  } catch (err) {
    console.error('최근 주문 로드 실패:', err);
  }
}

function getStatusColorClass(status) {
  switch(status) {
    case '주문 대기': return 'bg-red-50 text-red-600';
    case '처리중': return 'bg-yellow-50 text-yellow-600';
    case '배송중': return 'bg-blue-50 text-blue-600';
    case '배송완료': return 'bg-green-50 text-green-600';
    default: return 'bg-gray-50 text-gray-600';
  }
}

// 정산 계좌 정보 불러오기
async function loadSettlementAccount() {
  try {
    const res = await fetch(`${API_BASE}/api/seller/settlement`, {
      credentials: "include"
    });
    
    if (!res.ok) {
      console.log('정산 계좌 정보 없음');
      return;
    }
    
    const settlement = await res.json();
    
    const bankElement = document.getElementById('settlement-bank');
    if (bankElement && settlement.bank_name) {
      bankElement.textContent = settlement.bank_name;
    }
    
    const accountElement = document.getElementById('settlement-account');
    if (accountElement && settlement.account_number) {
      accountElement.textContent = settlement.account_number;
    }
    
  } catch (err) {
    console.error('정산 계좌 정보 로드 실패:', err);
  }
}