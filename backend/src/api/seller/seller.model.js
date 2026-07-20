import db from "../../config/db.js";

// 판매자 찾기
export const findSellerByUsername = async (username) => {
  const [rows] = await db.query("SELECT * FROM seller WHERE username = ?", [username]);
  return rows[0];
};

// 토큰으로 판매자 찾기
export const findSellerByToken = async (token) => {
  const [rows] = await db.query("SELECT * FROM seller WHERE token = ?", [token]);
  return rows[0];
};

// 토큰 저장
export const updateSellerToken = async (sellerId, token) => {
  await db.query("UPDATE seller SET token = ? WHERE seller_id = ?", [token, sellerId]);
};

// 로그아웃 시 토큰 삭제
export const clearSellerToken = async (sellerId) => {
  await db.query("UPDATE seller SET token = NULL WHERE seller_id = ?", [sellerId]);
};

// 프로필 조회/수정
export const getSellerProfile = async (sellerId) => {
  const [rows] = await db.query(
    "SELECT seller_id, username, name, email, phone, company_name, business_reg_no, profile_image_url, introduction FROM seller WHERE seller_id = ?",
    [sellerId]
  );
  return rows[0];
};

export const updateSellerProfile = async (sellerId, name, email, phone, introduction) => {
  const [result] = await db.query(
    "UPDATE seller SET name = ?, email = ?, phone = ?, introduction = ? WHERE seller_id = ?",
    [name, email, phone, introduction, sellerId]
  );
  return result.affectedRows > 0;
};

// username까지 포함하여 수정
export const updateSellerProfileAll = async (sellerId, username, name, email, phone, introduction) => {
  const [result] = await db.query(
    "UPDATE seller SET username = ?, name = ?, email = ?, phone = ?, introduction = ? WHERE seller_id = ?",
    [username, name, email, phone, introduction, sellerId]
  );
  return result.affectedRows > 0;
};

export const updatePassword = async (sellerId, newPassword) => {
  await db.query("UPDATE seller SET password = ? WHERE seller_id = ?", [newPassword, sellerId]);
};

// 판매자 생성 (회원가입)
export const createSeller = async (username, password, name, email, phone, company_name, business_reg_no) => {
  const [result] = await db.query(
    "INSERT INTO seller (username, password, name, email, phone, company_name, business_reg_no) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [username, password, name, email, phone, company_name, business_reg_no]
  );
  return result.insertId;
};