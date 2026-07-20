// /backend/src/app.js 
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import morgan from 'morgan';
import https from "https"
import fs from "fs"
import path from "path";
import { fileURLToPath } from "url";
import helmet from 'helmet';
import cookieParser from 'cookie-parser'

// ====== 경로 설정 ======
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ====== 라우터 임포트 ======
import userRoutes from "./api/users/user.routes.js";
import adminRoutes from "./api/admin/admin.js";
import productRoutes from "./api/products/product.routes.js";
import buyerWishlistRoutes from "./api/buyerWishlist/buyerWishlist.routes.js";
import buyerCartRoutes from "./api/buyerCart/buyerCart.routes.js";
import sellerProductRoutes from "./api/sellerProducts/sellerProduct.routes.js";
import supportRoutes from "./api/support/support.js";
import reviewRoutes from "./api/reviews/review.routes.js";
import buyerCouponsRoutes from "./api/buyerCoupons/buyerCoupons.routes.js";
import buyerPointsRoutes from "./api/buyerPoints/buyerPoints.routes.js";
import buyerRoutes from "./api/buyer/buyer.routes.js";
import buyerOrdersRoutes from "./api/buyerOrders/buyerOrders.routes.js";
import sellerSettlementRoutes from "./api/seller/sellerSettlement.routes.js";
import sellerOrdersRoutes from "./api/sellerOrders/sellerOrders.routes.js";  // ✅ 직접 import
import noticeRoutes from "./api/notice/notice.js"; // ✅ 추가

// ✅ [추가] 에러 핸들러 임포트
import { notFoundHandler, globalErrorHandler } from "./middleware/errorHandler.js";// ✅ [추가] 에러 핸들러 임포트

const app = express();

// 보안 조치 추가
app.disable('x-powered-by');

app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      '',
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'https://chwiyak-mall.com',
      'https://www.chwiyak-mall.com'
    ];
    
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie']
}));

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

// 로그 디렉토리 확인 및 생성
const logDirectory = '/var/log/nodejs';
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory, { recursive: true });
}

// 액세스 로그 스트림 생성
const accessLogStream = fs.createWriteStream(
    path.join(logDirectory, 'access.log'),
    { flags: 'a' }
);

// Morgan combined 포맷 설정 (파일에 저장)
app.use(morgan('combined', { stream: accessLogStream }));

// 개발 모드에서만 콘솔 출력
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

// ===== S3에서 업로드 이미지 스트리밍 =====
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
const s3 = new S3Client({ region: process.env.AWS_REGION });


// ✅ [수정] next 파라미터 추가 및 에러 처리
app.get("/uploads/*", async (req, res, next) => {
  try {
    // 요청 경로 그대로 키로 사용 (예: /uploads/AAA_beauty6.jpg)
    const key = req.path.replace(/^\/+/, ""); // 'uploads/AAA_beauty6.jpg'
    const bucket = process.env.AWS_S3_BUCKET;

    const obj = await s3.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }));

    // ContentType이 있으면 그대로 전달
    if (obj.ContentType) res.setHeader("Content-Type", obj.ContentType);
    if (obj.CacheControl) res.setHeader("Cache-Control", obj.CacheControl);

    // 스트리밍
    obj.Body.pipe(res);
  } catch (err) {
    // console.error("S3 getObject error:", err?.message || err);
    // 404 에러 처리를 위해 다음 미들웨어로 넘김
    next();
  }
});




// ====== 라우터 연결 ======
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/products", productRoutes);
app.use("/api/wishlist", buyerWishlistRoutes);
app.use("/api/cart", buyerCartRoutes);
app.use("/api/sellerProducts", sellerProductRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/coupons", buyerCouponsRoutes);
app.use("/api/buyer/points", buyerPointsRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/buyer", buyerRoutes);
app.use("/api/buyer/orders", buyerOrdersRoutes);
app.use("/api/seller/settlement", sellerSettlementRoutes);
app.use("/api/seller", sellerOrdersRoutes);  // ✅
app.use("/api/notice", noticeRoutes); // ✅ 추가

// 헬스 체크
app.get("/health", (req, res) => {
  res.send("🧩 E-Commerce API Server is running successfully 🚀");
});

// 보안 조치 추가 2

// 1. 404 Not Found (일치하는 라우트 없음)
app.use(notFoundHandler);

// 2. 500 Error (서버 내부 오류)
app.use(globalErrorHandler);



// ====== 서버 실행 ======
const PORT = process.env.PORT || 5000;
// 1. '자물쇠'와 '열쇠' 파일 읽어오기
const options = {
  key: fs.readFileSync(path.join(__dirname, "../certs/key.pem")),
  cert: fs.readFileSync(path.join(__dirname, "../certs/cert.pem"))
};

// 2. http 대신 https 서버로 실행!
https.createServer(options, app).listen(PORT, () => {
  console.log(`✅ HTTPS Server running on port ${PORT}`);
});
