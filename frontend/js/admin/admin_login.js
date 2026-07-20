// ✅ /frontend/js/admin/admin_login.js
document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "/api/admin";
  const loginForm = document.getElementById("login-form");
  const errorMsg = document.getElementById("error-msg");

  if (!loginForm) return;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
      showError("아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // 쿠키 인증 추가
        body: JSON.stringify({ username, password }),
      });

      const result = await res.json();
      console.log("🧩 관리자 로그인 응답:", result);

      if (res.ok && result.success) {
        localStorage.setItem("userType", "admin"); // ✅ 추가
        localStorage.setItem("adminId", result.admin_id);
        localStorage.setItem("adminName", result.admin.name);
        alert("로그인 성공!");
        window.location.href = "/frontend/pages/admin/admin.html";
      } else {
        showError(result.message || "로그인 실패. 다시 시도해주세요.");
      }
    } catch (err) {
      console.error("로그인 요청 오류:", err);
      showError("서버 연결 오류: 백엔드가 실행 중인지 확인해주세요.");
    }
  });

  function showError(msg) {
    if (errorMsg) {
      errorMsg.textContent = msg;
      errorMsg.classList.remove("hidden");
    } else {
      alert(msg);
    }
  }
});
