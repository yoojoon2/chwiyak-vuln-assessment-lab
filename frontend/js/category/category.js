// 가격 포맷
const formatKRW = (n) => {
  const num = Number(n);
  return Number.isFinite(num)
    ? new Intl.NumberFormat("ko-KR", { style: "decimal" }).format(num) + " 원"
    : n || "";
};

// URL 파라미터 감지
function detectParams() {
  const qs = new URLSearchParams(location.search);
  const category = qs.get("category_name");
  const brand = qs.get("brand_name");
  return {
    category: category ? category.toLowerCase() : "all",
    brand: brand ? brand.toUpperCase() : null,
  };
}

// Hero 이미지 교체
function setHeroImage(type) {
  const hero = document.getElementById("heroImg");
  if (!hero) return;
  
  // 🔽 S3 프록시 경로로 수정
  const baseUrl = "/uploads/models"; // S3의 /uploads/models/ 폴더

  if (type === "all") hero.src = `${baseUrl}/all_model.webp`;
  else if (type === "brand") hero.src = `${baseUrl}/brand_model.webp`;
  else hero.src = `${baseUrl}/${type}_model.webp`;
}

// 상품 카드 템플릿
function cardHTML({ href, imgSrc, name, price }) {
  return `
  <a href="${href}" class="relative block fade">
    <div class="relative aspect-[3/4] bg-neutral-100 overflow-hidden">
      <img src="${imgSrc}" alt="${name}"
        class="absolute inset-0 w-full h-full object-contain hover-zoom"
        loading="lazy" decoding="async"/>
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

// ✅ 브랜드 이름을 안전한 ID로 변환
function normalizeId(name) {
  return name.replace(/\s+/g, "-").replace(/[^\w-]/g, "");
}

// 브랜드 보기 전용 렌더링 (섹션 + 탭)
async function renderBrandView() {
  const brandTabs = document.getElementById("brandTabs");
  const grid = document.getElementById("categoryGrid");

  // 전체보기와 동일한 스타일을 위해 grid 해제 (중첩 방지)
  grid.classList.remove("grid", "grid-cols-2", "md:grid-cols-4", "gap-0");
  grid.innerHTML = `<p class="text-center text-gray-400 py-10">상품을 불러오는 중...</p>`;
  brandTabs.style.display = "block";
  brandTabs.innerHTML = `<p class="text-center text-gray-400 text-sm">브랜드 목록 불러오는 중...</p>`;

  try {
    const res = await fetch("/api/products/brands");
    const brands = await res.json();

    if (!Array.isArray(brands) || brands.length === 0) {
      brandTabs.innerHTML = `<p class="text-center text-gray-400">브랜드가 없습니다.</p>`;
      return;
    }

    // 브랜드 탭
    brandTabs.innerHTML = brands
      .map((b, i) => `<button data-target="${b}" ${i === 0 ? 'class="active"' : ""}>${b}</button>`)
      .join("");

    // 브랜드별 섹션 렌더링
    const sections = [];
    for (const b of brands) {
      const resp = await fetch(`/api/products?brand=${encodeURIComponent(b)}`);
      const items = await resp.json();

      const cards =
        items.length > 0
          ? items
              .map((p) => {
                const finalImageUrl = p.imageUrl?.startsWith("/uploads")
                  ? `${p.imageUrl}`
                  : p.imageUrl;
                return cardHTML({
                  href: `/frontend/pages/category/product.html?id=${p.product_id}`,
                  imgSrc: finalImageUrl,
                  name: p.name,
                  price: p.price,
                });
              })
              .join("")
          : `<p class="text-center text-gray-400 py-4">상품이 없습니다.</p>`;

      // ✅ 브랜드 이름을 normalizeId로 처리
      sections.push(`
        <section id="brand-${normalizeId(b)}" class="py-8">
          <h2 class="text-2xl font-semibold tracking-tight mb-3 ml-4">${b}</h2>
          <hr class="border-gray-300 mb-6 mx-4" />
          <div class="grid grid-cols-2 md:grid-cols-4 gap-0">${cards}</div>
        </section>
      `);
    }

    grid.innerHTML = sections.join("");
    activateFade();

    // 탭 클릭 시 스크롤 이동
    brandTabs.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const target = e.target.getAttribute("data-target");
        const section = document.getElementById(`brand-${normalizeId(target)}`);
        brandTabs.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");
        if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    // ✅ 스크롤에 따라 탭 자동 활성화 (개선된 버전)
    const sectionsEl = document.querySelectorAll("section[id^='brand-']");
    let currentActive = null;

    const observer = new IntersectionObserver(
      (entries) => {
        // 현재 화면에 가장 많이 보이는 섹션 찾기
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible) {
          const brandId = visible.target.id.replace("brand-", "");
          if (brandId !== currentActive) {
            currentActive = brandId;
            brandTabs.querySelectorAll("button").forEach((b) => {
              b.classList.toggle(
                "active",
                normalizeId(b.dataset.target) === brandId
              );
            });

            // 탭이 화면 밖이면 중앙 정렬
            const activeBtn = brandTabs.querySelector("button.active");
            if (activeBtn) {
              activeBtn.scrollIntoView({
                behavior: "smooth",
                inline: "center",
                block: "nearest",
              });
            }
          }
        }
      },
      {
        root: null,
        rootMargin: "0px 0px -40% 0px",
        threshold: [0, 0, 0],
      }
    );

    sectionsEl.forEach((section) => observer.observe(section));
  } catch (err) {
    console.error("브랜드 보기 오류:", err);
    grid.innerHTML = `<p class="text-center text-red-500 py-10">브랜드 데이터를 불러오는 중 오류가 발생했습니다.</p>`;
  }
}

// 기본 카테고리 보기
async function renderCategoryView(category, brand) {
  const grid = document.getElementById("categoryGrid");
  setHeroImage(brand ? "brand" : category);

  try {
    const query = brand
      ? `brand=${encodeURIComponent(brand)}`
      : category !== "all"
      ? `category=${encodeURIComponent(category)}`
      : "";

    const response = await fetch(`/api/products${query ? `?${query}` : ""}`);
    if (!response.ok) throw new Error("데이터를 불러오지 못했습니다.");
    const products = await response.json();

    if (products.length === 0) {
      grid.innerHTML = `<p class="col-span-full text-center py-10">표시할 상품이 없습니다.</p>`;
      return;
    }

    const cards = products
      .map((p) => {
        const isNewUrl = p.imageUrl && p.imageUrl.startsWith("/uploads");
        const finalImageUrl = isNewUrl
          ? `${p.imageUrl}`
          : p.imageUrl;
        return cardHTML({
          href: `/frontend/pages/category/product.html?id=${p.product_id}`,
          imgSrc: finalImageUrl,
          name: p.name,
          price: p.price,
        });
      })
      .join("");

    grid.innerHTML = cards;
    activateFade();
  } catch (error) {
    console.error("Error fetching products:", error);
    grid.innerHTML = `<p class="col-span-full text-center py-10 text-red-500">
      상품을 불러오는 중 오류가 발생했습니다.
    </p>`;
  }
}

// DOM 로드 후 실행
document.addEventListener("DOMContentLoaded", async () => {
  const { category, brand } = detectParams();

  if (category === "brand") {
    setHeroImage("brand");
    await renderBrandView();
  } else {
    await renderCategoryView(category, brand);
  }
});
