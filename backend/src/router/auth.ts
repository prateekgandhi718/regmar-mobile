import express from 'express';
import { registerDevice, refreshToken } from '../controllers/auth';

export default (router: express.Router) => {
  router.post('/auth/device/register', registerDevice);
  router.post('/auth/refresh-token', refreshToken);
};
