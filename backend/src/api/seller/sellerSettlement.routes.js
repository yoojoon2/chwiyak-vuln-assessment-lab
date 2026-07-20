import express from "express";
import { verifySellerToken } from "../../middleware/sellerAuth.js";
import {
  createSettlementAccount,
  getSettlementAccount,
} from "./sellerSettlement.controller.js";

const router = express.Router();

// 조회
router.get("/", verifySellerToken, getSettlementAccount);

// 등록 또는 수정
router.post("/", verifySellerToken, createSettlementAccount);

export default router;