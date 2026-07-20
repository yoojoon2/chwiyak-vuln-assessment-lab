## 디렉터리 구조

```
backend/                  # :arrow_left: Node.js 백엔드 루트
├── src/                  # 소스 코드 디렉토리
│   ├── api/              # ⭐️ 기능별 API 라우트 및 로직
│   │   ├── auth/         # 인증 (로그인, 로그아웃, 회원가입)
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.controller.js
│   │   │   └── auth.service.js
│   │   │
│   │   ├── users/        # 사용자 (구매자, 판매자, 관리자 프로필 등)
│   │   │   ├── user.routes.js
│   │   │   ├── user.controller.js
│   │   │   ├── user.service.js
│   │   │   └── user.model.js       # (Buyer, Seller, Admin 통합 또는 분리)
│   │   │
│   │   ├── products/     # 상품 (목록, 상세, 검색, 카테고리)
│   │   │   ├── product.routes.js
│   │   │   ├── product.controller.js
│   │   │   ├── product.service.js
│   │   │   └── product.model.js
│   │   │
│   │   ├── cart/         # 장바구니
│   │   │   ├── cart.routes.js
│   │   │   ├── cart.controller.js
│   │   │   └── cart.service.js     # (DB 모델 없이 세션/Redis 가능)
│   │   │
│   │   ├── orders/       # 주문
│   │   │   ├── order.routes.js
│   │   │   ├── order.controller.js
│   │   │   ├── order.service.js
│   │   │   └── order.model.js      # (Order, OrderItem)
│   │   │
│   │   ├── reviews/      # 리뷰
│   │   │   ├── review.routes.js
│   │   │   ├── review.controller.js
│   │   │   ├── review.service.js
│   │   │   └── review.model.js
│   │   │
│   │   ├── wishlists/    # 위시리스트
│   │   │   ├── wishlist.routes.js
│   │   │   ├── wishlist.controller.js
│   │   │   ├── wishlist.service.js
│   │   │   └── wishlist.model.js
│   │   │
│   │   ├── coupons/      # 쿠폰
│   │   │   ├── coupon.routes.js
│   │   │   ├── coupon.controller.js
│   │   │   ├── coupon.service.js
│   │   │   └── coupon.model.js     # (Coupon, BuyerCoupon)
│   │   │
│   │   ├── points/       # 포인트
│   │   │   ├── point.routes.js
│   │   │   ├── point.controller.js # (주로 내역 조회)
│   │   │   ├── point.service.js
│   │   │   └── point.model.js
│   │   │
│   │   ├── addresses/    # 배송지 (구매자)
│   │   │   ├── address.routes.js
│   │   │   ├── address.controller.js
│   │   │   ├── address.service.js
│   │   │   └── address.model.js    # (BuyerAddress)
│   │   │
│   │   ├── settlements/  # 정산 (판매자)
│   │   │   ├── settlement.routes.js
│   │   │   ├── settlement.controller.js
│   │   │   ├── settlement.service.js
│   │   │   └── settlement.model.js # (SellerSettlement)
│   │   │
│   │   ├── notices/      # 공지사항
│   │   │   ├── notice.routes.js
│   │   │   ├── notice.controller.js
│   │   │   ├── notice.service.js
│   │   │   └── notice.model.js
│   │   │
│   │   ├── qna/          # 문의사항 (supportBoard)
│   │   │   ├── qna.routes.js
│   │   │   ├── qna.controller.js
│   │   │   ├── qna.service.js
│   │   │   └── qna.model.js      # (QnaBoard)
│   │   │
│   │   ├── faq/          # FAQ
│   │   │   ├── faq.routes.js
│   │   │   ├── faq.controller.js
│   │   │   ├── faq.service.js
│   │   │   └── faq.model.js      # (FAQ 모델 필요)
│   │   │
│   │   └── admin/        # 관리자 전용 기능 (예: 사용자 목록 조회/관리)
│   │       ├── admin.routes.js
│   │       ├── admin.controller.js
│   │       └── admin.service.js
│   │
│   ├── config/           # 설정 파일 (DB, JWT secret, 환경변수 로드)
│   │   ├── index.js          # 설정 통합 및 내보내기
│   │   ├── database.js       # DB 연결 설정 (ORM 설정 포함)
│   │   └── jwt.js            # JWT 관련 설정
│   │
│   ├── middlewares/      # 미들웨어 (요청 중간 처리)
│   │   ├── auth.middleware.js # JWT 토큰 검증 등 인증 처리
│   │   ├── error.middleware.js # 에러 핸들링
│   │   └── validator.middleware.js # 요청 데이터 유효성 검사 (선택적)
│   │
│   ├── utils/            # 공통 유틸리티 함수
│   │   ├── asyncHandler.js   # async 함수 에러 처리 래퍼
│   │   └── responseFormatter.js # 일관된 응답 형식 생성
│   │
│   └── app.js            # Express 앱 생성, 미들웨어/라우트 연결
│
├── .env                  # 환경 변수 (DB 접속 정보, JWT 비밀키 등)
├── .gitignore
├── package.json          # 프로젝트 정보 및 의존성 관리
└── README.md             # 프로젝트 설명
```