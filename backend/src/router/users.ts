import express from 'express';
import { updatePreferences, updateProfile, getMe, deleteMe } from '../controllers/users';
import { authMiddleware } from '../middlewares/auth';

export default (router: express.Router) => {
  router.get('/users/me', authMiddleware, getMe);
  router.delete('/users/me', authMiddleware, deleteMe);
  router.patch('/users/profile', authMiddleware, updateProfile);
  router.patch('/users/preferences', authMiddleware, updatePreferences);
};
