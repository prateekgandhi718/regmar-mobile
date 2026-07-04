import express from 'express';
import { getNeeds } from '../db/needModel';
import { AuthRequest } from '../middlewares/auth';

export const getAllNeeds = async (req: AuthRequest, res: express.Response) => {
  try {
    const needs = await getNeeds();
    return res.status(200).json(needs);
  } catch (error) {
    console.error(error);
    return res.sendStatus(400);
  }
};
