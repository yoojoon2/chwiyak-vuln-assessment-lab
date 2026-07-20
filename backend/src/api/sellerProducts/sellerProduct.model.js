// /backend/src/api/sellerProducts/sellerProduct.model.js (전체 교체)

import 'dotenv/config'; // .env 로드
import db from "../../config/db.js";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

// 🔽 [추가] S3 클라이언트 설정
const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.AWS_S3_BUCKET;

/**
 * S3 객체를 삭제합니다.
 * @param {string} imageUrl - DB에 저장된 /uploads/.. 경로
 */
export const deleteS3Object = async (imageUrl) => {
  if (!imageUrl) return;
  const key = imageUrl.replace(/^\//, "");

  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });
    await s3.send(command);
    console.log(`🗑 S3 객체 삭제 완료: ${key}`);
  } catch (err) {
    console.warn(`⚠️ S3 객체 삭제 실패 (이미 없는 파일일 수 있음): ${key}`, err);
  }
};

/**
 * image_sequence 테이블에서 다음 시퀀스 번호를 가져오고 +1 업데이트 (트랜잭션)
 */
export const getNextSequenceForProduct = async (brand, category) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. 현재 시퀀스 번호를 가져옵니다 (FOR UPDATE로 행 잠금)
    const [rows] = await connection.query(
      `SELECT next_seq FROM image_sequence WHERE brand = ? AND category = ? FOR UPDATE`,
      [brand, category]
    );

    let currentSeq;
    if (rows.length > 0) {
      // 2a. (존재) 현재 번호 사용 + 1 업데이트
      currentSeq = rows[0].next_seq;
      await connection.query(
        `UPDATE image_sequence SET next_seq = next_seq + 1 WHERE brand = ? AND category = ?`,
        [brand, category]
      );
    } else {
      // 2b. (없음) 1번 사용 + 다음 번호 2로 새로 삽입
      currentSeq = 1;
      await connection.query(
        `INSERT INTO image_sequence (brand, category, next_seq) VALUES (?, ?, 2)`,
        [brand, category]
      );
    }

    await connection.commit();
    return currentSeq; // 현재 사용할 번호 반환 (1 또는 N)

  } catch (error) {
    await connection.rollback();
    console.error("❌ [DB] 시퀀스 가져오기 실패:", error);
    throw new Error("이미지 번호를 가져오는 중 오류가 발생했습니다.");
  } finally {
    connection.release();
  }
};

// 새로운 상품을 DB에 추가 (변경 없음)
export const createProduct = async (productData) => {
  const { seller_id, name, brand, category, description, price, imageUrl } = productData;
  console.log("--- DB INSERT 시도 데이터 (S3) ---");
  console.log({ seller_id, name, brand, category, description, price, imageUrl });

  try {
    const [result] = await db.query(
      `INSERT INTO products (seller_id, name, brand, category, description, price, imageUrl) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [seller_id, name, brand, category, description, price, imageUrl]
    );
    console.log("✅ DB INSERT 성공! 새로운 상품 ID:", result.insertId);
    return result.insertId; // ◀️ 서비스에서 ID 대신 객체를 원하면 return productData;
  } catch (error) {
    console.error("❌❌❌ 데이터베이스 INSERT 실패! ❌❌❌");
    console.error(error);
    throw new Error("데이터베이스에 상품을 추가하는 중 오류가 발생했습니다.");
  }
};

// ✅ 특정 판매자의 상품 전체 조회 (이름 변경: findProductsBySellerId -> getProductsBySeller)
export const getProductsBySeller = async (sellerId) => {
  try {
    const [rows] = await db.query(
      `SELECT 
         product_id, product_id AS id, seller_id, name, description,
         price, category, brand, imageUrl
       FROM products
       WHERE seller_id = ?
       ORDER BY product_id DESC`,
      [sellerId]
    );
    return rows;
  } catch (error) {
    console.error("❌ [DB] 판매자 상품 조회 실패:", error);
    throw new Error("판매자 상품 목록을 불러오는 중 오류가 발생했습니다.");
  }
};

// ✅ 상품 삭제 (DB + S3 객체) (이름 변경: deleteProductById -> deleteProduct)
export const deleteProduct = async (sellerId, productId) => {
  try {
    // 1️⃣ 삭제 전, S3 삭제를 위해 이미지 경로 가져오기
    const [rows] = await db.query(
      `SELECT imageUrl FROM products WHERE product_id = ? AND seller_id = ?`,
      [productId, sellerId]
    );

    if (!rows.length) {
      throw new Error("상품이 존재하지 않거나 권한이 없습니다.");
    }
    const imageUrl = rows[0].imageUrl; // S3 삭제 대상

    // 2️⃣ DB에서 상품 삭제
    const [result] = await db.query(
      `DELETE FROM products WHERE product_id = ? AND seller_id = ?`,
      [productId, sellerId]
    );

    if (result.affectedRows === 0) {
      throw new Error("상품 삭제 실패 또는 권한이 없습니다.");
    }

    // 3️⃣ [수정] S3 객체 삭제
    await deleteS3Object(imageUrl);

    return true;
  } catch (error) {
    console.error("❌ [DB] 상품 삭제 실패:", error);
    throw new Error("상품 삭제 중 오류가 발생했습니다.");
  }
};

// ✅ 상품 수정 (DB + S3 객체 교체) (이름/시그니처 변경)
// 서비스에서 S3 업로드를 처리하므로, 모델은 '기존 이미지 삭제'와 'DB 업데이트'만 담당
export const updateProduct = async (sellerId, productId, updatedData) => {
  try {
    // 1️⃣ 기존 상품 조회 (기존 S3 이미지 경로 확인)
    const [rows] = await db.query(
      `SELECT imageUrl FROM products WHERE product_id = ? AND seller_id = ?`,
      [productId, sellerId]
    );

    if (!rows.length) {
      throw new Error("상품이 존재하지 않거나 권한이 없습니다.");
    }

    const oldImageUrl = rows[0].imageUrl;
    const newImageUrl = updatedData.imageUrl; // 서비스가 전달한 새 S3 경로

    // 2️⃣ [수정] S3 이미지 교체 (새 URL이 기존 URL과 다르면 기존 S3 객체 삭제)
    if (newImageUrl && oldImageUrl !== newImageUrl) {
      await deleteS3Object(oldImageUrl);
    }

    // 3️⃣ 상품 정보 업데이트
    const { name, description, price, category } = updatedData;
    await db.query(
      `UPDATE products 
       SET name = ?, description = ?, price = ?, category = ?, imageUrl = ?
       WHERE product_id = ? AND seller_id = ?`,
      [
        name,
        description,
        price,
        category,
        newImageUrl, // ◀️ 서비스가 이미 S3에 올리고 생성한 새 URL
        productId,
        sellerId,
      ]
    );

    console.log(`✅ 상품 수정 완료: ID ${productId}`);
    return { success: true, imageUrl: newImageUrl };
  } catch (error) {
    console.error("❌ [DB] 상품 수정 실패:", error);
    // 롤백: 만약 DB 업데이트 실패 시, 서비스가 방금 올린 S3 객체를 삭제해야 함
    // (서비스 단에서 이 에러를 잡아서 처리하는 것이 더 좋음)
    throw new Error("상품 수정 중 오류가 발생했습니다.");
  }
};

