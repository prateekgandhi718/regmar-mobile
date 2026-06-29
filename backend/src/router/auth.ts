import express from 'express';
import { requestOtp, verifyOtp, refreshToken } from '../controllers/auth';

export default (router: express.Router) => {
  router.post('/auth/request-otp', requestOtp);
  router.post('/auth/verify-otp', verifyOtp);
  router.post('/auth/refresh-token', refreshToken);
};

