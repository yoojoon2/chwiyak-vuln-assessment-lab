import express from "express";
import { updateOrderStatus, checkoutOrder } from "./order.controller.js";
import { verifySellerToken } from "../../middleware/sellerAuth.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

// 주문 생성 (결제)
router.post("/checkout", verifyToken, checkoutOrder);

// 판매자용 주문 상태 업데이트
router.put("/:id/status", verifySellerToken, updateOrderStatus);

export default router;
