import * as model from "./order.model.js";
import db from "../../config/db.js";

export const createOrder = async (buyerId, addressId, orderName, totalPrice) => {
  const orderId = await model.createOrder(buyerId, addressId, orderName, totalPrice);
  return orderId;
};

export const addOrderItem = async (orderId, productId, quantity, unitPrice) => {
  await model.addOrderItem(orderId, productId, quantity, unitPrice);
};

export const usePoints = async (userId, orderId, points) => {
  // 포인트 사용 처리
  await db.query(
    `INSERT INTO point_history (user_id, order_id, points, point_type, description)
     VALUES (?, ?, ?, 'USE', '주문 결제 사용')`,
    [userId, orderId, points]
  );
  
  // 사용자 포인트 업데이트
  await db.query(
    `UPDATE users 
     SET points = points - ? 
     WHERE user_id = ? AND points >= ?`,
    [points, userId, points]
  );
};

export const useCoupon = async (userId, buyerCouponId, orderId) => {
  // 쿠폰 사용 처리
  await db.query(
    `UPDATE buyer_coupons 
     SET is_used = 1, used_at = NOW(), order_id = ?
     WHERE buyer_coupon_id = ? AND user_id = ?`,
    [orderId, buyerCouponId, userId]
  );
};

export const getBuyerOrders = async (buyerId) => {
  return await model.getOrdersByBuyer(buyerId);
};

export const getBuyerOrderDetail = async (orderId, buyerId) => {
  const order = await model.getOrderDetail(orderId, buyerId);
  if (!order) throw new Error("주문을 찾을 수 없습니다.");
  return order;
};

export const changeOrderStatus = async (orderId, status) => {
  const validStatuses = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"];
  if (!validStatuses.includes(status)) throw new Error("유효하지 않은 상태 값입니다.");

  const updated = await model.updateOrderStatus(orderId, status);
  if (!updated) throw new Error("주문 상태 변경에 실패했습니다.");
  return true;
};
