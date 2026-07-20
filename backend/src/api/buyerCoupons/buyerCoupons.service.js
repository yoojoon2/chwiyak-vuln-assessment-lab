// /src/api/buyerCoupons/buyerCoupons.service.js
import {
  findCouponCodeByCode,
  hasRemainingQuantity,
  incrementIssuedCount,
  findUserCouponByCodeId,
  insertUserCoupon,
  listUserCoupons,
  getUserCouponById,
  markCouponUsed,
  softDeleteCoupon,
} from "./buyerCoupons.model.js";

/** 공통: req에서 buyerId 추출 */
function getBuyerId(req) {
  // verifyBuyerToken이 req.buyer.buyer_id를 채워준다고 가정
  return req?.buyer?.buyer_id || Number(req.headers["x-buyer-id"]);
}

/** 쿠폰 코드 등록(발급) */
export async function redeemCoupon(req) {
  const buyerId = getBuyerId(req);
  if (!buyerId) throw new Error("UNAUTHORIZED");

  const { code } = req.body || {};
  if (!code || !String(code).trim()) throw new Error("INVALID_CODE");

  const codeRow = await findCouponCodeByCode(String(code).trim());
  if (!codeRow) throw new Error("NOT_FOUND_CODE");
  if (!hasRemainingQuantity(codeRow)) throw new Error("SOLD_OUT");

  const already = await findUserCouponByCodeId(buyerId, codeRow.coupon_id);
  if (already) throw new Error("ALREADY_OWNED");

  const id = await insertUserCoupon(buyerId, codeRow);
  await incrementIssuedCount(codeRow.coupon_id);

  return { id };
}

/** 내 쿠폰 목록 */
export async function getMyCoupons(req) {
  const buyerId = getBuyerId(req);
  if (!buyerId) throw new Error("UNAUTHORIZED");

  const isUsedParam = req.query?.is_used;
  let isUsed = undefined;
  if (isUsedParam === "true") isUsed = true;
  if (isUsedParam === "false") isUsed = false;

  const page = Number(req.query?.page ?? 1);
  const size = Number(req.query?.size ?? 20);

  const rows = await listUserCoupons(buyerId, { isUsed, page, size });
  return rows;
}

/** 사용 처리 */
export async function useMyCoupon(req) {
  const buyerId = getBuyerId(req);
  if (!buyerId) throw new Error("UNAUTHORIZED");

  const { id } = req.params;
  const { orderId } = req.body || {};

  const exists = await getUserCouponById(buyerId, id);
  if (!exists) throw new Error("NOT_FOUND_COUPON");

  // (선택) 만료/최소주문금액/스코프 검사는 주문 시점 검증 로직에 추가 가능
  const ok = await markCouponUsed(buyerId, id, orderId ?? null);
  if (!ok) throw new Error("ALREADY_USED_OR_DELETED");

  return { ok: true };
}

/** 소프트 삭제 */
export async function deleteMyCoupon(req) {
  const buyerId = getBuyerId(req);
  if (!buyerId) throw new Error("UNAUTHORIZED");

  const { id } = req.params;

  const exists = await getUserCouponById(buyerId, id);
  if (!exists) throw new Error("NOT_FOUND_COUPON");

  const ok = await softDeleteCoupon(buyerId, id);
  if (!ok) throw new Error("DELETE_FAILED");

  return { ok: true };
}