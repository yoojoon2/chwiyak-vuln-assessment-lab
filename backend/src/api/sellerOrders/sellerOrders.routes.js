// backend/src/api/sellerOrders/sellerOrders.routes.js
import express from 'express';
import * as sellerOrdersController from './sellerOrders.controller.js';
import { verifySellerToken } from '../../middleware/sellerAuth.js';

const router = express.Router();

// 판매자 통계
router.get('/stats', verifySellerToken, sellerOrdersController.getSellerStats);

// 최근 주문 3건
router.get('/orders/recent', verifySellerToken, sellerOrdersController.getRecentOrders);

// 주문 목록 조회
router.get('/orders', verifySellerToken, sellerOrdersController.getSellerOrders);

// 주문 상태 변경
router.patch('/orders/:orderId/status', verifySellerToken, sellerOrdersController.updateOrderStatus);

export default router;