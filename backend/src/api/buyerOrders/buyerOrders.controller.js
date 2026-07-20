// src/api/buyerOrders/buyerOrders.controller.js
import * as service from "./buyerOrders.service.js";
import db from "../../config/db.js";
import { getPointBalance } from "../buyerPoints/buyerPoints.model.js";
import { getUserCouponById } from "../buyerCoupons/buyerCoupons.model.js";

export const getPendingReviews = async (req, res) => {
  try {
    const buyerId = req?.buyer?.buyer_id;
    if (!buyerId) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }

    const items = await service.getPendingReviewItems(buyerId);
    res.status(200).json(items);
  } catch (err) {
    console.error("리뷰 대기 목록 조회 오류:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getOrders = async (req, res) => {
  try {
    const buyerId = req?.buyer?.buyer_id;
    const status = req.query.status;
    
    let orders;
    if (status) {
      orders = await service.getBuyerOrdersByStatus(buyerId, status);
    } else {
      orders = await service.getBuyerOrders(buyerId);
    }
    
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const checkout = async (req, res) => {
  const buyerId = req?.buyer?.buyer_id || req?.buyer_id;
  if (!buyerId) return res.status(401).json({ message: "UNAUTHORIZED" });

  try {
    const {
      order_name,
      items,
      use_points = 0,
      buyer_coupon_id = null,
      payment_method,
      shipping_address,
    } = req.body || {};

    if (!order_name || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "INVALID_PAYLOAD" });
    }

    if (!shipping_address || !shipping_address.zipcode || !shipping_address.address) {
      return res.status(400).json({ message: "SHIPPING_ADDRESS_REQUIRED" });
    }

    // ✅ buyer 정보 조회 (기본값으로 사용)
    const [buyers] = await db.query(
      'SELECT name, phone FROM buyer WHERE buyer_id = ?',
      [buyerId]
    );
    const buyerInfo = buyers[0] || { name: '구매자', phone: '010-0000-0000' };

    // ✅ 보안 강화: 서버에서 실제 상품 가격 조회 및 검증
    let itemsTotal = 0;
    const validatedItems = [];
    
    for (const item of items) {
      const productId = Number(item?.product_id);
      const quantity = Number(item?.quantity || 0);
      
      if (!productId || quantity <= 0) {
        continue; // 잘못된 항목은 건너뜀
      }
      
      // DB에서 실제 상품 가격 조회
      const [products] = await db.query(
        'SELECT product_id, name, price FROM products WHERE product_id = ?',
        [productId]
      );
      
      if (products.length === 0) {
        return res.status(400).json({ 
          message: `상품을 찾을 수 없습니다. (product_id: ${productId})` 
        });
      }
      
      const actualPrice = Number(products[0].price);
      
      // ⚠️ 보안 로그: 클라이언트가 보낸 가격과 실제 가격 비교
      if (item.unit_price && Number(item.unit_price) !== actualPrice) {
        console.warn(
          `[보안 경고] 가격 불일치 감지!\n` +
          `  - buyer_id: ${buyerId}\n` +
          `  - product_id: ${productId}\n` +
          `  - 클라이언트 가격: ${item.unit_price}\n` +
          `  - 실제 가격: ${actualPrice}\n` +
          `  - IP: ${req.ip || req.connection.remoteAddress}`
        );
      }
      
      // ✅ 서버에서 조회한 실제 가격으로만 계산
      itemsTotal += actualPrice * quantity;
      
      validatedItems.push({
        product_id: productId,
        product_name: products[0].product_name,
        quantity: quantity,
        unit_price: actualPrice  // 실제 가격으로 덮어씀
      });
    }

    if (itemsTotal <= 0 || validatedItems.length === 0) {
      return res.status(400).json({ message: "INVALID_ITEMS_TOTAL" });
    }

    // ✅ 배송비 추가
    const shippingFee = 5000;

    // 쿠폰 할인 계산 (상품 금액에만 적용)
    let couponDiscount = 0;
    let couponRow = null;
    if (buyer_coupon_id) {
      couponRow = await getUserCouponById(buyerId, buyer_coupon_id);
      if (!couponRow) return res.status(400).json({ message: "NOT_FOUND_COUPON" });
      if (couponRow.is_used) return res.status(400).json({ message: "ALREADY_USED_COUPON" });

      const minAmount = Number(couponRow.min_order_amount || 0);
      if (itemsTotal < minAmount) {
        return res.status(400).json({ message: "MIN_AMOUNT_NOT_MET" });
      }

      if (couponRow.discount_type === "fixed") {
        couponDiscount = Math.max(0, Number(couponRow.discount_value || 0));
      } else if (couponRow.discount_type === "percentage") {
        const pct = Math.max(0, Math.min(100, Number(couponRow.discount_value || 0)));
        couponDiscount = Math.floor((itemsTotal * pct) / 100);
      }
      couponDiscount = Math.min(couponDiscount, itemsTotal);
    }

    // ✅ 배송비 포함한 총액 계산 (쿠폰 적용 후)
    const totalWithShipping = Math.max(0, itemsTotal + shippingFee - couponDiscount);

    // 포인트 한도 검증
    const wantUsePoints = Math.max(0, Number(use_points || 0));
    const pointBalance = await getPointBalance(buyerId);
    if (wantUsePoints > pointBalance) {
      return res.status(400).json({ message: "INSUFFICIENT_POINTS" });
    }
    
    // ✅ 포인트는 배송비 포함 금액에서 차감 가능
    const usePoints = Math.min(wantUsePoints, totalWithShipping);
    const finalTotal = Math.max(0, totalWithShipping - usePoints);

    // 트랜잭션 시작
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // ✅ 1단계: 주소 먼저 저장 (buyer 정보를 기본값으로 사용)
      const [addressResult] = await conn.query(
        `INSERT INTO buyer_address (buyer_id, recipient, phone, postal_code, address_line1, address_line2, is_default)
         VALUES (?, ?, ?, ?, ?, ?, FALSE)`,
        [
          buyerId,
          shipping_address.recipient_name || buyerInfo.name,
          shipping_address.recipient_phone || buyerInfo.phone,
          shipping_address.zipcode,
          shipping_address.address,
          shipping_address.address_detail || ''
        ]
      );
      const addressId = addressResult.insertId;

      // ✅ 2단계: 주문 생성 (배송비 포함된 최종 금액)
      const [orderResult] = await conn.query(
        `INSERT INTO orders (buyer_id, address_id, order_name, total_price, status, created_at)
         VALUES (?, ?, ?, ?, 'PAID', NOW())`,
        [buyerId, addressId, order_name, Number(finalTotal)]
      );
      const orderId = orderResult.insertId;

      // ✅ 주문 항목 저장 (검증된 데이터 사용)
      for (const validItem of validatedItems) {
        await conn.query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
           VALUES (?, ?, ?, ?)`,
          [orderId, validItem.product_id, validItem.quantity, validItem.unit_price]
        );
      }

      // 포인트 차감 기록
      if (usePoints > 0) {
        await conn.query(
          `INSERT INTO points (buyer_id, amount, description, type, created_at)
           VALUES (?, ?, '주문 사용', 'spend', NOW())`,
          [buyerId, -usePoints]
        );
      }

      // 쿠폰 사용 처리
      if (couponRow) {
        const [ret] = await conn.query(
          `UPDATE buyer_coupons
              SET is_used = TRUE, used_at = NOW()
            WHERE buyer_coupon_id = ? AND buyer_id = ? AND is_used = FALSE`,
          [buyer_coupon_id, buyerId]
        );
        if (!ret.affectedRows) {
          throw new Error("COUPON_ALREADY_USED_OR_DELETED");
        }
      }

      // ✅ 장바구니에서 구매한 상품 제거 (검증된 상품만)
      try {
        const purchasedIds = validatedItems.map(item => item.product_id);
        if (purchasedIds.length > 0) {
          const placeholders = purchasedIds.map(() => '?').join(',');
          await conn.query(
            `DELETE FROM cart_items WHERE buyer_id = ? AND product_id IN (${placeholders})`,
            [buyerId, ...purchasedIds]
          );
        }
      } catch (cartErr) {
        console.warn('장바구니 정리 중 경고:', cartErr?.message || cartErr);
      }

      // ✅ 포인트 적립 (최종 결제 금액의 1%)
      const earnPoints = Math.floor(Number(finalTotal) * 0.01);
      if (earnPoints > 0) {
        await conn.query(
          `INSERT INTO points (buyer_id, amount, description, type, created_at)
           VALUES (?, ?, '주문 적립', 'earn', NOW())`,
          [buyerId, earnPoints]
        );
      }

      await conn.commit();

      return res.status(201).json({
        ok: true,
        order_id: orderId,
        redirect: "/frontend/pages/mypage/mypage.html",
        paid_total: finalTotal,
        used_points: usePoints,
        coupon_discount: couponDiscount,
      });
    } catch (txErr) {
      await conn.rollback();
      return res.status(500).json({ message: txErr.message || "CHECKOUT_FAILED" });
    } finally {
      conn.release();
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


// ✅ 주문 상세 조회 함수 - 회원 정보 우선 표시
export const getOrderDetail = async (req, res) => {
  try {
    const buyerId = req.buyer.buyer_id;
    const { orderId } = req.params;

    console.log('📦 주문 상세 조회:', { buyerId, orderId });

    // ✅ buyer 테이블도 JOIN하여 회원 정보 확보
    const [orders] = await db.query(
      `SELECT o.*,
              b.name as buyer_name,
              b.phone as buyer_phone,
              b.email as buyer_email,
              ba.postal_code,
              ba.address_line1,
              ba.address_line2,
              ba.recipient,
              ba.phone as address_phone
       FROM orders o
       JOIN buyer b ON o.buyer_id = b.buyer_id
       LEFT JOIN buyer_address ba ON o.address_id = ba.address_id
       WHERE o.order_id = ? AND o.buyer_id = ?`,
      [orderId, buyerId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }

    const order = orders[0];
    
    console.log('📦 주문 원본 데이터:', {
      order_id: order.order_id,
      buyer_name: order.buyer_name,
      buyer_phone: order.buyer_phone,
      recipient: order.recipient,
      address_phone: order.address_phone
    });

    // 주문 상품 정보
    const [items] = await db.query(
      `SELECT oi.*, p.name as product_name, p.brand, p.imageUrl, p.category
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.product_id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    order.items = items;

    // 상태 한글 변환
    const statusMap = {
      'PAID': '결제완료',
      'PROCESSING': '상품 준비중',
      'SHIPPED': '배송중',
      'DELIVERED': '배송완료'
    };
    order.status_kr = statusMap[order.status] || order.status;

    // ✅ 배송 정보 - 항상 회원 정보 사용 (결제 페이지와 동일하게)
    order.shipping_address = {
      recipient_name: order.buyer_name || '수령인',
      recipient_phone: order.buyer_phone || '-',
      zipcode: order.postal_code || '-',
      address: order.address_line1 || '주소 정보 없음',
      address_detail: order.address_line2 || '',
      delivery_message: order.delivery_message || order.shipping_memo || '요청사항 없음'
    };

    console.log('✅ 최종 배송 정보 (회원정보 사용):', order.shipping_address);

    // 결제 정보 계산
    const totalProductPrice = items.reduce((sum, item) => 
      sum + (Number(item.unit_price) * Number(item.quantity)), 0
    );
    
    const shippingFee = 5000;
    
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

    order.product_amount = totalProductPrice;
    order.delivery_fee = shippingFee;
    order.coupon_discount = couponDiscount;
    order.point_usage = pointUsage;
    
    // ✅ 최종 결제 금액: (상품금액 + 배송비) - 쿠폰 - 포인트
    const totalBeforeDiscount = totalProductPrice + shippingFee;
    order.total_price = Math.max(0, totalBeforeDiscount - couponDiscount - pointUsage);

    console.log('✅ 주문 상세 조회 성공');
    res.json(order);
    
  } catch (error) {
    console.error('❌ 주문 상세 조회 오류:', error);
    res.status(500).json({ 
      message: '주문 상세 조회 실패', 
      error: error.message 
    });
  }
};
