import express from 'express';
import { AuthRequest } from '../middlewares/auth';
import { AccountModel, createAccount, getAccountsByUserId, getAccountById, updateAccountById, deleteAccountById } from '../db/accountModel';
import { createDomain, deleteDomainsByAccountId, getDomainsByAccountId } from '../db/domainModel';
import { deleteTransactionsByAccountId } from '../db/transactionModel';

const bodyDomains = (value: unknown) => Array.isArray(value) ? value.map(String).map(v => v.trim().toLowerCase()).filter(Boolean) : [];
export const getUserAccounts = async (req: AuthRequest, res: express.Response) => res.json(await getAccountsByUserId(req.userId!));
export const addUserAccount = async (req: AuthRequest, res: express.Response) => {
  const { title, currency = 'INR', accountNumber, icon } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ message: 'Title is required' });
  const account = await createAccount({ userId: req.userId, title: title.trim(), currency, accountNumber, icon, domainIds: [] });
  const domains = await Promise.all(bodyDomains(req.body.domainNames).map(fromEmail => createDomain({ userId: req.userId, accountId: account._id, fromEmail })));
  const result = await updateAccountById(String(account._id), { domainIds: domains.map(d => d._id) });
  return res.status(201).json(result);
};
export const updateAccount = async (req: AuthRequest, res: express.Response) => {
  const account = await getAccountById(req.params.id);
  if (!account || String(account.userId) !== req.userId) return res.sendStatus(404);
  const { title, currency = 'INR', accountNumber, icon } = req.body || {};
  const values: Record<string, unknown> = { title: title?.trim(), currency, accountNumber, icon };
  if (Array.isArray(req.body.domainNames)) {
    await deleteDomainsByAccountId(req.params.id);
    const domains = await Promise.all(bodyDomains(req.body.domainNames).map(fromEmail => createDomain({ userId: req.userId, accountId: req.params.id, fromEmail })));
    values.domainIds = domains.map(d => d._id);
  }
  return res.json(await updateAccountById(req.params.id, values));
};
export const deleteAccount = async (req: AuthRequest, res: express.Response) => {
  const account = await getAccountById(req.params.id);
  if (!account || String(account.userId) !== req.userId) return res.sendStatus(404);
  await Promise.all([deleteDomainsByAccountId(req.params.id), deleteTransactionsByAccountId(req.params.id), deleteAccountById(req.params.id)]);
  return res.json({ message: 'Account and associated data deleted successfully' });
};
