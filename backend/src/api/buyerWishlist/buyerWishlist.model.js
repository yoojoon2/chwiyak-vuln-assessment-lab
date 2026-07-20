import db from "../../config/db.js";

export const getWishlist = async (buyerId) => {
  const [rows] = await db.query(
    `SELECT w.wishlist_id, w.product_id, p.name, p.brand, p.price, p.imageUrl, w.created_at 
     FROM wishlists w 
     JOIN products p ON w.product_id = p.product_id 
     WHERE w.buyer_id = ? ORDER BY w.created_at DESC`,
    [buyerId]
  );
  return rows;
};

export const getWishlistItem = async (buyerId, productId) => {
  const [rows] = await db.query(
    `SELECT w.wishlist_id, w.buyer_id, w.product_id, w.created_at,
            p.name, p.brand, p.price, p.imageUrl
     FROM wishlists w
     JOIN products p ON p.product_id = w.product_id
     WHERE w.buyer_id = ? AND w.product_id = ?`,
    [buyerId, productId]
  );
  return rows[0] || null;
};

export const addWishlist = async (buyerId, productId) => {
  const [result] = await db.query(
    "INSERT IGNORE INTO wishlists (buyer_id, product_id, created_at) VALUES (?, ?, NOW())",
    [buyerId, productId]
  );
  return result.affectedRows; // 1=신규 삽입, 0=이미 존재
};

export const removeWishlist = async (buyerId, productId) => {
  const [result] = await db.query(
    "DELETE FROM wishlists WHERE buyer_id = ? AND product_id = ?",
    [buyerId, productId]
  );
  return result.affectedRows > 0;
};
