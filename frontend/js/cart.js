// /frontend/js/cart.js (옵션 변경 완전 제거 버전)

document.addEventListener("DOMContentLoaded", () => {
  loadCartItems();
});

const formatKRW = (n) => new Intl.NumberFormat("ko-KR").format(n);

// [핵심] API 호출하여 장바구니 목록 불러오기
async function loadCartItems() {
  const container = document.getElementById("cart-items-container");
  const loadingIndicator = document.getElementById("loading-indicator");
  const emptyMessage = document.getElementById("empty-cart-message");
  const orderSummarySection = document.querySelector(
    ".bg-white.rounded-lg.p-6.my-3"
  );
  const orderButton = document.getElementById("order-checkout-button");
  const userType = localStorage.getItem("userType");

  if (!userType) {
    alert("로그인이 필요합니다.");
    return (window.location.href =
      "/frontend/pages/login&signup/login.html");
  }

  try {
   const response = await fetch("/api/cart", {
    credentials: "include"
   });
    if (!response.ok)
      throw new Error("장바구니 정보를 불러오는 데 실패했습니다.");

    const items = await response.json();
    loadingIndicator.style.display = "none";

    if (items.length === 0) {
      emptyMessage.classList.remove("hidden");
      container.innerHTML = "";
      if (orderSummarySection) orderSummarySection.classList.add("hidden");
      if (orderButton) orderButton.classList.add("hidden");
    } else {
      container.innerHTML = items.map((item) => createItemHTML(item)).join("");
      attachEventListeners();
      updateOrderSummary();
    }
  } catch (error) {
    console.error("장바구니 로딩 오류:", error);
    loadingIndicator.innerHTML = `<p class="text-red-500">${error.message}</p>`;
  }
}

// 개별 장바구니 아이템 HTML
function createItemHTML(item) {
  const itemTotalPrice = item.price * item.quantity;
  const isNewUrl = item.imageUrl && item.imageUrl.startsWith("/uploads");
  const finalImageUrl = isNewUrl
    ? `${item.imageUrl}`
    : item.imageUrl;

  return `
    <div class="bg-white rounded-lg p-6 mb-3 shadow-sm" 
         data-cart-item-id="${item.cart_item_id}" 
         data-product-id="${item.product_id}" 
         data-price="${item.price}"
         data-quantity="${item.quantity}">
        <div class="flex justify-between items-center mb-4">
            <input type="checkbox" class="cart-item-checkbox w-5 h-5" />
            <button class="delete-btn px-6 py-2 border border-gray-300 rounded-full text-sm hover:bg-gray-50 transition">삭제</button>
        </div>
        <div class="flex gap-4 items-start mb-4">
            <img src="${finalImageUrl}" alt="${item.name}" class="w-24 h-24 bg-gray-200 rounded object-cover flex-shrink-0">
            <div class="flex-1">
                <p class="text-base font-bold mb-1">${item.name}</p>
                <p class="text-sm text-gray-500 mb-1">${item.brand}</p>
                <p class="text-sm text-gray-900">수량: ${item.quantity}개</p>
            </div>
        </div>
        <div class="pt-4 border-t border-gray-200">
            <div class="flex justify-between text-base mb-2">
                <span class="text-gray-600">상품금액</span>
                <span class="font-bold item-total-price">${formatKRW(
                  itemTotalPrice
                )}원</span>
            </div>
            <div class="flex justify-between text-base mb-4">
                <span class="text-gray-600">배송비</span>
                <span class="font-bold">무료</span>
            </div>
            <button class="quick-order-btn w-full px-4 py-3 bg-gray-900 text-white rounded text-sm hover:bg-gray-700 transition">바로 주문</button>
        </div>
    </div>
    `;
}

// 이벤트 리스너 부착
function attachEventListeners() {
  const selectAllCheckbox = document.getElementById("select-all");
  const itemCheckboxes = document.querySelectorAll(".cart-item-checkbox");
  const selectDeleteBtn = document.getElementById("select-delete-btn");

  selectAllCheckbox.addEventListener("change", function () {
    itemCheckboxes.forEach((checkbox) => {
      checkbox.checked = this.checked;
    });
    updateOrderSummary();
  });

  itemCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      selectAllCheckbox.checked = Array.from(itemCheckboxes).every(
        (cb) => cb.checked
      );
      updateOrderSummary();
    });
  });

  // ✅ 업로드 이미지 경로 보정 유틸 (필요 시 사용)
  function _resolveImg(raw) {
    if (!raw) return "/frontend/public/placeholder.webp";
    return raw.startsWith("/uploads") ? `${raw}` : raw;
  }


  // ✅ [추가] 개별 카드의 "바로 주문" 버튼 → 결제 페이지로
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".quick-order-btn");
    if (!btn) return;

    const card = btn.closest("[data-cart-item-id]");
    if (!card) return;

    const product_id = Number(card.dataset.productId);
    const quantity   = Number(card.dataset.quantity || 1);
    const price      = Number(card.dataset.price || 0);
    const name       = card.querySelector(".text-base.font-bold")?.textContent?.trim() || "상품";
    const rawImg     = card.querySelector("img")?.getAttribute("src") || "";
    const image      = _resolveImg(rawImg);

    const item = { id: product_id, product_id, name, price, quantity, image };
    localStorage.setItem("buyNowProduct", JSON.stringify([item]));
    location.href = `/frontend/pages/payment/payment.html?productId=${encodeURIComponent(product_id)}`;
  });

  // ✅ [추가] "총 결제" 버튼(선택한 항목들) → 결제 페이지로
  const totalCheckoutBtn = document.getElementById("order-checkout-button");
  if (totalCheckoutBtn) {
    totalCheckoutBtn.addEventListener("click", () => {
      const checked = Array.from(document.querySelectorAll(".cart-item-checkbox")).filter(cb => cb.checked);
      if (!checked.length) {
        alert("주문할 상품을 선택해주세요.");
        return;
      }

      const items = checked.map(cb => {
        const card = cb.closest("[data-cart-item-id]");
        const product_id = Number(card.dataset.productId);
        const quantity   = Number(card.dataset.quantity || 1);
        const price      = Number(card.dataset.price || 0);
        const name       = card.querySelector(".text-base.font-bold")?.textContent?.trim() || "상품";
        const rawImg     = card.querySelector("img")?.getAttribute("src") || "";
        const image      = _resolveImg(rawImg);
        return { id: product_id, product_id, name, price, quantity, image };
      });

      localStorage.setItem("cartOrderItems", JSON.stringify(items)); // 복수 결제 컨텍스트
      location.href = "/frontend/pages/payment/payment.html";        // productId 없이 진입
    });
  }


  // ✅ 선택삭제
  selectDeleteBtn.addEventListener("click", async () => {
    const checkedItems = Array.from(document.querySelectorAll(".cart-item-checkbox:checked"));
    if (checkedItems.length === 0) {
      alert("삭제할 상품을 선택해주세요.");
      return;
    }

    if (!confirm(`선택한 ${checkedItems.length}개 상품을 삭제하시겠습니까?`)) return;

    const userType = localStorage.getItem("userType");

    // 선택된 cart_item_id 목록 추출
    const cartItemIds = checkedItems.map(cb => {
      const card = cb.closest("[data-cart-item-id]");
      return card?.dataset?.cartItemId;
    });

    try {
      // ✅ 백엔드 선택 삭제 API 호출
      const res = await fetch(`/api/cart/selected`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      credentials: "include",
        body: JSON.stringify({ cartItemIds }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "삭제 실패");

      alert(data.message || "선택한 상품이 삭제되었습니다.");

      // ✅ 자동 새로고침 (반영 즉시)
      window.location.reload();
    } catch (err) {
      console.error("선택 삭제 실패:", err);
      alert(err.message || "삭제 중 오류가 발생했습니다.");
      // 실패 시에도 새로고침으로 UI 정리
      window.location.reload();
    }
  });



  // 개별 삭제
  document.querySelectorAll(".delete-btn").forEach((button) => {
    button.addEventListener("click", async function () {
      const cartItem = this.closest("[data-cart-item-id]");
      const cartItemId = cartItem.dataset.cartItemId;

      if (confirm("이 상품을 장바구니에서 삭제하시겠습니까?")) {
        const success = await removeItemAPI(cartItemId);
        if (success) {
          alert("상품이 삭제되었습니다.");
          cartItem.remove();
          updateOrderSummary();

          if (
            document.querySelectorAll("[data-cart-item-id]").length === 0
          ) {
            document
              .getElementById("empty-cart-message")
              .classList.remove("hidden");
          }
        } else {
          alert("상품 삭제에 실패했습니다.");
        }
      }
    });
  });
}


// 주문 요약 정보 업데이트
function updateOrderSummary() {
  const itemCheckboxes = document.querySelectorAll(".cart-item-checkbox");
  const checkedItems = Array.from(itemCheckboxes).filter((cb) => cb.checked);

  let totalPrice = 0;

  checkedItems.forEach((checkbox) => {
    const cartItem = checkbox.closest("[data-cart-item-id]");
    totalPrice +=
      parseInt(cartItem.dataset.price) *
      parseInt(cartItem.dataset.quantity);
  });

  document.getElementById(
    "total-price"
  ).textContent = `${formatKRW(totalPrice)}원`;
  document.getElementById("total-delivery").textContent = "0원";
  document.getElementById(
    "final-total"
  ).textContent = `${formatKRW(totalPrice)}원`;

  const orderButton = document.getElementById("order-checkout-button");
  orderButton.textContent = `${formatKRW(
    totalPrice
  )}원 • 총 ${checkedItems.length}건 주문하기`;
}

// [API 호출] 장바구니 삭제
async function removeItemAPI(cartItemId) {
  const userType = localStorage.getItem("userType");
  try {
    const response = await fetch(
      `/api/cart/${cartItemId}`,
      {
        method: "DELETE",
        credentials: "include"}
    );
    return response.ok;
  } catch (error) {
    console.error("API 삭제 오류:", error);
    return false;
  }
}