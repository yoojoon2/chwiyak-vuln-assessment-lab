import db from "../../config/db.js";
import * as orderService from "./order.service.js";

export const checkoutOrder = async (req, res) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    const userId = req.user.id; // 인증 미들웨어에서 설정된 사용자 ID
    const { items, address, use_points, buyer_coupon_id, payment_method, total_amount } = req.body;

    // 필수 필드 검증
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "주문 항목이 비어 있습니다." });
    }

    if (!address || !address.zipcode || !address.address1) {
      return res.status(400).json({ message: "배송지 정보가 올바르지 않습니다." });
    }

    // 주소 저장 및 기본 주소로 설정
    let addressId;
    
    // 기존 기본 주소가 있는지 확인
    const [existingAddresses] = await connection.query(
      `SELECT address_id FROM addresses WHERE user_id = ? AND is_default = 1`,
      [userId]
    );
    
    if (existingAddresses.length > 0) {
      // 기존 주소가 있으면 업데이트
      const [updateResult] = await connection.query(
        `UPDATE addresses 
         SET zipcode = ?, address1 = ?, address2 = ?, is_default = 1 
         WHERE user_id = ? AND is_default = 1`,
        [address.zipcode, address.address1, address.address2 || null, userId]
      );
      addressId = existingAddresses[0].address_id;
    } else {
      // 새로운 주소 추가
      const [insertResult] = await connection.query(
        `INSERT INTO addresses (user_id, zipcode, address1, address2, is_default) 
         VALUES (?, ?, ?, ?, 1)`,
        [userId, address.zipcode, address.address1, address.address2 || null]
      );
      addressId = insertResult.insertId;
    }

    // 주문 생성
    const orderId = await orderService.createOrder(
      userId,
      addressId,
      req.body.order_name || `주문_${new Date().getTime()}`,
      total_amount
    );

    // 주문 항목 추가
    for (const item of items) {
      await orderService.addOrderItem(
        orderId,
        item.product_id,
        item.quantity,
        item.unit_price
      );
    }

    // 포인트 사용 처리
    if (use_points && use_points > 0) {
      await orderService.usePoints(userId, orderId, use_points);
    }

    // 쿠폰 사용 처리
    if (buyer_coupon_id) {
      await orderService.useCoupon(userId, buyer_coupon_id, orderId);
    }

    await connection.commit();
    
    res.status(201).json({
      ok: true,
      order_id: orderId,
      message: "주문이 성공적으로 생성되었습니다."
    });

  } catch (error) {
    await connection.rollback();
    console.error("주문 생성 오류:", error);
    res.status(500).json({ 
      ok: false,
      message: error.message || "주문 처리 중 오류가 발생했습니다." 
    });
  } finally {
    connection.release();
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    const validStatuses = [
      "PENDING",
      "PROCESSING",
      "SHIPPING",
      "COMPLETED",
      "CANCELLED",
    ];
    if (!validStatuses.includes(status))
      return res.status(400).json({ message: "잘못된 상태값입니다." });

    const [result] = await db.query(
      `UPDATE orders SET status = ?, updated_at = NOW() WHERE order_id = ?`,
      [status, orderId]
    );

    if (!result.affectedRows)
      return res.status(404).json({ message: "주문을 찾을 수 없습니다." });

    res.status(200).json({ message: "주문 상태 변경 완료", status });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
