// /src/api/buyerPoints/buyerPoints.model.js
import db from "../../config/db.js";

/** 잔액(합계) */
export async function getPointBalance(buyerId) {
  const [rows] = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS total_points
       FROM points
      WHERE buyer_id = ?`,
    [buyerId]
  );
  return Number(rows?.[0]?.total_points || 0);
}

/** 상세 내역 (페이지네이션) - order_id 제거 */
export async function getPointHistory(buyerId, { page = 1, size = 20 }) {
  const limit = Math.max(1, Math.min(size, 100));
  const offset = Math.max(0, (page - 1) * limit);
  const [rows] = await db.query(
    `SELECT point_id, amount, description, type, created_at, expires_at
       FROM points
      WHERE buyer_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`,
    [buyerId, limit, offset]
  );
  return rows;
}

/** 포인트 사용(차감) - order_id 제거 */
export async function spendPoints(buyerId, amount, description) {
  const [ret] = await db.query(
    `INSERT INTO points (buyer_id, amount, description, type, created_at)
     VALUES (?, ?, ?, 'spend', NOW())`,
    [buyerId, -Math.abs(amount), description]
  );
  return ret.insertId;
}

/** 포인트 복구(환불/취소) - order_id 제거 */
export async function refundPoints(buyerId, amount, description) {
  const [ret] = await db.query(
    `INSERT INTO points (buyer_id, amount, description, type, created_at)
     VALUES (?, ?, ?, 'earn', NOW())`,
    [buyerId, Math.abs(amount), description]
  );
  return ret.insertId;
}

/** ✅ 회원가입 축하 포인트 지급 */
export async function grantWelcomePoints(buyerId) {
  const [ret] = await db.query(
    `INSERT INTO points (buyer_id, amount, description, type, created_at)
     VALUES (?, 10000, '회원가입 축하 포인트', 'earn', NOW())`,
    [buyerId]
  );
  return ret.insertId;
}