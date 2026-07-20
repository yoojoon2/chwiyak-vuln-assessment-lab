import db from "../../config/db.js";
import * as reviewService from "./review.service.js";

const parseImageUrls = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch (err) {
    return [];
  }
};

// 리뷰 생성
export const createReview = async (req, res) => {
  try {
    console.log('--- [Debug] createReview 컨트롤러 ---');
    console.log('req.body (텍스트 데이터):', req.body);
    console.log('req.files (이미지 파일):', req.files);
    // 텍스트 필드는 req.body, 파일은 req.files로 받음
    const reviewData = req.body;
    const files = req.files || []; // 1. files 배열 (없으면 빈 배열)
    const buyerId = req.buyer?.buyer_id;

    if (!buyerId) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }

    // 2. controller.js의 기존 시그니처에 맞게 변수 재조합
    const order_item_id = reviewData.order_item_id;
    const numericRating = Number(reviewData.rating);
    const content = reviewData.content;

    if (!order_item_id || !numericRating || !content) {
      return res.status(400).json({ message: "주문 항목, 평점, 내용을 모두 입력해야 합니다." });
    }

    if (numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: "평점은 1 ~ 5 사이여야 합니다." });
    }

    // 주문 항목이 구매자 소유이며 배송완료 상태인지 확인
    const [orderItems] = await db.query(
      `SELECT oi.item_id, oi.product_id, o.buyer_id, o.status
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.order_id
       WHERE oi.item_id = ? AND o.buyer_id = ?`,
      [order_item_id, buyerId]
    );

    if (!orderItems.length) {
      return res.status(404).json({ message: "주문 항목을 찾을 수 없습니다." });
    }

    const orderItem = orderItems[0];
    if (orderItem.status !== "DELIVERED") {
      return res.status(400).json({ message: "배송완료된 상품에 대해서만 리뷰를 작성할 수 있습니다." });
    }
    
    // (createReview에 product_id가 필요 없었으나, 서비스에서 사용하므로 추가)
    const product_id = reviewData.product_id ? Number(reviewData.product_id) : orderItem.product_id;
    if (product_id !== orderItem.product_id) {
      return res.status(400).json({ message: "상품 정보가 주문 항목과 일치하지 않습니다." });
    }

    const existing = await reviewService.findReviewByOrderItem(buyerId, order_item_id);
    if (existing) {
      return res.status(400).json({ message: "이미 리뷰를 작성한 상품입니다." });
    }

    // 3. [수정됨] review.service.js의 시그니처(6개 인자)에 맞게 호출
    const review = await reviewService.createNewReview(
      buyerId,
      orderItem.product_id, // productId
      order_item_id,       // orderItemId
      numericRating,       // rating
      content,             // content
      files                // files 배열 (imageUrls 대신)
    );

    res.status(201).json({
      message: "리뷰가 성공적으로 등록되었습니다.",
      review
    });
  } catch (err) {
    console.error("리뷰 생성 오류:", err);
    res.status(500).json({ message: err.message });
  }
};

// *** [추가] 리뷰 수정
export const updateReview = async (req, res) => {
  try {
    const reviewData = req.body; // 1. 텍스트 필드 (rating, content, existingImageUrls)
    const files = req.files || []; // 2. 파일 필드 (images, 없으면 빈 배열)
    const reviewId = req.params.id;
    const buyerId = req.buyer?.buyer_id;

    if (!buyerId) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }

    // 3. controller.js의 기존 시그니처에 맞게 변수 재조합
    const numericRating = Number(reviewData.rating);
    const content = reviewData.content;
    let existingImageUrls = []; // '유지할' 이미지 URL 목록

    if (!numericRating || !content) {
      return res.status(400).json({ message: "평점과 내용을 모두 입력해야 합니다." });
    }

    if (numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: "평점은 1 ~ 5 사이여야 합니다." });
    }

    // 프론트엔드에서 JSON 배열을 문자열로 보냈을 수 있으므로 파싱
    if (reviewData.existingImageUrls) {
      try {
        existingImageUrls = JSON.parse(reviewData.existingImageUrls);
      } catch (e) {
        return res.status(400).json({ message: "잘못된 existingImageUrls 형식입니다." });
      }
    }

    // 4. [수정됨] review.service.js의 시그니처(6개 인자)에 맞게 호출
    const review = await reviewService.updateExistingReview(
      reviewId,
      buyerId,
      numericRating,        // rating
      content,              // content
      existingImageUrls,    // '유지할' URL 목록
      files                 // '신규' File 목록
    );

    if (!review) {
       return res.status(404).json({ message: "리뷰를 찾을 수 없거나 수정 권한이 없습니다." });
    }

    res.status(200).json({
      message: "리뷰가 성공적으로 수정되었습니다.",
      review
    });
  } catch (err) {
    console.error("리뷰 수정 오류:", err);
    res.status(500).json({ message: err.message });
  }
};

// *** [추가] 단일 리뷰 조회
export const getReview = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const buyerId = req.buyer?.buyer_id;
    
    if (!buyerId) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }

    const review = await reviewService.getReviewById(reviewId);

    if (!review) {
      return res.status(404).json({ message: "리뷰를 찾을 수 없습니다." });
    }

    // 본인 리뷰인지 확인
    if (review.buyer_id !== buyerId) {
      return res.status(403).json({ message: "리뷰를 조회할 권한이 없습니다." });
    }

    res.status(200).json(review);
  } catch (err) {
    console.error("단일 리뷰 조회 오류:", err);
    res.status(500).json({ message: err.message });
  }
};


// 상품별 리뷰 조회
export const getProductReviews = async (req, res) => {
  try {
    const productId = req.params.productId;
    const reviews = await reviewService.getProductReviews(productId);
    res.status(200).json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 구매자별 리뷰 조회 (내 리뷰)
export const getMyReviews = async (req, res) => {
  try {
    const buyerId = req.buyer?.buyer_id;
    
    if (!buyerId) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }

    const [reviews] = await db.query(
      `SELECT r.review_id, r.product_id, r.rating, r.content, r.image_urls, 
              r.seller_comment, r.commented_at, r.created_at, r.updated_at,
              p.name AS product_name, p.brand, p.imageUrl AS product_image,
              r.order_item_id 
       FROM reviews r
       JOIN products p ON r.product_id = p.product_id
       WHERE r.buyer_id = ?
       ORDER BY r.created_at DESC`,
      [buyerId]
    );

    const sanitized = reviews.map((review) => ({
      ...review,
      image_urls: parseImageUrls(review.image_urls)
    }));

    res.status(200).json(sanitized);
  } catch (err) {
    console.error("내 리뷰 조회 오류:", err);
    res.status(500).json({ message: err.message });
  }
};

// 리뷰 삭제
export const deleteReview = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const buyerId = req.buyer?.buyer_id;
    
    if (!buyerId) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }

    // [수정] DB만 삭제하는 것이 아니라, S3까지 삭제하는 서비스 함수 호출
    await reviewService.removeReview(reviewId, buyerId);

    res.status(200).json({ message: "리뷰가 삭제되었습니다." });
  } catch (err) {
    console.error("리뷰 삭제 오류:", err);
    // 서비스/모델에서 던진 404/403 오류 처리
    if (err.message.includes("찾을 수 없거나")) {
      return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
};

// 판매자 답변 등록
export const sellerComment = async (req, res) => {
  try {
    const sellerId = req.seller?.seller_id;
    if (!sellerId) {
      return res.status(401).json({ message: "판매자 인증이 필요합니다." });
    }
    
    // multer를 사용하지 않는 라우트이므로 req.body에 comment가 정상적으로 들어옵니다.
    const { comment } = req.body;
    if (!comment || !comment.trim()) {
      return res.status(400).json({ message: "답변 내용을 입력해주세요." });
    }

    const reviewId = req.params.id;

    const updated = await reviewService.addSellerComment(reviewId, sellerId, comment.trim());
    if (!updated) {
      return res.status(404).json({ message: "리뷰를 찾을 수 없거나 접근 권한이 없습니다." });
    }

    res.status(200).json({
      message: "판매자 답변 등록 완료",
      comment: updated.seller_comment,
      commented_at: updated.commented_at
    });
  } catch (err) {
    console.error("판매자 답변 등록 오류:", err);
    res.status(500).json({ message: err.message });
  }
};

// 판매자 리뷰 목록
export const getSellerReviews = async (req, res) => {
  try {
    const sellerId = req.seller?.seller_id;
    if (!sellerId) {
      return res.status(401).json({ message: "판매자 인증이 필요합니다." });
    }

    const reviews = await reviewService.getSellerReviews(sellerId);
    res.status(200).json(reviews);
  } catch (err) {
    console.error("판매자 리뷰 조회 오류:", err);
    res.status(500).json({ message: err.message });
  }
};
