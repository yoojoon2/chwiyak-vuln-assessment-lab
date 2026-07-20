// /backend/src/api/buyerCart/buyerCart.routes.js

import express from "express";
import { verifyBuyerToken } from "../../middleware/buyerAuth.js";
import { 
    getCartItems, 
    addItemToCart,
    updateItemQuantity,
    removeItemFromCart,
    removeSelectedItems
} from "./buyerCart.controller.js";

const router = express.Router();

// 모든 경로는 구매자 인증이 필요
router.use(verifyBuyerToken);

router.get("/", getCartItems); // 장바구니 목록 조회
router.post("/", addItemToCart); // 장바구니에 상품 추가
router.put("/:cartItemId", updateItemQuantity); // 수량 변경

router.delete("/selected", removeSelectedItems);
router.delete("/:cartItemId", removeItemFromCart); // 항목 삭제

export default router;