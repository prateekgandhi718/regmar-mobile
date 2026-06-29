import express from 'express';
import auth from './auth';
import masterData from './masterData';
import accounts from './accounts';
import linkedAccounts from './linkedAccounts';
import sync from './sync';
import ai from './ai';
import transactions from './transactions';
import users from './users';
import investments from './investments';
import optimize from './optimize';
import nerTraining from './nerFeedback';
import txnClassifier from './txnClassifier';

const router = express.Router();

export default (): express.Router => {
  auth(router);
  masterData(router);
  accounts(router);
  linkedAccounts(router);
  sync(router);
  ai(router);
  transactions(router);
  users(router);
  investments(router);
  optimize(router);
  nerTraining(router);
  txnClassifier(router);
  return router;
};
