import express from 'express';
import { getAllCategories } from '../controllers/masterData';
import { authMiddleware } from '../middlewares/auth';

export default (router: express.Router) => {
  router.get('/master/categories', authMiddleware, getAllCategories);
};

