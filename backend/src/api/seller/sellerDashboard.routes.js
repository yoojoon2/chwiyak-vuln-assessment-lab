import express from "express";
import { getSellerDashboard } from "./sellerDashboard.controller.js";
import { verifySellerToken } from "../../middleware/sellerAuth.js";

const router = express.Router();

router.get("/", verifySellerToken, getSellerDashboard);

export default router;