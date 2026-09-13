import express from 'express';
import { authMiddleware } from '../middlewares/auth';
import { getUserTransactions, updateTransaction, deleteTransaction, createUserTransaction, clearUserTransactions } from '../controllers/transactions';
export default (router: express.Router) => { router.get('/transactions', authMiddleware, getUserTransactions); router.post('/transactions', authMiddleware, createUserTransaction); router.patch('/transactions/:id', authMiddleware, updateTransaction); router.delete('/transactions', authMiddleware, clearUserTransactions); router.delete('/transactions/:id', authMiddleware, deleteTransaction); };
