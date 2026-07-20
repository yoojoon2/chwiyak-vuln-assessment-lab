import express from 'express';
import * as sellerController from './seller.controller.js';
import sellerOrdersRoutes from '../sellerOrders/sellerOrders.routes.js';
import { verifySellerToken } from '../../middleware/sellerAuth.js';  // ✅ 통일

const router = express.Router();

// 판매자 회원가입
router.post('/register', sellerController.registerSeller);

// 판매자 로그인
router.post('/login', sellerController.loginSeller);

// 판매자 프로필 조회 (인증 필요)
router.get('/profile', verifySellerToken, sellerController.getSellerProfile);

// 판매자 프로필 수정 (인증 필요)
router.put('/profile', verifySellerToken, sellerController.updateSellerProfile);

// 판매자 비밀번호 변경 (인증 필요)
router.patch('/password', verifySellerToken, sellerController.changeSellerPassword);

// 정산 계좌 관련
router.get('/settlement', verifySellerToken, sellerController.getSettlement);
router.post('/settlement', verifySellerToken, sellerController.createSettlement);
router.put('/settlement', verifySellerToken, sellerController.updateSettlement);

// ✅ 판매자 주문 관련 라우터 통합
router.use('/', sellerOrdersRoutes);

export default router;