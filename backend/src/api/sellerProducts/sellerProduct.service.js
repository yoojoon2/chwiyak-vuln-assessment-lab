// /backend/src/api/sellerProducts/sellerProduct.service.js (전체 교체)

import 'dotenv/config'; // .env 로드
import mime from "mime";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

import * as productModel from "./sellerProduct.model.js";
import { deleteS3Object } from "./sellerProduct.model.js";
import * as sellerModel from "../seller/seller.model.js"; 

// S3
const s3 = new S3Client({ region: process.env.AWS_REGION });
// const BUCKET = process.env.AWS_S3_BUCKET; // ◀️ [수정] 함수 내부에서 참조하도록 변경

// 브랜드명 표준화
function normalizeBrand(brandRaw) {
  if (!brandRaw) return "UNKNOWN";
  return String(brandRaw).trim().replace(/\s+/g, "").toUpperCase();
}

// 확장자/ContentType 결정
function pickExtAndType(file) {
  const ct = file?.mimetype || "application/octet-stream";
  let ext = mime.getExtension(ct) || "bin";
  if (ext === "jpeg") ext = "jpg";
  return { contentType: ct, ext };
}

// S3 업로드
async function uploadToS3({ key, contentType, body }) {
  // 🔽 [수정] BUCKET 변수를 함수 내에서 직접 참조
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
  console.log(`✅ S3 업로드 완료: ${key}`);
}

// 파일 버퍼 얻기 (memoryStorage 전용)
async function getFileBuffer(file) {
  if (file?.buffer) {
    return file.buffer; 
  }
  return null;
}

// =============== 공개 API ===============

// 상품 등록
export const createProduct = async (sellerId, body, file) => {
  const buf = await getFileBuffer(file);
  if (!buf) {
    throw new Error("업로드 파일이 없습니다. (mainImage 누락)");
  }

  const { name, category, price, description } = body;

  // 1) 판매자 브랜드/회사명 조회
  const seller = await sellerModel.getSellerProfile(sellerId);
  const brand = normalizeBrand(seller?.company_name || "UNKNOWN");

  // 2) DB에서 다음 시퀀스 번호 가져오기
  const nextNum = await productModel.getNextSequenceForProduct(brand, category);

  // 3) 업로드 파일 준비
  const { contentType, ext } = pickExtAndType(file);

  // 4) S3 키/URL 생성
  const fileBase = `${brand}_${category}${nextNum}`;

  const s3CategoryFolder = category === 'bag' ? 'bags' : category;

  // 🔽 [수정] 카테고리별 폴더 경로 추가
  const s3Key = `uploads/${s3CategoryFolder}/${fileBase}.${ext}`;
  const imageUrl = `/${s3Key}`; // DB 저장 경로는 /uploads/category/filename.ext

  try {
    // 5) S3 업로드
    await uploadToS3({ key: s3Key, contentType, body: buf });

    // 6) DB 저장
    const created = await productModel.createProduct({
      seller_id: sellerId,
      name,
      brand,
      category,
      description,
      price,
      imageUrl,
    });

    return created;
  
  } catch (error) {
    // 롤백: DB 저장 실패 시, 방금 올린 S3 객체 삭제
    console.warn("⚠️ DB 저장 실패. 방금 업로드한 S3 객체를 롤백(삭제)합니다.");
    await deleteS3Object(imageUrl);
    throw error; // 에러 다시 던지기
  }
};

// 내 상품 목록
export const getSellerProducts = async (sellerId) => {
  return productModel.getProductsBySeller(sellerId);
};

// 삭제
export const deleteProduct = async (sellerId, productId) => {
  return productModel.deleteProduct(sellerId, productId);
};

// 수정 (이미지 변경 시 새 업로드)
export const updateProduct = async (sellerId, productId, updatedData, file) => {
  let imageUrlToSave = updatedData.imageUrl;
  let newS3UploadedUrl = null; 

  if (file) {
    const buf = await getFileBuffer(file);
    if (!buf) throw new Error("수정할 이미지가 없습니다.");

    // 1) 판매자 브랜드/회사명 조회
    const seller = await sellerModel.getSellerProfile(sellerId);
    const brand = normalizeBrand(seller?.company_name || "UNKNOWN");
    
    // 🔽 [수정] updatedData에서 category를 가져와야 함
    const category = updatedData.category;
    const nextNum = await productModel.getNextSequenceForProduct(brand, category);
    
    const { contentType, ext } = pickExtAndType(file);
    const fileBase = `${brand}_${category}${nextNum}`;
    
    // 🔽 [수정] 카테고리별 폴더 경로 추가
    const s3Key = `uploads/${category}/${fileBase}.${ext}`;
    imageUrlToSave = `/${s3Key}`;
    newS3UploadedUrl = imageUrlToSave; 

    try {
      await uploadToS3({ key: s3Key, contentType, body: buf });
    } catch (error) {
      console.error("❌ S3 업로드 실패 (수정):", error);
      throw new Error("새 이미지를 업로드하는 중 오류가 발생했습니다.");
    }
  }

  try {
    // DB 업데이트
    const result = await productModel.updateProduct(sellerId, productId, {
      ...updatedData,
      imageUrl: imageUrlToSave,
    });
    return result;

  } catch (error) {
    // 롤백: DB 업데이트 실패 시, '새로 업로드한' S3 객체 삭제
    if (newS3UploadedUrl) { 
      console.warn("⚠️ DB 업데이트 실패. 방금 업로드한 S3 객체를 롤백(삭제)합니다.", newS3UploadedUrl);
      await deleteS3Object(newS3UploadedUrl);
    }
    throw error; // 에러 다시 던지기
  }
};

