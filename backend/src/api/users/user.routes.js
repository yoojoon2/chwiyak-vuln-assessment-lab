import express from "express";
import { register, login, getMypageSummary, getProfile, updateProfile, changePassword, deleteAccount, findId, findPassword, resetPassword } from "./user.controller.js";
import { verifyToken } from "./user.middleware.js";

const router = express.Router();

// 통합 회원가입 (buyer/seller 구분)
router.post("/register", register);

// 통합 로그인 (buyer/seller 구분)
router.post("/login", login);

// ✅ 로그아웃
router.post("/logout", verifyToken, (req, res) => {
  try {
    // httpOnly 쿠키 삭제
    res.clearCookie('authToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    
    res.status(200).json({ 
      success: true, 
      message: '로그아웃되었습니다' 
    });
  } catch (error) {
    console.error('로그아웃 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '로그아웃 중 오류가 발생했습니다' 
    });
  }
});

// 마이페이지 요약 정보
router.get("/mypage/summary", verifyToken, getMypageSummary);

// 프로필 조회/수정
router.get("/profile", verifyToken, getProfile);
router.patch("/profile", verifyToken, updateProfile);

// 비밀번호 변경
router.patch("/password", verifyToken, changePassword);

// 계정 탈퇴
router.delete("/account", verifyToken, deleteAccount);

// ✅ 현재 로그인한 사용자 정보 조회 (삭제버튼 표시용)
router.get("/me", verifyToken, (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "인증 필요" });
    res.status(200).json(req.user);
  } catch (err) {
    console.error("❌ /me 오류:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

// 아이디/비밀번호 찾기
router.post("/find-id", findId);
router.post("/find-pw", findPassword);
router.post("/reset_password/:token", resetPassword);

export default router;
