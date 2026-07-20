import express from "express";
import { verifyBuyerToken } from "../../middleware/buyerAuth.js";
import { getOrders, checkout, getOrderDetail, getPendingReviews } from "./buyerOrders.controller.js";  // ✅ getOrderDetail 추가

const router = express.Router();

// 주문 생성 (먼저!)
router.post("/checkout", verifyBuyerToken, checkout);

// 주문 목록 조회
router.get("/", verifyBuyerToken, getOrders);

// 리뷰 대기 목록
router.get("/pending/reviews", verifyBuyerToken, getPendingReviews);

// ✅ 주문 상세 조회 (맨 마지막!)
router.get("/:orderId", verifyBuyerToken, getOrderDetail);

export default router;