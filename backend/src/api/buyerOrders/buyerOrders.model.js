
import db from "../../config/db.js";

export const getOrdersByBuyer = async (buyerId) => {
  // 주문 목록 가져오기
  const [orders] = await db.query(
    `SELECT o.order_id, o.order_name, o.total_price, o.status, o.created_at
     FROM orders o
     WHERE o.buyer_id = ?
     ORDER BY o.created_at DESC`,
    [buyerId]
  );
  
  // 각 주문의 상품 정보 가져오기 및 날짜/상태 포맷팅
  for (let order of orders) {
    const [items] = await db.query(
      `SELECT oi.*, p.name as product_name, p.brand, p.imageUrl, p.category,
              r.review_id, r.order_item_id as _item_id
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.product_id
       LEFT JOIN reviews r ON r.order_item_id = oi.item_id
       WHERE oi.order_id = ?`,
      [order.order_id]
    );
    order.items = items;
    
    // ✅ 상태를 한글로 변환 (4가지만)
    const statusMap = {
      'PAID': '결제완료',
      'PROCESSING': '상품 준비중',
      'SHIPPED': '배송중',
      'DELIVERED': '배송완료'
    };
    order.status_kr = statusMap[order.status] || order.status;
    
    // 날짜를 YYYY.MM.DD 형식으로 변환
    if (order.created_at) {
      const date = new Date(order.created_at);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      order.created_at_formatted = `${year}.${month}.${day}`;
    }

    // ✅ 결제 정보 계산
    const totalProductPrice = items.reduce((sum, item) => 
      sum + (Number(item.unit_price) * Number(item.quantity)), 0
    );
    
    const shippingFee = 5000; // 배송비
    
    // ✅ 포인트 사용 금액 조회 (시간 기반 매칭)
    const [pointRows] = await db.query(
      `SELECT COALESCE(SUM(ABS(amount)), 0) AS used_points
       FROM points
       WHERE buyer_id = ?
         AND type = 'spend'
         AND description = '주문 사용'
         AND created_at BETWEEN DATE_SUB(?, INTERVAL 2 MINUTE) AND DATE_ADD(?, INTERVAL 2 MINUTE)`,
      [buyerId, order.created_at, order.created_at]
    );
    const pointUsage = Number(pointRows?.[0]?.used_points || 0);

    // ✅ 쿠폰 할인 금액 조회 (buyer_coupons → coupons, 시간 기반 매칭)
    let couponDiscount = 0;
    try {
      const [couponRows] = await db.query(
        `SELECT c.discount_type, c.discount_value
           FROM buyer_coupons bc
           JOIN coupons c ON bc.coupon_id = c.coupon_id
          WHERE bc.buyer_id = ?
            AND bc.is_used = TRUE
            AND bc.used_at BETWEEN DATE_SUB(?, INTERVAL 2 MINUTE) AND DATE_ADD(?, INTERVAL 2 MINUTE)
          ORDER BY bc.used_at DESC
          LIMIT 1`,
        [buyerId, order.created_at, order.created_at]
      );

      if (couponRows && couponRows.length) {
        const row = couponRows[0];
        const dtype = String(row.discount_type || '').toUpperCase();
        const dval = Number(row.discount_value || 0);
        if (dtype === 'FIXED') {
          couponDiscount = Math.max(0, dval);
        } else if (dtype === 'PERCENT' || dtype === 'PERCENTAGE') {
          couponDiscount = Math.floor((totalProductPrice * Math.max(0, Math.min(100, dval))) / 100);
        }
        couponDiscount = Math.min(couponDiscount, totalProductPrice);
      }
    } catch (_) {
      couponDiscount = 0;
    }

    // ✅ 최종 결제 금액 계산: (상품금액 + 배송비) - 쿠폰 - 포인트
    // 포인트와 쿠폰이 배송비까지 할인 가능하도록 수정
    const totalBeforeDiscount = totalProductPrice + shippingFee;
    order.total_price = Math.max(0, totalBeforeDiscount - couponDiscount - pointUsage);
  }
  
  return orders;
};

export const getPendingReviewItems = async (buyerId) => {
  const [rows] = await db.query(
    `SELECT oi.item_id, oi.order_id, oi.product_id, oi.quantity, oi.unit_price,
            o.order_name, o.created_at,
            p.name AS product_name, p.brand, p.imageUrl,
            DATE_FORMAT(o.created_at, '%Y.%m.%d') AS delivered_at
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.order_id
     JOIN products p ON oi.product_id = p.product_id
     LEFT JOIN reviews r ON r.order_item_id = oi.item_id AND r.buyer_id = o.buyer_id
     WHERE o.buyer_id = ?
       AND o.status = 'DELIVERED'
       AND r.review_id IS NULL
     ORDER BY o.created_at DESC`,
    [buyerId]
  );
  return rows;
};

// 특정 상태의 주문 조회
export const getOrdersByBuyerAndStatus = async (buyerId, status) => {
  const [orders] = await db.query(
    `SELECT o.order_id, o.order_name, o.total_price, o.status, o.created_at
     FROM orders o
     WHERE o.buyer_id = ? AND o.status = ?
     ORDER BY o.created_at DESC`,
    [buyerId, status]
  );
  
  // 각 주문의 상품 정보 가져오기 및 날짜/상태 포맷팅
  for (let order of orders) {
    const [items] = await db.query(
      `SELECT oi.*, p.name as product_name, p.brand, p.imageUrl, p.category,
              r.review_id
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.product_id
       LEFT JOIN reviews r ON r.order_item_id = oi.item_id
       WHERE oi.order_id = ?`,
      [order.order_id]
    );
    order.items = items;
    
    // ✅ 상태를 한글로 변환 (4가지만)
    const statusMap = {
      'PAID': '결제완료',
      'PROCESSING': '상품 준비중',
      'SHIPPED': '배송중',
      'DELIVERED': '배송완료'
    };
    order.status_kr = statusMap[order.status] || order.status;
    
    // 날짜를 YYYY.MM.DD 형식으로 변환
    if (order.created_at) {
      const date = new Date(order.created_at);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      order.created_at_formatted = `${year}.${month}.${day}`;
    }

    // ✅ 결제 정보 계산
    const totalProductPrice = items.reduce((sum, item) => 
      sum + (Number(item.unit_price) * Number(item.quantity)), 0
    );
    
    const shippingFee = 5000; // 배송비
    
    // ✅ 포인트 사용 금액 조회 (시간 기반 매칭)
    const [pointRows] = await db.query(
      `SELECT COALESCE(SUM(ABS(amount)), 0) AS used_points
       FROM points
       WHERE buyer_id = ?
         AND type = 'spend'
         AND description = '주문 사용'
         AND created_at BETWEEN DATE_SUB(?, INTERVAL 2 MINUTE) AND DATE_ADD(?, INTERVAL 2 MINUTE)`,
      [buyerId, order.created_at, order.created_at]
    );
    const pointUsage = Number(pointRows?.[0]?.used_points || 0);

    // ✅ 쿠폰 할인 금액 조회 (buyer_coupons → coupons, 시간 기반 매칭)
    let couponDiscount = 0;
    try {
      const [couponRows] = await db.query(
        `SELECT c.discount_type, c.discount_value
           FROM buyer_coupons bc
           JOIN coupons c ON bc.coupon_id = c.coupon_id
          WHERE bc.buyer_id = ?
            AND bc.is_used = TRUE
            AND bc.used_at BETWEEN DATE_SUB(?, INTERVAL 2 MINUTE) AND DATE_ADD(?, INTERVAL 2 MINUTE)
          ORDER BY bc.used_at DESC
          LIMIT 1`,
        [buyerId, order.created_at, order.created_at]
      );

      if (couponRows && couponRows.length) {
        const row = couponRows[0];
        const dtype = String(row.discount_type || '').toUpperCase();
        const dval = Number(row.discount_value || 0);
        if (dtype === 'FIXED') {
          couponDiscount = Math.max(0, dval);
        } else if (dtype === 'PERCENT' || dtype === 'PERCENTAGE') {
          couponDiscount = Math.floor((totalProductPrice * Math.max(0, Math.min(100, dval))) / 100);
        }
        couponDiscount = Math.min(couponDiscount, totalProductPrice);
      }
    } catch (_) {
      couponDiscount = 0;
    }

    // ✅ 최종 결제 금액 계산: (상품금액 + 배송비) - 쿠폰 - 포인트
    // 포인트와 쿠폰이 배송비까지 할인 가능하도록 수정
    const totalBeforeDiscount = totalProductPrice + shippingFee;
    order.total_price = Math.max(0, totalBeforeDiscount - couponDiscount - pointUsage);
  }
  
  return orders;
};

