import express from "express";
import {
  register,
  login,
  logout,
  profile,
  updateProfile,
  changePassword,
} from "./buyer.controller.js";
import { verifyBuyerToken } from "../../middleware/buyerAuth.js";

const router = express.Router();

// 회원가입, 로그인
router.post("/register", register);
router.post("/login", login);

// 로그아웃, 프로필 관련
router.post("/logout", verifyBuyerToken, logout);
router.get("/profile", verifyBuyerToken, profile);
router.put("/profile", verifyBuyerToken, updateProfile);
router.put("/password", verifyBuyerToken, changePassword);

export default router;