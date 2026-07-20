## 디렉터리 구조

```
backend/                       # ⬅ Node.js 백엔드 루트
├── src/
│   ├── api/                   # ⭐ 기능별 API 라우트 및 로직
│   │   ├── users/             # 사용자 공통 (인증: 로그인/로그아웃/회원가입 등)
│   │   │   ├── user.routes.js
│   │   │   ├── user.controller.js
│   │   │   └── user.middleware.js
│   │   │
│   │   ├── buyer/             # 구매자 프로필
│   │   ├── buyerCart/         # 장바구니
│   │   ├── buyerOrders/       # 구매자 주문
│   │   ├── buyerCoupons/      # 구매자 쿠폰
│   │   ├── buyerPoints/       # 구매자 포인트
│   │   ├── buyerWishlist/     # 위시리스트
│   │   │   └── (각 폴더: *.routes.js / *.controller.js / *.service.js / *.model.js)
│   │   │
│   │   ├── seller/            # 판매자 프로필, 대시보드, 정산
│   │   │   ├── seller.routes.js / controller.js / service.js / model.js
│   │   │   ├── sellerDashboard.controller.js / routes.js
│   │   │   └── sellerSettlement.controller.js / routes.js
│   │   ├── sellerOrders/      # 판매자 주문 관리
│   │   ├── sellerProducts/    # 판매자 상품 등록·관리
│   │   │
│   │   ├── admin/             # 관리자 (admin.js)
│   │   ├── products/          # 상품 (목록/상세/검색/카테고리)
│   │   ├── orders/            # 주문 공통
│   │   ├── reviews/           # 리뷰
│   │   ├── notice/            # 공지사항
│   │   └── support/           # 고객센터(문의/FAQ 등)
│   │
│   ├── middleware/            # 공통 미들웨어 (요청 중간 처리)
│   ├── utils/                 # 공통 유틸리티
│   └── app.js                 # 앱 엔트리포인트
│
├── public/                    # 정적 리소스 (상품 이미지 등)
├── uploads/                   # 업로드 파일 저장 경로
├── database_schema.sql        # DB 스키마 및 초기 시드 데이터
├── .env.example                # 필요 환경변수 목록
└── package.json
```

> `config/` 폴더(DB 접속 정보 등)는 보안상 `.gitignore`로 제외되어 저장소에 포함되지 않습니다.

## 주요 기술

- Node.js + Express
- MySQL (mysql2)
- 인증: JWT (Access/Refresh), bcryptjs
- 파일 업로드: multer, multer-s3, AWS S3
- 메일 발송: SendGrid, Nodemailer
- 보안: helmet, xss, validator, cors
