import db from "../../config/db.js";
// 1. sellerProduct.model.js에서 S3 삭제 헬퍼 임포트
// (상대 경로가 ../sellerProducts/ 가 맞는지 확인 필요. 현재 파일 구조 기반으로 작성)
import { deleteS3Object } from "../sellerProducts/sellerProduct.model.js";

const parseJson = (value) => {
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch (err) {
    return [];
  }
};

// 상품별 리뷰 목록 조회
export const getReviewsByProduct = async (productId) => {
  const [rows] = await db.query(
    `SELECT r.review_id, r.buyer_id, b.username AS buyer_name, r.rating, r.content,
            r.image_urls, r.seller_comment, r.commented_at, r.created_at, r.updated_at,
            r.order_item_id
     FROM reviews r
     JOIN buyer b ON r.buyer_id = b.buyer_id
     WHERE r.product_id = ?
     ORDER BY r.created_at DESC`,
    [productId]
  );

  return rows.map((row) => ({
    ...row,
    image_urls: parseJson(row.image_urls)
  }));
};

// 리뷰 등록 (S3 경로 배열을 JSON 문자열로 저장)
export const createReview = async (productId, buyerId, orderItemId, rating, content, imageUrls) => {
  const [result] = await db.query(
    "INSERT INTO reviews (product_id, buyer_id, order_item_id, rating, content, image_urls) VALUES (?, ?, ?, ?, ?, ?)",
    [productId, buyerId, orderItemId, rating, content, JSON.stringify(imageUrls || [])]
  );
  return result.insertId;
};

// 리뷰 수정 (S3 경로 배열을 JSON 문자열로 저장)
export const updateReview = async (reviewId, buyerId, rating, content, imageUrls) => {
  const [result] = await db.query(
    "UPDATE reviews SET rating=?, content=?, image_urls=?, updated_at=NOW() WHERE review_id=? AND buyer_id=?",
    [rating, content, JSON.stringify(imageUrls || []), reviewId, buyerId]
  );
  return result.affectedRows > 0;
};

// 2. deleteReview 수정 (S3 삭제 로직 포함)
export const deleteReview = async (reviewId, buyerId) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. 삭제 전, S3에서 지우기 위해 image_urls를 먼저 조회 (본인 확인 포함)
    const [rows] = await connection.query(
      "SELECT image_urls FROM reviews WHERE review_id = ? AND buyer_id = ?",
      [reviewId, buyerId]
    );

    if (rows.length === 0) {
      // service에서 "리뷰를 찾을 수 없거나..." 에러를 던지도록 롤백
      throw new Error("리뷰를 찾을 수 없거나 삭제 권한이 없습니다.");
    }

    const imageUrls = parseJson(rows[0].image_urls);

    // 2. DB에서 리뷰 삭제
    const [result] = await connection.query(
      "DELETE FROM reviews WHERE review_id = ? AND buyer_id = ?",
      [reviewId, buyerId]
    );
    
    if (result.affectedRows === 0) {
       throw new Error("DB 삭제 실패"); // (이론상 발생 안 함)
    }

    // 3. DB 삭제 성공 시, S3 객체들 삭제
    for (const url of imageUrls) {
      await deleteS3Object(url); // 임포트한 헬퍼 사용
    }

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    console.error("❌ 리뷰 삭제 트랜잭션 오류:", error);
    // service.removeReview에서 이 에러를 잡아서 처리
    throw error;
  } finally {
    connection.release();
  }
};

// 판매자 답변 등록
export const updateSellerComment = async (reviewId, sellerId, comment) => {
  const [result] = await db.query(
    `UPDATE reviews r
     JOIN products p ON r.product_id = p.product_id
     SET r.seller_comment = ?, r.commented_at = NOW()
     WHERE r.review_id = ? AND p.seller_id = ?`,
    [comment, reviewId, sellerId]
  );
  if (!result.affectedRows) {
    return null;
  }

  const [rows] = await db.query(
    `SELECT r.review_id, r.seller_comment, r.commented_at
     FROM reviews r
     WHERE r.review_id = ?`,
    [reviewId]
  );

  return rows[0] || null;
};

// *** [수정] 단일 리뷰 조회 (수정용 데이터 로드)
// 상품 정보와 주문 정보를 함께 가져오도록 JOIN 추가
export const getReviewById = async (reviewId) => {
  const [rows] = await db.query(
    `SELECT r.*, 
            p.name AS product_name, p.brand, p.imageUrl AS product_image,
            o.order_name, o.order_id
     FROM reviews r
     JOIN products p ON r.product_id = p.product_id
     LEFT JOIN order_items oi ON r.order_item_id = oi.item_id
     LEFT JOIN orders o ON oi.order_id = o.order_id
     WHERE r.review_id = ?`,
    [reviewId]
  );
  
  if (!rows[0]) return null;
  
  return {
    ...rows[0],
    image_urls: parseJson(rows[0].image_urls)
  };
};

export const findReviewByOrderItem = async (buyerId, orderItemId) => {
  const [rows] = await db.query(
    "SELECT review_id FROM reviews WHERE buyer_id = ? AND order_item_id = ?",
    [buyerId, orderItemId]
  );
  return rows[0] || null;
};

export const getReviewsBySeller = async (sellerId) => {
  const [rows] = await db.query(
    `SELECT r.review_id, r.rating, r.content, r.image_urls, r.created_at, r.updated_at,
            r.seller_comment, r.commented_at, r.order_item_id,
            b.buyer_id, b.username AS buyer_name,
            p.product_id, p.name AS product_name, p.brand, p.imageUrl AS product_image,
            oi.order_id, oi.quantity, oi.unit_price,
            o.order_name, o.created_at AS order_created_at
     FROM reviews r
     JOIN products p ON r.product_id = p.product_id
     JOIN buyer b ON r.buyer_id = b.buyer_id
     LEFT JOIN order_items oi ON r.order_item_id = oi.item_id
     LEFT JOIN orders o ON oi.order_id = o.order_id
     WHERE p.seller_id = ?
     ORDER BY r.created_at DESC`,
    [sellerId]
  );

  return rows.map((row) => ({
    ...row,
    image_urls: parseJson(row.image_urls)
  }));
};
