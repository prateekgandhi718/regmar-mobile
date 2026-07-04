import express from 'express';
import { getCategories } from '../db/categoryModel';
import { getNeeds } from '../db/needModel';
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

export const getAllNeeds = async (req: AuthRequest, res: express.Response) => {
  try {
    const needs = await getNeeds();
    return res.status(200).json(needs);
  } catch (error) {
    console.error(error);
    return res.sendStatus(400);
  }
};
