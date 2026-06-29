import express from "express";
import {
  retrainTxnClassifier,
  saveTxnClassifierFeedback,
} from "../controllers/txnClassifier";
import { authMiddleware } from "../middlewares/auth";

export default (router: express.Router) => {
  router.post(
    "/txn-classifier/feedback",
    authMiddleware,
    saveTxnClassifierFeedback,
  );
  router.post("/txn-classifier/retrain", retrainTxnClassifier);
};
