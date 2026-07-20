import * as service from "./buyerWishlist.service.js";

export const getWishlist = async (req, res) => {
  try {
    const data = await service.getBuyerWishlist(req.buyer_id);
    res.status(200).json(data);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const addWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const result = await service.addToWishlist(req.buyer_id, productId);
    res.status(201).json(result); // inserted, snapshot 포함
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const removeWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    await service.removeFromWishlist(req.buyer_id, productId);
    res.status(200).json({ message: "위시리스트에서 제거되었습니다." });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
     