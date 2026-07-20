// ✅ /frontend/js/notice/notice.js
// 공지사항 목록 로드 스크립트

const NOTICE_API = "/api/notice";
console.log("📡 NOTICE_API =", NOTICE_API);

const $list = document.getElementById("notice-list");
const $loading = document.getElementById("notice-loading");

// 날짜 포맷 (YYYY-MM-DD)
function fmtYMD(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 목록 렌더링
function render(notices) {
  $list.innerHTML = "";

  if (!Array.isArray(notices) || notices.length === 0) {
    $list.innerHTML = `
      <li class="px-4 py-8 text-center text-gray-500">
        등록된 공지사항이 없습니다.
      </li>`;
    return;
  }

  notices.forEach((n, idx) => {
    const li = document.createElement("li");
    li.className =
      "hover:bg-gray-50 transition grid grid-cols-[64px_1fr_140px_160px] items-center px-2 sm:px-4 py-4 cursor-pointer";

    li.innerHTML = `
      <div class="text-center text-gray-700">${idx + 1}</div>
      <div class="text-center text-gray-900 font-medium hover:underline">${n.title || "(제목 없음)"}</div>
      <div class="text-center text-gray-700">${n.admin_name || "관리자"}</div>
      <div class="text-center text-gray-500">${fmtYMD(n.created_at)}</div>
    `;

    // 클릭 시 상세페이지로 이동
    li.addEventListener("click", () => {
      window.location.href = `/frontend/pages/notice/notice_detail.html?id=${n.notice_id}`;
    });

    $list.appendChild(li);
  });
}

// 데이터 로드
async function load() {
  try {
    if ($loading) $loading.remove();

    const res = await fetch(NOTICE_API, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    // ✅ 백엔드 구조: { success: true, notices: [...] }
    if (data.success && Array.isArray(data.notices)) {
      render(data.notices);
    } else {
      throw new Error(data.message || "알 수 없는 응답 구조");
    }
  } catch (err) {
    console.error("공지사항 로드 실패:", err);
    $list.innerHTML = `
      <li class="px-4 py-8 text-center text-gray-500">
        공지사항을 불러오지 못했습니다.
      </li>`;
  }
}

document.addEventListener("DOMContentLoaded", load);
