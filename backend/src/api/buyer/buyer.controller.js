import * as buyerService from "./buyer.service.js";

// 회원가입
export const register = async (req, res) => {
  try {
    const { username, password, name, email, phone } = req.body;
    const buyer = await buyerService.registerBuyer(username, password, name, email, phone);
    res.status(201).json({ message: "회원가입 성공", buyer });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// 로그인
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const buyer = await buyerService.loginBuyer(username, password);
    
    // ✅ httpOnly 쿠키로 토큰 설정
    res.cookie('authToken', buyer.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 30 * 60 * 1000 // 30분
    });
    
    return res.status(200).json({
      message: "로그인 성공",
      success: true,
      userType: 'buyer',
      username: buyer.username,
      name: buyer.name,
      email: buyer.email
    });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

// 로그아웃
export const logout = async (req, res) => {
  try {
    // ✅ 쿠키 삭제
    res.clearCookie('authToken');
    res.status(200).json({ message: "로그아웃 완료" });
  } catch (err) {
    res.status(500).json({ message: "서버 오류" });
  }
};

// 프로필 조회
export const profile = async (req, res) => {
  try {
    // JWT 미들웨어에서 설정한 buyer_id 사용
    const buyerId = req.buyer_id || req.buyer?.buyer_id || req.buyer?.id;
    if (!buyerId) {
      return res.status(401).json({ message: "사용자 ID를 찾을 수 없습니다." });
    }
    
    const buyer = await buyerService.getProfile(buyerId);
    res.status(200).json(buyer);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

// 프로필 수정
export const updateProfile = async (req, res) => {
  const { name, email, phone } = req.body;
  try {
    const buyerId = req.buyer_id || req.buyer?.buyer_id || req.buyer?.id;
    if (!buyerId) {
      return res.status(401).json({ message: "사용자 ID를 찾을 수 없습니다." });
    }
    
    const updated = await buyerService.updateProfile(buyerId, name, email, phone);
    res.status(200).json({ message: "프로필 수정 완료", data: updated });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// 비밀번호 변경
export const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  try {
    const buyerId = req.buyer_id || req.buyer?.buyer_id || req.buyer?.id;
    if (!buyerId) {
      return res.status(401).json({ message: "사용자 ID를 찾을 수 없습니다." });
    }
    
    await buyerService.changePassword(buyerId, oldPassword, newPassword);
    res.status(200).json({ message: "비밀번호 변경 완료" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
