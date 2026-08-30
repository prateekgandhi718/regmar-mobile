import express from 'express';
import { syncAccountTransactions, syncInvestments } from '../controllers/sync';
import { authMiddleware } from '../middlewares/auth';

export default (router: express.Router) => {
  router.post('/sync', authMiddleware, syncAccountTransactions);
  router.post('/sync/investments', authMiddleware, syncInvestments);
};
