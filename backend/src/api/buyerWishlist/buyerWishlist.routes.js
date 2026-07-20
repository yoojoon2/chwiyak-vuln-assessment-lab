import express from "express";
import { verifyBuyerToken } from "../../middleware/buyerAuth.js";
import { getWishlist, addWishlist, removeWishlist } from "./buyerWishlist.controller.js";

const router = express.Router();

router.get("/", verifyBuyerToken, getWishlist);
router.post("/", verifyBuyerToken, addWishlist);
router.delete("/:productId", verifyBuyerToken, removeWishlist);

export default router;
