import express from 'express';
import { getAllNeeds } from '../controllers/masterData';
import { authMiddleware } from '../middlewares/auth';

export default (router: express.Router) => {
  router.get('/master/needs', authMiddleware, getAllNeeds);
};
