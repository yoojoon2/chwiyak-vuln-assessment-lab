import { verifyJWTToken } from "../utils/jwt.js";

// 구매자 토큰 검증 (JWT 방식) - 쿠키 기반으로 변경
export const verifyBuyerToken = async (req, res, next) => {
  try {
    // 1. 헤더 대신 쿠키에서 토큰 추출
    // (app.js에서 cookieParser 미들웨어가 설정되어 있어야 req.cookies 사용 가능)
    const token = req.cookies?.authToken; 

    if (!token) {
        return res.status(401).json({ message: "인증 토큰이 없습니다. (로그인 필요)" });
    }

    // 2. JWT 토큰 검증
    const result = verifyJWTToken(token);
    if (!result.valid) {
      return res.status(401).json({ message: result.message || "유효하지 않은 토큰입니다." });
    }

    // 3. 토큰에서 추출한 userType이 'buyer'인지 확인
    if (result.decoded.role !== 'buyer') {  // ✅ 'role'로 변경
      return res.status(403).json({ message: "구매자 권한이 필요합니다." });
    }

    // 4. 요청 객체에 구매자 정보 설정
    req.buyer = result.decoded;
    req.buyer_id = result.decoded.buyer_id || result.decoded.id;
    
    next();
  } catch (err) {
    console.error("구매자 인증 오류:", err);
    res.status(500).json({ message: "서버 인증 오류", error: err.message });
  }
};
