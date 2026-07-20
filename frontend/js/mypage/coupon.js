// ============================================
// 쿠폰 페이지 JS (백엔드 API 완전 연동)
// ============================================

function goBack() {
  window.history.back();
}

function closeModal() {
  document.getElementById("coupon-modal").style.display = "none";
}

// ✅ 페이지 로드 시 쿠폰 목록 불러오기
async function loadCoupons() {
  const userType = localStorage.getItem("userType");

  try {
    const response = await fetch("/api/coupons?is_used=false", {
      method: "GET",
      headers: {
        
      },
      credentials: "include"
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("쿠폰 목록 조회 실패:", result.message);
      return;
    }

    // 백엔드 응답: { data: [...] }
    renderCoupons(result.data || []);

  } catch (err) {
    console.error("쿠폰 목록 조회 오류:", err);
  }
}

// ✅ 쿠폰 리스트 HTML 생성
function renderCoupons(coupons) {
  const couponSection = document.querySelector("main section:last-child");
  
  if (coupons.length === 0) {
    couponSection.innerHTML = '<p class="text-center text-gray-500 py-8">등록된 쿠폰이 없습니다.</p>';
    return;
  }

  couponSection.innerHTML = coupons.map(coupon => {
    // 백엔드 응답 형식:
    // {
    //   buyer_coupon_id: 1,
    //   code: "WELCOME5000",
    //   description: "신규 회원 웰컴 쿠폰",
    //   discount_type: "AMOUNT",
    //   discount_value: "5000.00",
    //   is_used: false,
    //   issued_at: "2025-10-29...",
    //   valid_until: "2025-10-31..."
    // }

    const discount = coupon.discount_type === 'PERCENT' 
      ? `${coupon.discount_value}%` 
      : `${Number(coupon.discount_value).toLocaleString()}원`;
    // discount_type: 'PERCENT' 또는 'FIXED'

    const badge = getBadgeFromDescription(coupon.description);
    const conditions = extractConditions(coupon.description);
    const expireDate = formatExpireDate(coupon.valid_until);

    return `
      <div class="coupon-card ${coupon.is_used ? 'opacity-50' : ''}">
        <div class="coupon-discount">${discount}</div>
        <div class="coupon-name">${coupon.description}</div>
        <span class="coupon-badge">${badge}</span>
        ${conditions.map(cond => `<div class="coupon-condition">${cond}</div>`).join('')}
        <div class="coupon-expire">${expireDate}</div>
        ${coupon.is_used 
          ? '<button class="coupon-download mt-4 bg-gray-400 cursor-not-allowed" disabled>사용 완료</button>'
          : '<button class="coupon-download mt-4">사용 가능 상품</button>'
        }
      </div>
    `;
  }).join('');
}

// ✅ 쿠폰 코드 등록 (핵심!)
async function submitCoupon() {
  const code = document.getElementById("coupon-code-input").value.trim();
  const userType = localStorage.getItem("userType");

  if (!code) {
    alert("쿠폰 코드를 입력해주세요.");
    return;
  }

  try {
    // POST /api/coupons/redeem
    const response = await fetch("/api/coupons/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ code: code })  // 주의: "code"가 키!
    });

    const result = await response.json();

    if (!response.ok) {
      // 에러 메시지 표시
      alert(result.message || "쿠폰 등록에 실패했습니다.");
      return;
    }

    // 성공!
    alert("✅ " + result.message); // "쿠폰이 등록되었습니다."
    closeModal();
    document.getElementById("coupon-code-input").value = "";
    loadCoupons(); // 쿠폰 목록 새로고침

  } catch (err) {
    console.error("쿠폰 등록 오류:", err);
    alert("서버 오류가 발생했습니다.");
  }
}

// ============================================
// 유틸리티 함수들
// ============================================

function getBadgeFromDescription(description) {
  if (description.includes('브랜드')) return '브랜드';
  if (description.includes('명품')) return '명품';
  if (description.includes('시즌오프')) return '시즌오프';
  if (description.includes('생일')) return '생일';
  if (description.includes('신규') || description.includes('웰컴')) return '신규';
  return '전체';
}

function extractConditions(description) {
  const conditions = [];
  
  if (description.includes('브랜드배송')) {
    conditions.push('• 브랜드배송 선택 시 사용가능');
  }
  if (description.includes('VIP') || description.includes('100만원')) {
    conditions.push('• 100만원 이상 구매 시');
  }
  if (description.includes('첫 구매')) {
    conditions.push('• 첫 구매 시 사용 가능');
    conditions.push('• 최소 구매금액 50,000원');
  }
  if (description.includes('시즌오프')) {
    conditions.push('• 시즌오프 카테고리 한정');
  }
  if (description.includes('생일')) {
    conditions.push('• 생일 당월 사용 가능');
    conditions.push('• 최소 구매금액 200,000원');
  }
  
  if (conditions.length === 0) {
    conditions.push('• 일부 상품 제외');
  }
  conditions.push('• 중복 사용 불가');
  
  return conditions;
}

function formatExpireDate(validUntil) {
  if (!validUntil) return '만료일 없음';
  
  const date = new Date(validUntil);
  const year = date.getFullYear().toString().slice(2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `오늘 종료 ${year}/${month}/${day} ${hours}:${minutes}:${seconds} 까지`;
}

// 페이지 로드 시 자동 실행
document.addEventListener('DOMContentLoaded', loadCoupons);