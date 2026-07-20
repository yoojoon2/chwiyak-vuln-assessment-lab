import express from "express";
import { getProducts, getProductDetail, getBrands } from "./product.controller.js";

const router = express.Router();

// 전체 / 카테고리 / 브랜드별 조회
router.get("/", getProducts);

// 브랜드 목록 조회
router.get("/brands", getBrands);

// 단일 상세 조회
router.get("/:id", getProductDetail);


export default router;
