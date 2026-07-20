// /frontend/js/category/search.js

// ------ 공통 유틸 ------ //
const API_BASE = "/api";

/** KRW 통화 포맷터 */
const formatKRW = (n) =>
  typeof n === "number"
    ? new Intl.NumberFormat("ko-KR", {
        style: "currency",
        currency: "KRW",
        maximumFractionDigits: 0,
      }).format(n)
    : (n ?? "");

/** URL에서 검색어(q|query|keyword) 추출 */
function detectQuery() {
  const qs = new URLSearchParams(location.search);
  const raw =
    qs.get("q") || qs.get("query") || qs.get("keyword") || qs.get("k") || "";
  return raw.trim();
}

/** 카드 템플릿 (category 카드와 동일 톤) */
function cardHTML({ href, imgSrc, name, price }) {
  return `
    <a href="${href}" class="relative block fade">
      <div class="relative aspect-[3/4] bg-neutral-100 overflow-hidden">
        <img
          src="${imgSrc}"
          alt="${name}"
          class="absolute inset-0 w-full h-full object-contain hover-zoom"
          loading="lazy" decoding="async"
        />
        <div class="absolute inset-x-0 bottom-0 z-10 p-3">
          <p class="text-sm text-white">${name}</p>
          <p class="text-sm text-white/90">${formatKRW(price)}</p>
        </div>
        <div class="absolute inset-x-0 bottom-0 h-24 cap-grad"></div>
      </div>
    </a>`;
}

function activateFade() {
  setTimeout(() => {
    document.querySelectorAll(".fade").forEach((el) => el.classList.add("active"));
  }, 100);
}

/** 제목/메타 반영 */
function renderTitle(q, count = null) {
  const title = document.getElementById("searchTitle");
  const meta = document.getElementById("searchMeta");
  title.textContent = q
    ? `‘${q}’에 대한 검색결과`
    : "검색결과";

  if (count === null) {
    meta.textContent = q ? `검색어: ${q}` : "검색어가 비어 있습니다.";
  } else {
    meta.textContent = q ? `검색어: ${q} · 총 ${count}개` : `총 ${count}개`;
  }
}

/**
 * 검색 API 호출
 * - 백엔드에서는 /api/products?keyword=키워드 형식을 지원
 */
async function fetchByQuery(q) {
  const url = `${API_BASE}/products?keyword=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("검색 API 오류:", error);
    throw new Error("검색 API 호출 실패");
  }
}

async function renderSearch() {
  const grid = document.getElementById("searchGrid");
  const q = detectQuery();

  renderTitle(q);

  if (!q) {
    // ... (검색어 없을 때의 처리는 동일)
    return;
  }

  try {
    const products = await fetchByQuery(q);
    renderTitle(q, products.length);

    if (!products.length) {
      // ... (검색 결과 없을 때의 처리는 동일)
      return;
    }

    // --- 🔽 [핵심 수정] 카드 생성 로직 🔽 ---
    const cards = products.map((p) => {
        // 1. DB에 저장된 imageUrl이 '/uploads/'로 시작하는 새로운 경로인지 확인합니다.
        const isNewUrl = p.imageUrl && p.imageUrl.startsWith('/uploads');
        // 2. 새로운 경로이면 백엔드 주소를 앞에 붙여주고, 아니면 기존 경로를 그대로 사용합니다.
        const finalImageUrl = isNewUrl ? `${p.imageUrl}` : p.imageUrl;

        return cardHTML({
          href: `/frontend/pages/category/product.html?id=${p.product_id ?? p.id ?? ""}`,
          imgSrc: finalImageUrl || "", // 최종적으로 만들어진 이미지 URL 사용
          name: p.name || "",
          price: p.price,
        });
      })
      .join("");
    // --- 🔼 카드 생성 로직 수정 끝 🔼 ---

    grid.innerHTML = cards;
    activateFade();
  } catch (error) {
    // ... (에러 처리는 동일)
  }
}

/** (선택) 네비게이션의 검색폼을 자동 연결해주는 보조 핸들러 */
function wireNavSearch() {
  const form = document.getElementById("siteSearchForm");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const q = (fd.get("q") || "").toString().trim();
    if (!q) return;
    // ✅ 어떤 페이지에서든 절대경로로 이동
    location.href = `${window.location.origin}/frontend/pages/category/search.html?q=${encodeURIComponent(q)}`;
  });
}


// 실행
document.addEventListener("DOMContentLoaded", () => {
  wireNavSearch();
  renderSearch();
});
