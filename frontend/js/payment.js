// payment.js (쿠폰/포인트 API 완전 연동)
document.addEventListener("DOMContentLoaded", async () => {
  const API_BASE = "";
  const userType = localStorage.getItem("userType");

  if (!userType) {
    alert('로그인이 필요합니다.');
    window.location.href = '../login&signup/login.html';
    return;
  }

  // 안전한 JSON 파싱
  async function safeFetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const contentType = res.headers.get("content-type") || "";
    const raw = await res.text();
    let data = null;
    if (raw) {
      try { data = JSON.parse(raw); } catch (_) { /* JSON 아님 */ }
    }
    return { res, data, raw, contentType };
  }

  // 뒤로가기 버튼
  const backButton = document.querySelector('.back-btn');
  if (backButton) {
    backButton.addEventListener('click', (e) => {
      e.preventDefault();
      history.back();
    });
  }


  // ✅ 포인트 잔액 조회
  let userPoints = 0;
  async function loadUserPoints() {
    try {
      const { res, data } = await safeFetchJSON(`${API_BASE}/api/buyer/points/balance`, {
        credentials: "include"
      });
      if (res.ok && data) {
        userPoints = data.total_points || 0;
        console.log('💰 보유 포인트:', userPoints);
        
        // 보유 포인트 표시
        const allHints = document.querySelectorAll('.text-xs.text-gray-500');
        for (const hint of allHints) {
          if (hint.textContent.includes('보유 포인트')) {
            hint.textContent = `보유 포인트 ${userPoints.toLocaleString()}P`;
            console.log('✅ 보유 포인트 표시 완료:', hint.textContent);
            return;
          }
        }
        
        console.warn('⚠️ 보유 포인트 표시 위치를 찾을 수 없습니다.');
      } else {
        console.error('❌ 포인트 API 응답 오류:', res.status, data);
      }
    } catch (error) {
      console.error('❌ 포인트 조회 실패:', error);
    }
  }

  // ✅ 쿠폰 목록 조회
  let userCoupons = [];
  async function loadUserCoupons() {
    try {
      const { res, data } = await safeFetchJSON(`${API_BASE}/api/coupons?is_used=false`, {
        credentials: "include"
      });
      
      console.log('🎫 쿠폰 API 응답:', res.status, data);
      
      if (res.ok && data) {
        userCoupons = data.data || [];
        console.log('🎫 보유 쿠폰:', userCoupons);
        renderCouponModal();
      } else {
        console.warn('⚠️ 쿠폰 조회 실패:', res.status);
        renderCouponModal();
      }
    } catch (error) {
      console.error('❌ 쿠폰 조회 실패:', error);
      renderCouponModal();
    }
  }

  // ✅ 쿠폰 모달 렌더링
  function renderCouponModal() {
    const couponList = document.querySelector('#coupon-modal .space-y-3');
    if (!couponList) {
      console.error('❌ 쿠폰 모달 컨테이너를 찾을 수 없습니다!');
      return;
    }

    let html = `
      <label class="flex items-center cursor-pointer p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
        <input type="radio" name="coupon" value="none" class="w-5 h-5 mr-3" checked />
        <div class="flex-1">
          <p class="text-sm font-medium">쿠폰 사용 안 함</p>
        </div>
      </label>
    `;

    if (userCoupons.length === 0) {
      html += `
        <div class="text-center py-8 text-gray-500">
          <p>사용 가능한 쿠폰이 없습니다.</p>
        </div>
      `;
    } else {
      userCoupons.forEach(coupon => {
        const discountText = coupon.discount_type === 'PERCENT' 
          ? `${coupon.discount_value}% 할인` 
          : `${Number(coupon.discount_value).toLocaleString()}원 할인`;
        
        const expiryText = coupon.valid_until 
          ? new Date(coupon.valid_until).toLocaleDateString('ko-KR')
          : '무기한';

        html += `
          <label class="flex items-center cursor-pointer p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <input type="radio" name="coupon" 
                   value="${coupon.discount_value}" 
                   data-buyer-coupon-id="${coupon.buyer_coupon_id}"
                   data-discount-type="${coupon.discount_type}"
                   data-min-amount="${coupon.min_order_amount || 0}"
                   class="w-5 h-5 mr-3" />
            <div class="flex-1">
              <p class="text-sm font-bold text-red-500">${discountText}</p>
              <p class="text-xs text-gray-600 mt-1">${coupon.description || coupon.code}</p>
              <p class="text-xs text-gray-500 mt-1">${expiryText}까지</p>
              ${coupon.min_order_amount > 0 ? `<p class="text-xs text-gray-400 mt-1">최소 주문금액: ${Number(coupon.min_order_amount).toLocaleString()}원</p>` : ''}
            </div>
          </label>
        `;
      });
    }

    couponList.innerHTML = html;
    console.log('✅ 쿠폰 모달 렌더링 완료:', userCoupons.length, '개');
  }

  // 초기 로드
  await loadUserPoints();
  await loadUserCoupons();

  // 구매자 프로필 정보 로드
  let buyerProfile = null;
  async function loadBuyerProfile() {
    try {
      const { res, data } = await safeFetchJSON(`${API_BASE}/api/buyer/profile`, {
        credentials: "include"
      });
      if (res.ok && data) {
        buyerProfile = data;
        console.log("구매자 프로필:", buyerProfile);

        setTimeout(() => {
          const sections = document.querySelectorAll('section.bg-white.rounded-lg.shadow-sm.p-6.mb-4');
          let shippingSection = null;
          for (let section of sections) {
            const h3 = section.querySelector('h3');
            if (h3 && h3.textContent.includes('배송 주소')) {
              shippingSection = section;
              break;
            }
          }
          
          if (shippingSection) {
            const shippingFlexDivs = shippingSection.querySelectorAll('div.flex');
            
            if (shippingFlexDivs.length > 0) {
              const nameSpan = shippingFlexDivs[0].querySelector('span.text-gray-900');
              if (nameSpan) {
                nameSpan.textContent = buyerProfile.name || '홍길동';
              }
            }
            
            if (shippingFlexDivs.length > 1) {
              const phoneSpan = shippingFlexDivs[1].querySelector('span.text-gray-900');
              if (phoneSpan) {
                const phone = buyerProfile.phone || '010-1234-5678';
                phoneSpan.textContent = phone;
              }
            }
          }
        }, 100);
      }
    } catch (error) {
      console.error("구매자 정보 로드 실패:", error);
    }
  }
  
  loadBuyerProfile();

  // 상품 정보 로드
  const urlParams = new URLSearchParams(location.search);
  const buyNowProductId = urlParams.get("productId");
  
  let currentProducts = [];
  
  if (buyNowProductId) {
    // 단일 상품 바로구매
    const buyNowProducts = JSON.parse(localStorage.getItem("buyNowProduct") || "[]");
    const buyNowProduct = buyNowProducts.find(item => String(item.id) === String(buyNowProductId));
    if (buyNowProduct) {
      buyNowProduct.quantity = buyNowProduct.quantity || 1;
      currentProducts = [buyNowProduct];
    }
  } else {
    // ✅ 장바구니에서 선택한 여러 상품
    const cartItems = JSON.parse(localStorage.getItem("cartOrderItems") || "[]");
    if (cartItems.length > 0) {
      currentProducts = cartItems.map(item => ({
        ...item,
        quantity: item.quantity || 1
      }));
      console.log("🛒 장바구니에서 온 상품:", currentProducts);
    }
  }

  console.log("로드된 상품:", currentProducts);
  
  if (currentProducts.length > 0) {
    updateProductDisplay(currentProducts);
    updateProductCount(currentProducts.length);
    setTimeout(() => {
      updatePaymentAmount();
    }, 100);
  }

  function formatPrice(price) {
    if (typeof price !== 'number') {
      price = parseFloat(price) || 0;
    }
    return price.toLocaleString('ko-KR') + '원';
  }

  // ✅ 여러 상품을 각 줄에 표시
  function updateProductDisplay(products) {
    const productInfoContainer = document.getElementById('product-info-container');
    if (!productInfoContainer) return;

    productInfoContainer.innerHTML = products.map(product => {
      const price = parseFloat(product.price) || 0;
      const quantity = parseInt(product.quantity) || 1;
      const totalPrice = price * quantity;

      let description = product.description || '';
      description = description.replace(/<[^>]*>?/gm, '');

      // ✅ 이미지 경로 보정
      let imageSrc = product.image || product.imageUrl || '';
      if (imageSrc.startsWith('/uploads')) {
        imageSrc = `${imageSrc}`;
      } else if (!imageSrc) {
        imageSrc = '../../public/bags/LOUISVUITTON_bag1.jpg';
      }

      return `
        <div class="flex gap-4 mb-4 pb-4 border-b border-gray-200 last:border-b-0">
          <div class="w-20 h-20 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
            <img src="${imageSrc}" 
                alt="${product.name || '상품'}" 
                class="w-full h-full object-cover" />
          </div>
          <div class="flex-1">
            <p class="text-sm font-bold mb-1">${product.name || '상품명'}</p>
            ${product.sku ? `<p class="text-xs text-gray-500 mb-1">${product.sku}</p>` : ''}
            ${description ? `<p class="text-xs text-gray-600 mb-1">${description.substring(0, 30)}${description.length > 30 ? '...' : ''}</p>` : ''}
            <p class="text-xs text-gray-900">수량: ${quantity}개</p>
          </div>
          <div class="text-right">
            <p class="text-sm text-gray-600">${formatPrice(price)}</p>
            <p class="font-bold text-base">${formatPrice(totalPrice)}</p>
          </div>
        </div>
      `;
    }).join('');
  }


  function updateProductCount(count) {
    const countBtn = document.querySelector('.text-sm.text-gray-500');
    if (countBtn) countBtn.textContent = `총 ${count}건`;
  }

  // 우편번호 검색
  const zipcodeSearchBtn = document.getElementById("zipcode-search-btn");
  if (zipcodeSearchBtn) {
    zipcodeSearchBtn.addEventListener("click", () => {
      new daum.Postcode({
        oncomplete: function(data) {
          document.getElementById("zipcode").value = data.zonecode;
          let addr = (data.userSelectedType === 'R') ? data.roadAddress : data.jibunAddress;
          if (data.buildingName) addr += ` (${data.buildingName})`;
          document.getElementById("address1").value = addr;
          document.getElementById("address2").focus();
        }
      }).open();
    });
  }

  // 쿠폰 모달
  const couponModal = document.getElementById("coupon-modal");
  const couponOpenBtn = document.getElementById("coupon-open-btn");
  const couponModalBackBtn = document.getElementById("coupon-modal-back-btn");
  const couponApplyBtn = document.getElementById("coupon-apply-btn");
  const selectedCouponText = document.getElementById("selected-coupon-text");

  if (couponOpenBtn) {
    couponOpenBtn.addEventListener("click", () => {
      couponModal.classList.remove("hidden");
    });
  }
  if (couponModalBackBtn) {
    couponModalBackBtn.addEventListener("click", () => {
      couponModal.classList.add("hidden");
    });
  }
  if (couponApplyBtn) {
    couponApplyBtn.addEventListener("click", () => {
      const selected = document.querySelector('input[name="coupon"]:checked');
      if (!selected) return;

      if (selected.value === "none") {
        selectedCouponText.textContent = "사용할 쿠폰을 선택해주세요";
        selectedCouponText.classList.remove("text-red-500", "font-medium");
        selectedCouponText.classList.add("text-gray-500");
      } else {
        const discountType = selected.dataset.discountType;
        const discountValue = Number(selected.value);
        const discountText = discountType === 'PERCENT' 
          ? `${discountValue}% 할인 쿠폰` 
          : `${discountValue.toLocaleString()}원 할인 쿠폰`;
        
        selectedCouponText.textContent = discountText;
        selectedCouponText.classList.remove("text-gray-500");
        selectedCouponText.classList.add("text-red-500", "font-medium");
      }
      couponModal.classList.add("hidden");
      updatePaymentAmount();
    });
  }
  couponModal?.addEventListener("click", (e) => {
    if (e.target === couponModal) couponModal.classList.add("hidden");
  });

  // 배송 메시지 모달
  const deliveryModal = document.getElementById("delivery-modal");
  const deliveryMsgBtn = document.getElementById("delivery-msg-btn");
  const modalBackBtn = document.getElementById("modal-back-btn");
  const modalApplyBtn = document.getElementById("modal-apply-btn");

  if (deliveryMsgBtn) {
    deliveryMsgBtn.addEventListener("click", () => {
      deliveryModal.classList.remove("hidden");
    });
  }
  if (modalBackBtn) {
    modalBackBtn.addEventListener("click", () => {
      deliveryModal.classList.add("hidden");
    });
  }
  if (modalApplyBtn) {
    modalApplyBtn.addEventListener("click", () => {
      const selected = document.querySelector('input[name="delivery-request"]:checked');
      if (!selected) return;

      const label = selected.parentElement.querySelector('span')?.textContent || "";
      if (selected.value === "custom") {
        const customMsg = prompt("배송 요청사항을 입력하세요:");
        if (customMsg) {
          deliveryMsgBtn.textContent = customMsg;
          deliveryMsgBtn.classList.add("text-left");
        }
      } else if (selected.value === "default") {
        deliveryMsgBtn.textContent = "배송 메세지";
        deliveryMsgBtn.classList.remove("text-left");
      } else {
        deliveryMsgBtn.textContent = label;
        deliveryMsgBtn.classList.add("text-left");
      }
      deliveryModal.classList.add("hidden");
    });
  }
  deliveryModal?.addEventListener("click", (e) => {
    if (e.target === deliveryModal) deliveryModal.classList.add("hidden");
  });

  // ✅ 포인트 입력
  const pointInput = document.querySelector('input[placeholder="포인트"]');
  const maxPointBtn = document.getElementById("max-point-btn");

  if (maxPointBtn) {
    maxPointBtn.addEventListener("click", () => {
      if (!pointInput) {
        console.error('❌ 포인트 입력 필드를 찾을 수 없습니다!');
        alert('포인트 입력 필드를 찾을 수 없습니다.');
        return;
      }
      
      const productPrice = currentProducts.reduce((sum, p) => sum + (Number(p.price) * (p.quantity || 1)), 0);
      const deliveryFee = 5000;
      
      // 쿠폰 할인 계산
      const selectedCoupon = document.querySelector('input[name="coupon"]:checked');
      let couponDiscount = 0;
      if (selectedCoupon && selectedCoupon.value !== "none") {
        const discountType = selectedCoupon.dataset.discountType;
        const discountValue = Number(selectedCoupon.value);
        
        if (discountType === 'PERCENT') {
          couponDiscount = Math.floor((productPrice * discountValue) / 100);
        } else {
          couponDiscount = discountValue;
        }
      }
      
      const beforePoints = Math.max(0, productPrice + deliveryFee - couponDiscount);
      const maxUse = Math.min(userPoints, beforePoints);
      
      pointInput.value = maxUse.toLocaleString();
      alert(`${maxUse.toLocaleString()}P를 사용합니다.`);
      updatePaymentAmount();
    });
  }
  if (pointInput) {
    pointInput.addEventListener("input", (e) => {
      const value = e.target.value.replace(/[^0-9]/g, '');
      e.target.value = value ? Number(value).toLocaleString() : '';
    });
    pointInput.addEventListener("blur", () => {
      updatePaymentAmount();
    });
  }

  // ✅ 결제금액 재계산
  function updatePaymentAmount() {
    const productPrice = currentProducts.length > 0 
      ? currentProducts.reduce((sum, p) => sum + (Number(p.price) * (p.quantity || 1)), 0)
      : 0;
    const deliveryFee = 5000;

    // 쿠폰 할인
    const selectedCoupon = document.querySelector('input[name="coupon"]:checked');
    let couponDiscount = 0;
    if (selectedCoupon && selectedCoupon.value !== "none") {
      const discountType = selectedCoupon.dataset.discountType;
      const discountValue = Number(selectedCoupon.value);
      
      if (discountType === 'PERCENT') {
        couponDiscount = Math.floor((productPrice * discountValue) / 100);
      } else {
        couponDiscount = discountValue;
      }
      couponDiscount = Math.min(couponDiscount, productPrice);
    }

    // 포인트 사용
    const pointValue = pointInput ? pointInput.value.replace(/,/g, '') : '0';
    let pointDiscount = pointValue ? Number(pointValue) : 0;
    
    // 포인트 한도 체크
    const beforePoints = Math.max(0, productPrice + deliveryFee - couponDiscount);
    pointDiscount = Math.min(pointDiscount, userPoints, beforePoints);

    const finalAmount = Math.max(0, productPrice + deliveryFee - couponDiscount - pointDiscount);

    // 결제 버튼
    const payBtn = document.getElementById("payment-btn");
    if (payBtn) payBtn.textContent = `${finalAmount.toLocaleString()}원 결제하기`;

    // 요약 업데이트
    function setSummaryValue(labelText, valueText) {
      const rows = document.querySelectorAll(".space-y-2.text-sm.mb-4.pl-4 .flex.justify-between");
      for (const row of rows) {
        const labelEl = row.querySelector("span:first-child");
        const valueEl = row.querySelector(".font-medium");
        if (!labelEl || !valueEl) continue;
        const txt = labelEl.textContent.replace(/\s/g, "");
        if (txt.includes(labelText)) {
          valueEl.textContent = valueText;
          break;
        }
      }
    }

    setSummaryValue("상품가", `${productPrice.toLocaleString()}원`);
    setSummaryValue("배송비", `${deliveryFee.toLocaleString()}원`);
    setSummaryValue("할인", couponDiscount > 0 ? `-${couponDiscount.toLocaleString()}원` : "-");
    setSummaryValue("포인트", pointDiscount > 0 ? `-${pointDiscount.toLocaleString()}원` : "-");

    // 중간 결제금액
    const sections = document.querySelectorAll('section.bg-white.rounded-lg.shadow-sm.p-6.mb-4');
    for (let section of sections) {
      const h3 = section.querySelector('h3');
      if (h3 && h3.textContent.includes('주문 상품')) {
        const midPaymentSpan = section.querySelector('.border-t.border-gray-200.pt-4.flex.justify-between.font-bold.text-base.pl-4 span:last-child');
        if (midPaymentSpan) {
          midPaymentSpan.textContent = `${productPrice.toLocaleString()}원`;
          break;
        }
      }
    }

    // 이 결제금액
    const totalSpan = document.querySelector(".border-t.border-gray-200.pt-4.flex.justify-between.font-bold.text-lg span:last-child");
    if (totalSpan) totalSpan.textContent = `${finalAmount.toLocaleString()}원`;
  }

  // ✅ 결제하기 버튼
  const paymentBtn = document.getElementById("payment-btn");
  if (paymentBtn) {
    function collectSelectedItemsFromProducts() {
      return currentProducts.map(product => ({
        product_id: Number(product.id ?? product.product_id),
        quantity: Number(product.quantity || 1),
        unit_price: Number(product.price)
      }));
    }

    paymentBtn.addEventListener("click", async () => {
      const zipcode = document.getElementById("zipcode")?.value;
      const address1 = document.getElementById("address1")?.value;
      const address2 = document.getElementById("address2")?.value || "";

      if (!zipcode || !address1) {
        alert("배송 주소를 입력해주세요.");
        return;
      }

      const methodEl = document.querySelector('input[name="payment-method"]:checked');
      if (!methodEl) {
        alert("결제 방법을 선택해주세요.");
        return;
      }

      const methodText = methodEl.nextElementSibling?.textContent || "선택 안 됨";
      const finalAmountText = paymentBtn.textContent.replace('원 결제하기', '원').trim();

      if (!confirm(`${methodText}로 ${finalAmountText}을 결제하시겠습니까?`)) return;

      const selectedCoupon = document.querySelector('input[name="coupon"]:checked');
      const buyerCouponId = selectedCoupon && selectedCoupon.dataset.buyerCouponId
        ? Number(selectedCoupon.dataset.buyerCouponId) : null;
      const pointValue = pointInput ? Number((pointInput.value || '0').replace(/,/g, '')) : 0;

      const items = collectSelectedItemsFromProducts();
      
      console.log("🛒 currentProducts:", currentProducts);
      console.log("📦 items:", items);
      
      if (!items.length) {
        alert("주문 항목을 찾을 수 없습니다.");
        return;
      }

      const validItems = items.filter(item => {
        const isValid = item.product_id > 0 && item.quantity > 0 && item.unit_price >= 0;
        if (!isValid) {
          console.error("❌ 잘못된 상품 데이터:", item);
        }
        return isValid;
      });

      if (validItems.length === 0) {
        alert("올바른 상품 정보가 없습니다.");
        return;
      }

      const body = {
        order_name: "주문결제",
        items: validItems,
        use_points: pointValue,
        buyer_coupon_id: buyerCouponId,
        payment_method: methodEl.value || "card",
        shipping_address: {
          zipcode: zipcode,
          address: address1,
          address_detail: address2,
          recipient_name: "고객",
          recipient_phone: "010-0000-0000"
        }
      };

      console.log("📤 결제 요청 데이터:", JSON.stringify(body, null, 2));

      try {
        const response = await fetch(`${API_BASE}/api/buyer/orders/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ 서버 응답 에러:", response.status, errorText);
          
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText };
          }
          
          alert(`결제 실패 (${response.status}): ${errorData.message || errorData.detail || '알 수 없는 오류'}`);
          return;
        }

        const data = await response.json();
        console.log("✅ 결제 성공:", data);
        
        if (!data || !data.ok) {
          alert(data?.message || "결제 실패");
          return;
        }

        alert("결제가 완료되었습니다!");
        
        // ✅ 결제 완료 후 장바구니 데이터 정리
        localStorage.removeItem("cartOrderItems");
        localStorage.removeItem("buyNowProduct");
        
        location.href = data.redirect || "/frontend/pages/mypage/mypage.html";

      } catch (e) {
        console.error("❌ 결제 오류:", e);
        alert("결제 요청 중 오류가 발생했습니다: " + e.message);
      }
    });
  }
});