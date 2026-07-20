// ✅ /frontend/js/admin/admin_notice.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("notice-form");
  const statusEl = document.getElementById("status");
  const API_URL = "/api/admin/notice";

  if (!form) {
    console.error("폼 엘리먼트를 찾을 수 없습니다. id='notice-form' 확인 필요");
    return;
  }

  // ✅ 관리자 토큰 확인
  const userType = localStorage.getItem("userType");
  if (!userType) {
    alert("관리자 로그인이 필요합니다.");
    location.href = "/frontend/pages/admin/admin_login.html";
    return;
  }

  // ✅ (선택) 토큰 서버 검증
  fetch("/api/admin/verify", {
    credentials: 'include',
  })
    .then((r) => r.json())
    .then((v) => {
      if (!v?.success) {
        alert("세션이 만료되었습니다. 다시 로그인해주세요.");
        location.href = "/frontend/pages/admin/admin_login.html";
      }
    })
    .catch(() => {
      // 네트워크 에러일 땐 개발 편의상 통과
    });

  // ✅ 공지 등록 이벤트
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("title")?.value.trim();
    const content = document.getElementById("content")?.value.trim();

    if (!title || !content) {
      return showStatus("제목과 내용을 모두 입력하세요.", false);
    }

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, content }),
      });

      const data = await res.json();
      console.debug("[공지 등록 응답]", data);

      if (res.ok && data?.success) {
        showStatus("✅ 공지사항이 등록되었습니다!", true);
        setTimeout(() => {
          window.location.href = "/frontend/pages/admin/admin.html";
        }, 800);
      } else {
        showStatus(data?.message || "등록 실패", false);
      }
    } catch (err) {
      console.error("공지 등록 오류:", err);
      showStatus("서버 오류로 등록 실패", false);
    }
  });

  // ✅ 상태 메시지 표시
  function showStatus(msg, success) {
    if (!statusEl) {
      alert(msg);
      return;
    }
    statusEl.textContent = msg;
    statusEl.classList.remove("hidden", "text-green-600", "text-rose-600");
    statusEl.classList.add(success ? "text-green-600" : "text-rose-600");
  }
});
