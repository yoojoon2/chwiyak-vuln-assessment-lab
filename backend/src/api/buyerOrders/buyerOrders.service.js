import * as model from "./buyerOrders.model.js";

export const getBuyerOrders = async (buyerId) => {
  return await model.getOrdersByBuyer(buyerId);
};

export const getBuyerOrdersByStatus = async (buyerId, status) => {
  return await model.getOrdersByBuyerAndStatus(buyerId, status);
};

export const getPendingReviewItems = async (buyerId) => {
  return await model.getPendingReviewItems(buyerId);
};