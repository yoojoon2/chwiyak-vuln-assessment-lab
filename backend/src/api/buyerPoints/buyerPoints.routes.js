// /src/api/buyerPoints/buyerPoints.routes.js
import express from "express";
import { verifyBuyerToken } from "../../middleware/buyerAuth.js";
import {
  getBalance,
  getHistory,
  postSpend,
  postRefund,
  getBuyerPoints, // 하위 호환용
} from "./buyerPoints.controller.js";

const router = express.Router();

// ✅ 인증 공통 적용
router.use(verifyBuyerToken);

// 하위호환: 옛날 프론트가 호출하던 GET /api/buyer-points/
router.get("/", getBuyerPoints);

// 신규 권장 엔드포인트
router.get("/balance", getBalance);   // 잔액
router.get("/history", getHistory);   // 내역
router.post("/spend", postSpend);     // 사용
router.post("/refund", postRefund);   // 환불

export default router;