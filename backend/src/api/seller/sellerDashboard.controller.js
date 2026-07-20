import db from "../../config/db.js";

export const getSellerDashboard = async (req, res) => {
  try {
    const sellerId = req.seller_id || req.seller?.seller_id || req.seller?.id;
    if (!sellerId) {
      return res.status(401).json({ message: "판매자 ID를 찾을 수 없습니다." });
    }

    const [[{ productCount }]] = await db.query(
      "SELECT COUNT(*) AS productCount FROM products WHERE seller_id = ?",
      [sellerId]
    );

    const [[{ pendingOrders }]] = await db.query(
      "SELECT COUNT(*) AS pendingOrders FROM orders WHERE status IN ('PENDING','PROCESSING')",
      []
    );

    const [[{ reviewCount }]] = await db.query(
      `SELECT COUNT(*) AS reviewCount
       FROM reviews r
       JOIN products p ON r.product_id = p.product_id
       WHERE p.seller_id = ?`,
      [sellerId]
    );

    res.status(200).json({
      productCount,
      pendingOrders,
      reviewCount,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};