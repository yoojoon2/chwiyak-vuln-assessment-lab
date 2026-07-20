  // ✅ /backend/src/api/notice/notice.js
  import express from "express";
  import db from "../../config/db.js";

  const router = express.Router();

  /* ------------------------------ 공지사항 목록 조회 ------------------------------ */
  router.get("/", async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT 
            n.notice_id, 
            n.title, 
            LEFT(n.content, 300) AS preview,
            a.name AS admin_name, 
            n.created_at
        FROM notice n
        JOIN admin a ON n.admin_id = a.admin_id
        ORDER BY n.created_at DESC`
      );
      res.json({ success: true, notices: rows });
    } catch (err) {
      console.error("공지사항 목록 오류:", err);
      res.json({ success: false, message: "DB 오류로 목록 조회 실패" });
    }
  });

  /* ------------------------------ 공지사항 단일 조회 ------------------------------ */
  router.get("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await db.query(
        `SELECT 
            n.notice_id, 
            n.title, 
            n.content, 
            a.username AS admin_name, 
            n.created_at
        FROM notice n
        JOIN admin a ON n.admin_id = a.admin_id
        WHERE n.notice_id = ?`,
        [id]
      );

      if (rows.length === 0)
        return res.json({ success: false, message: "공지사항을 찾을 수 없습니다." });

      res.json({ success: true, notice: rows[0] });
    } catch (err) {
      console.error("공지사항 단일 조회 오류:", err);
      res.json({ success: false, message: "DB 오류로 조회 실패" });
    }
  });

  export default router; // ✅ ES Module 스타일로 변경
