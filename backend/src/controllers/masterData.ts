import express from 'express';
import { getCategories } from '../db/categoryModel';
import { AuthRequest } from '../middlewares/auth';

export const getAllCategories = async (req: AuthRequest, res: express.Response) => {
  try {
    const categories = await getCategories();
    return res.status(200).json(categories);
  } catch (error) {
    console.error(error);
    return res.sendStatus(400);
  }
};

