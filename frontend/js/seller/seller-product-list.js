// ✅ 판매자 상품 관리 스크립트
document.addEventListener("DOMContentLoaded", async () => {
  const $list = document.getElementById("productList");
  const $empty = document.getElementById("emptyState");

  // ✅ API 자동 감지 (Live Server ↔ Backend)
  const API_BASE_URL =
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost"
      ? ""
      : window.location.origin;

  // ✅ 로그인 토큰 확인
  const userType = localStorage.getItem("userType");
  if (!userType) {
    alert("로그인이 필요합니다.");
    location.href = "/frontend/pages/login.html";
    return;
  }

  // ✅ 모달 요소 가져오기
  const modal = document.getElementById("editModal");
  const form = document.getElementById("editForm");
  const nameInput = document.getElementById("editName");
  const priceInput = document.getElementById("editPrice");
  const descInput = document.getElementById("editDesc");
  const imageInput = document.getElementById("editImage");
  const preview = document.getElementById("imagePreview");

  // --- 애니메이션: 모달 열기/닫기 ---
  const openModal = () => {
    modal.classList.remove("hidden");
    setTimeout(() => {
      modal.classList.add("opacity-100");
      modal.classList.remove("opacity-0");
      document.getElementById("modalBox").classList.remove("scale-95");
      document.getElementById("modalBox").classList.add("scale-100");
    }, 10);
  };

  const closeModal = () => {
    modal.classList.add("opacity-0");
    modal.classList.remove("opacity-100");
    document.getElementById("modalBox").classList.remove("scale-100");
    document.getElementById("modalBox").classList.add("scale-95");
    setTimeout(() => {
      modal.classList.add("hidden");
    }, 300);
  };

  document.getElementById("closeModal").onclick = closeModal;
  document.getElementById("cancelEdit").onclick = closeModal;
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // ✅ 상품 조회
  try {
    const res = await fetch(`${API_BASE_URL}/api/sellerProducts`, {
      credentials: "include",
    });

    if (!res.ok) throw new Error(`서버 응답 오류 (${res.status})`);

    const products = await res.json();
    if (!Array.isArray(products) || products.length === 0) {
      $empty.classList.remove("hidden");
      return;
    }

    // ✅ 렌더링
    products.forEach((p, idx) => {
      const row = document.createElement("div");
      row.className = "py-4";

      const line = document.createElement("div");
      line.className =
        "grid grid-cols-[1fr_96px_120px_2.75fr_auto] gap-4 items-center px-2 sm:px-3";

      // --- 상품명 ---
      const nameEl = document.createElement("div");
      nameEl.className = "text-center font-medium";
      nameEl.textContent = p.name ?? "(이름 없음)";

      // --- 이미지 ---
      const imgEl = document.createElement("div");
      imgEl.className = "flex items-center justify-center";

      const imgWrap = document.createElement("div");
      imgWrap.className =
        "w-24 h-24 rounded overflow-hidden bg-slate-100 flex items-center justify-center";

      const img = document.createElement("img");
      img.className = "w-full h-full object-cover";
      img.alt = "상품 이미지";

      if (p.imageUrl) {
        img.src = p.imageUrl.startsWith("http")
          ? p.imageUrl
          : `${API_BASE_URL}${p.imageUrl}`;
      } else {
        img.src = `${API_BASE_URL}/uploads/assets/no-image.png`;
      }

      imgWrap.appendChild(img);
      imgEl.appendChild(imgWrap);

      // --- 가격 ---
      const priceEl = document.createElement("div");
      priceEl.className = "text-center";
      priceEl.textContent =
        Number(p.price || 0).toLocaleString("ko-KR") + "원";

      // --- 설명 ---
      const descEl = document.createElement("div");
      descEl.className =
        "text-left text-sm leading-5 text-slate-700 break-words";
      descEl.textContent = p.description ?? "(설명 없음)";

      // --- 수정 / 삭제 버튼 ---
      const actionsEl = document.createElement("div");
      actionsEl.className = "flex items-center justify-center gap-0.5";

      // ✅ 수정 버튼
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className =
        "px-2.5 py-1.5 rounded-md text-sm font-medium bg-sky-100 text-sky-700 border border-sky-200 hover:bg-sky-200";
      editBtn.textContent = "수정";

      editBtn.addEventListener("click", () => {
        // 기존 값 채우기
        nameInput.value = p.name || "";
        priceInput.value = p.price || "";
        descInput.value = p.description || "";

        if (p.imageUrl) {
          preview.src = p.imageUrl.startsWith("http")
            ? p.imageUrl
            : `${API_BASE_URL}${p.imageUrl}`;
          preview.classList.remove("hidden");
        } else {
          preview.classList.add("hidden");
        }

        imageInput.value = "";
        openModal();

        // 이미지 미리보기 변경
        imageInput.onchange = () => {
          const file = imageInput.files[0];
          if (file) {
            preview.src = URL.createObjectURL(file);
            preview.classList.remove("hidden");
          }
        };

        // 폼 제출
        form.onsubmit = async (e) => {
          e.preventDefault();

          const formData = new FormData();
          formData.append("name", nameInput.value);
          formData.append("price", priceInput.value);
          formData.append("description", descInput.value);
          formData.append("category", p.category);
          if (imageInput.files.length > 0) {
            formData.append("mainImage", imageInput.files[0]);
          }

          try {
            const res = await fetch(
              `${API_BASE_URL}/api/sellerProducts/${p.product_id || p.id}`,
              {
                method: "PUT",
                credentials: "include",
                body: formData,
              }
            );

            const result = await res.json();
            if (res.ok) {
              alert("상품이 수정되었습니다.");
              closeModal();
              location.reload();
            } else {
              alert(`수정 실패: ${result.message}`);
            }
          } catch (err) {
            console.error("❌ 상품 수정 요청 오류:", err);
            alert("상품 수정 중 오류가 발생했습니다.");
          }
        };
      });

      // ✅ 삭제 버튼
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className =
        "px-2.5 py-1.5 rounded-md text-sm font-medium bg-rose-100 text-rose-700 border border-rose-200 hover:bg-rose-200";
      delBtn.textContent = "삭제";

      delBtn.addEventListener("click", async () => {
        if (!confirm(`정말 삭제하시겠습니까?\n[${p.name}]`)) return;

        try {
          const res = await fetch(
            `${API_BASE_URL}/api/sellerProducts/${p.product_id || p.id}`,
            {
              method: "DELETE",
              credentials: "include",
            }
          );

          const result = await res.json();
          if (res.ok) {
            alert(result.message || "상품이 삭제되었습니다.");
            row.remove();
            if (!$list.querySelector("div.grid"))
              $empty.classList.remove("hidden");
          } else {
            alert(`삭제 실패: ${result.message}`);
          }
        } catch (err) {
          console.error("❌ 상품 삭제 요청 오류:", err);
          alert("상품 삭제 중 오류가 발생했습니다.");
        }
      });

      actionsEl.append(editBtn, delBtn);
      line.append(nameEl, imgEl, priceEl, descEl, actionsEl);
      row.append(line);

      const hr = document.createElement("hr");
      hr.className = "mt-4 border-slate-200";
      $list.appendChild(row);
      if (idx < products.length - 1) $list.appendChild(hr);
    });
  } catch (err) {
    console.error("❌ 상품 조회 오류:", err);
    alert("상품을 불러오는 중 오류가 발생했습니다.");
    $empty.classList.remove("hidden");
  }
});
