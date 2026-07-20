// ============================================
// 포인트 페이지 JS (백엔드 API 완전 연동)
// ============================================

function goBack() {
  window.history.back();
}

function closeModal() {
  document.getElementById('point-modal').style.display = 'none';
}

// ✅ 페이지 로드 시 포인트 데이터 불러오기
async function loadPoints() {
  const userType = localStorage.getItem("userType");
  const API_BASE = "";

  try {
    // 1. 잔액 조회 - ✅ /api/buyer-points → /api/buyer/points
    const balanceResponse = await fetch(`${API_BASE}/api/buyer/points/balance`, {
      method: "GET",
      credentials: "include"
    });

    const balanceData = await balanceResponse.json();

    if (balanceResponse.ok) {
      const balanceEl = document.querySelector('.point-balance');
      if (balanceEl) {
        balanceEl.textContent = `${Number(balanceData.total_points || 0).toLocaleString()}P`;
      }
    } else {
      console.error("잔액 조회 실패:", balanceResponse.status, balanceData);
    }

    // 2. 내역 조회 - ✅ /api/buyer-points → /api/buyer/points
    const historyResponse = await fetch(`${API_BASE}/api/buyer/points/history?page=1&size=20`, {
      method: "GET",
      credentials: "include"
    });

    const historyData = await historyResponse.json();

    if (historyResponse.ok) {
      renderPointHistory(historyData.data || []);
    } else {
      console.error("내역 조회 실패:", historyResponse.status, historyData);
    }

  } catch (err) {
    console.error("포인트 조회 오류:", err);
  }
}

// ✅ 포인트 내역 HTML 생성
function renderPointHistory(history) {
  const container = document.getElementById('point-history');
  
  if (!history || history.length === 0) {
    container.innerHTML = '<p class="text-center text-gray-500 py-8">포인트 내역이 없습니다.</p>';
    return;
  }

  container.innerHTML = history.map((item, index) => {
    const isPlus = item.amount > 0;
    const amountColor = isPlus ? '#3b82f6' : '#ef4444';
    const amountSign = isPlus ? '+' : '';
    const amountText = `${amountSign}${Math.abs(item.amount).toLocaleString()}P`;
    
    const date = formatDate(item.created_at);
    const borderStyle = index < history.length - 1 ? 'border-bottom: 1px solid #e5e7eb;' : '';

    return `
      <div style="${borderStyle} padding: 1.25rem 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <div style="font-size: 1.5rem; font-weight: 700; color: ${amountColor};">${amountText}</div>
          <div style="font-size: 0.875rem; color: #9ca3af;">${date}</div>
        </div>
        <div style="font-size: 0.875rem; color: #6b7280;">${item.description || '포인트'}</div>
      </div>
    `;
  }).join('');
}

// ✅ 날짜 포맷팅
function formatDate(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}.${month}.${day}`;
}

// ============================================
// 이벤트 리스너
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  loadPoints();

  const modal = document.getElementById('point-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }
});

window.goBack = goBack;
window.closeModal = closeModal;