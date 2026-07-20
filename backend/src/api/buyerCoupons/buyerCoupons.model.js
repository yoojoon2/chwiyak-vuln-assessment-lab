// /src/api/buyerCoupons/buyerCoupons.model.js
import db from "../../config/db.js";

/** db.query / db.execute / db.pool.query 대응용 래퍼 */
async function q(sql, params = []) {
  if (db?.query) return db.query(sql, params);
  if (db?.execute) return db.execute(sql, params);
  if (db?.pool?.query) return db.pool.query(sql, params);
  throw new Error("DB module must expose query/execute");
}

/** 쿠폰 코드(마스터) 조회 - valid_from으로 수정! */
export async function findCouponCodeByCode(code) {
  const [rows] = await q(
    `SELECT *
       FROM coupons
      WHERE code = ?
        AND is_active = TRUE
        AND (valid_from IS NULL OR valid_from <= NOW())
        AND (valid_until IS NULL OR valid_until >= NOW())`,
    [code]
  );
  return rows?.[0] ?? null;
}

/** 쿠폰코드 남은 수량 체크 (total_quantity 컬럼 없으면 무제한) */
export function hasRemainingQuantity(codeRow) {
  // total_quantity 컬럼이 없으면 항상 true
  if (!('total_quantity' in codeRow) || codeRow.total_quantity == null) return true;
  return (codeRow.issued_count ?? 0) < codeRow.total_quantity;
}

/** 발급 수 증가 (issued_count 컬럼이 있을 때만) */
export async function incrementIssuedCount(codeId) {
  // issued_count 컬럼이 없으면 아무것도 안 함
  // 필요시 ALTER TABLE coupons ADD COLUMN issued_count INT DEFAULT 0;
  return;
}

/** 동일 코드 보유 여부 - is_deleted 체크 제거 */
export async function findUserCouponByCodeId(userId, codeId) {
  const [rows] = await q(
    `SELECT *
       FROM buyer_coupons
      WHERE buyer_id = ? AND coupon_id = ?`,
    [userId, codeId]
  );
  return rows?.[0] ?? null;
}

/** 유저 쿠폰 발급 - 최소 필드만 사용 */
export async function insertUserCoupon(userId, codeRow) {
  const [ret] = await q(
    `INSERT INTO buyer_coupons
       (buyer_id, coupon_id, issued_at)
     VALUES
       (?, ?, NOW())`,
    [userId, codeRow.coupon_id]
  );
  return ret.insertId;
}

/** 내 쿠폰 목록 (필터/페이지네이션) */
export async function listUserCoupons(userId, { isUsed, page, size }) {
  const where = [`bc.buyer_id = ?`];
  const params = [userId];

  if (isUsed === true) { where.push(`bc.is_used = TRUE`); }
  else if (isUsed === false) { where.push(`bc.is_used = FALSE`); }

  const limit = Math.max(1, Math.min(size ?? 20, 100));
  const offset = Math.max(0, ((page ?? 1) - 1) * limit);

  const [rows] = await q(
    `SELECT bc.buyer_coupon_id, bc.buyer_id, bc.coupon_id,
            bc.is_used, bc.issued_at, bc.used_at,
            c.code, c.description, c.discount_type, c.discount_value, c.valid_until
       FROM buyer_coupons bc
       JOIN coupons c ON bc.coupon_id = c.coupon_id
      WHERE ${where.join(" AND ")}
      ORDER BY bc.issued_at DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return rows;
}

/** 단건 조회(권한 체크용) */
export async function getUserCouponById(userId, buyerCouponId) {
  const [rows] = await q(
    `SELECT *
       FROM buyer_coupons
      WHERE buyer_coupon_id = ? AND buyer_id = ?`,
    [buyerCouponId, userId]
  );
  return rows?.[0] ?? null;
}

/** 사용 처리 */
export async function markCouponUsed(userId, buyerCouponId, orderId = null) {
  const [ret] = await q(
    `UPDATE buyer_coupons
        SET is_used = TRUE,
            used_at = NOW()
      WHERE buyer_coupon_id = ?
        AND buyer_id = ?
        AND is_used = FALSE`,
    [buyerCouponId, userId]
  );
  return ret.affectedRows > 0;
}

/** 소프트 삭제 (is_deleted 컬럼이 있을 때만) */
export async function softDeleteCoupon(userId, buyerCouponId) {
  try {
    const [ret] = await q(
      `UPDATE buyer_coupons
          SET is_deleted = TRUE
        WHERE buyer_coupon_id = ?
          AND buyer_id = ?`,
      [buyerCouponId, userId]
    );
    return ret.affectedRows > 0;
  } catch (err) {
    // is_deleted 컬럼이 없으면 물리적 삭제
    const [ret] = await q(
      `DELETE FROM buyer_coupons
        WHERE buyer_coupon_id = ?
          AND buyer_id = ?`,
      [buyerCouponId, userId]
    );
    return ret.affectedRows > 0;
  }
}