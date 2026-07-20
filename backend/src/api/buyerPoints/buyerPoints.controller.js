// /src/api/buyerPoints/buyerPoints.controller.js
import {
  fetchBalance,
  fetchHistory,
  spendOnOrder,
  refundOnOrder,
} from "./buyerPoints.service.js";

// 공통 에러 응답
function sendError(res, err) {
  const map = {
    UNAUTHORIZED: [401, "로그인이 필요합니다."],
    INVALID_AMOUNT: [400, "포인트 금액이 올바르지 않습니다."],
    INSUFFICIENT_POINTS: [400, "보유 포인트가 부족합니다."],
  };
  const [status, message] = map[err.message] || [500, "서버 오류가 발생했습니다."];
  return res.status(status).json({ message });
}

/** 잔액 조회 (신규 이름) */
export async function getBalance(req, res) {
  try {
    const data = await fetchBalance(req);
    // ✅ 프론트엔드가 기대하는 형식: { total_points: number }
    res.json(data);
  } catch (e) {
    sendError(res, e);
  }
}

/** ⬇️ 하위 호환: 기존 라우트가 getBuyerPoints를 쓰면 여기로 들어오게 */
export const getBuyerPoints = getBalance;

/** 내역 조회 */
export async function getHistory(req, res) {
  try {
    const result = await fetchHistory(req);
    // ✅ 프론트엔드가 기대하는 형식: { data: [...] }
    res.json(result);
  } catch (e) {
    sendError(res, e);
  }
}

/** 결제 시 포인트 차감 */
export async function postSpend(req, res) {
  try {
    const data = await spendOnOrder(req);
    res.json({ message: "포인트가 사용되었습니다.", ...data });
  } catch (e) {
    sendError(res, e);
  }
}

/** 취소/환불 시 포인트 복구 */
export async function postRefund(req, res) {
  try {
    const data = await refundOnOrder(req);
    res.json({ message: "포인트가 복구되었습니다.", ...data });
  } catch (e) {
    sendError(res, e);
  }
}