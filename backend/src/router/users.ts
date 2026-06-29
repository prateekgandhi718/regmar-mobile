import express from 'express';
import { updatePreferences, updateProfile, getMe } from '../controllers/users';
import { authMiddleware } from '../middlewares/auth';

export default (router: express.Router) => {
  router.get('/users/me', authMiddleware, getMe);
  router.patch('/users/profile', authMiddleware, updateProfile);
  router.patch('/users/preferences', authMiddleware, updatePreferences);
};
