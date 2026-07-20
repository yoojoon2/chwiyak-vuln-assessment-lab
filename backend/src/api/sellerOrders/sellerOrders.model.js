// backend/src/api/sellerOrders/sellerOrders.model.js
import db from "../../config/db.js";

// 판매자의 주문 목록 조회
export const getOrdersBySeller = async (sellerId, status, sort) => {
  let query = `
    SELECT DISTINCT
      o.order_id,
      o.order_name,
      o.total_price,
      o.status,
      o.created_at,
      b.name as buyer_name,
      b.email as buyer_email,
      b.phone as buyer_phone,
      o.address_id,
      ba.postal_code,
      ba.address_line1,
      ba.address_line2,
      ba.recipient,
      ba.phone as recipient_phone
    FROM orders o
    JOIN order_items oi ON o.order_id = oi.order_id
    JOIN products p ON oi.product_id = p.product_id
    JOIN buyer b ON o.buyer_id = b.buyer_id
    LEFT JOIN buyer_address ba ON o.address_id = ba.address_id
    WHERE p.seller_id = ?
  `;

  const params = [sellerId];

  // 상태 필터
  if (status && status !== 'all') {
    const statusMap = {
      'pending': 'PAID',         // 주문 대기
      'processing': 'PROCESSING', // 처리중
      'shipping': 'SHIPPED',      // 배송중
      'completed': 'DELIVERED'    // 배송완료
    };
    query += ` AND o.status = ?`;
    params.push(statusMap[status] || status);
  }

  // 정렬
  if (sort === 'oldest') {
    query += ` ORDER BY o.created_at ASC`;
  } else if (sort === 'price-high') {
    query += ` ORDER BY o.total_price DESC`;
  } else if (sort === 'price-low') {
    query += ` ORDER BY o.total_price ASC`;
  } else {
    query += ` ORDER BY o.created_at DESC`;
  }

  const [orders] = await db.query(query, params);

  console.log('📦 조회된 주문 수:', orders.length);
  if (orders.length > 0) {
    console.log('📦 첫 번째 주문 샘플:', {
      order_id: orders[0].order_id,
      address_id: orders[0].address_id,
      postal_code: orders[0].postal_code,
      address_line1: orders[0].address_line1,
      address_line2: orders[0].address_line2
    });
  }

  // 각 주문의 상품 정보 가져오기
  for (let order of orders) {
    // 상품 정보
    const [items] = await db.query(
      `SELECT oi.*, p.name as product_name, p.brand, p.imageUrl
       FROM order_items oi
       JOIN products p ON oi.product_id = p.product_id
       WHERE oi.order_id = ? AND p.seller_id = ?`,
      [order.order_id, sellerId]
    );
    order.items = items;

    // ✅ 주소 정보 (이미 JOIN으로 가져왔음)
    console.log(`📍 주문 ${order.order_id} 주소:`, {
      postal_code: order.postal_code,
      address_line1: order.address_line1,
      address_line2: order.address_line2
    });

    order.zipcode = order.postal_code;
    order.address = order.address_line1;
    order.address_detail = order.address_line2;
    
    // 주소 합치기
    if (order.address) {
      order.full_address = `(${order.zipcode || ''}) ${order.address}${order.address_detail ? ' ' + order.address_detail : ''}`.trim();
    } else {
      order.full_address = '주소 정보 없음';
    }
    
    console.log(`✅ 최종 주소: ${order.full_address}`);

    // 상태 한글 변환
    const statusMap = {
      'PENDING': '결제 대기',
      'PAID': '주문 대기',
      'PROCESSING': '처리중',
      'SHIPPED': '배송중',
      'DELIVERED': '배송완료',
      'CANCELLED': '취소됨'
    };
    order.status_kr = statusMap[order.status] || order.status;

    // 날짜 포맷
    if (order.created_at) {
      const date = new Date(order.created_at);
      order.created_at_formatted = date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  return orders;
};

// 판매자 정산 예정 금액 합계
export const getSettlementAmountBySeller = async (sellerId) => {
  const [rows] = await db.query(
    `SELECT COALESCE(SUM(oi.unit_price * oi.quantity), 0) AS amount
     FROM order_items oi
     JOIN products p ON oi.product_id = p.product_id
     JOIN orders o ON oi.order_id = o.order_id
     WHERE p.seller_id = ?
       AND o.status IN ('PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED')`,
    [sellerId]
  );

  return rows[0]?.amount ?? 0;
};

// 주문이 판매자의 것인지 확인
export const verifyOrderOwnership = async (orderId, sellerId) => {
  const [result] = await db.query(
    `SELECT COUNT(*) as count
     FROM orders o
     JOIN order_items oi ON o.order_id = oi.order_id
     JOIN products p ON oi.product_id = p.product_id
     WHERE o.order_id = ? AND p.seller_id = ?`,
    [orderId, sellerId]
  );
  return result[0].count > 0;
};

// 주문 상태 변경
export const updateOrderStatus = async (orderId, status) => {
  try {
    const statusMap = {
      'processing': 'PROCESSING',  // 처리중
      'shipping': 'SHIPPED',       // 배송중
      'completed': 'DELIVERED'     // 배송완료
    };

    const dbStatus = statusMap[status] || status;
    
    console.log('💾 상태 변경 시도:', { orderId, status, dbStatus });

    const [result] = await db.query(
      'UPDATE orders SET status = ? WHERE order_id = ?',
      [dbStatus, orderId]
    );
    
    console.log('✅ 업데이트 결과:', result);
    
    if (result.affectedRows === 0) {
      throw new Error('주문을 찾을 수 없습니다');
    }
    
    return result;
  } catch (error) {
    console.error('❌ 상태 변경 DB 오류:', error);
    throw error;
  }
};

// 판매자 통계
export const getSellerStatistics = async (sellerId) => {
  // 등록 상품 수
  const [products] = await db.query(
    'SELECT COUNT(*) as count FROM products WHERE seller_id = ?',
    [sellerId]
  );

  // 주문 대기 수 (PAID 상태)
  const [pendingOrders] = await db.query(
    `SELECT COUNT(DISTINCT o.order_id) as count
     FROM orders o
     JOIN order_items oi ON o.order_id = oi.order_id
     JOIN products p ON oi.product_id = p.product_id
     WHERE p.seller_id = ? AND o.status = 'PAID'`,
    [sellerId]
  );

  // 리뷰 수
  const [reviews] = await db.query(
    `SELECT COUNT(*) as count
     FROM reviews r
     JOIN products p ON r.product_id = p.product_id
     WHERE p.seller_id = ?`,
    [sellerId]
  );

  const settlementAmount = await getSettlementAmountBySeller(sellerId);

  return {
    productCount: products[0].count,
    pendingOrderCount: pendingOrders[0].count,
    reviewCount: reviews[0].count,
    pendingSettlementAmount: settlementAmount
  };
};

// 최근 주문 조회
export const getRecentOrdersBySeller = async (sellerId, limit = 3) => {
  const [orders] = await db.query(
    `SELECT DISTINCT
      o.order_id,
      o.order_name,
      o.total_price,
      o.status,
      o.created_at,
      b.name as buyer_name
    FROM orders o
    JOIN order_items oi ON o.order_id = oi.order_id
    JOIN products p ON oi.product_id = p.product_id
    JOIN buyer b ON o.buyer_id = b.buyer_id
    WHERE p.seller_id = ?
    ORDER BY o.created_at DESC
    LIMIT ?`,
    [sellerId, limit]
  );

  for (let order of orders) {
    const [items] = await db.query(
      `SELECT oi.*, p.name as product_name, p.imageUrl
       FROM order_items oi
       JOIN products p ON oi.product_id = p.product_id
       WHERE oi.order_id = ? AND p.seller_id = ?`,
      [order.order_id, sellerId]
    );
    order.items = items;

    // 상태 한글 변환
    const statusMap = {
      'PENDING': '결제 대기',
      'PAID': '주문 대기',
      'PROCESSING': '처리중',
      'SHIPPED': '배송중',
      'DELIVERED': '배송완료',
      'CANCELLED': '취소됨'
    };
    order.status_kr = statusMap[order.status] || order.status;

    // 날짜 포맷
    if (order.created_at) {
      const date = new Date(order.created_at);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      order.created_at_formatted = `${year}.${month}.${day}`;
    }
  }

  return orders;
};