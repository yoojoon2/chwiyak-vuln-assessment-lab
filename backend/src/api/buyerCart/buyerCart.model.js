// /backend/src/api/buyerCart/buyerCart.model.js

import db from "../../config/db.js";

// 구매자의 전체 장바구니 목록 조회 (상품 정보 포함)
export const getCartItemsByBuyerId = async (buyerId) => {
  const [rows] = await db.query(
    `SELECT 
        ci.cart_item_id, 
        ci.quantity,
        p.product_id, 
        p.name, 
        p.price, 
        p.imageUrl,
        p.brand
     FROM cart_items ci
     JOIN products p ON ci.product_id = p.product_id
     WHERE ci.buyer_id = ?
     ORDER BY ci.cart_item_id DESC`,
    [buyerId]
  );
  return rows;
};

// 장바구니에 특정 상품이 있는지 확인
export const findCartItem = async (buyerId, productId) => {
  const [rows] = await db.query(
    "SELECT * FROM cart_items WHERE buyer_id = ? AND product_id = ?",
    [buyerId, productId]
  );
  return rows[0];
};

// 장바구니에 새 상품 추가
export const createCartItem = async (buyerId, productId, quantity) => {
  const [result] = await db.query(
    "INSERT INTO cart_items (buyer_id, product_id, quantity) VALUES (?, ?, ?)",
    [buyerId, productId, quantity]
  );
  return result.insertId;
};

// 장바구니 상품 수량 변경
export const updateCartItemQuantity = async (cartItemId, quantity) => {
  const [result] = await db.query(
    "UPDATE cart_items SET quantity = ? WHERE cart_item_id = ?",
    [quantity, cartItemId]
  );
  return result.affectedRows > 0;
};

// 장바구니 항목 삭제
export const deleteCartItem = async (buyerId, cartItemId) => {
    const [result] = await db.query(
        "DELETE FROM cart_items WHERE buyer_id = ? AND cart_item_id = ?",
        [buyerId, cartItemId]
    );
    return result.affectedRows > 0;
};


// 특정 상품의 장바구니 항목(조인 포함) 스냅샷 검증용입니다. 끝나면 삭제
export const getCartItemSnapshot = async (buyerId, productId) => {
  const [rows] = await db.query(
    `SELECT ci.cart_item_id, ci.buyer_id, ci.product_id, ci.quantity,
            p.name, p.price, p.brand, p.imageUrl
     FROM cart_items ci
     JOIN products p ON p.product_id = ci.product_id
     WHERE ci.buyer_id = ? AND ci.product_id = ?`,
    [buyerId, productId]
  );
  return rows[0] || null;
};



// cart_item_id 기준 스냅샷 (본인 소유 검증 포함)  검증용입니다. 끝나면 삭제
export const getCartItemById = async (buyerId, cartItemId) => {
  const [rows] = await db.query(
    `SELECT ci.cart_item_id, ci.buyer_id, ci.product_id, ci.quantity,
            p.name, p.price, p.brand, p.imageUrl
     FROM cart_items ci
     JOIN products p ON p.product_id = ci.product_id
     WHERE ci.cart_item_id = ? AND ci.buyer_id = ?`,
    [cartItemId, buyerId]
  );
  return rows[0] || null;
};

// 여러 항목 삭제
export const deleteCartItems = async (buyerId, cartItemIds = []) => {
  if (!Array.isArray(cartItemIds) || cartItemIds.length === 0) return 0;

  const placeholders = cartItemIds.map(() => "?").join(", ");
  const [result] = await db.query(
    `DELETE FROM cart_items WHERE buyer_id = ? AND cart_item_id IN (${placeholders})`,
    [buyerId, ...cartItemIds]
  );

  return result.affectedRows || 0;
};
