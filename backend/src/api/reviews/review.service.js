import * as model from "./review.model.js";
import 'dotenv/config'; // 1. .env 로드
import mime from "mime"; // 2. mime 임포트
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"; // 3. S3 임포트
// 4. S3 삭제 함수 임포트 (sellerProduct.model.js에서 가져옴)
import { deleteS3Object } from "../sellerProducts/sellerProduct.model.js"; 

// 5. S3 클라이언트 및 헬퍼 함수 (sellerProduct.service.js에서 복사)
const s3 = new S3Client({ region: process.env.AWS_REGION });

async function uploadToS3({ key, contentType, body }) {
  const BUCKET = process.env.AWS_S3_BUCKET;
  if (!BUCKET) throw new Error("AWS_S3_BUCKET 환경 변수가 없습니다.");
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  console.log(`✅ S3 리뷰 업로드 완료: ${key}`);
}

function pickExtAndType(file) {
  const ct = file?.mimetype || "application/octet-stream";
  let ext = mime.getExtension(ct) || "bin";
  if (ext === "jpeg") ext = "jpg";
  return { contentType: ct, ext };
}

async function getFileBuffer(file) {
  if (file?.buffer) return file.buffer; 
  return null;
}
// (헬퍼 함수 끝)


// *** [추가] 단일 리뷰 조회 (컨트롤러에서 사용하기 위해 export)
export const getReviewById = async (reviewId) => {
  return await model.getReviewById(reviewId);
};

// (사용자님이 요청하신 함수)
export const getProductReviews = async (productId) => {
  return await model.getReviewsByProduct(productId);
};

// [수정] S3 업로드 로직 추가 (시그니처는 controller.js에 맞게 유지)
export const createNewReview = async (buyerId, productId, orderItemId, rating, content, files = []) => {
  if (!rating || !content) throw new Error("평점과 내용을 모두 입력해야 합니다.");

  const uploadedUrls = [];
  try {
    // 1. S3에 파일 업로드
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const buf = await getFileBuffer(file);
      if (!buf) continue;

      const { contentType, ext } = pickExtAndType(file);
      // 파일명 규칙: {buyerId}-{orderItemId}-{index}.{ext}
      const fileBase = `${buyerId}-${orderItemId}-${i}`;
      const s3Key = `uploads/reviews/${fileBase}.${ext}`;
      const imageUrl = `/${s3Key}`; // DB 저장 경로

      await uploadToS3({ key: s3Key, contentType, body: buf });
      uploadedUrls.push(imageUrl);
    }
    
    // 2. DB에 저장 (S3 경로 포함)
    // (controller.js에서 image_urls 파라미터가 files로 대체되었으므로, uploadedUrls를 사용)
    const id = await model.createReview(productId, buyerId, orderItemId, rating, content, uploadedUrls);
    return await model.getReviewById(id);

  } catch (error) {
    // 3. 롤백: DB 저장 실패 시, 방금 올린 S3 객체 삭제
    console.warn("⚠️ 리뷰 DB 저장 실패. 방금 업로드한 S3 객체를 롤백(삭제)합니다.");
    for (const url of uploadedUrls) {
      await deleteS3Object(url);
    }
    throw error; // 에러 다시 던지기
  }
};

// [수정] S3 업로드 및 삭제 로직 추가 (시그니처는 controller.js에 맞게 유지)
export const updateExistingReview = async (reviewId, buyerId, rating, content, existingImageUrls = [], files = []) => {
  
  const newUploadedUrls = [];
  try {
    // 1. 새 파일 S3에 업로드
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const buf = await getFileBuffer(file);
      if (!buf) continue;

      const { contentType, ext } = pickExtAndType(file);
      // 파일명 규칙: {reviewId}는 이미 있으므로 {reviewId}-{timestamp}-{index} 사용
      const timestamp = Date.now();
      const fileBase = `${buyerId}-${reviewId}-${timestamp}-${i}`;
      const s3Key = `uploads/reviews/${fileBase}.${ext}`;
      const imageUrl = `/${s3Key}`;

      await uploadToS3({ key: s3Key, contentType, body: buf });
      newUploadedUrls.push(imageUrl);
    }

    // 2. 삭제할 이미지 파악
    const oldReview = await model.getReviewById(reviewId);
    if (!oldReview) return null; // 리뷰 없음
    if (oldReview.buyer_id !== buyerId) throw new Error("권한이 없습니다.");
    
    const oldImageUrls = oldReview.image_urls || [];
    // 프론트에서 보낸 '유지할' 목록(existingImageUrls)에 없는 이미지는 삭제
    const urlsToDelete = oldImageUrls.filter(url => !existingImageUrls.includes(url));

    // 3. DB 업데이트 (유지할 이미지 + 새로 업로드한 이미지)
    const finalImageUrls = [...existingImageUrls, ...newUploadedUrls];
    const success = await model.updateReview(reviewId, buyerId, rating, content, finalImageUrls);
    if (!success) return null; // 업데이트 실패

    // 4. S3에서 삭제 (DB 업데이트 성공 후에만)
    for (const url of urlsToDelete) {
      await deleteS3Object(url);
    }

    return await model.getReviewById(reviewId);
  } catch (error) {
    // 5. 롤백: DB 업데이트 실패 시, '새로 업로드한' S3 객체 삭제
    console.warn("⚠️ 리뷰 DB 수정 실패. 방금 업로드한 S3 객체를 롤백(삭제)합니다.");
    for (const url of newUploadedUrls) {
      await deleteS3Object(url);
    }
    throw error;
  }
};

// [수정] removeReview 함수 (S3 삭제를 위해 model.deleteReview 호출)
export const removeReview = async (reviewId, buyerId) => {
  // S3 삭제 로직이 model.deleteReview에 포함됨
  const success = await model.deleteReview(reviewId, buyerId);
  if (!success) throw new Error("리뷰 삭제에 실패했거나 권한이 없습니다.");
  return true;
};

export const addSellerComment = async (reviewId, sellerId, comment) => {
  if (!comment) throw new Error("답변 내용을 입력해야 합니다.");
  return await model.updateSellerComment(reviewId, sellerId, comment);
};

export const findReviewByOrderItem = async (buyerId, orderItemId) => {
  return await model.findReviewByOrderItem(buyerId, orderItemId);
};

export const getSellerReviews = async (sellerId) => {
  return await model.getReviewsBySeller(sellerId);
};
