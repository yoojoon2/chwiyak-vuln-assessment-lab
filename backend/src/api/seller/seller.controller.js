import db from "../../config/db.js";

// 판매자 프로필 수정
export const updateSellerProfile = async (req, res) => {
  try {
    const sellerId = req.seller_id || req.seller?.seller_id || req.seller?.id;
    if (!sellerId) {
      return res.status(401).json({ message: "판매자 ID를 찾을 수 없습니다." });
    }
    
    const { name, email, phone, introduction } = req.body;

    const [result] = await db.query(
      `UPDATE seller
       SET name = ?, email = ?, phone = ?, introduction = ?, updated_at = NOW()
       WHERE seller_id = ?`,
      [name, email, phone, introduction, sellerId]
    );

    if (!result.affectedRows)
      return res.status(404).json({ message: "판매자 정보를 찾을 수 없습니다." });

    res.status(200).json({ message: "프로필 수정 완료" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};