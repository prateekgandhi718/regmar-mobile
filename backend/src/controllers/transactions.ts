import express from 'express';
import { AuthRequest } from '../middlewares/auth';
import { getTransactionsByUserId, updateTransactionById, deleteTransactionById, createTransaction, TransactionModel } from '../db/transactionModel';
import { getAccountById } from '../db/accountModel';
export const createUserTransaction = async (req: AuthRequest, res: express.Response) => {
  const body = req.body || {};
  if (!body.accountId || !body.description || !body.date || !Number.isFinite(Number(body.amount))) return res.status(400).json({ message: 'accountId, description, date and amount are required' });
  const account = await getAccountById(String(body.accountId));
  if (!account || String(account.userId) !== req.userId) return res.sendStatus(404);
  const tx = await createTransaction({ clientTxnId: body.clientTxnId, accountId: body.accountId, userId: req.userId, originalDate: new Date(body.date), originalDescription: body.description, originalAmount: Number(body.amount), type: body.userType === 'credit' ? 'credit' : 'debit', userType: body.userType, refunded: Boolean(body.refunded), categoryId: body.categoryId?._id, isProcessed: true });
  return res.status(201).json(tx);
};
export const clearUserTransactions = async (req: AuthRequest, res: express.Response) => { await TransactionModel.deleteMany({ userId: req.userId }); return res.json({ message: 'Transactions cleared successfully' }); };
export const getUserTransactions = async (req: AuthRequest, res: express.Response) => {
  const filter: Record<string, unknown> = {};
  if (req.query.fromDate || req.query.toDate) filter.originalDate = { ...(req.query.fromDate ? { $gte: new Date(String(req.query.fromDate)) } : {}), ...(req.query.toDate ? { $lte: new Date(String(req.query.toDate)) } : {}) };
  return res.json(await getTransactionsByUserId(req.userId!, filter));
};
export const updateTransaction = async (req: AuthRequest, res: express.Response) => {
  const allowed = ['newDate', 'newDescription', 'newAmount', 'refunded', 'userType', 'categoryId', 'needSelection'];
  const values = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)));
  if (values.categoryId && typeof values.categoryId === 'object') values.categoryId = (values.categoryId as { _id?: string })._id;
  const tx = await updateTransactionById(req.params.id, req.userId!, values);
  return tx ? res.json(tx) : res.sendStatus(404);
};
export const deleteTransaction = async (req: AuthRequest, res: express.Response) => {
  const tx = await deleteTransactionById(req.params.id, req.userId!);
  return tx ? res.json({ message: 'Transaction deleted successfully' }) : res.sendStatus(404);
};
