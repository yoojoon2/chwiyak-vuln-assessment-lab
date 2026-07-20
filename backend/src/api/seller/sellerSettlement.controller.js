import db from "../../config/db.js";

// 📌 정산 계좌 등록 또는 수정
export const createSettlementAccount = async (req, res) => {
  try {
    const sellerId = req.seller_id || req.seller?.seller_id || req.seller?.id;
    if (!sellerId) {
      return res.status(401).json({ message: "판매자 ID를 찾을 수 없습니다." });
    }
    
    const { bank_name, account_number, account_holder } = req.body;

    if (!bank_name || !account_number || !account_holder)
      return res.status(400).json({ message: "은행명, 계좌번호, 예금주는 필수입니다." });

    const [existing] = await db.query(
      `SELECT settlement_id FROM seller_settlement WHERE seller_id = ?`,
      [sellerId]
    );

    if (existing.length) {
      await db.query(
        `UPDATE seller_settlement
         SET bank_name = ?, account_number = ?, account_holder = ?, updated_at = NOW()
         WHERE seller_id = ?`,
        [bank_name, account_number, account_holder, sellerId]
      );
    } else {
      await db.query(
        `INSERT INTO seller_settlement (seller_id, bank_name, account_number, account_holder)
         VALUES (?, ?, ?, ?)`,
        [sellerId, bank_name, account_number, account_holder]
      );
    }

    res.status(200).json({ message: "정산 계좌 등록/수정 완료" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 정산 계좌 조회
export const getSettlementAccount = async (req, res) => {
  try {
    const sellerId = req.seller_id || req.seller?.seller_id || req.seller?.id;
    if (!sellerId) {
      return res.status(401).json({ message: "판매자 ID를 찾을 수 없습니다." });
    }
    
    const [rows] = await db.query(
      `SELECT bank_name, account_number, account_holder, updated_at
       FROM seller_settlement WHERE seller_id = ?`,
      [sellerId]
    );

    if (!rows.length)
      return res.status(404).json({ message: "등록된 계좌가 없습니다." });

    res.status(200).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};