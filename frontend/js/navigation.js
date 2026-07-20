document.addEventListener("DOMContentLoaded", async () => {
  const mount = document.getElementById("navigation");
  if (!mount) return;

  const src = mount.getAttribute("data-src");
  if (!src) {
    console.error("[navigation] data-src가 없습니다.");
    return;
  }

  try {
    const res = await fetch(src, { cache: "no-cache" });
    if (!res.ok) throw new Error(`[nav] fetch 실패 ${res.status}`);

    // ✅ navigation.html 내용을 삽입
    mount.innerHTML = await res.text();

    // ------------------------------
    // ✅ 로그인 상태에 따른 메뉴 표시
    // ------------------------------
    const navUtil = document.getElementById("nav-util");
    if (navUtil) {
      // ✅ 쿠키는 httpOnly라 JavaScript에서 읽을 수 없음
      // userType과 username은 localStorage에 유지 (민감 정보 아님)
      const userType = localStorage.getItem("userType");

      if (userType) {
        let myPageLink = "/frontend/pages/mypage/mypage.html";
        if (userType === "seller") {
          myPageLink = "/frontend/pages/seller/seller.html";
        }

        navUtil.innerHTML = `
          <a href="/frontend/pages/notice/notice.html">공지사항</a>
          <a href="/frontend/pages/support/support.html">문의사항</a>
          <a href="/frontend/pages/FAQ/FAQ.html">FAQ</a>
          <a href="${myPageLink}">마이페이지</a>
          <a href="#" id="logout-btn">로그아웃</a>
        `;

        const logoutBtn = document.getElementById("logout-btn");
        if (logoutBtn) {
          logoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            if (confirm("로그아웃하시겠습니까?")) {
              try {
                // ✅ 서버에 로그아웃 요청 (쿠키 삭제)
                const response = await fetch("/api/users/logout", {
                  method: "POST",
                  credentials: "include" // 쿠키 전송
                });

                if (response.ok) {
                  // localStorage에서 userType, username만 삭제
                  localStorage.removeItem("userType");
                  localStorage.removeItem("username");
                  alert("로그아웃되었습니다.");
                  window.location.href = "/frontend/pages/main.html";
                } else {
                  alert("로그아웃 중 오류가 발생했습니다.");
                }
              } catch (error) {
                console.error("로그아웃 오류:", error);
                // 실패해도 로컬 정보는 삭제
                localStorage.removeItem("userType");
                localStorage.removeItem("username");
                window.location.href = "/frontend/pages/main.html";
              }
            }
          });
        }
      } else {
        navUtil.innerHTML = `
          <a href="/frontend/pages/notice/notice.html">공지사항</a>
          <a href="/frontend/pages/support/support.html">문의사항</a>
          <a href="/frontend/pages/FAQ/FAQ.html">FAQ</a>
          <a href="/frontend/pages/login&signup/login.html">로그인</a>
          <a href="/frontend/pages/login&signup/signup.html">회원가입</a>
        `;
      }
    }

    // ------------------------------
    // ✅ 검색 기능
    // ------------------------------
    const searchInput = document.getElementById("search-input");
    const searchBtn = document.getElementById("search-btn");

    if (searchBtn && searchInput) {
      searchBtn.addEventListener("click", () => {
        const keyword = searchInput.value.trim();
        if (keyword) {
          window.location.href = `/frontend/pages/search/search.html?keyword=${encodeURIComponent(keyword)}`;
        } else {
          alert("검색어를 입력해주세요.");
        }
      });

      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          searchBtn.click();
        }
      });
    }
  } catch (err) {
    console.error("[navigation] 로드 실패:", err);
  }
});