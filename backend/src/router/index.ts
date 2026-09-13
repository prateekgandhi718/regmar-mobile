import express from 'express';
import auth from './auth';
import masterData from './masterData';
import linkedAccounts from './linkedAccounts';
import sync from './sync';
import users from './users';
import investments from './investments';
import optimize from './optimize';
import accounts from './accounts';
import transactions from './transactions';

const router = express.Router();

export default (): express.Router => {
  auth(router);
  masterData(router);
  linkedAccounts(router);
  sync(router);
  users(router);
  investments(router);
  optimize(router);
  accounts(router);
  transactions(router);
  return router;
};
