import express from "express";
import multer from "multer"; // 1. multer 임포트
import { 
  createReview, 
  getProductReviews, 
  getMyReviews, 
  deleteReview, 
  sellerComment, 
  getSellerReviews,
  getReview, // *** [추가]
  updateReview // *** [추가]
} from "./review.controller.js";

import { verifySellerToken } from "../../middleware/sellerAuth.js";
import { verifyBuyerToken } from "../../middleware/buyerAuth.js";

const router = express.Router();

// 2. multer 설정 (메모리 저장, 5개 제한)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { files: 5 } 
});

// 3. 리뷰 생성 라우트에 upload.array() 적용
router.post("/", verifyBuyerToken, upload.array('images', 5), createReview);

// --- [수정] 구체적인 경로를 /:id 보다 위로 이동 ---
router.get("/my", verifyBuyerToken, getMyReviews);
router.get("/seller", verifySellerToken, getSellerReviews);
// --- [수정] 여기까지 ---

router.get("/product/:productId", getProductReviews);

// *** [수정] 단일 리뷰 조회 (수정용) - 이제 /my, /seller 뒤에 위치
router.get("/:id", verifyBuyerToken, getReview);

// 4. 리뷰 수정 라우트에 upload.array() 적용
router.put("/:id", verifyBuyerToken, upload.array('images', 5), updateReview);

// 리뷰 삭제 (구매자 인증 필요)
router.delete("/:id", verifyBuyerToken, deleteReview);

// 판매자 답변 등록 (판매자 인증 필요)
router.put("/:id/comment", verifySellerToken, sellerComment);

export default router;
