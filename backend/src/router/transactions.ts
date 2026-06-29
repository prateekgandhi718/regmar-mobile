import express from 'express';
import { getUserTransactions, updateTransaction, deleteTransaction } from '../controllers/transactions';
import { authMiddleware } from '../middlewares/auth';

export default (router: express.Router) => {
  router.get('/transactions', authMiddleware, getUserTransactions);
  router.patch('/transactions/:id', authMiddleware, updateTransaction);
  router.delete('/transactions/:id', authMiddleware, deleteTransaction);
};

