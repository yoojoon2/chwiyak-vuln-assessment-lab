console.log("🔥🔥🔥 user_controller.js 로드됨! 🔥🔥🔥");
import * as buyerService from "../buyer/buyer.service.js";
import * as sellerService from "../seller/seller.service.js";
import db from "../../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";

const SECRET_KEY  = process.env.JWT_SECRET;

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const MAIL_FROM   = process.env.MAIL_FROM;           // Single Sender 또는 도메인 인증 주소
const RESET_PATH  = process.env.FRONTEND_RESET_PATH  // 선택: 경로만 환경변수로 분리
  || "/frontend/pages/login&signup/reset_password.html";

const SALT_ROUNDS = 10;

const resolveImagePath = (raw) => {
  if (!raw) return null;
  const BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://chwiyak-mall.com' 
    : '';
  return raw.startsWith('/uploads') ? `${BASE_URL}${raw}` : raw;
};

// ====== 프런트엔드 BASE URL 동적 해석 ======
function resolveFrontendBaseUrl(req) {
  const envBase = (process.env.FRONTEND_BASE_URL || "").trim();
  const allowHosts = (process.env.ALLOWED_FRONTEND_HOSTS || "")
    .split(",").map(s => s.trim()).filter(Boolean);

  if (envBase) return envBase.replace(/\/+$/, ""); // 1) 고정값이 있으면 우선

  const isAllowed = (urlLike) => {
    if (allowHosts.length === 0) return true;
    try {
      const u = new URL(urlLike);
      return allowHosts.includes(u.hostname);
    } catch { return false; }
  };

  // 2) Origin 우선
  const origin = req.get("origin");
  if (origin && isAllowed(origin)) return origin.replace(/\/+$/, "");

  // 3) 프록시 헤더
  const xfProto = (req.get("x-forwarded-proto") || "").split(",")[0].trim();
  const xfHost  = (req.get("x-forwarded-host")  || "").split(",")[0].trim();
  const xfPort  = (req.get("x-forwarded-port")  || "").split(",")[0].trim();
  if (xfHost) {
    const proto = xfProto || "https";
    const port  = xfPort && !/^(80|443)$/.test(xfPort) ? `:${xfPort}` : "";
    const url   = `${proto}://${xfHost}${port}`;
    if (isAllowed(url)) return url;
    return url; // 화이트리스트 미사용이면 그대로 허용
  }

  // 4) 최후: req.protocol + host
  const proto = req.protocol || "https";
  const host  = req.get("host");
  if (host) {
    const url = `${proto}://${host}`;
    if (isAllowed(url)) return url;
    return url;
  }
}

// 통합 회원가입 (buyer/seller 구분)
export const register = async (req, res) => {
  try {
    const { userType, username, password, name, email, phone, company_name, business_reg_no } = req.body;

    // userType 검증
    if (!userType || (userType !== 'buyer' && userType !== 'seller')) {
      return res.status(400).json({ message: "userType은 'buyer' 또는 'seller'여야 합니다." });
    }

    let result;
    if (userType === 'buyer') {
      // 구매자 회원가입
      result = await buyerService.registerBuyer(username, password, name, email, phone);
      return res.status(201).json({ 
        message: "회원가입 성공", 
        userType: 'buyer',
        user: result 
      });
    } else {
      // 판매자 회원가입
      if (!company_name || !business_reg_no) {
        return res.status(400).json({ message: "판매자는 company_name과 business_reg_no가 필요합니다." });
      }
      result = await sellerService.registerSeller(username, password, name, email, phone, company_name, business_reg_no);
      return res.status(201).json({ 
        message: "회원가입 성공", 
        userType: 'seller',
        user: result 
      });
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// 비밀번호 변경 (buyer/seller 공통)
export const changePassword = async (req, res) => {
  try {
    const userType = req.userType;
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "oldPassword와 newPassword가 필요합니다." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "비밀번호는 최소 8자 이상이어야 합니다." });
    }

    if (userType === "buyer") {
      const buyerId = req.user.buyer_id;
      await buyerService.changePassword(buyerId, oldPassword, newPassword);
      return res.status(200).json({ message: "비밀번호가 변경되었습니다." });
    } else if (userType === "seller") {
      const sellerId = req.user.seller_id;
      await sellerService.changePassword(sellerId, oldPassword, newPassword);
      return res.status(200).json({ message: "비밀번호가 변경되었습니다." });
    } else {
      return res.status(400).json({ message: "지원하지 않는 사용자 유형입니다." });
    }
  } catch (err) {
    const msg = err?.message || "서버 오류가 발생했습니다.";
    if (msg.includes("기존 비밀번호")) {
      return res.status(400).json({ message: msg });
    }
    console.error("비밀번호 변경 오류:", err);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

// 프로필 단건 조회 (buyer/seller 공통)
export const getProfile = async (req, res) => {
  try {
    const userType = req.userType;
    if (userType === "buyer") {
      const buyerId = req.user.buyer_id;
      const profile = await buyerService.getProfile(buyerId);
      return res.status(200).json(profile);
    } else if (userType === "seller") {
      const sellerId = req.user.seller_id;
      const profile = await sellerService.getProfile(sellerId);
      return res.status(200).json(profile);
    } else {
      return res.status(400).json({ message: "지원하지 않는 사용자 유형입니다." });
    }
  } catch (err) {
    console.error("프로필 조회 오류:", err);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

// 프로필 수정 (buyer/seller 공통)
export const updateProfile = async (req, res) => {
  try {
    const userType = req.userType;
    const { name, email, phone, introduction, username } = req.body;

    if (userType === "buyer") {
      const buyerId = req.user.buyer_id;
      const current = await buyerService.getProfile(buyerId);
      const updated = await buyerService.updateProfile(
        buyerId,
        name ?? current.name,
        email ?? current.email,
        phone ?? current.phone,
        username ?? undefined
      );
      return res.status(200).json(updated);
    } else if (userType === "seller") {
      const sellerId = req.user.seller_id;
      const current = await sellerService.getProfile(sellerId);
      const updated = await sellerService.updateProfile(
        sellerId,
        name ?? current.name,
        email ?? current.email,
        phone ?? current.phone,
        introduction ?? current.introduction ?? null,
        username ?? undefined
      );
      return res.status(200).json(updated);
    } else {
      return res.status(400).json({ message: "지원하지 않는 사용자 유형입니다." });
    }
  } catch (err) {
    console.error("프로필 수정 오류:", err);
    if (err && (err.code === 'ER_DUP_ENTRY' || (err.message && err.message.includes('Duplicate')))) {
      return res.status(409).json({ message: "이미 사용 중인 아이디 또는 이메일입니다." });
    }
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

// user_controller.js - login 함수 (197번 라인부터)

export const login = async (req, res) => {
  console.log("🔥 LOGIN 함수 실행됨!", req.body);
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "아이디와 비밀번호를 입력해주세요." });
    }
    // 먼저 buyer로 시도
    try {
      const buyerResult = await buyerService.loginBuyer(username, password);
      
      console.log("🍪 실제 쿠키 설정:", {
        hasToken: !!buyerResult.token,
        tokenLength: buyerResult.token?.length
      });
      
      // ✅ httpOnly 쿠키로 토큰 설정
      res.cookie('authToken', buyerResult.token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 30 * 60 * 1000,
        path: '/'
      });
      
      console.log("✅ authToken 쿠키 설정 완료");
      
      return res.status(200).json({ 
        message: "로그인 성공", 
        success: true,
        role: 'buyer',
        username: buyerResult.username,
        name: buyerResult.name
      });
    } catch (buyerErr) {
      if (buyerErr.message.includes("정지된 계정")) {
        return res.status(403).json({ message: buyerErr.message });
      }

      // buyer 로그인 실패 시 seller로 시도
      try {
        const sellerResult = await sellerService.loginSeller(username, password);
        
        console.log("🍪 [Seller] 쿠키 설정 시도:", {
          token: sellerResult.token ? sellerResult.token.substring(0, 20) + "..." : "없음",
          NODE_ENV: process.env.NODE_ENV,
          secure: process.env.NODE_ENV === 'production'
        });
        
        // ✅ httpOnly 쿠키로 토큰 설정
        res.cookie('authToken', sellerResult.token, {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: 30 * 60 * 1000,
          path: '/'
        });
        
        console.log("✅ [Seller] 쿠키 설정 완료");
        
        return res.status(200).json({ 
          message: "로그인 성공", 
          success: true,
          role: 'seller',
          username: sellerResult.username,
          name: sellerResult.name
        });
      } catch (sellerErr) {
        if (sellerErr.message.includes("정지된 계정")) {
          return res.status(403).json({ message: sellerErr.message });
        }
        return res.status(400).json({ message: "아이디 또는 비밀번호가 올바르지 않습니다." });
      }
    }

  } catch (err) {
    console.error("❌ 로그인 오류:", err);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

// 마이페이지 요약 정보 조회
export const getMypageSummary = async (req, res) => {
  try {
    const userId = req.user.buyer_id || req.user.seller_id;
    const userType = req.userType;

    if (userType === 'buyer') {
      // 구매자 마이페이지 정보
      const [orders] = await db.query(
        "SELECT status, COUNT(*) as count FROM `orders` WHERE buyer_id = ? GROUP BY status",
        [userId]
      );

      const orderCounts = {
        '결제완료': 0,
        '상품 준비중': 0,
        '배송중': 0,
        '배송완료': 0
      };

      // 대문자 상태로 매핑
      orders.forEach(row => {
        if (row.status === 'PAID') orderCounts['결제완료'] = row.count;
        if (row.status === 'PROCESSING') orderCounts['상품 준비중'] = row.count;
        if (row.status === 'SHIPPED') orderCounts['배송중'] = row.count;
        if (row.status === 'DELIVERED') orderCounts['배송완료'] = row.count;
      });

      const [coupons] = await db.query(
        "SELECT COUNT(*) as count FROM buyer_coupons WHERE buyer_id = ? AND is_used = FALSE",
        [userId]
      );

      const [reviews] = await db.query(
        "SELECT COUNT(*) as count FROM reviews WHERE buyer_id = ?",
        [userId]
      );

      const [wishlist] = await db.query(
        `SELECT p.product_id, p.name, p.price, p.imageUrl, bw.created_at
         FROM wishlists bw
         JOIN products p ON bw.product_id = p.product_id
         WHERE bw.buyer_id = ?
         ORDER BY bw.created_at DESC
         LIMIT 10`,
        [userId]
      );

      const wishlistItems = wishlist.map(item => ({
        productId: item.product_id,
        name: item.name,
        price: item.price,
        thumbnailUrl: resolveImagePath(item.imageUrl),
        createdAt: item.created_at
      }));

      // 최신 사용자 정보 조회 (토큰 값이 아니라 DB 값 사용)
      const buyerProfile = await buyerService.getProfile(userId);

      res.status(200).json({
        user: {
          username: buyerProfile.username,
          name: buyerProfile.name,
          email: buyerProfile.email
        },
        stats: {
          orderCounts,
          couponCount: coupons[0].count,
          points: buyerProfile.points || 0,
          reviewCount: reviews[0].count
        },
        wishlist: wishlistItems
      });

    } else {
      // 판매자 마이페이지 정보 (간단한 버전)
      const sellerProfile = await sellerService.getProfile(userId);
      res.status(200).json({
        user: {
          username: sellerProfile.username,
          name: sellerProfile.name,
          email: sellerProfile.email,
          company_name: sellerProfile.company_name
        },
        stats: {
          orderCounts: {
            '결제완료': 0,
            '상품 준비중': 0,
            '배송중': 0,
            '배송완료': 0
          },
          couponCount: 0,
          points: 0,
          reviewCount: 0
        },
        wishlist: []
      });
    }
  } catch (err) {
    console.error('마이페이지 조회 오류:', err);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};





// 계정 탈퇴 (buyer/seller 공통)
export const deleteAccount = async (req, res) => {
  try {
    const userType = req.userType;
    const { password } = req.body;

    console.log("계정 탈퇴 요청:", { userType, hasPassword: !!password });

    if (!password) {
      return res.status(400).json({ message: "비밀번호를 입력해주세요." });
    }

    if (userType === "buyer") {
      const buyerId = req.user.buyer_id;
      console.log("구매자 탈퇴 시도:", buyerId);
      
      // 비밀번호 확인
      const [buyers] = await db.query("SELECT password FROM buyer WHERE buyer_id = ?", [buyerId]);
      if (buyers.length === 0) {
        return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      }
      
      const isPasswordValid = await bcrypt.compare(password, buyers[0].password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "비밀번호가 일치하지 않습니다." });
      }

      // 구매자 삭제 (관련 데이터는 ON DELETE CASCADE/SET NULL로 자동 처리)
      // support_board의 buyer_id는 SET NULL로 처리됨
      await db.query("DELETE FROM buyer WHERE buyer_id = ?", [buyerId]);
      console.log("구매자 삭제 완료:", buyerId);
      return res.status(200).json({ message: "계정이 탈퇴되었습니다." });

    } else if (userType === "seller") {
      const sellerId = req.user.seller_id;
      console.log("판매자 탈퇴 시도:", sellerId);
      
      // 비밀번호 확인
      const [sellers] = await db.query("SELECT password FROM seller WHERE seller_id = ?", [sellerId]);
      if (sellers.length === 0) {
        return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      }
      
      const isPasswordValid = await bcrypt.compare(password, sellers[0].password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "비밀번호가 일치하지 않습니다." });
      }

      // 판매자 삭제
      await db.query("DELETE FROM seller WHERE seller_id = ?", [sellerId]);
      console.log("판매자 삭제 완료:", sellerId);
      return res.status(200).json({ message: "계정이 탈퇴되었습니다." });

    } else {
      return res.status(400).json({ message: "지원하지 않는 사용자 유형입니다." });
    }
  } catch (err) {
    console.error("계정 탈퇴 오류 상세:", err);
    res.status(500).json({ message: err.message || "서버 오류가 발생했습니다." });
  }
};

/* ------------------------------ 아이디 찾기 ------------------------------ */
export const findId = async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: "이름과 이메일을 모두 입력해주세요." });
    }

    const sql = `
      SELECT username FROM buyer WHERE name = ? AND email = ?
      UNION
      SELECT username FROM seller WHERE name = ? AND email = ?
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [name, email, name, email]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "일치하는 계정을 찾을 수 없습니다." });
    }

    const username = rows[0].username;

    const subject = "[PREAM] 아이디 찾기 안내";
    const textBody = `안녕하세요, ${name}님.\n\n회원님의 아이디는 ${username} 입니다.`;
    const htmlBody = `
      <div style="font-family:Arial, sans-serif; line-height:1.6">
        <p>안녕하세요, <b>${name}</b>님.</p>
        <p>회원님의 아이디는 <b>${username}</b> 입니다.</p>
        <hr/>
        <small style="color:#666">본 메일은 발신 전용입니다.</small>
      </div>
    `;

    await sgMail.send({
      to: email,
      from: MAIL_FROM,
      subject,
      text: textBody,
      html: htmlBody,
    });

    return res.status(200).json({ message: "입력하신 이메일로 아이디를 전송했습니다." });
  } catch (err) {
    console.error("❌ 아이디 찾기(Email) 오류:", err?.response?.body || err.message || err);
    // 도메인 미설정/일시제한 등 케이스
    return res.status(500).json({ message: "아이디 찾기 중 이메일 전송 실패" });
  }
};

/* ------------------------------ 비밀번호 찾기 ------------------------------ */
export const findPassword = async (req, res) => {
  try {
    const { name, username, email } = req.body;
    if (!name || !username || !email) {
      return res.status(400).json({ message: "이름, 아이디, 이메일을 모두 입력해주세요." });
    }

    const sql = `
      SELECT buyer_id AS id, username, email, 'buyer' AS role
      FROM buyer WHERE name = ? AND username = ? AND email = ?
      UNION
      SELECT seller_id AS id, username, email, 'seller' AS role
      FROM seller WHERE name = ? AND username = ? AND email = ?
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [name, username, email, name, username, email]);

    // ✅ 일치하지 않으면 중단
    if (rows.length === 0) {
      console.log("❌ 비밀번호 찾기 실패: 해당 계정 없음");
      return res.status(404).json({ message: "일치하는 계정을 찾을 수 없습니다." });
    }

    // ✅ 토큰에는 꼭 필요한 정보만 포함 (민감정보/이메일은 넣지 않음)
    const user = rows[0];
    const payload = { id: user.id, role: user.role, username: user.username };
    const resetToken = jwt.sign(payload, SECRET_KEY, { expiresIn: "2h" });

    // ✅ 프런트엔드 재설정 링크 (동적 BASE URL)
    const baseUrl   = resolveFrontendBaseUrl(req);
    const resetLink = `${baseUrl.replace(/\/+$/, "")}${RESET_PATH}?token=${encodeURIComponent(resetToken)}`;

    const subject  = "[PREAM] 비밀번호 재설정 안내";
    const textBody =
`안녕하세요, ${name}님.

아래 링크를 클릭하여 비밀번호를 재설정해주세요 (2시간 내 유효)

${resetLink}

본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.`;
    const htmlBody = `
      <div style="font-family:Arial, sans-serif; line-height:1.6">
        <p>안녕하세요, <b>${name}</b>님.</p>
        <p>아래 버튼을 눌러 비밀번호를 재설정하세요. (유효기간: 2시간)</p>
        <p style="margin:20px 0">
          <a href="${resetLink}" style="display:inline-block;padding:10px 16px;text-decoration:none;border-radius:6px;background:#2563eb;color:#fff">
            비밀번호 재설정
          </a>
        </p>
        <p style="word-break:break-all;color:#555">직접 링크: <br>${resetLink}</p>
        <hr/>
        <small style="color:#777">본 메일은 발신 전용입니다. 본인이 요청하지 않았다면 무시하세요.</small>
      </div>
    `;

    // ✅ SendGrid로 메일 전송 (HTTP API / 443)
    await sgMail.send({
      to: email,
      from: { email: MAIL_FROM, name: "PREAM" },
      subject,
      text: textBody,
      html: htmlBody,
    });

    console.log("✅ 비밀번호 재설정 메일 전송 성공:", email);
    return res.json({ success: true, message: "비밀번호 재설정 링크를 이메일로 전송했습니다." });

  } catch (err) {
    const sgErr = err?.response?.body || err?.message || err;
    console.error("❌ 비밀번호 찾기(Email) 오류:", sgErr);

    if (typeof sgErr === "object" && sgErr?.errors?.length) {
      const msg = sgErr.errors.map(e => e.message).join("; ");
      return res.status(500).json({ message: `메일 전송 실패: ${msg}` });
    }
    return res.status(500).json({ message: "비밀번호 찾기 중 오류가 발생했습니다." });
  }
};

/* ------------------------------ 비밀번호 재설정 ------------------------------ */
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "비밀번호가 누락되었습니다." });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "비밀번호는 최소 8자리 이상이어야 합니다." });
    }

    // ✅ 토큰 검증
    let decoded;
    try {
      decoded = jwt.verify(token, SECRET_KEY);
    } catch (e) {
      return res.status(400).json({ message: "링크가 만료되었거나 유효하지 않습니다." });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    const table    = decoded.role === "seller" ? "seller" : "buyer";
    const idColumn = table === "seller" ? "seller_id" : "buyer_id";

    await db.query(`UPDATE ${table} SET password = ? WHERE ${idColumn} = ?`, [
      hashed,
      decoded.id,
    ]);

    res.json({ message: "비밀번호가 성공적으로 변경되었습니다." });
  } catch (err) {
    console.error("비밀번호 재설정 오류:", err);
    res.status(400).json({ message: "링크가 만료되었거나 유효하지 않습니다." });
  }
};

