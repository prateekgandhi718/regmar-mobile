import express from 'express';
import { getMyInvestments } from '../controllers/investments';
import { authMiddleware } from '../middlewares/auth';

export default (router: express.Router) => {
  router.get('/investments/me', authMiddleware, getMyInvestments);
};

