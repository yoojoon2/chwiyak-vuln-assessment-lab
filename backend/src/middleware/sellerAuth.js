// backend/src/middleware/sellerAuth.js
import { verifyJWTToken } from "../utils/jwt.js";

// 판매자 토큰 검증 (JWT 방식) - 쿠키 기반으로 변경
export const verifySellerToken = async (req, res, next) => {
  try {
    // 1. 헤더 대신 쿠키에서 토큰 추출
    const token = req.cookies?.authToken;
    
    console.log('🔍 Token from Cookie:', token ? token.substring(0, 20) + '...' : 'None');
    
    if (!token) {
      return res.status(401).json({ message: "판매자 토큰이 없습니다. (로그인 필요)" });
    }

    // 2. JWT 토큰 검증
    const result = verifyJWTToken(token);
    
    console.log('🔍 JWT Verification Result:', result);
    
    if (!result.valid) {
      return res.status(401).json({ message: result.message || "유효하지 않은 토큰입니다." });
    }

    console.log('🔍 JWT Decoded:', result.decoded);

    // 3. 토큰에서 추출한 userType이 'seller'인지 확인
    if (result.decoded.role !== 'seller') {
      return res.status(403).json({ message: "판매자 권한이 필요합니다." });
    }

    // 4. 요청 객체에 판매자 정보 설정
    req.seller = result.decoded;
    req.seller_id = result.decoded.seller_id || result.decoded.id;
    
    console.log('✅ req.seller:', req.seller);
    console.log('✅ req.seller_id:', req.seller_id);
    
    if (!req.seller_id) {
      console.error('❌ seller_id가 JWT에 없습니다!');
      return res.status(401).json({ message: "토큰에 판매자 ID가 없습니다." });
    }
    
    next();
  } catch (err) {
    console.error('❌ 판매자 인증 오류:', err);
    res.status(500).json({ message: "판매자 인증 오류", error: err.message });
  }
};
