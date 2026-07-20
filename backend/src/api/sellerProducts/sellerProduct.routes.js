// /backend/src/api/sellerProducts/sellerProduct.routes.js

import express from "express";
import multer from "multer";
import { verifySellerToken } from "../../middleware/sellerAuth.js";
import { 
    createProduct,
    getSellerProducts,
    deleteSellerProduct,
    updateSellerProduct
} from "./sellerProduct.controller.js";

const router = express.Router();
// 🔽 [수정] 임시 폴더 저장에서 메모리 저장으로 변경
// const upload = multer({ dest: 'uploads/' });
const upload = multer({ storage: multer.memoryStorage() });


// POST /api/seller/products : 상품 등록 API
router.post("/", verifySellerToken, upload.single('mainImage'), createProduct);

// GET /api/seller/products : 판매자 상품 조회 API
router.get("/", verifySellerToken, getSellerProducts);

// DELETE /api/seller/products/:id : 상품 삭제 API
router.delete("/:id", verifySellerToken, deleteSellerProduct);

// PUT /api/seller/products/:id : 상품 수정 API
router.put("/:id", verifySellerToken, upload.single("mainImage"), updateSellerProduct);

export default router;
