import express from 'express';
import { upsertLinkedAccount, getLinkedAccounts, removeLinkedAccount } from '../controllers/linkedAccounts';
import { authMiddleware } from '../middlewares/auth';

export default (router: express.Router) => {
  router.get('/linked-accounts', authMiddleware, getLinkedAccounts);
  router.post('/linked-accounts/:provider', authMiddleware, upsertLinkedAccount);
  router.delete('/linked-accounts/:id', authMiddleware, removeLinkedAccount);
};
