import express from 'express';
import { authMiddleware } from '../middlewares/auth';
import { runPortfolioOptimizer } from '../controllers/optimize';

export default (router: express.Router) => {
  router.post('/optimize/ultimate-portfolio', authMiddleware, runPortfolioOptimizer);
};