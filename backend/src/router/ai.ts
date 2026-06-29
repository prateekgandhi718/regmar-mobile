import express from 'express';
import { generateRegexFromEmail } from '../controllers/ai';
import { authMiddleware } from '../middlewares/auth';

export default (router: express.Router) => {
  router.post('/ai/generate-regex', authMiddleware, generateRegexFromEmail);
};

