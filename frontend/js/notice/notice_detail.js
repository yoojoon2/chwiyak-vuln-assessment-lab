// ✅ /frontend/js/notice/notice_detail.js
const params = new URLSearchParams(window.location.search);
const id = params.get("id");

const API_URL = `/api/notice/${encodeURIComponent(id || "")}`;

const $title = document.getElementById("notice-title");
const $author = document.getElementById("notice-author");
const $date = document.getElementById("notice-date");
const $content = document.getElementById("notice-content");

// 날짜 포맷: "2025. 10. 29. 오전 9:35:48" 스타일
function fmtKLocale(ts) {
  try {
    return new Date(ts).toLocaleString("ko-KR", { hour12: true });
  } catch {
    return "-";
  }
}

async function loadNotice() {
  // id가 없으면 목록으로
  if (!id) {
    $content.textContent = "잘못된 접근입니다. 목록으로 이동합니다.";
    setTimeout(() => history.back(), 1000);
    return;
  }

  try {
    const res = await fetch(API_URL, { headers: { Accept: "application/json" } });
    const data = await res.json();

    if (!res.ok || !data.success || !data.notice) {
      throw new Error(data.message || `HTTP ${res.status}`);
    }

    const n = data.notice;

    // 제목/작성자/날짜
    $title.textContent = n.title || "(제목 없음)";
    $author.textContent = `작성자: ${n.admin_name || "관리자"}`;
    $date.textContent = `등록일: ${fmtKLocale(n.created_at)}`;

    // 본문: 줄바꿈을 살리고 안전하게 렌더링
    // (XSS 방지를 위해 기본은 textContent 사용 → \n을 <br>로만 치환)
    const safe = (n.content ?? "").replace(/\n/g, "<br>");
    $content.innerHTML = safe || "<span class='text-gray-400'>내용이 없습니다.</span>";
  } catch (err) {
    console.error("공지 상세 로드 실패:", err);
    $title.textContent = "불러오기 실패";
    $content.innerHTML =
      `<p class="text-center text-gray-500">공지사항을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>`;
  }
}

document.addEventListener("DOMContentLoaded", loadNotice);
