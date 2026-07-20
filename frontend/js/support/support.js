// ✅ /frontend/js/support/support.js
// 문의사항 목록·상세·작성·수정·삭제 기능 통합

const SUPPORT_API = "/api/support";

const $list = document.getElementById("support-list");
const $form = document.getElementById("support-form");
const $loading = document.getElementById("support-loading");

// -----------------------------
// 🧩 공통 유틸
// -----------------------------

async function fetchCurrentUser() {
  try {
    const res = await fetch("/api/users/me", { 
      method: "GET", 
      credentials: "include" 
    });
    if (!res.ok) return null;
    
    const user = await res.json();
    return {
      id: user.buyer_id || user.seller_id || user.admin_id,
      role: user.userType || user.role
    };
  } catch (err) {
    return null;
  }
}

const fmtYMD = (ts) => {
  if (!ts) return "-";
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// -----------------------------
// ✅ 1. 문의글 목록 불러오기
// -----------------------------
async function loadSupportList() {
  if (!$list) return;
  $list.innerHTML = "";
  if ($loading) $loading.style.display = "block";

  try {
    const res = await fetch(SUPPORT_API, {
      headers: { "Content-Type": "application/json" }, // [수정] authHeaders() 삭제
      credentials: "include"
    });
    const data = await res.json();
    if ($loading) $loading.style.display = "none";

    if (!data.success) {
      $list.innerHTML = `<li class="py-8 text-center text-gray-500 col-span-5">${
        data.message || "불러오기 실패"
      }</li>`;
      return;
    }

    if (!data.inquiries || data.inquiries.length === 0) {
      $list.innerHTML = `<li class="py-8 text-center text-gray-500 col-span-5">등록된 문의가 없습니다.</li>`;
      return;
    }

    data.inquiries.forEach((item, idx) => {
      const li = document.createElement("li");
      li.className =
        "flex text-sm text-gray-700 hover:bg-gray-50 cursor-pointer transition border-b";

      const privateBadge = item.is_private
        ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-300 ml-2">
             <i data-lucide='lock' class='w-3 h-3 mr-1'></i>비밀글
           </span>`
        : "";

      li.innerHTML = `
        <div class="w-16 py-4 text-center">${data.inquiries.length - idx}</div>
        <div class="flex-1 py-4 px-4 text-center">
          <span class="text-gray-800">${item.title}</span>${privateBadge}
        </div>
        <div class="w-36 py-4 text-center">${item.author_name || "알 수 없음"}</div>
        <div class="w-40 py-4 text-center">${fmtYMD(item.created_at)}</div>
        <div class="w-28 py-4 text-center ${
          item.is_answered
            ? "text-green-600 font-semibold"
            : "text-gray-400"
        }">${item.is_answered ? "답변완료" : "미답변"}</div>
      `;

      li.addEventListener("click", () => {
        location.href = `/frontend/pages/support/support_detail.html?id=${item.support_id}`;
      });

      $list.appendChild(li);
    });

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    console.error("❌ 문의 목록 불러오기 오류:", err);
    if ($loading) $loading.style.display = "none";
    $list.innerHTML = `<li class='py-8 text-center text-red-500 col-span-5'>서버 오류가 발생했습니다.</li>`;
  }
}

// -----------------------------
// ✅ 2. 문의글 상세보기
// -----------------------------
async function loadSupportDetail(id) {
  const $title = document.getElementById("support-title");
  const $author = document.getElementById("support-author");
  const $date = document.getElementById("support-date");
  const $content = document.getElementById("support-content");
  const $answer = document.getElementById("support-answer");
  const $actions = document.getElementById("support-actions");

  if (!$title || !$content) return;

  $content.innerHTML = "불러오는 중...";

  try {
    const res = await fetch(`${SUPPORT_API}/${id}`, {
      headers: { "Content-Type": "application/json" }, // [수정] authHeaders() 삭제
      credentials: "include" // [추가]
    });
    const data = await res.json();

    if (!data.success) {
      $title.textContent = "오류";
      $content.innerHTML = `<div class='text-red-500'>${
        data.message || "불러오기 실패"
      }</div>`;
      return;
    }

    const privateBadge = data.is_private
      ? `<span class='inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600 border border-gray-300 ml-3'>
           <i data-lucide='lock' class='w-4 h-4 mr-1'></i>비밀글
         </span>`
      : "";

    $title.innerHTML = `${data.title}${privateBadge}`;
    $author.textContent = `작성자: ${data.author_name || "알 수 없음"}`;
    $date.textContent = `등록일: ${fmtYMD(data.created_at)}`;
    $content.textContent = data.content || "(내용 없음)";

    if (data.is_answered && data.answer) {
      $answer.classList.remove("hidden");
      $answer.innerHTML = `
        <div class='bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 mt-8'>
          <div class='flex items-center mb-3'>
            <i data-lucide='message-circle' class='w-5 h-5 text-green-600 mr-2'></i>
            <h3 class='font-semibold text-green-700 text-lg'>관리자 답변</h3>
          </div>
          <p class='text-gray-700 whitespace-pre-line leading-relaxed pl-7'>${data.answer}</p>
        </div>`;
    }

    const currentUser = await fetchCurrentUser();
    if (
      currentUser &&
      data.user_id === currentUser.id &&
      data.userType?.toLowerCase() === currentUser.role?.toLowerCase() &&
      !data.is_answered
    ) {
      if ($actions) {
        // 수정 버튼
        const editBtn = document.createElement("a");
        editBtn.href = `./support_edit.html?id=${id}`;
        editBtn.className =
          "inline-flex items-center px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition mr-3";
        editBtn.innerHTML =
          "<i data-lucide='edit-3' class='w-4 h-4 mr-2'></i> 수정하기";
        $actions.appendChild(editBtn);

        // 삭제 버튼
        const deleteBtn = document.createElement("button");
        deleteBtn.className =
          "inline-flex items-center px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition";
        deleteBtn.innerHTML =
          "<i data-lucide='trash-2' class='w-4 h-4 mr-2'></i> 삭제하기";
        deleteBtn.onclick = () => deleteSupportInquiry(id);
        $actions.appendChild(deleteBtn);
      }
    }

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    console.error("❌ 문의 상세 조회 오류:", err);
    $title.textContent = "오류";
    $content.innerHTML = `<div class='text-red-500'>서버 오류가 발생했습니다.</div>`;
  }
}

// -----------------------------
// ✅ 2-1. 문의글 삭제
// -----------------------------
async function deleteSupportInquiry(id) {
  if (!confirm("정말 이 문의를 삭제하시겠습니까?")) return;

  try {
    const res = await fetch(`${SUPPORT_API}/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" }, // [수정] authHeaders() 삭제
      credentials: "include" // [추가]
    });
    const data = await res.json();

    if (data.success) {
      alert("문의가 삭제되었습니다.");
      location.href = "./support.html";
    } else {
      alert(data.message || "삭제 실패");
    }
  } catch (err) {
    console.error("❌ 문의 삭제 오류:", err);
    alert("서버 오류가 발생했습니다.");
  }
}

// -----------------------------
// ✅ 3. 문의글 작성 (등록 페이지 전용)
// -----------------------------
async function setupWriteForm() {
  const $form = document.getElementById("support-form");
  if (!$form) return;

  $form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("title")?.value.trim();
    const content = document.getElementById("content")?.value.trim();
    const isPrivate = document.getElementById("is_private")?.checked;

    if (!title || !content) {
      alert("제목과 내용을 모두 입력하세요.");
      return;
    }

    try {
      const res = await fetch(SUPPORT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" }, // [수정] authHeaders() 삭제
        credentials: "include", // [추가]
        body: JSON.stringify({
          title,
          content,
          is_private: isPrivate ? 1 : 0,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("문의가 등록되었습니다.");
        location.href = "./support.html";
      } else {
        alert(data.message || "등록 실패");
      }
    } catch (err) {
      console.error("❌ 문의 등록 오류:", err);
      alert("서버 오류가 발생했습니다.");
    }
  });
}

// -----------------------------
// ✅ 4. 문의글 수정
// -----------------------------
async function loadSupportForEdit(id) {
  const $title = document.getElementById("title");
  const $content = document.getElementById("content");
  const $isPrivate = document.getElementById("is_private");
  const $formTitle = document.getElementById("form-title");
  const $submitBtn = document.getElementById("submit-btn");

  if (!$title || !$content) return;

  try {
    const res = await fetch(`${SUPPORT_API}/${id}`, {
      headers: { "Content-Type": "application/json" }, // [수정] authHeaders() 삭제
      credentials: "include" // [추가]
    });
    const data = await res.json();

    if (!data.success) {
      alert(data.message || "불러오기 실패");
      location.href = "./support.html";
      return;
    }

    const currentUser = await fetchCurrentUser();
    if (
      !currentUser ||
      data.user_id !== currentUser.id ||
      data.userType?.toLowerCase() !== currentUser.role?.toLowerCase()
    ) {
      alert("본인이 작성한 글만 수정할 수 있습니다.");
      location.href = "./support.html";
      return;
    }

    if (data.is_answered) {
      alert("답변이 등록된 문의는 수정할 수 없습니다.");
      location.href = `./support_detail.html?id=${id}`;
      return;
    }

    $title.value = data.title;
    $content.value = data.content;
    $isPrivate.checked = data.is_private;

    if ($formTitle) $formTitle.textContent = "문의 수정";
    if ($submitBtn) $submitBtn.textContent = "수정하기";

    const $form = document.getElementById("support-form");
    if ($form) {
      $form.onsubmit = async (e) => {
        e.preventDefault();
        const title = $title.value.trim();
        const content = $content.value.trim();
        const isPrivate = $isPrivate.checked;

        if (!title || !content) {
          alert("제목과 내용을 모두 입력하세요.");
          return;
        }

        try {
          const res = await fetch(`${SUPPORT_API}/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }, // [수정]
            credentials: "include", // [추가]
            body: JSON.stringify({
              title,
              content,
              is_private: isPrivate ? 1 : 0,
            }),
          });
          const data = await res.json();

          if (data.success) {
            alert("문의가 수정되었습니다.");
            location.href = `./support_detail.html?id=${id}`;
          } else {
            alert(data.message || "수정 실패");
          }
        } catch (err) {
          console.error("❌ 문의 수정 오류:", err);
          alert("서버 오류가 발생했습니다.");
        }
      };
    }
  } catch (err) {
    console.error("❌ 문의 불러오기 오류:", err);
    alert("서버 오류가 발생했습니다.");
    location.href = "./support.html";
  }
}

// -----------------------------
// ✅ 초기 실행
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const path = window.location.pathname;

  if (path.includes("support.html")) loadSupportList();
  if (id && path.includes("support_detail.html")) loadSupportDetail(id);
  if (id && path.includes("support_edit.html")) loadSupportForEdit(id);
  if (path.includes("support_write.html")) setupWriteForm();
});
