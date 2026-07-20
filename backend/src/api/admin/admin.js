import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import pool from "../../config/db.js";
import { verifyAdminToken } from "../../middleware/adminAuth.js";
import { sanitizeText, sanitizeHTML, validateLength, containsSQLInjection } from '../../utils/sanitizer.js';

dotenv.config();
const router = express.Router();

const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set');
}

/* ------------------------------ 관리자 로그인 ------------------------------ */
// admin.js - login 라우트 (18번 라인부터)

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.json({ success: false, message: "아이디와 비밀번호를 입력해주세요." });

    const [rows] = await pool.query("SELECT * FROM admin WHERE username = ?", [username]);
    if (rows.length === 0)
      return res.json({ success: false, message: "존재하지 않는 관리자입니다." });

    const admin = rows[0];
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid)
      return res.json({ success: false, message: "비밀번호가 올바르지 않습니다." });

    // [수정 후] ✅ userType -> role 변경
    const token = jwt.sign(
      { 
        admin_id: admin.admin_id, 
        username: admin.username, 
        name: admin.name, 
        role: "admin" // 여기서 'role'로 저장해야 미들웨어가 알아봅니다.
      },
      SECRET_KEY,
      { expiresIn: "30m" }
    );

    // ✅ httpOnly 쿠키로 토큰 설정
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 30 * 60 * 1000,
      path: '/'  // ✅ path 추가
    });

    return res.json({
      success: true,
      message: "관리자 로그인 성공",
      // ✅ token 필드 제거됨
      admin_id: admin.admin_id,
      admin: { name: admin.name, username: admin.username },
    });
  } catch (err) {
    console.error("관리자 로그인 오류:", err);
    res.json({ success: false, message: "서버 오류 (로그인 실패)" });
  }
});

/* ------------------------------ 회원 목록 조회 ------------------------------ */
router.get("/users", verifyAdminToken, async (req, res) => {
  try {
    const sql = `
      SELECT 
        buyer_id AS id,
        'buyer' AS role,
        username,
        name,
        email,
        phone,
        created_at,
        is_active,
        NULL AS company_name,
        NULL AS business_reg_no
      FROM buyer

      UNION ALL

      SELECT 
        seller_id AS id,
        'seller' AS role,
        username,
        name,
        email,
        phone,
        created_at,
        is_active,
        company_name,
        business_reg_no
      FROM seller

      ORDER BY created_at DESC
    `;

    const [rows] = await pool.query(sql);
    res.json({ success: true, users: rows });
  } catch (err) {
    console.error("회원 목록 불러오기 오류:", err);
    res.json({ success: false, message: "회원 목록 조회 실패", error: err.message });
  }
});

/* ------------------------------ 회원 상태 변경 ------------------------------ */
router.patch("/users/:id/is_active", verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, is_active } = req.body;
    if (!role || typeof is_active === "undefined")
      return res.json({ success: false, message: "요청 데이터 누락" });

    const table = role === "seller" ? "seller" : "buyer";
    const key = role === "seller" ? "seller_id" : "buyer_id";

    const [result] = await pool.query(`UPDATE ${table} SET is_active = ? WHERE ${key} = ?`, [is_active, id]);
    if (result.affectedRows === 0)
      return res.json({ success: false, message: "해당 회원을 찾을 수 없습니다." });

    res.json({ success: true, message: `회원이 ${is_active ? "활성화" : "정지"}되었습니다.` });
  } catch (err) {
    console.error("회원 상태 변경 오류:", err);
    res.json({ success: false, message: "상태 변경 실패" });
  }
});

/* ------------------------------ 회원 삭제 ------------------------------ */
router.delete("/users/:id", verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!role) return res.json({ success: false, message: "회원 구분(role)이 필요합니다." });

    const table = role === "seller" ? "seller" : "buyer";
    const key = role === "seller" ? "seller_id" : "buyer_id";

    const [result] = await pool.query(`DELETE FROM ${table} WHERE ${key} = ?`, [id]);
    if (result.affectedRows === 0)
      return res.json({ success: false, message: "삭제할 회원을 찾을 수 없습니다." });

    res.json({ success: true, message: "회원이 삭제되었습니다." });
  } catch (err) {
    console.error("회원 삭제 오류:", err);
    res.json({ success: false, message: "DB 오류로 삭제 실패" });
  }
});

/* ------------------------------ ✅ 공지사항 작성 (XSS 방어 적용) ------------------------------ */
router.post("/notice", verifyAdminToken, async (req, res) => {
  try {
    const { title, content } = req.body;
    const { admin_id } = req.admin;
    if (!title || !content)
      return res.json({ success: false, message: "제목과 내용을 모두 입력하세요." });

    // ========================================
    // 🛡️ XSS 방어: 입력값 검증 및 Sanitize
    // ========================================
    
    // 🔥 1. 강제 XSS 패턴 차단
    if (title.includes('<') || title.includes('>') || title.includes('script') || title.includes('onerror')) {
      return res.json({ success: false, message: "제목에 허용되지 않는 문자가 포함되어 있습니다." });
    }
    
    if (content.includes('onerror') || content.includes('javascript:') || content.includes('onclick') || content.includes('onload')) {
      return res.json({ success: false, message: "내용에 허용되지 않는 문자가 포함되어 있습니다." });
    }

    // 2. 길이 검증
    if (!validateLength(title, 200)) {
      return res.json({ success: false, message: "제목은 200자를 초과할 수 없습니다." });
    }
    
    if (!validateLength(content, 10000)) {
      return res.json({ success: false, message: "내용은 10000자를 초과할 수 없습니다." });
    }

    // 3. XSS 방어: Sanitize 처리
    const sanitizedTitle = sanitizeText(title);
    const sanitizedContent = sanitizeHTML(content);

    await pool.query("INSERT INTO notice (title, content, admin_id) VALUES (?, ?, ?)", [
      sanitizedTitle,
      sanitizedContent,
      admin_id,
    ]);

    res.json({ success: true, message: "공지사항이 등록되었습니다." });
  } catch (err) {
    console.error("공지사항 등록 오류:", err);
    res.json({ success: false, message: "DB 오류로 등록 실패" });
  }
});

/* ------------------------------ 공지사항 목록 조회 ------------------------------ */
router.get("/notice", verifyAdminToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT n.notice_id, n.title, n.content, a.username AS admin_name, n.created_at
      FROM notice n
      JOIN admin a ON n.admin_id = a.admin_id
      ORDER BY n.created_at DESC
    `);
    res.json({ success: true, notices: rows });
  } catch (err) {
    console.error("공지 목록 오류:", err);
    res.json({ success: false, message: "DB 오류로 목록 조회 실패" });
  }
});

/* ------------------------------ ✅ 공지사항 수정 (XSS 방어 적용) ------------------------------ */
router.patch("/notice/:id", verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    if (!title || !content)
      return res.json({ success: false, message: "제목과 내용을 모두 입력하세요." });

    // ========================================
    // 🛡️ XSS 방어: 입력값 검증 및 Sanitize
    // ========================================
    
    // 🔥 1. 강제 XSS 패턴 차단
    if (title.includes('<') || title.includes('>') || title.includes('script') || title.includes('onerror')) {
      return res.json({ success: false, message: "제목에 허용되지 않는 문자가 포함되어 있습니다." });
    }
    
    if (content.includes('onerror') || content.includes('javascript:') || content.includes('onclick') || content.includes('onload')) {
      return res.json({ success: false, message: "내용에 허용되지 않는 문자가 포함되어 있습니다." });
    }

    // 2. 길이 검증
    if (!validateLength(title, 200)) {
      return res.json({ success: false, message: "제목은 200자를 초과할 수 없습니다." });
    }
    
    if (!validateLength(content, 10000)) {
      return res.json({ success: false, message: "내용은 10000자를 초과할 수 없습니다." });
    }

    // 3. XSS 방어: Sanitize 처리
    const sanitizedTitle = sanitizeText(title);
    const sanitizedContent = sanitizeHTML(content);

    const [result] = await pool.query("UPDATE notice SET title = ?, content = ? WHERE notice_id = ?", [
      sanitizedTitle,
      sanitizedContent,
      id,
    ]);

    if (result.affectedRows === 0)
      return res.json({ success: false, message: "해당 공지를 찾을 수 없습니다." });

    res.json({ success: true, message: "공지사항이 수정되었습니다." });
  } catch (err) {
    console.error("공지 수정 오류:", err);
    res.json({ success: false, message: "DB 오류로 수정 실패" });
  }
});

/* ------------------------------ 공지사항 삭제 ------------------------------ */
router.delete("/notice/:id", verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query("DELETE FROM notice WHERE notice_id = ?", [id]);
    if (result.affectedRows === 0)
      return res.json({ success: false, message: "삭제할 공지를 찾을 수 없습니다." });

    res.json({ success: true, message: "공지사항이 삭제되었습니다." });
  } catch (err) {
    console.error("공지 삭제 오류:", err);
    res.json({ success: false, message: "DB 오류로 삭제 실패" });
  }
});

/* ------------------------------ 문의사항 관리 ------------------------------ */
router.get("/support", verifyAdminToken, async (req, res) => {
  try {
    const sql = `
      SELECT 
        s.support_id, s.title, s.content, s.user_role, s.user_id,
        s.is_answered, s.answer, s.answered_by, s.created_at, s.answered_at,
        a.username AS admin_name
      FROM support_board s
      LEFT JOIN admin a ON s.answered_by = a.admin_id
      ORDER BY s.created_at DESC
    `;
    const [rows] = await pool.query(sql);
    res.json({ success: true, supports: rows });
  } catch (err) {
    console.error("문의 목록 오류:", err);
    res.json({ success: false, message: "DB 오류로 조회 실패" });
  }
});

/* ------------------------------ ✅ 문의사항 답변 등록 (XSS 방어 적용) ------------------------------ */
router.patch("/support/:id/answer", verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { answer } = req.body;
    const { admin_id } = req.admin;
    if (!answer) return res.json({ success: false, message: "답변 내용이 누락되었습니다." });

    // ========================================
    // 🛡️ XSS 방어: 입력값 검증 및 Sanitize
    // ========================================
    
    // 1. 길이 검증
    if (!validateLength(answer, 5000)) {
      return res.json({ success: false, message: "답변은 5000자를 초과할 수 없습니다." });
    }

    // 2. SQL Injection 패턴 검증
    if (containsSQLInjection(answer)) {
      return res.json({ success: false, message: "답변에 허용되지 않는 문자가 포함되어 있습니다." });
    }

    // 3. XSS 방어: Sanitize 처리
    const sanitizedAnswer = sanitizeHTML(answer);

    const sql = `
      UPDATE support_board
      SET answer = ?, answered_by = ?, is_answered = 1, answered_at = NOW()
      WHERE support_id = ?
    `;
    const [result] = await pool.query(sql, [sanitizedAnswer, admin_id, id]);
    if (result.affectedRows === 0)
      return res.json({ success: false, message: "해당 문의를 찾을 수 없습니다." });

    res.json({ success: true, message: "답변이 등록되었습니다." });
  } catch (err) {
    console.error("문의 답변 등록 오류:", err);
    res.json({ success: false, message: "DB 오류로 답변 등록 실패" });
  }
});

/* ------------------------------ ✅ 문의사항 답변 수정 (XSS 방어 적용) ------------------------------ */
router.patch("/support/:id/edit", verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { answer } = req.body;
    if (!answer) return res.json({ success: false, message: "수정할 답변 내용이 없습니다." });

    // ========================================
    // 🛡️ XSS 방어: 입력값 검증 및 Sanitize
    // ========================================
    
    // 1. 길이 검증
    if (!validateLength(answer, 5000)) {
      return res.json({ success: false, message: "답변은 5000자를 초과할 수 없습니다." });
    }

    // 2. SQL Injection 패턴 검증
    if (containsSQLInjection(answer)) {
      return res.json({ success: false, message: "답변에 허용되지 않는 문자가 포함되어 있습니다." });
    }

    // 3. XSS 방어: Sanitize 처리
    const sanitizedAnswer = sanitizeHTML(answer);

    const [result] = await pool.query(
      "UPDATE support_board SET answer = ?, answered_at = NOW() WHERE support_id = ? AND is_answered = 1",
      [sanitizedAnswer, id]
    );
    if (result.affectedRows === 0)
      return res.json({ success: false, message: "수정할 답변이 없습니다." });

    res.json({ success: true, message: "답변이 수정되었습니다." });
  } catch (err) {
    console.error("답변 수정 오류:", err);
    res.json({ success: false, message: "DB 오류로 수정 실패" });
  }
});

/* ------------------------------ 문의사항 답변 삭제 ------------------------------ */
router.patch("/support/:id/delete-answer", verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(`
      UPDATE support_board
      SET answer = NULL, answered_by = NULL, is_answered = 0, answered_at = NULL
      WHERE support_id = ?
    `, [id]);
    if (result.affectedRows === 0)
      return res.json({ success: false, message: "해당 문의를 찾을 수 없습니다." });

    res.json({ success: true, message: "답변이 삭제되었습니다." });
  } catch (err) {
    console.error("답변 삭제 오류:", err);
    res.json({ success: false, message: "DB 오류로 삭제 실패" });
  }
});

/* ------------------------------ 문의사항 삭제 ------------------------------ */
router.delete("/support/:id", verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query("DELETE FROM support_board WHERE support_id = ?", [id]);
    if (result.affectedRows === 0)
      return res.json({ success: false, message: "삭제할 문의를 찾을 수 없습니다." });

    res.json({ success: true, message: "문의글이 삭제되었습니다." });
  } catch (err) {
    console.error("문의 삭제 오류:", err);
    res.json({ success: false, message: "DB 오류로 삭제 실패" });
  }
});

/* ------------------------------ 관리자 토큰 검증 ------------------------------ */
router.get("/verify", verifyAdminToken, (req, res) => {
  res.json({ success: true, admin: req.admin, message: "토큰 유효" });
});

export default router;

