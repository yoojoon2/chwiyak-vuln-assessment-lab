import express from "express";
import db from "../../config/db.js";
import { requireAuth } from "../../middleware/jwtAuth.js";

const router = express.Router();

/* =========================================
   ✅ 문의글 목록 조회 (로그인 필요)
   - 내 비밀글 + 다른 사람의 공개글만 표시
   - 비밀글일 경우 제목/내용 마스킹
   - 작성자 이름은 name 컬럼 사용
   ========================================= */
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.buyer_id || req.user?.seller_id;
    const userRole = req.user?.userType || req.user?.role; // ✅ userType 기반
    if (!userId || !userRole)
      return res.status(401).json({ message: "로그인이 필요합니다." });

    const [rows] = await db.query(`
      SELECT 
        sb.support_id,
        sb.title,
        sb.content,
        sb.answer,
        sb.is_answered,
        sb.is_private,
        sb.user_role,
        sb.user_id,
        sb.created_at,
        COALESCE(b.name, s.name) AS author_name
      FROM support_board sb
      LEFT JOIN buyer b ON (sb.user_role='buyer' AND sb.user_id=b.buyer_id)
      LEFT JOIN seller s ON (sb.user_role='seller' AND sb.user_id=s.seller_id)
      ORDER BY sb.support_id DESC
    `);

    // 접근 가능한 글만 필터링
    const visible = rows.filter(r => {
      // 비밀글이면 본인만 볼 수 있음
      if (
        r.is_private &&
        !(r.user_id === userId && r.user_role.toLowerCase() === String(userRole).toLowerCase())
      )
        return false;
      return true;
    });

    // 비밀글 제목/내용 마스킹 처리
    const sanitized = visible.map(r => {
      if (
        r.is_private &&
        !(r.user_id === userId && r.user_role.toLowerCase() === String(userRole).toLowerCase())
      ) {
        return {
          ...r,
          title: "비밀글입니다.",
          content: "",
          answer: "",
        };
      }
      return r;
    });

    res.status(200).json({ success: true, inquiries: sanitized });
  } catch (err) {
    console.error("❌ 문의 목록 조회 오류:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

/* =========================================
   ✅ 문의글 작성
   - 구매자 또는 판매자만 가능
   - is_private 지원 (비밀글 여부)
   ========================================= */
router.post("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.buyer_id || req.user?.seller_id;
    const userRole = req.user?.userType || req.user?.role;
    const { title, content, is_private } = req.body;

    if (!userId || !userRole)
      return res.status(401).json({ message: "로그인이 필요합니다." });

    if (!title || !content)
      return res.status(400).json({ message: "제목과 내용을 입력하세요." });

    const [result] = await db.query(
      `INSERT INTO support_board (user_role, user_id, title, content, is_private, is_answered, created_at)
       VALUES (?, ?, ?, ?, ?, 0, NOW())`,
      [userRole, userId, title.trim(), content.trim(), is_private ? 1 : 0]
    );

    res.status(201).json({
      success: true,
      message: "문의 등록 완료",
      support_id: result.insertId,
    });
  } catch (err) {
    console.error("❌ 문의 등록 오류:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

/* =========================================
   ✅ 문의글 상세 조회
   - 본인 글 or 다른 사람의 공개글만 접근 가능
   - 관리자 답변 있으면 같이 반환
   ========================================= */
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const boardId = req.params.id;
    const userId = req.user?.buyer_id || req.user?.seller_id;
    const userRole = req.user?.userType || req.user?.role;

    const [rows] = await db.query(`
      SELECT 
        sb.support_id,
        sb.title,
        sb.content,
        sb.answer,
        sb.is_answered,
        sb.is_private,
        sb.user_role,
        sb.user_id,
        sb.created_at,
        COALESCE(b.name, s.name) AS author_name
      FROM support_board sb
      LEFT JOIN buyer b ON (sb.user_role='buyer' AND sb.user_id=b.buyer_id)
      LEFT JOIN seller s ON (sb.user_role='seller' AND sb.user_id=s.seller_id)
      WHERE sb.support_id = ?
    `, [boardId]);

    if (!rows.length)
      return res.status(404).json({ message: "문의글을 찾을 수 없습니다." });

    const inquiry = rows[0];

    // 접근 권한 체크
    if (
      inquiry.is_private &&
      !(inquiry.user_id === userId &&
        inquiry.user_role.toLowerCase() === String(userRole).toLowerCase())
    ) {
      return res.status(403).json({ message: "비밀글 접근 권한이 없습니다." });
    }

    // 응답 구조
    res.status(200).json({
      success: true,
      support_id: inquiry.support_id,
      title: inquiry.title,
      content: inquiry.content,
      author_name: inquiry.author_name,
      created_at: inquiry.created_at,
      is_answered: inquiry.is_answered,
      answer: inquiry.is_answered ? inquiry.answer : null,
      user_id: inquiry.user_id,
      userType: inquiry.user_role,   // ✅ 필드명 userType 으로 반환
      is_private: inquiry.is_private,
    });
  } catch (err) {
    console.error("❌ 문의 상세 조회 오류:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

/* =========================================
   ✅ 문의글 수정 (본인만 가능, 답변 전만 가능)
   ========================================= */
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const boardId = req.params.id;
    const userId = req.user?.buyer_id || req.user?.seller_id;
    const userRole = req.user?.userType || req.user?.role;
    const { title, content, is_private } = req.body;


    if (!userId || !userRole)
      return res.status(401).json({ message: "로그인이 필요합니다." });

    if (!title || !content)
      return res.status(400).json({ message: "제목과 내용을 입력하세요." });

    // 기존 글 확인
    const [rows] = await db.query(
      `SELECT user_id, user_role, is_answered FROM support_board WHERE support_id = ?`,
      [boardId]
    );

    if (!rows.length)
      return res.status(404).json({ message: "문의글을 찾을 수 없습니다." });

    const inquiry = rows[0];

    console.log("🔍 [문의 수정 요청 비교]");
    console.log(" - DB user_id:", inquiry.user_id);
    console.log(" - JWT userId:", userId);
    console.log(" - DB user_role:", inquiry.user_role);
    console.log(" - JWT userRole:", userRole);

    // 작성자 본인 확인
    if (
        String(inquiry.user_id) !== String(userId) ||
        inquiry.user_role.trim().toLowerCase() !== String(userRole).trim().toLowerCase()
        ) {
        return res.status(403).json({ message: "본인이 작성한 글만 수정할 수 있습니다." });
    }

    // 답변이 달린 경우 수정 불가
    if (inquiry.is_answered) {
      return res.status(400).json({ message: "답변이 등록된 문의는 수정할 수 없습니다." });
    }

    // 수정 실행
    await db.query(
      `UPDATE support_board 
       SET title = ?, content = ?, is_private = ? 
       WHERE support_id = ?`,
      [title.trim(), content.trim(), is_private ? 1 : 0, boardId]
    );

    res.status(200).json({
      success: true,
      message: "문의가 수정되었습니다.",
    });
  } catch (err) {
    console.error("❌ 문의 수정 오류:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});


/* =========================================
   ✅ 문의글 삭제 (본인만 가능, 답변 전만 가능)
   ========================================= */
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const boardId = req.params.id;
    const userId = req.user?.buyer_id || req.user?.seller_id;
    const userRole = req.user?.userType || req.user?.role;

    if (!userId || !userRole)
      return res.status(401).json({ message: "로그인이 필요합니다." });

    // 기존 글 확인
    const [rows] = await db.query(
      `SELECT user_id, user_role, is_answered FROM support_board WHERE support_id = ?`,
      [boardId]
    );

    if (!rows.length)
      return res.status(404).json({ message: "문의글을 찾을 수 없습니다." });

    const inquiry = rows[0];

    console.log("🔍 [문의 삭제 요청 비교]");
    console.log(" - DB user_id:", inquiry.user_id);
    console.log(" - JWT userId:", userId);
    console.log(" - DB user_role:", inquiry.user_role);
    console.log(" - JWT userRole:", userRole);

    // 작성자 본인 확인
    if (
        String(inquiry.user_id) !== String(userId) ||
        inquiry.user_role.trim().toLowerCase() !== String(userRole).trim().toLowerCase()
    ) {
        return res.status(403).json({ message: "본인이 작성한 글만 삭제할 수 있습니다." });
    }

    // 답변이 달린 경우 삭제 불가
    if (inquiry.is_answered) {
      return res.status(400).json({ message: "답변이 등록된 문의는 삭제할 수 없습니다." });
    }

    // 삭제 실행
    await db.query(
      `DELETE FROM support_board WHERE support_id = ?`,
      [boardId]
    );

    res.status(200).json({
      success: true,
      message: "문의가 삭제되었습니다.",
    });
  } catch (err) {
    console.error("❌ 문의 삭제 오류:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});


export default router;
