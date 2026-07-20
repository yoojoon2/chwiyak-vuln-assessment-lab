// /src/api/buyerPoints/buyerPoints.service.js
import {
  getPointBalance,
  getPointHistory,
  spendPoints,
  refundPoints,
} from "./buyerPoints.model.js";

function getBuyerId(req) {
  return req?.buyer?.buyer_id || Number(req.headers["x-buyer-id"]);
}

export async function fetchBalance(req) {
  const buyerId = getBuyerId(req);
  if (!buyerId) throw new Error("UNAUTHORIZED");
  const total = await getPointBalance(buyerId);
  return { buyer_id: buyerId, total_points: total };
}

export async function fetchHistory(req) {
  const buyerId = getBuyerId(req);
  if (!buyerId) throw new Error("UNAUTHORIZED");

  const page = Number(req.query?.page || 1);
  const size = Number(req.query?.size || 20);

  const data = await getPointHistory(buyerId, { page, size });
  return { buyer_id: buyerId, page, size, data };
}

export async function spendOnOrder(req) {
  const buyerId = getBuyerId(req);
  if (!buyerId) throw new Error("UNAUTHORIZED");

  const { amount, orderId } = req.body || {};
  const n = Number(amount);
  if (!n || n <= 0) throw new Error("INVALID_AMOUNT");

  const balance = await getPointBalance(buyerId);
  if (n > balance) throw new Error("INSUFFICIENT_POINTS");

  await spendPoints(buyerId, n, "주문 사용", orderId ?? null);
  const after = await getPointBalance(buyerId);
  return { ok: true, total_points: after };
}

export async function refundOnOrder(req) {
  const buyerId = getBuyerId(req);
  if (!buyerId) throw new Error("UNAUTHORIZED");

  const { amount, orderId } = req.body || {};
  const n = Number(amount);
  if (!n || n <= 0) throw new Error("INVALID_AMOUNT");

  await refundPoints(buyerId, n, "주문 취소/환불 포인트 복구", orderId ?? null);
  const after = await getPointBalance(buyerId);
  return { ok: true, total_points: after };
}