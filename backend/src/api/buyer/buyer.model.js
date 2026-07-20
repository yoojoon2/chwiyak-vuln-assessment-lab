import db from "../../config/db.js";

// 기본 회원 기능
export const findBuyerByUsername = async (username) => {
  const [rows] = await db.query("SELECT * FROM buyer WHERE username = ?", [username]);
  return rows[0];
};

export const findBuyerByToken = async (token) => {
  const [rows] = await db.query("SELECT * FROM buyer WHERE token = ?", [token]);
  return rows[0];
};

export const createBuyer = async (username, password, name, email, phone) => {
  const [result] = await db.query(
    "INSERT INTO buyer (username, password, name, email, phone) VALUES (?, ?, ?, ?, ?)",
    [username, password, name, email, phone]
  );
  return result.insertId;
};

export const updateBuyerToken = async (buyerId, token) => {
  await db.query("UPDATE buyer SET token = ? WHERE buyer_id = ?", [token, buyerId]);
};

export const clearBuyerToken = async (buyerId) => {
  await db.query("UPDATE buyer SET token = NULL WHERE buyer_id = ?", [buyerId]);
};

export const getBuyerProfile = async (buyerId) => {
  const [rows] = await db.query(
    "SELECT buyer_id, username, name, email, phone, points, created_at FROM buyer WHERE buyer_id = ?",
    [buyerId]
  );
  return rows[0];
};

export const updateBuyerProfile = async (buyerId, name, email, phone) => {
  const [result] = await db.query(
    "UPDATE buyer SET name = ?, email = ?, phone = ? WHERE buyer_id = ?",
    [name, email, phone, buyerId]
  );
  return result.affectedRows > 0;
};

// username까지 포함하여 수정
export const updateBuyerProfileAll = async (buyerId, username, name, email, phone) => {
  const [result] = await db.query(
    "UPDATE buyer SET username = ?, name = ?, email = ?, phone = ? WHERE buyer_id = ?",
    [username, name, email, phone, buyerId]
  );
  return result.affectedRows > 0;
};

export const updatePassword = async (buyerId, newPassword) => {
  await db.query("UPDATE buyer SET password = ? WHERE buyer_id = ?", [newPassword, buyerId]);
};
