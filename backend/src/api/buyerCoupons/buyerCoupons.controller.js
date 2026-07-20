// buyerCoupons.controller.js
import db from "../../config/db.js";
import * as service from "./buyerCoupons.service.js";

export const getBuyerCoupons = async (req, res) => {
  try {
    const rows = await service.getMyCoupons(req);
    // ✅ { data: [...] } 형식으로 감싸서 반환
    res.status(200).json({ data: rows });
  } catch (err) {
    const statusMap = {
      UNAUTHORIZED: 401,
    };
    res.status(statusMap[err.message] || 500).json({ message: err.message });
  }
};

export const redeemCoupon = async (req, res) => {
  try {
    const result = await service.redeemCoupon(req);
    // ✅ 성공 메시지 추가
    res.status(201).json({ 
      message: "쿠폰이 등록되었습니다.",
      ...result 
    });
  } catch (err) {
    const statusMap = {
      UNAUTHORIZED: 401,
      INVALID_CODE: 400,
      NOT_FOUND_CODE: 404,
      SOLD_OUT: 410,
      ALREADY_OWNED: 409,
    };
    const messageMap = {
      INVALID_CODE: "쿠폰 코드를 입력해주세요.",
      NOT_FOUND_CODE: "존재하지 않거나 만료된 쿠폰입니다.",
      SOLD_OUT: "쿠폰 수량이 모두 소진되었습니다.",
      ALREADY_OWNED: "이미 등록한 쿠폰입니다.",
      UNAUTHORIZED: "로그인이 필요합니다.",
    };
    res.status(statusMap[err.message] || 500).json({ 
      message: messageMap[err.message] || "쿠폰 등록에 실패했습니다." 
    });
  }
};

export const useCoupon = async (req, res) => {
  try {
    const result = await service.useMyCoupon(req);
    res.status(200).json(result);
  } catch (err) {
    const statusMap = {
      UNAUTHORIZED: 401,
      NOT_FOUND_COUPON: 404,
      ALREADY_USED_OR_DELETED: 409,
    };
    res.status(statusMap[err.message] || 500).json({ message: err.message });
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    const result = await service.deleteMyCoupon(req);
    res.status(200).json(result);
  } catch (err) {
    const statusMap = {
      UNAUTHORIZED: 401,
      NOT_FOUND_COUPON: 404,
      DELETE_FAILED: 500,
    };
    res.status(statusMap[err.message] || 500).json({ message: err.message });
  }
};