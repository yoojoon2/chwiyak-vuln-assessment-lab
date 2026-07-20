// /backend/src/api/buyerCart/buyerCart.service.js

import * as model from "./buyerCart.model.js";

// 장바구니 목록 조회
export const getCart = async (buyerId) => {
    return await model.getCartItemsByBuyerId(buyerId);
};

// 장바구니에 상품 추가 또는 수량 업데이트
export const addOrUpdateCart = async (buyerId, productId, quantity = 1) => {
  const q = Number(quantity);
  if (!productId || Number.isNaN(q) || q < 1) {
    throw new Error("상품 ID와 수량은 필수입니다.");
  }

  const existingItem = await model.findCartItem(buyerId, productId);

  if (existingItem) {
    const newQuantity = Number(existingItem.quantity) + q;
    await model.updateCartItemQuantity(existingItem.cart_item_id, newQuantity);
    const snapshot = await model.getCartItemById(buyerId, existingItem.cart_item_id);
    return { message: "수량 증가", status: "updated", snapshot };
  } else {
    const insertId = await model.createCartItem(buyerId, productId, q);
    const snapshot = await model.getCartItemSnapshot(buyerId, productId);
    return {
      message: "장바구니에 상품이 추가되었습니다.",
      status: "inserted",
      cart_item_id: insertId,
      snapshot
    };
  }
};

// 장바구니 상품 수량 변경
export const updateQuantity = async (buyerId, cartItemId, quantity) => {
  const q = Number(quantity);
  if (Number.isNaN(q) || q < 1) {
    throw new Error("수량은 1 이상이어야 합니다.");
  }

  const ok = await model.updateCartItemQuantity(cartItemId, q);
  if (!ok) throw new Error("수량 변경 실패");

  const snapshot = await model.getCartItemById(buyerId, cartItemId);
  if (!snapshot) throw new Error("본인 항목이 아니거나 존재하지 않습니다.");

  return { message: "수량이 변경되었습니다.", snapshot };
};

// 장바구니 항목 삭제
export const removeItem = async (buyerId, cartItemId) => {
    const success = await model.deleteCartItem(buyerId, cartItemId);
    if (!success) throw new Error("상품을 삭제하지 못했습니다.");
    return { message: "상품이 장바구니에서 삭제되었습니다." };
};

// 선택된 장바구니 항목들 삭제
export const removeSelected = async (buyerId, cartItemIds) => {
  if (!Array.isArray(cartItemIds) || cartItemIds.length === 0) {
    throw new Error("삭제할 항목이 없습니다.");
  }

  const deletedCount = await model.deleteCartItems(buyerId, cartItemIds);
  if (deletedCount === 0) {
    throw new Error("삭제된 항목이 없습니다.");
  }

  return { message: `${deletedCount}개의 상품이 삭제되었습니다.` };
};
