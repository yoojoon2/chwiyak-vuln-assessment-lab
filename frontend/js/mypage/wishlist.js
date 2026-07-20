// ===== 환경 =====
const API_BASE = "/api";

function getToken() {
  // 토큰은 httpOnly 쿠키로 관리
  return "";
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
    window.location.href = "../../pages/login&signup/login.html";
    throw new Error(`Auth error: ${res.status}`);
  }
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

const fmtKRW = (n) => {
  const num = Number(n);
  return Number.isFinite(num)
    ? new Intl.NumberFormat("ko-KR", { style: "decimal" }).format(num) + " 원"
    : n || "";
};

// ✅ 카테고리와 동일 규칙: /uploads로 시작하면 서버 도메인 붙이기
function resolveImageUrl(raw) {
  if (!raw) return "/frontend/public/placeholder.webp";
  return raw.startsWith("/uploads") ? `${raw}` : raw;
}

// ===== DOM refs =====
const el = {
  grid: null,
  empty: null,
  count: null,
  sort: null,
};

// ===== 상태 =====
let items = [];

// ===== 라우팅 보조 =====
window.goBack = function () { window.history.back(); };
window.goHome = function () { window.location.href = '../../pages/main.html'; };
window.goShopping = function () { window.location.href = '../../pages/login&signup/main.html'; };
window.goToProduct = function (productId) {
  window.location.href = `/frontend/pages/category/product.html?id=${encodeURIComponent(productId)}`;
};

// ===== UI 렌더링 =====
function itemCardHTML(it) {
  const pid = it.product_id ?? it.id ?? it._id;
  const name = it.name ?? "상품명";
  const brand = it.brand ?? "";
  const price = fmtKRW(it.price);

  // ✅ 다양한 필드에서 원본 이미지 경로를 추출한 뒤 규칙 적용
  const rawImg = it.imageUrl || it.thumbnailUrl || it.image;
  const img = resolveImageUrl(rawImg);

  return `
    <div class="bg-white rounded-lg shadow overflow-hidden wishlist-item" data-id="${pid}">
      <div class="relative">
        <img src="${img}" alt="${name}" class="w-full h-64 object-cover" loading="lazy" decoding="async"/>
      </div>
      <div class="p-4">
        <div class="flex items-center justify-between mb-1">
          <p class="font-semibold truncate flex-1" title="${name}">${name}</p>
          <button onclick="toggleWishlist(${pid})" class="wishlist-heart ml-2 flex-shrink-0" aria-label="위시리스트 제거">
            <span class="text-red-500 text-xl">♥</span>
          </button>
        </div>
        <p class="text-sm text-gray-600 mb-2">${brand}</p>
        <p class="text-lg font-bold">${price}</p>
        <button onclick="goToProduct(${pid})" class="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm">
          상품 보기
        </button>
      </div>
    </div>
  `;
}

function renderGrid(list) {
  if (!el.grid) return;
  if (!Array.isArray(list) || list.length === 0) {
    el.grid.classList.add("hidden");
    el.empty.classList.remove("hidden");
  } else {
    el.grid.classList.remove("hidden");
    el.empty.classList.add("hidden");
    el.grid.innerHTML = list.map(itemCardHTML).join("");
  }
  el.count.textContent = list.length;
}

// ===== 정렬 =====
function sortItems(by) {
  const c = [...items];
  switch (by) {
    case "price-high":
      c.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
      break;
    case "price-low":
      c.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
      break;
    case "name":
      c.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
      break;
    case "recent":
    default:
      c.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }
  return c;
}

// ===== 서버 연동 =====
async function fetchWishlist() {
  const { json } = await api(`${API_BASE}/wishlist`, { method: "GET" });
  items = Array.isArray(json) ? json : [];
  const sorted = sortItems(el.sort?.value || "recent");
  renderGrid(sorted);
}

window.toggleWishlist = async function (productId) {
  if (!confirm("위시리스트에서 삭제하시겠습니까?")) return;

  try {
    const { res, json } = await api(`${API_BASE}/wishlist/${encodeURIComponent(productId)}`, {
      method: "DELETE",
    });
    console.log("[WISHLIST][REMOVE]", res.status, json);

    items = items.filter((it) => String(it.product_id ?? it.id ?? it._id) !== String(productId));
    const sorted = sortItems(el.sort?.value || "recent");
    renderGrid(sorted);
  } catch (err) {
    console.error("위시리스트 제거 실패:", err);
    alert("삭제 중 오류가 발생했습니다.");
  }
};

// ===== 초기화 =====
document.addEventListener("DOMContentLoaded", async function () {
  el.grid = document.getElementById("wishlist-grid");
  el.empty = document.getElementById("empty-state");
  el.count = document.getElementById("wishlist-count");
  el.sort = document.getElementById("wishlist-sort");

  if (el.sort) {
    el.sort.addEventListener("change", () => {
      const sorted = sortItems(el.sort.value);
      renderGrid(sorted);
    });
  }

  try { await fetchWishlist(); }
  catch (e) {
    console.error("위시리스트 불러오기 실패:", e);
    renderGrid([]);
  }
});