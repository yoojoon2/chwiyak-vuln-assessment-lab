// /frontend/js/main.js
const API_BASE = "";

// 로그인 요청

// --- 전화번호, 이메일, 비밀번호 검증 함수 추가 ---
function validatePhone(phone) {
  // 010, 011, 016, 017, 018, 019 등 모든 휴대폰 번호
  // 02, 031, 032, 033 등 지역번호 포함
  const phonePattern1 = /^0\d{1,2}\d{7,8}$/; // 01012345678, 0212345678 형식
  const phonePattern2 = /^0\d{1,2}-\d{3,4}-\d{4}$/; // 010-1234-5678, 02-123-4567 형식
  return phonePattern1.test(phone) || phonePattern2.test(phone);
}

function validateEmail(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}(\.[a-zA-Z]{2,})?$/;
  return emailPattern.test(email);
}

function validatePassword(password) {
  // 8자리 이상
  return password.length >= 8;
}
// --- 검증 함수 끝 ---

// --- 로그인 상태에 따른 네비게이션 바 로드 ---
document.addEventListener("DOMContentLoaded", () => {
  const navDiv = document.querySelector("#navigation");
  if (navDiv && navDiv.dataset.src) {
    fetch(navDiv.dataset.src)
      .then((res) => res.text())
      .then((html) => {
        navDiv.innerHTML = html; // 1. 내비게이션 HTML 삽입

        // --- 로그인 상태 체크 및 메뉴 변경 로직 ---
        const navUtil = document.getElementById('nav-util');
        if (navUtil) {
            //const token = localStorage.getItem('token');
            const userType = localStorage.getItem('userType');

            if (userType) {
                // 로그인 상태일 때 메뉴
                let myPageLink = '/frontend/pages/mypage/mypage.html';
                if (userType === 'seller') {
                    myPageLink = '/frontend/pages/seller/seller.html';
                }

                navUtil.innerHTML = `
                    <a href="/frontend/pages/notice/notice.html">공지사항</a>
                    <a href="/frontend/pages/support/support.html">문의사항</a>
                    <a href="/frontend/pages/FAQ/FAQ.html">FAQ</a>
                    <a href="${myPageLink}">마이페이지</a>
                    <a href="#" id="logout-btn">로그아웃</a>
                `;

                // 로그아웃 버튼 기능 추가
                const logoutBtn = document.getElementById('logout-btn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        if (confirm('로그아웃하시겠습니까?')) {
                          try {
                            await fetch('/api/users/logout', { method: 'POST' });
                          } catch (err) {
                                console.error("로그아웃 오류", err);
                            } finally {
                            //localStorage.removeItem('token');
                            localStorage.removeItem('userType');
                            localStorage.removeItem('username');
                            alert('로그아웃되었습니다.');
                            window.location.href = '/frontend/pages/main.html';
                            }
                        }
                    });
                }
            }
        }
        // --- 로직 추가 끝 ---

        // lucide 아이콘 다시 렌더링
        if (window.lucide) {
          lucide.createIcons();
        }
      })
      .catch((err) => console.error("네비게이션 로드 실패:", err));
  }
  // --- 🔼 수정 끝 🔼 ---

  // 메인 페이지 슬라이드
  const slides = document.querySelectorAll("#slider .fade");
  const indicator = document.getElementById("slideIndicator");
  if (slides.length && indicator) {
    let current = 0;
    const showSlide = (n) => {
      slides.forEach((slide, i) => {
        slide.classList.remove("active");
        if (i === n) slide.classList.add("active");
      });
      indicator.textContent = `${n + 1} / ${slides.length}`;
    };
    const nextSlide = () => {
      current = (current + 1) % slides.length;
      showSlide(current);
    };
    const prevSlide = () => {
      current = (current - 1 + slides.length) % slides.length;
      showSlide(current);
    };

    // 전역으로 버튼에서 접근 가능하게 등록
    window.nextSlide = nextSlide;
    window.prevSlide = prevSlide;
    setInterval(nextSlide, 5000);
  }

  // 회원가입 페이지
  const step1 = document.getElementById("step1");
  const step2 = document.getElementById("step2");
  const step3 = document.getElementById("step3");
  const formContainer = document.getElementById("formContainer");
  const form1 = document.getElementById("form1");
  const form2 = document.getElementById("form2");
  const sellerFields = document.getElementById("seller-fields");

  if (step1 && step2 && step3) {
    // 유형 선택
    window.selectType = function (type) {
      if (!sellerFields) return;
      if (type === "seller") {
        sellerFields.classList.remove("hidden");
        setTimeout(() => sellerFields.classList.add("opacity-100"), 50);
        document.getElementById("seller").checked = true;
      } else {
        sellerFields.classList.remove("opacity-100");
        setTimeout(() => sellerFields.classList.add("hidden"), 300);
        document.getElementById("buyer").checked = true;
      }
    };

    // 단계 전환 함수
    function goToStep(num) {
      [step1, step2, step3].forEach((s) => s.classList.add("hidden"));
      document.getElementById(`step${num}`).classList.remove("hidden");
    }

    window.goToStep = goToStep;

    // 뒤로가기 버튼
    window.goBack = function () {
      if (!step1.classList.contains("hidden")) {
        window.location.href = "login.html";
      } else if (!step2.classList.contains("hidden")) {
        // step2 → step1 슬라이드 복귀
        step2.classList.add(
          "transition-all",
          "duration-700",
          "opacity-0",
          "translate-x-full"
        );
        setTimeout(() => {
          step2.classList.add("hidden");
          step2.classList.remove("opacity-0", "translate-x-full");
          step1.classList.remove("hidden");
          step1.classList.add("opacity-0", "translate-x-[-50%]");
          setTimeout(() => {
            step1.classList.remove("opacity-0", "translate-x-[-50%]");
          }, 50);
        }, 500);
      } else if (!step3.classList.contains("hidden")) {
        goToStep(2);
      }
    };

    // step1 검증
    window.validateStep1 = function () {
      const buyer = document.getElementById("buyer");
      const seller = document.getElementById("seller");
      let isValid = true;

      if (!buyer.checked && !seller.checked) {
        alert("회원 유형을 선택해주세요.");
        return;
      }

      if (seller.checked) {
        const businessNumber = document.getElementById("businessNumber");
        const shopName = document.getElementById("shopName");
        const businessWarning = businessNumber.nextElementSibling;
        const shopWarning = shopName.nextElementSibling;

        if (!businessNumber.value.trim()) {
          businessWarning.classList.remove("hidden");
          isValid = false;
        } else {
          businessWarning.classList.add("hidden");
        }

        if (!shopName.value.trim()) {
          shopWarning.classList.remove("hidden");
          isValid = false;
        } else {
          shopWarning.classList.add("hidden");
        }
      }

      if (isValid) {
        step1.classList.add(
          "transition-all",
          "duration-700",
          "opacity-0",
          "translate-x-[-50%]"
        );
        setTimeout(() => {
          step1.classList.add("hidden");
          step1.classList.remove("opacity-0", "translate-x-[-50%]");
          step2.classList.remove("hidden");
          step2.classList.add("translate-x-full", "opacity-0");
          setTimeout(() => {
            step2.classList.remove("translate-x-full", "opacity-0");
          }, 50);
        }, 500);
      }
    };

    // 입력 페이지 전환 (form1 <-> form2) - 비밀번호 검증 추가
    window.nextFormPage = function () {
      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value.trim();
      const passwordConfirm = document.getElementById("passwordConfirm").value.trim();
      
      let isValid = true;

      // 아이디 검증
      const usernameError = document.querySelector('#username + p');
      if (!username) {
        usernameError.classList.remove("hidden");
        isValid = false;
      } else {
        usernameError.classList.add("hidden");
      }

      // 비밀번호 검증
      const passwordError = document.getElementById("passwordError");
      if (!password) {
        passwordError.textContent = "비밀번호를 입력해주세요.";
        passwordError.classList.remove("hidden");
        isValid = false;
      } else if (!validatePassword(password)) {
        passwordError.textContent = "비밀번호는 8자리 이상이어야 합니다.";
        passwordError.classList.remove("hidden");
        isValid = false;
      } else {
        passwordError.classList.add("hidden");
      }

      // 비밀번호 확인 검증
      const passwordConfirmError = document.getElementById("passwordConfirmError");
      if (!passwordConfirm) {
        passwordConfirmError.textContent = "비밀번호를 다시 입력해주세요.";
        passwordConfirmError.classList.remove("hidden");
        isValid = false;
      } else if (password !== passwordConfirm) {
        passwordConfirmError.textContent = "비밀번호가 일치하지 않습니다.";
        passwordConfirmError.classList.remove("hidden");
        isValid = false;
      } else {
        passwordConfirmError.classList.add("hidden");
      }

      if (!isValid) return;

      // 검증 통과 시 페이지 슬라이드
      formContainer.style.transform = "translateX(-50%)";
      form1.style.opacity = "0";
      form2.style.opacity = "1";
    };

    window.prevFormPage = function () {
      formContainer.style.transform = "translateX(0)";
      form1.style.opacity = "1";
      form2.style.opacity = "0";
    };

    // 최종 검증 (전화번호 및 이메일 검증 추가)
    window.validateForm = async function () {
      const fields = [
        "name",
        "phone",
        "email",
      ];
      let isValid = true;

      // 이름, 전화번호, 이메일 기본 검증
      fields.forEach((id) => {
        const input = document.getElementById(id);
        if (!input) return;
        const warning = input.nextElementSibling;
        if (!input.value.trim()) {
          warning.classList.remove("hidden");
          isValid = false;
        } else {
          warning.classList.add("hidden");
        }
      });

      // --- 🔽 전화번호 검증 추가 ---
      const phone = document.getElementById("phone").value.trim();
      const phoneError = document.getElementById("phoneError");
      if (phone && !validatePhone(phone)) {
        if (phoneError) {
          phoneError.textContent = '올바른 전화번호 형식을 입력해주세요. (예: 010-1234-5678, 02-123-4567)';
          phoneError.classList.remove("hidden");
        }
        isValid = false;
      } else if (phoneError && phone) {
        phoneError.classList.add("hidden");
      }
      // --- 🔼 전화번호 검증 끝 ---

      // --- 🔽 이메일 검증 추가 ---
      const email = document.getElementById("email").value.trim();
      const emailError = document.getElementById("emailError");
      if (email && !validateEmail(email)) {
        if (emailError) {
          emailError.textContent = '올바른 이메일 형식을 입력해주세요. (예: example@email.com)';
          emailError.classList.remove("hidden");
        }
        isValid = false;
      } else if (emailError && email) {
        emailError.classList.add("hidden");
      }
      // --- 🔼 이메일 검증 끝 ---

      if (isValid) {
        // --- 🔽 API 호출을 위해 추가된 부분 🔽 ---
        
        // 1. 폼 데이터 수집
        const userTypeRadio = document.querySelector('input[name="type"]:checked');
        const formData = {
            role: userTypeRadio.value, // 'buyer' 또는 'seller'
            username: document.getElementById('username').value,
            password: document.getElementById('password').value,
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
        };

        // 판매자일 경우, 판매자 정보 추가
        if (formData.userType === 'seller') {
            formData.company_name = document.getElementById('shopName').value;
            formData.business_reg_no = document.getElementById('businessNumber').value;
        }

        // 2. fetch를 사용하여 백엔드에 데이터 전송
        try {
            const response = await fetch('/api/users/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const result = await response.json();

            if (response.ok) { // HTTP 상태 코드가 200-299일 경우
                alert(result.message); // "회원가입 성공" 메시지 표시
                goToStep(3); // 가입 완료 화면으로 이동
            } else { // 서버에서 에러를 보냈을 경우
                alert(`오류: ${result.message}`);
            }
        } catch (error) {
            console.error('회원가입 요청 실패:', error);
            alert('서버와 통신 중 오류가 발생했습니다. 백엔드 서버가 켜져 있는지 확인해주세요.');
        }
        // --- 🔼 API 호출 코드 끝 🔼 ---
        
      } // if (isValid) 끝
    };
  }

  // 아이디 찾기 페이지
  // === 🔎 아이디 찾기 페이지 ===
if (document.getElementById("findIdForm")) {
  window.sendIdEmail = async function () {
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const successMsg = document.getElementById("successMsg");

    if (!name || !email) {
      alert("이름과 이메일을 모두 입력해주세요.");
      return;
    }

    try {
      const res = await fetch('/api/users/find-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });

      const result = await res.json();
      console.log("아이디 찾기 응답:", result);

      if (res.status >= 200 && res.status < 300) {
        successMsg.classList.remove("hidden");
        successMsg.textContent = result.message || "입력하신 이메일로 아이디를 전송했습니다.";
      } else {
        alert(result.message || "아이디 찾기 실패. 다시 시도해주세요.");
      }
    } catch (err) {
      console.error("아이디 찾기 오류:", err);
      alert("서버 연결 오류가 발생했습니다.");
    }
  };
}


  // 비밀번호 찾기 페이지
 if (document.getElementById("findPwForm")) {
  window.sendPwEmail = async function () {
    const name = document.getElementById("name").value.trim();
    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const successMsg = document.getElementById("successMsg");

    if (!name || !username || !email) {
      alert("이름, 아이디, 이메일을 모두 입력해주세요.");
      return;
    }

    try {
      const res = await fetch('/api/users/find-pw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, email }),
      });

      const result = await res.json();

      if (res.status === 200) {
        // ✅ 일치하는 계정일 때만 메일 전송 완료 메시지
        successMsg.classList.remove("hidden");
        successMsg.textContent =
          result.message || "입력하신 이메일로 비밀번호 재설정 링크를 전송했습니다.";
      } else if (res.status === 404) {
        // ❌ 일치하지 않음
        alert("입력하신 정보와 일치하는 계정을 찾을 수 없습니다.");
      } else {
        alert(result.message || "비밀번호 찾기 중 오류가 발생했습니다.");
      }
    } catch (err) {
      console.error("비밀번호 찾기 요청 실패:", err);
      alert("서버 연결 오류가 발생했습니다. 백엔드가 실행 중인지 확인해주세요.");
    }
  };
}



  // ✅ DB 기반 "지금 가장 주목받는 신상"
  const trendingGrid = document.getElementById("trendingGrid");

  if (trendingGrid) {

    async function loadTrendingProducts() {
      try {
        const response = await fetch(`${API_BASE}/api/products`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const products = Array.isArray(data) ? data : data.data || [];

        if (products.length === 0) {
          trendingGrid.innerHTML = `
            <p class="text-gray-500 text-center col-span-full py-8">
              표시할 상품이 없습니다.
            </p>`;
          return;
        }

        // ✅ Fisher–Yates Shuffle
        const shuffled = [...products];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const randomFive = shuffled.slice(0, 5);

        trendingGrid.innerHTML = randomFive
          .map((p) => {
            // --- 🔽 product.js와 동일한 이미지 처리 ---
            const isNewUrl = p.imageUrl && p.imageUrl.startsWith("/uploads");
            const finalImageUrl = isNewUrl
              ? `${p.imageUrl}`
              : p.imageUrl;

            const imageUrl =
              finalImageUrl ||
              (Array.isArray(p.images) ? p.images[0] : "") ||
              "/frontend/public/default_product.jpg";
            // --- 🔼 동일한 로직 끝 ---

            const price =
              typeof p.price === "number"
                ? p.price.toLocaleString("ko-KR")
                : Number(p.price || 0).toLocaleString("ko-KR");

            return `
              <a href="/frontend/pages/category/product.html?id=${p.id}" class="block">
                <div class="flex flex-col items-center">
                  <div class="w-40 h-70 bg-white rounded-md mb-2 hover-zoom flex items-center justify-center overflow-hidden">
                    <img src="${imageUrl}" alt="${p.name}" class="object-cover w-full h-full"/>
                  </div>
                  <p class="text-sm font-semibold text-center truncate w-36">${p.name}</p>
                  <p class="text-sm text-gray-600">${price}원</p>
                </div>
              </a>`;
          })
          .join("");
      } catch (error) {
        console.error("❌ 신상 상품 로드 실패:", error);
        trendingGrid.innerHTML = `
          <p class="text-gray-500 text-center col-span-full py-8">
            상품 정보를 불러오는 중 오류가 발생했습니다.
          </p>`;
      }
    }

    loadTrendingProducts();
  }



  // --- 🔽 [올바른 위치] 로그인 기능 🔽 ---
  const loginForm = document.getElementById('login-form');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault(); // 폼 자동 제출(새로고침) 방지

      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;

      if (!username || !password) {
          alert('아이디와 비밀번호를 모두 입력해주세요.');
          return;
      }

      try {
          const response = await fetch('/api/users/login', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              credentials: "include",
              body: JSON.stringify({ username, password }),
          });

          const result = await response.json();

          if (response.ok) {
              alert(result.message); // "로그인 성공" 메시지

              // [중요] 발급받은 토큰을 브라우저 저장소(localStorage)에 저장합니다.
              //localStorage.setItem('token', result.token);
              localStorage.setItem('userType', result.role);
              localStorage.setItem('username', result.username);

              // 로그인 성공 후 메인 페이지로 이동
              window.location.href = '/frontend/pages/main.html'; // 상대 경로 수정
          } else {
              alert(`로그인 실패: ${result.message}`);
          }
      } catch (error) {
          console.error('로그인 요청 실패:', error);
          alert('서버와 통신 중 오류가 발생했습니다. 백엔드 서버가 켜져 있는지 확인해주세요.');
      }
    });
  }
  // --- 🔼 로그인 기능 코드 끝 🔼 ---


});

// === 🔎 아이디 찾기 페이지 ===
  if (document.getElementById("findIdForm")) {
    window.sendIdEmail = async function () {
      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const successMsg = document.getElementById("successMsg");

      if (!name || !email) {
        alert("이름과 이메일을 모두 입력해주세요.");
        return;
      }

      try {
        const res = await fetch('/api/users/find-id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email }),
        });

        const result = await res.json();
        console.log("아이디 찾기 응답:", result);

        if (res.ok) {
          successMsg.classList.remove("hidden");
          successMsg.textContent = result.message || "입력하신 이메일로 아이디를 전송했습니다.";
        } else {
          alert(result.message || "아이디 찾기 실패. 다시 시도해주세요.");
        }
      } catch (err) {
        console.error("아이디 찾기 오류:", err);
        alert("서버 연결 오류가 발생했습니다.");
      }
    };
  }

  // === 🔑 비밀번호 찾기 페이지 ===
  if (document.getElementById("findPwForm")) {
    window.sendPwEmail = async function () {
      const name = document.getElementById("name").value.trim();
      const username = document.getElementById("username").value.trim();
      const email = document.getElementById("email").value.trim();
      const successMsg = document.getElementById("successMsg");

      if (!name || !username || !email) {
        alert("이름, 아이디, 이메일을 모두 입력해주세요.");
        return;
      }

      try {
        const res = await fetch('/api/users/find-pw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, username, email }),
        });

        const result = await res.json();
        console.log("비밀번호 찾기 응답:", result);

        if (res.ok) {
          successMsg.classList.remove("hidden");
          successMsg.textContent =
            result.message ||
            "입력하신 이메일로 비밀번호 재설정 링크를 전송했습니다.";
        } else {
          alert(result.message || "비밀번호 찾기 실패. 다시 시도해주세요.");
        }
      } catch (err) {
        console.error("비밀번호 찾기 요청 실패:", err);
        alert("서버 연결 오류가 발생했습니다.");
      }
    };
  }

  // === 🔄 비밀번호 재설정 페이지 ===
  if (document.getElementById("resetPwForm")) {
  window.resetPassword = async function () {
    const token = new URLSearchParams(window.location.search).get("token");
    const password = document.getElementById("password").value.trim();
    const passwordConfirm = document.getElementById("passwordConfirm").value.trim();

    if (!password || !passwordConfirm) {
      alert("비밀번호를 모두 입력해주세요.");
      return;
    }
    if (password.length < 8) {
      alert("비밀번호는 최소 8자리 이상이어야 합니다.");
      return;
    }
    if (password !== passwordConfirm) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      const res = await fetch(`/api/users/reset_password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const result = await res.json();
      console.log("비밀번호 재설정 응답:", result);

      if (res.ok) {
        alert(result.message || "비밀번호가 성공적으로 변경되었습니다.");
        window.location.href = "/frontend/pages/login&signup/login.html";
      } else {
        alert(result.message || "비밀번호 재설정 실패. 다시 시도해주세요.");
      }
    } catch (err) {
      console.error("비밀번호 재설정 오류:", err);
      alert("서버 연결 오류가 발생했습니다.");
    }
  };
}
