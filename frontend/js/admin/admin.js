// ✅ /frontend/js/admin/admin.js
(() => {
  document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = "/api/admin";



    /* ---------------- 인증 확인 ---------------- */
    //const token = getToken();
    //if (!token) {
     // window.location.href = "/frontend/pages/admin/admin_login.html";
      //return;
    //}

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/verify`, {
          credentials: 'include',
        });
        const result = await res.json();

        if (!res.ok || !result.success) {
          alert("세션이 만료되었습니다. 다시 로그인해주세요.");
          //clearToken();
          window.location.href = "/frontend/pages/admin/admin_login.html";
          return;
        }
      } catch (err) {
        console.error("토큰 검증 실패:", err);
        //clearToken();
        window.location.href = "/frontend/pages/admin/admin_login.html";
        return;
      }
    })();

    /* ---------------- 관리자 이름 표시 ---------------- */
    const nameEl = document.getElementById("admin-name");
    const adminName = localStorage.getItem("adminName");
    if (nameEl && adminName) nameEl.textContent = `${adminName}님`;

    /* ---------------- 로그아웃 (수정) ---------------- */
    const logoutBtn = document.getElementById("logout-btn");
    logoutBtn?.addEventListener("click", async (e) => { // [추가] async
      e.preventDefault();
      
      try {
        // [추가] 서버 로그아웃 (쿠키 삭제)
        await fetch("/api/users/logout", { method: "POST" });
      } catch (err) {
        console.error("로그아웃 오류:", err);
      } finally {
        // clearToken(); // [삭제]
        localStorage.removeItem("adminId"); // UI용 데이터 삭제
        localStorage.removeItem("adminName");
        window.location.href = "/frontend/pages/admin/admin_login.html";
      }
    });

    /* ---------------- 회원 관리 ---------------- */
    const userTableBody = document.getElementById("user-table-body");
    const userModal = document.getElementById("user-modal");
    const modalCloseBtn = document.getElementById("user-modal-close");
    const toggleBtn = document.getElementById("btn-toggle-active");
    const deleteBtn = document.getElementById("btn-delete-user");
    let selectedUser = null;

    // 1️⃣ 전체 회원 불러오기
    async function loadUsers() {
      try {
        const res = await fetch(`${API_BASE}/users`, {
          credentials: 'include',
        });
        const result = await res.json();
        if (res.ok && result.success && result.users) {
          renderUserTable(result.users);
        } else {
          console.error("회원 목록 불러오기 실패:", result.message);
        }
      } catch (err) {
        console.error("회원 목록 요청 오류:", err);
      }
    }

    // 2️⃣ 테이블 렌더링
    function renderUserTable(users) {
      if (!userTableBody) return;
      userTableBody.innerHTML = "";
      users.forEach((u, idx) => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-gray-50 cursor-pointer transition";
        tr.innerHTML = `
          <td class="py-2 border-b">${idx + 1}</td>
          <td class="py-2 border-b">${u.role}</td>
          <td class="py-2 border-b">${u.name}</td>
          <td class="py-2 border-b">${u.username}</td>
          <td class="py-2 border-b">${u.email}</td>
          <td class="py-2 border-b">${u.phone || "-"}</td>
          <td class="py-2 border-b font-semibold ${
            u.is_active ? "text-green-600" : "text-red-500"
          }">${u.is_active ? "활성" : "정지"}</td>
        `;
        tr.addEventListener("click", () => openUserModal(u));
        userTableBody.appendChild(tr);
      });
    }

    // 3️⃣ 상세보기 모달
    function openUserModal(user) {
      selectedUser = user;
      document.getElementById("detail-role").textContent = user.role;
      document.getElementById("detail-name").textContent = user.name;
      document.getElementById("detail-username").textContent = user.username;
      document.getElementById("detail-email").textContent = user.email;
      document.getElementById("detail-phone").textContent = user.phone || "-";
      document.getElementById("detail-created").textContent =
        user.created_at || "-";
      document.getElementById("detail-status").textContent = user.is_active
        ? "활성"
        : "정지";

      const businessField = document.getElementById("detail-business");
      const companyField = document.getElementById("detail-company");
      const businessNumSpan = document.getElementById("detail-business-number");
      const companyNameSpan = document.getElementById("detail-company-name");

      if (user.role === "seller") {
        businessField.classList.remove("hidden");
        companyField.classList.remove("hidden");
        businessNumSpan.textContent = user.business_number || "-";
        companyNameSpan.textContent = user.company_name || "-";
      } else {
        businessField.classList.add("hidden");
        companyField.classList.add("hidden");
      }

      userModal.classList.remove("hidden");
    }

    modalCloseBtn?.addEventListener("click", () => {
      userModal.classList.add("hidden");
      selectedUser = null;
    });

    toggleBtn?.addEventListener("click", async () => {
      if (!selectedUser) return;
      const newStatus = selectedUser.is_active ? 0 : 1;
      if (
        !confirm(
          `회원 '${selectedUser.username}'를 ${
            newStatus ? "활성화" : "정지"
          }하시겠습니까?`
        )
      )
        return;

      try {
        const res = await fetch(
          `${API_BASE}/users/${selectedUser.id}/is_active`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              // ...authHeaders(), // [삭제]
            },
            credentials: 'include',
            body: JSON.stringify({
              role: selectedUser.role,
              is_active: newStatus,
            }),
          }
        );
        const result = await res.json();

        if (res.ok && result.success) {
          alert(result.message);
          userModal.classList.add("hidden");
          await loadUsers();
        } else alert(result.message || "상태 변경 실패");
      } catch (err) {
        console.error("상태 변경 요청 실패:", err);
      }
    });

    deleteBtn?.addEventListener("click", async () => {
      if (!selectedUser) return;
      if (!confirm(`정말 '${selectedUser.username}' 회원을 삭제하시겠습니까?`))
        return;
      try {
        const res = await fetch(`${API_BASE}/users/${selectedUser.id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json"},
          credentials: 'include',
          body: JSON.stringify({ role: selectedUser.role }),
        });
        const result = await res.json();

        if (res.ok && result.success) {
          alert("회원이 삭제되었습니다.");
          userModal.classList.add("hidden");
          await loadUsers();
        } else alert(result.message || "회원 삭제 실패");
      } catch (err) {
        console.error("회원 삭제 요청 실패:", err);
      }
    });

    /* ---------------- 문의사항 관리 ---------------- */
    const inquiryModal = document.getElementById("inquiry-modal");
    const inquiryClose = document.getElementById("inquiry-modal-close");
    const inquiryAnswerInput = document.getElementById("inquiry-answer");
    let selectedInquiry = null;

    async function loadSupports() {
      try {
        const res = await fetch(`${API_BASE}/support`, {
          credentials: 'include',
        });
        const result = await res.json();
        if (res.ok && result.success) {
          renderInquiryTable(result.supports);
        } else {
          console.error("문의 목록 불러오기 실패:", result.message);
        }
      } catch (err) {
        console.error("문의 목록 요청 오류:", err);
      }
    }

    function renderInquiryTable(supports) {
      const tbody = document.getElementById("inquiry-table-body");
      if (!tbody) return;
      tbody.innerHTML = "";
      supports.forEach((s, idx) => {
        const tr = document.createElement("tr");
        tr.className =
          "hover:bg-gray-50 cursor-pointer transition border-b text-sm";
        tr.innerHTML = `
          <td class="py-2">${idx + 1}</td>
          <td class="py-2">${s.title}</td>
          <td class="py-2">${s.user_role}</td>
          <td class="py-2">${new Date(s.created_at).toLocaleString()}</td>
          <td class="py-2 font-semibold ${
            s.is_answered ? "text-green-600" : "text-red-500"
          }">${s.is_answered ? "답변완료" : "미답변"}</td>
        `;
        tr.addEventListener("click", () => openInquiryModal(s));
        tbody.appendChild(tr);
      });
    }

    function openInquiryModal(support) {
      selectedInquiry = support;
      document.getElementById("inquiry-title").textContent = support.title;
      document.getElementById("inquiry-content").textContent = support.content;
      document.getElementById("inquiry-role").textContent = support.user_role;
      document.getElementById("inquiry-date").textContent = new Date(
        support.created_at
      ).toLocaleString();
      document.getElementById("inquiry-status").textContent = support.is_answered
        ? "답변완료"
        : "미답변";
      inquiryAnswerInput.value = support.answer || "";
      inquiryModal.classList.remove("hidden");
    }

    inquiryClose?.addEventListener("click", () => {
      inquiryModal.classList.add("hidden");
      selectedInquiry = null;
    });

    document
      .getElementById("inquiry-answer-submit")
      ?.addEventListener("click", async () => {
        if (!selectedInquiry) return;
        const answer = inquiryAnswerInput.value.trim();
        const admin_id = localStorage.getItem("adminId");
        if (!admin_id) {
          alert("관리자 정보가 없습니다. 다시 로그인해주세요.");
          window.location.href = "/frontend/pages/admin/admin_login.html";
          return;
        }
        if (!answer) return alert("답변 내용을 입력하세요.");

        const method = selectedInquiry.is_answered ? "edit" : "answer";
        try {
          const res = await fetch(
            `${API_BASE}/support/${selectedInquiry.support_id}/${method}`,
            {
              method: "PATCH",
              headers: { 
                  "Content-Type": "application/json" 
                  // [수정] authHeaders 삭제
              },
              credentials: 'include', // [추가]
              body: JSON.stringify({ answer, admin_id }),
            }
          );
          const result = await res.json();
          if (res.ok && result.success) {
            alert(result.message);
            inquiryModal.classList.add("hidden");
            loadSupports();
          } else alert(result.message || "답변 처리 실패");
        } catch (err) {
          console.error("답변 요청 오류:", err);
        }
      });

    document
      .getElementById("inquiry-answer-delete")
      ?.addEventListener("click", async () => {
        if (!selectedInquiry) return;
        if (!confirm("이 답변을 삭제하시겠습니까?")) return;
        try {
          const res = await fetch(
            `${API_BASE}/support/${selectedInquiry.support_id}/delete-answer`,
            { 
                method: "PATCH", 
                // [수정] headers 삭제 (필요 없음), credentials 추가
                credentials: 'include'
            }
          );
          const result = await res.json();
          if (res.ok && result.success) {
            alert("답변이 삭제되었습니다.");
            inquiryModal.classList.add("hidden");
            loadSupports();
          } else alert(result.message || "삭제 실패");
        } catch (err) {
          console.error("답변 삭제 오류:", err);
        }
      });

    /* ---------------- 공지사항 관리 ---------------- */
    const noticeModal = document.getElementById("notice-modal");
    const noticeClose = document.getElementById("notice-modal-close");
    const noticeTitle = document.getElementById("notice-title");
    const noticeContent = document.getElementById("notice-content");
    const noticeCreated = document.getElementById("notice-created");
    const noticeUpdate = document.getElementById("notice-update");
    const noticeDelete = document.getElementById("notice-delete");
    let selectedNotice = null;

    async function loadNotices() {
      try {
        const res = await fetch(`${API_BASE}/notice`, {
          credentials: 'include',
        });
        const result = await res.json();
        if (res.ok && result.success) {
          renderNoticeTable(result.notices);
        } else console.error("공지사항 목록 불러오기 실패:", result.message);
      } catch (err) {
        console.error("공지사항 목록 요청 오류:", err);
      }
    }

    function renderNoticeTable(notices) {
      const tbody = document.getElementById("notice-table-body");
      if (!tbody) return;
      tbody.innerHTML = "";
      notices.forEach((n, idx) => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-gray-50 cursor-pointer transition";
        tr.innerHTML = `
          <td class="py-2 border-b">${idx + 1}</td>
          <td class="py-2 border-b text-center px-3">${n.title}</td>
          <td class="py-2 border-b">${n.admin_name}</td>
          <td class="py-2 border-b">${new Date(
            n.created_at
          ).toLocaleString()}</td>
        `;
        tr.addEventListener("click", () => openNoticeModal(n));
        tbody.appendChild(tr);
      });
    }

    function openNoticeModal(n) {
      selectedNotice = n;
      noticeTitle.value = n.title;
      noticeContent.value = n.content;
      noticeCreated.textContent = `등록일: ${new Date(
        n.created_at
      ).toLocaleString()}`;
      noticeModal.classList.remove("hidden");
    }

    noticeClose?.addEventListener("click", () => {
      noticeModal.classList.add("hidden");
      selectedNotice = null;
    });

    noticeUpdate?.addEventListener("click", async () => {
      if (!selectedNotice) return;
      const newTitle = noticeTitle.value.trim();
      const newContent = noticeContent.value.trim();
      if (!newTitle || !newContent) return alert("제목과 내용을 모두 입력하세요.");
      if (!confirm("이 공지를 수정하시겠습니까?")) return;

      try {
        const res = await fetch(
          `${API_BASE}/notice/${selectedNotice.notice_id}`,
          {
            method: "PATCH",
            headers: { 
                "Content-Type": "application/json" 
                // [수정] authHeaders 삭제
            },
            credentials: 'include', // [추가]
            body: JSON.stringify({ title: newTitle, content: newContent }),
          }
        );
        const result = await res.json();
        if (result.success) {
          alert("공지사항이 수정되었습니다.");
          noticeModal.classList.add("hidden");
          await loadNotices();
        } else alert(result.message || "수정 실패");
      } catch (err) {
        console.error("공지 수정 실패:", err);
      }
    });

    noticeDelete?.addEventListener("click", async () => {
      if (!selectedNotice) return;
      if (!confirm("정말 이 공지를 삭제하시겠습니까?")) return;
      try {
        const res = await fetch(
          `${API_BASE}/notice/${selectedNotice.notice_id}`,
          { 
              method: "DELETE", 
              // [수정] headers 삭제, credentials 추가
              credentials: 'include' 
          }
        );
        const result = await res.json();
        if (result.success) {
          alert("공지사항이 삭제되었습니다.");
          noticeModal.classList.add("hidden");
          await loadNotices();
        } else alert(result.message || "삭제 실패");
      } catch (err) {
        console.error("공지 삭제 실패:", err);
      }
    });

    /* ---------------- 부드러운 탭 전환 ---------------- */
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabSections = document.querySelectorAll(".tab-section");
    if (tabButtons.length && tabSections.length) {
      let currentTab = null;
      let isTransitioning = false;

      tabButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          if (isTransitioning) return;
          isTransitioning = true;
          const target = btn.dataset.target;
          const nextSection = document.getElementById(`tab-${target}`);
          if (!nextSection || nextSection === currentTab) {
            isTransitioning = false;
            return;
          }

          tabButtons.forEach((b) =>
            b.classList.remove("bg-gray-700", "text-white")
          );
          btn.classList.add("bg-gray-700", "text-white");

          if (currentTab) {
            currentTab.style.transition = "all 0.3s ease-in-out";
            currentTab.style.opacity = "0";
            currentTab.style.transform = "translateX(30px)";
            setTimeout(() => {
              currentTab.classList.add("hidden");
              showNextTab();
            }, 280);
          } else showNextTab();

          function showNextTab() {
            nextSection.classList.remove("hidden");
            nextSection.style.opacity = "0";
            nextSection.style.transform = "translateX(-30px)";
            nextSection.style.transition = "all 0.3s ease-in-out";
            requestAnimationFrame(() => {
              nextSection.style.opacity = "1";
              nextSection.style.transform = "translateX(0)";
            });
            currentTab = nextSection;
            setTimeout(() => (isTransitioning = false), 300);
            localStorage.setItem("adminActiveTab", target);
          }
        });
      });

      const savedTab = localStorage.getItem("adminActiveTab") || "user";
      tabSections.forEach((section) =>
        section.classList.add("hidden", "opacity-0", "translate-x-5")
      );
      const defaultBtn = document.querySelector(
        `.tab-btn[data-target="${savedTab}"]`
      );
      if (defaultBtn) defaultBtn.click();
      else tabButtons[0]?.click();
    }

    /* ---------------- 초기 데이터 로드 ---------------- */
    loadUsers();
    loadSupports();
    loadNotices();
  });
})();
