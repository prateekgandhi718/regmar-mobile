import express from 'express';
import { getUserAccounts, addUserAccount, updateAccount, deleteAccount } from '../controllers/accounts';
import { authMiddleware } from '../middlewares/auth';

export default (router: express.Router) => {
  router.get('/accounts', authMiddleware, getUserAccounts);
  router.post('/accounts', authMiddleware, addUserAccount);
  router.patch('/accounts/:id', authMiddleware, updateAccount);
  router.delete('/accounts/:id', authMiddleware, deleteAccount);
};

