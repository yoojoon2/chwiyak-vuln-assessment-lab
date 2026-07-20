// /src/api/buyer/buyer.service.js
import bcrypt from "bcryptjs";
import { generateToken } from "../../utils/jwt.js";
import db from "../../config/db.js";
import * as buyerModel from "./buyer.model.js";
import { grantWelcomePoints } from "../buyerPoints/buyerPoints.model.js"; // ✅ 추가

export const registerBuyer = async (username, password, name, email, phone) => {
  const existing = await buyerModel.findBuyerByUsername(username);
  if (existing) throw new Error("이미 존재하는 아이디입니다.");

  const hashed = await bcrypt.hash(password, 10);
  const id = await buyerModel.createBuyer(username, hashed, name, email, phone);
  
  // ✅ 회원가입 축하 포인트 10,000P 자동 지급
  try {
    await grantWelcomePoints(id);
    console.log(`✅ 포인트 지급 성공: buyer_id=${id}`);
  } catch (err) {
    console.error("❌ 포인트 지급 실패:", err);
  }
  
  return await buyerModel.getBuyerProfile(id);
};

export const loginBuyer = async (username, password) => {
  const buyer = await buyerModel.findBuyerByUsername(username);
  if (!buyer) throw new Error("존재하지 않는 회원입니다.");

  // ✅ 정지된 계정 로그인 차단
  if (buyer.is_active === 0) {
    throw new Error("정지된 계정입니다. 관리자에게 문의하세요.");
  }

  const isMatch = await bcrypt.compare(password, buyer.password);
  if (!isMatch) throw new Error("비밀번호가 올바르지 않습니다.");

  // JWT 토큰 생성 (DB에 저장하지 않음 - stateless)
  const token = generateToken(buyer, 'buyer');

  return {
    id: buyer.buyer_id,
    username: buyer.username,
    name: buyer.name,
    email: buyer.email,
    token,
  };
};

export const verifyToken = async (token) => {
  // JWT 검증은 미들웨어에서 처리 (여기서는 사용하지 않음)
  // UUID 방식에서 JWT로 변경했으므로 이 함수는 호환성을 위해 남겨둠
  const buyer = await buyerModel.findBuyerByToken(token);
  if (!buyer) throw new Error("유효하지 않은 토큰입니다.");
  return buyer;
};

export const logoutBuyer = async (buyerId) => {
  // JWT는 stateless이므로 DB에서 토큰을 삭제할 필요 없음
  // 클라이언트에서 토큰을 삭제하면 됨
  return true;
};

export const getProfile = async (buyerId) => {
  const buyer = await buyerModel.getBuyerProfile(buyerId);
  if (!buyer) throw new Error("회원 정보를 찾을 수 없습니다.");
  return buyer;
};

export const updateProfile = async (buyerId, name, email, phone, username) => {
  let success;
  if (username) {
    success = await buyerModel.updateBuyerProfileAll(buyerId, username, name, email, phone);
  } else {
    success = await buyerModel.updateBuyerProfile(buyerId, name, email, phone);
  }
  if (!success) throw new Error("프로필 수정에 실패했습니다.");
  return await buyerModel.getBuyerProfile(buyerId);
};

export const changePassword = async (buyerId, oldPw, newPw) => {
  const buyer = await buyerModel.getBuyerProfile(buyerId);
  if (!buyer) throw new Error("회원 정보를 찾을 수 없습니다.");

  // buyer_id로 사용자 정보 가져오기
  const [rows] = await db.query("SELECT * FROM buyer WHERE buyer_id = ?", [buyerId]);
  const existing = rows[0];
  if (!existing) throw new Error("회원 정보를 찾을 수 없습니다.");

  const isMatch = await bcrypt.compare(oldPw, existing.password);
  if (!isMatch) throw new Error("기존 비밀번호가 일치하지 않습니다.");

  const hashed = await bcrypt.hash(newPw, 10);
  await buyerModel.updatePassword(buyerId, hashed);
  return true;
};
