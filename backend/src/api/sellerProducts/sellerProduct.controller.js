// /backend/src/api/sellerProducts/sellerProduct.controller.js

import * as service from './sellerProduct.service.js';

export const createProduct = async (req, res) => {
    try {
        const sellerId = req.seller_id; 
        const productInfo = req.body;
        const mainImage = req.file; 

        if (!mainImage) {
            return res.status(400).json({ message: "메인 이미지는 필수입니다." });
        }
        
        // 🔽 [수정] 'registerProduct' -> 'createProduct'로 변경
        const newProduct = await service.createProduct(sellerId, productInfo, mainImage);
        
        res.status(201).json({ message: "상품 등록 성공", product: newProduct });

    } catch (err) {
        console.error("상품 등록 오류:", err);
        res.status(500).json({ message: err.message });
    }
};

// ✅ 판매자 상품 조회 컨트롤러
export const getSellerProducts = async (req, res) => {
  try {
    const sellerId = req.seller_id; // verifySellerToken 미들웨어에서 제공
    if (!sellerId) {
      return res.status(401).json({ message: "인증되지 않은 판매자입니다." });
    }

    const products = await service.getSellerProducts(sellerId);
    res.status(200).json(products);
  } catch (err) {
    console.error("❌ 판매자 상품 조회 오류:", err);
    res.status(500).json({ message: err.message });
  }
};

// ✅ 상품 삭제 컨트롤러
export const deleteSellerProduct = async (req, res) => {
  try {
    const sellerId = req.seller_id;
    const { id } = req.params;

    if (!id) return res.status(400).json({ message: "상품 ID가 필요합니다." });

    await service.deleteProduct(sellerId, id);
    res.status(200).json({ message: "상품이 삭제되었습니다." });
  } catch (err) {
    console.error("❌ 상품 삭제 오류:", err);
    res.status(500).json({ message: err.message });
  }
};

// ✅ 상품 수정 컨트롤러
export const updateSellerProduct = async (req, res) => {
  try {
    const sellerId = req.seller_id;
    const { id } = req.params;
    const productData = req.body;
    const newImage = req.file;

    const result = await service.updateProduct(sellerId, id, productData, newImage);
    res.status(200).json({
      message: "상품이 수정되었습니다.",
      updated: result,
    });
  } catch (err) {
    console.error("❌ 상품 수정 오류:", err);
    res.status(500).json({ message: err.message });
  }
};
