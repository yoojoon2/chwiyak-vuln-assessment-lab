import * as sellerOrdersModel from './sellerOrders.model.js';

// 판매자의 주문 목록 조회
export const getSellerOrders = async (req, res) => {
  try {
    // ✅ 안전한 로깅
    console.log('🔍 req.seller:', JSON.stringify(req.seller));
    console.log('🔍 req.seller_id:', req.seller_id);
    
    // ✅ 여러 경로에서 seller_id 찾기
    const sellerId = req.seller_id 
      || (req.seller && req.seller.seller_id) 
      || (req.seller && req.seller.id)
      || (req.user && req.user.seller_id)
      || (req.user && req.user.id);
    
    console.log('✅ 최종 sellerId:', sellerId);
    
    if (!sellerId) {
      console.error('❌ seller_id를 찾을 수 없습니다.');
      return res.status(401).json({ message: "판매자 ID를 찾을 수 없습니다." });
    }
    
    const { status, sort } = req.query;

    console.log('📦 판매자 주문 조회:', { sellerId, status, sort });

    const orders = await sellerOrdersModel.getOrdersBySeller(sellerId, status, sort);
    
    console.log('📦 조회된 주문 수:', orders.length);
    res.json(orders);
  } catch (error) {
    console.error('❌ 판매자 주문 조회 오류:', error);
    res.status(500).json({ message: '주문 조회 실패', error: error.message });
  }
};

// 주문 상태 변경
export const updateOrderStatus = async (req, res) => {
  try {
    const sellerId = req.seller_id 
      || (req.seller && req.seller.seller_id) 
      || (req.seller && req.seller.id);
    
    if (!sellerId) {
      return res.status(401).json({ message: "판매자 ID를 찾을 수 없습니다." });
    }
    
    const { orderId } = req.params;
    const { status } = req.body;

    console.log('🔄 주문 상태 변경:', { sellerId, orderId, status });

    const isOwner = await sellerOrdersModel.verifyOrderOwnership(orderId, sellerId);
    if (!isOwner) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    await sellerOrdersModel.updateOrderStatus(orderId, status);

    console.log('✅ 상태 변경 완료');
    res.json({ message: '주문 상태가 변경되었습니다.' });
  } catch (error) {
    console.error('❌ 주문 상태 변경 오류:', error);
    res.status(500).json({ message: '상태 변경 실패', error: error.message });
  }
};

// 판매자 통계
export const getSellerStats = async (req, res) => {
  try {
    const sellerId = req.seller_id 
      || (req.seller && req.seller.seller_id) 
      || (req.seller && req.seller.id);
    
    if (!sellerId) {
      return res.status(401).json({ message: "판매자 ID를 찾을 수 없습니다." });
    }

    const stats = await sellerOrdersModel.getSellerStatistics(sellerId);
    res.json(stats);
  } catch (error) {
    console.error('❌ 판매자 통계 조회 오류:', error);
    res.status(500).json({ message: '통계 조회 실패', error: error.message });
  }
};

// 최근 주문 3건
export const getRecentOrders = async (req, res) => {
  try {
    const sellerId = req.seller_id 
      || (req.seller && req.seller.seller_id) 
      || (req.seller && req.seller.id);
    
    if (!sellerId) {
      return res.status(401).json({ message: "판매자 ID를 찾을 수 없습니다." });
    }

    const orders = await sellerOrdersModel.getRecentOrdersBySeller(sellerId, 3);
    res.json(orders);
  } catch (error) {
    console.error('❌ 최근 주문 조회 오류:', error);
    res.status(500).json({ message: '최근 주문 조회 실패', error: error.message });
  }
};