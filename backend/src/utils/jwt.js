import jwt from "jsonwebtoken";

// JWT 토큰 생성 함수
export const generateToken = (user, userType) => {
  const payload = {
    id: user.buyer_id || user.seller_id || user.admin_id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: userType, // 'buyer', 'seller', 'admin'
  };

  // buyer 전용 정보 추가
  if (userType === 'buyer' && user.buyer_id) {
    payload.buyer_id = user.buyer_id;
    payload.points = user.points || 0;
  }

  // seller 전용 정보 추가
  if (userType === 'seller' && user.seller_id) {
    payload.seller_id = user.seller_id;
    payload.company_name = user.company_name;
    payload.business_reg_no = user.business_reg_no;
  }

  // admin 전용 정보 추가
  if (userType === 'admin' && user.admin_id) {
    payload.admin_id = user.admin_id;
  }

  // 토큰 생성 (24시간 유효)
  return jwt.sign(payload, process.env.JWT_SECRET, { 
    expiresIn: '24h' 
  });
};

// JWT 토큰 검증 함수
export const verifyJWTToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { valid: true, decoded };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return { valid: false, error: 'TokenExpiredError', message: '토큰이 만료되었습니다.' };
    } else if (error.name === 'JsonWebTokenError') {
      return { valid: false, error: 'JsonWebTokenError', message: '유효하지 않은 토큰입니다.' };
    }
    return { valid: false, error: error.name, message: error.message };
  }
};

// 리프레시 토큰 생성 (선택 사항)
export const generateRefreshToken = (userId, userType) => {
  const payload = {
    id: userId,
    userType: userType,
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { 
    expiresIn: '7d' 
  });
};
