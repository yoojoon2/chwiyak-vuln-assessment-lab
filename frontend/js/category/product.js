// ====== API 유틸 ======
const API_BASE = "/api";

function getToken() {
  // 토큰은 httpOnly 쿠키로 관리되므로 더 이상 localStorage에서 읽지 않음
  return "";
}

function getUserType() {
  return localStorage.getItem("userType") || "";
}

function getProductIdFrom(data) {
  return data?.product_id ?? data?.id ?? data?._id;
}

async function api(url, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    
    ...options.headers,
  };
  const res = await fetch(url, { ...options, headers, credentials: "include" });
  if (res.status === 401 || res.status === 403) {
    alert("로그인이 필요합니다. 다시 로그인해 주세요.");
    window.location.href = "/frontend/pages/login&signup/login.html";
    throw new Error(`Auth error: ${res.status}`);
  }
  const json = await res.json().catch(() => ({}));
  return { res, json };
}


const $ = (id) => document.getElementById(id);
const fmtKRW = (n) => {
  const num = Number(n);
  return Number.isFinite(num)
    ? new Intl.NumberFormat("ko-KR", { style: "decimal" }).format(num) + " 원"
    : n || "";
};


const params = new URLSearchParams(location.search);
const productId = params.get("id");

const el = {
  loading: $("loading"),
  error: $("error"),
  product: $("product"),
  name: $("name"),
  price: $("price"),
  sku: $("sku"),
  desc: $("description"),
  mainImage: $("mainImage"),
  thumbs: $("thumbs"),
  tags: $("tags"),
  wishToggle: $("wishToggle"),
};

// MockData에서 제품 찾기 (mockData.js 기반)
function findInMocks(id) {
  const M = window.MockData || {};
  const pools = Object.entries({
    bag: M.productBag,
    accessory: M.productAccessory,
    beauty: M.productBeauty,
    top: M.productTop,
    bottoms: M.productBottoms,
    shoes: M.productShoes,
  }).filter(([, pool]) => !!pool);

  for (const [cat, pool] of pools) {
    if (pool[id]) return { data: pool[id], category: cat };
  }
  return null;
}

// 제품 로딩 (API 호출 방식으로 변경)
async function loadProduct(id) {
  if (!id) throw new Error("상품 ID가 없습니다.");

  try {
    const res = await fetch(`/api/products/${encodeURIComponent(id)}`);

    if (!res.ok) {
      throw new Error(`상품 정보를 불러오지 못했습니다. (HTTP ${res.status})`);
    }

    const productData = await res.json();

    // API 응답 구조에 맞게 wrapper 객체로 감싸서 반환
    return { data: productData, category: productData.category };

  } catch (err) {
    console.error(err);
    // 에러 발생 시 표시할 기본 데이터
    return {
      data: { id, name: "상품 정보 없음", price: 0, description: "오류가 발생했습니다." },
      category: "bag"
    };
  }
}

// 위시리스트 로직
const WISHLIST_KEY = "wishlistIds";
const WISHLIST_ITEMS_KEY = "wishlistItems";

function getWishlistSet() {
  try {
    const arr = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]");
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveWishlistSet(set) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify([...set]));
}

function getWishlistItems() {
  try {
    const items = JSON.parse(localStorage.getItem(WISHLIST_ITEMS_KEY) || "[]");
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function saveWishlistItems(items) {
  localStorage.setItem(WISHLIST_ITEMS_KEY, JSON.stringify(items));
}

// (선택) 서버에서 현재 위시리스트 포함 여부 확인
async function fetchIsWishlisted(productId) {
  try {
    const { json } = await api(`${API_BASE}/wishlist`, { method: "GET" });
    return Array.isArray(json) && json.some((w) => w.product_id === productId || w.productId === productId);
  } catch {
    return false;
  }
}

function applyHeartUI(isOn) {
  if (!el.wishToggle) return;
  const svg = el.wishToggle.querySelector("svg") || el.wishToggle.querySelector("i");
  if (!svg) return;
  // lucide svg 채워주기
  if (svg.tagName.toLowerCase() === "svg") {
    svg.setAttribute("fill", isOn ? "currentColor" : "none");
  }
  el.wishToggle.setAttribute("aria-pressed", String(isOn));
}

// 서버 연동 버전
async function initWishlistToggle(productId, productData) {
  if (!el.wishToggle) return;
  if (window.lucide?.createIcons) window.lucide.createIcons({});

  if (getUserType() !== "buyer") {
    el.wishToggle.addEventListener("click", () => {
      alert("구매자만 위시리스트 기능을 사용할 수 있습니다.");
    });
    return;
  }

  // 초기 상태를 서버 기준으로 세팅
  let isOn = await fetchIsWishlisted(productId);
  applyHeartUI(isOn);

  el.wishToggle.onclick = async () => {
    try {
      if (!isOn) {
        // 추가: POST /api/wishlist
        const { res, json } = await api(`${API_BASE}/wishlist`, {
          method: "POST",
          body: JSON.stringify({ productId }),
        });
        console.log("[WISHLIST][ADD]", res.status, json);
        alert(json?.message || "위시리스트에 추가되었습니다.");
        isOn = true;
      } else {
        // 제거: DELETE /api/wishlist/:productId
        const { res, json } = await api(`${API_BASE}/wishlist/${encodeURIComponent(productId)}`, {
          method: "DELETE",
        });
        console.log("[WISHLIST][REMOVE]", res.status, json);
        alert(json?.message || "위시리스트에서 제거되었습니다.");
        isOn = false;
      }
      applyHeartUI(isOn);
    } catch (err) {
      console.error("위시리스트 처리 오류:", err);
      alert("위시리스트 처리 중 오류가 발생했습니다.");
    }
  };
}

// 상세 페이지 렌더링
function renderProduct(wrapper) {
  const data = wrapper.data;

  el.name.textContent = data.name ?? "상품명";
  el.price.textContent = fmtKRW(data.price);
  el.sku.textContent = data.sku ? `SKU: ${data.sku}` : "";
  el.desc.textContent = data.description ?? "";

  // --- 🔽 프론트, 백엔드 서버를 나누어 이미지 경로 처리 🔽 ---
  // 1. DB에 저장된 imageUrl이 '/uploads/'로 시작하는 새로운 경로인지 확인합니다.
  const isNewUrl = data.imageUrl && data.imageUrl.startsWith('/uploads');
  // 2. 새로운 경로이면 백엔드 주소를 앞에 붙여주고, 아니면 기존 경로를 그대로 사용합니다.
  const finalImageUrl = isNewUrl ? `${data.imageUrl}` : data.imageUrl;

  // 3. 최종적으로 만들어진 이미지 URL을 사용합니다.
  const imageUrl = finalImageUrl || "/uploads/placeholder.png"; // 이미지가 없을 경우를 대비한 기본값

  el.mainImage.src = imageUrl;
  
  // 썸네일도 메인 이미지와 동일하게 설정
  el.thumbs.innerHTML = "";
  const btn = document.createElement("button");
  btn.className = "relative aspect-square bg-neutral-100 rounded-md overflow-hidden border border-black";
  btn.innerHTML = `<img src="${imageUrl}" alt="thumb 1" class="absolute inset-0 w-full h-full object-contain" />`;
  el.thumbs.appendChild(btn);
  // --- 🔼 이미지 처리 로직 수정 끝 🔼 ---

  el.tags.innerHTML = "";
  if (Array.isArray(data.tags)) {
    data.tags.forEach((t) => {
      const chip = document.createElement("span");
      chip.className = "text-[11px] px-2 py-1 rounded-full bg-slate-100 text-slate-600";
      chip.textContent = t;
      el.tags.appendChild(chip);
    });
  }

  const pid = getProductIdFrom(data);
  initWishlistToggle(pid, data);
}


// 수량 표시 엘리먼트에서 숫자 읽기 (없으면 1)
function getCurrentQty() {
  const elQty = document.getElementById("quantity-display");
  const n = parseInt(elQty?.textContent || "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}


// 서버 연동 버전
async function addToCart(product, showAlert = true) {
  try {
    const productId = getProductIdFrom(product);
    const quantity = getCurrentQty();

    const { res, json } = await api(`${API_BASE}/cart`, {
      method: "POST",
      body: JSON.stringify({ productId, quantity }),
    });

    console.log("[CART][ADD]", res.status, json);
    if (showAlert) {
      alert(json?.message || "장바구니에 상품이 추가되었습니다.");
    }

    // (선택) 응답 스냅샷이 있으면 화면/로컬상태와 동기화 가능
    // const snapshot = json?.snapshot;

  } catch (err) {
    console.error("장바구니 추가 오류:", err);
    if (showAlert) alert("장바구니 추가에 실패했습니다.");
  }
}

// 수량 조절 함수
function setupQuantityControls() {
  const quantityDisplay = $("quantity-display");
  const minusBtn = $("quantity-minus");
  const plusBtn = $("quantity-plus");
  
  if (!quantityDisplay || !minusBtn || !plusBtn) return;
  
  // 현재 수량 가져오기 (기본값 1)
  let currentQuantity = 1;
  
  // 수량 업데이트 함수
  function updateQuantity(newQuantity) {
    // 1 미만으로 내려가지 않도록 제한
    if (newQuantity < 1) return;
    
    currentQuantity = newQuantity;
    quantityDisplay.textContent = currentQuantity;
  }
  
  // 마이너스 버튼 클릭 시
  minusBtn.addEventListener("click", () => {
    updateQuantity(currentQuantity - 1);
  });
  
  // 플러스 버튼 클릭 시
  plusBtn.addEventListener("click", () => {
    updateQuantity(currentQuantity + 1);
  });
  
  // 초기 수량 설정
  updateQuantity(1);
}

// 실행
(async () => {
  try {
    const wrapper = await loadProduct(productId || "101");
    renderProduct(wrapper);
    el.loading.classList.add("hidden");
    el.product.classList.remove("hidden");
    
    // 수량 조절 기능 초기화
    setupQuantityControls();
    
    // 장바구니 담기 버튼
    const addToCartBtn = $("addToCart");
    if (addToCartBtn) {
      addToCartBtn.addEventListener("click", () => {
        if (getUserType() !== "buyer") {
          alert("구매자만 장바구니를 이용할 수 있습니다.");
          return;
        }
        // 현재 선택된 수량 가져오기
        const quantityElement = $("quantity-display");
        const quantity = quantityElement ? parseInt(quantityElement.textContent) || 1 : 1;

        // 수량을 포함한 상품 정보로 장바구니에 추가
        const productWithQuantity = { ...wrapper.data, quantity };
        addToCart(productWithQuantity);
      });
    }
    
    // 바로 구매 버튼
    const buyNowBtn = document.getElementById("buyNow");
    if (buyNowBtn) {
      buyNowBtn.addEventListener("click", () => {
        if (getUserType() !== "buyer") {
          alert("구매자만 즉시 구매를 이용할 수 있습니다.");
          return;
        }
        const d = (typeof wrapper !== "undefined" ? wrapper.data : null) || {};
        const qty = parseInt(document.getElementById("quantity-display")?.textContent || "1", 10) || 1;

        const item = {
          id: d.product_id || d.id,
          product_id: d.product_id || d.id,
          name: d.name,
          price: d.price,
          quantity: qty,
          image: d.imageUrl || (Array.isArray(d.images) ? d.images[0] : "") || ""
        };

        localStorage.setItem("buyNowProduct", JSON.stringify([item]));
        // 단일 상품 결제는 productId를 쿼리에 붙여 이동
        location.href = `/frontend/pages/payment/payment.html?productId=${encodeURIComponent(item.product_id)}`;
      });
    }
  } catch (err) {
    console.error(err);
    el.loading.classList.add("hidden");
    el.error.textContent = err?.message || "오류가 발생했습니다.";
    el.error.classList.remove("hidden");
  }
})();