import express from 'express';
import { authMiddleware } from '../middlewares/auth';
import { getUserAccounts, addUserAccount, updateAccount, deleteAccount } from '../controllers/accounts';
export default (router: express.Router) => { router.get('/accounts', authMiddleware, getUserAccounts); router.post('/accounts', authMiddleware, addUserAccount); router.patch('/accounts/:id', authMiddleware, updateAccount); router.delete('/accounts/:id', authMiddleware, deleteAccount); };
