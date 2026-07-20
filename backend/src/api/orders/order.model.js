import db from "../../config/db.js";

// 주문 생성
export const createOrder = async (buyerId, addressId, orderName, totalPrice) => {
  const [result] = await db.query(
    "INSERT INTO orders (buyer_id, address_id, order_name, total_price, status) VALUES (?, ?, ?, ?, 'PAID')",
    [buyerId, addressId, orderName, totalPrice]
  );
  return result.insertId;
};

// 주문 항목 추가
export const addOrderItem = async (orderId, productId, quantity, unitPrice) => {
  await db.query(
    "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
    [orderId, productId, quantity, unitPrice]
  );
};

// 구매자 주문 목록 조회
export const getOrdersByBuyer = async (buyerId) => {
  const [rows] = await db.query(
    `SELECT o.order_id, o.order_name, o.total_price, o.status, o.created_at,
            COUNT(oi.item_id) AS item_count
     FROM orders o
     LEFT JOIN order_items oi ON o.order_id = oi.order_id
     WHERE o.buyer_id = ?
     GROUP BY o.order_id
     ORDER BY o.created_at DESC`,
    [buyerId]
  );
  return rows;
};

// 주문 상세 조회
export const getOrderDetail = async (orderId, buyerId) => {
  const [orders] = await db.query(
    "SELECT * FROM orders WHERE order_id = ? AND buyer_id = ?",
    [orderId, buyerId]
  );
  if (!orders.length) return null;

  const [items] = await db.query(
    `SELECT oi.*, p.name, p.brand, p.imageUrl 
     FROM order_items oi 
     JOIN products p ON oi.product_id = p.product_id 
     WHERE oi.order_id = ?`,
    [orderId]
  );

  return { ...orders[0], items };
};

// 판매자용 주문 상태 변경
export const updateOrderStatus = async (orderId, status) => {
  const [result] = await db.query(
    "UPDATE orders SET status = ?, updated_at = NOW() WHERE order_id = ?",
    [status, orderId]
  );
  return result.affectedRows > 0;
};
