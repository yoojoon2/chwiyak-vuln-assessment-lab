// buyerCoupons.routes.js
import express from "express";
import { 
  getBuyerCoupons,
  redeemCoupon,
  useCoupon,
  deleteCoupon 
} from "./buyerCoupons.controller.js";
import { verifyBuyerToken } from "../../middleware/buyerAuth.js";

const router = express.Router();

// 내 쿠폰 목록 조회
router.get("/", verifyBuyerToken, getBuyerCoupons);

// 쿠폰 코드 등록
router.post("/redeem", verifyBuyerToken, redeemCoupon);

// 쿠폰 사용
router.patch("/:id/use", verifyBuyerToken, useCoupon);

// 쿠폰 삭제
router.delete("/:id", verifyBuyerToken, deleteCoupon);

export default router;