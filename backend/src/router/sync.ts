import express from 'express';
import { syncAccountTransactions, syncInvestments, testClassifier } from '../controllers/sync';
import { authMiddleware } from '../middlewares/auth';

export default (router: express.Router) => {
  router.post('/sync', authMiddleware, syncAccountTransactions);
  router.post('/sync/investments', authMiddleware, syncInvestments);
  router.post('/sync/test-classifier', authMiddleware, testClassifier);
};
