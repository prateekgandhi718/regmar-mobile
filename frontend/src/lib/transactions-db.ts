import * as SQLite from "expo-sqlite";
import { decryptSensitive, encryptSensitive } from "@/lib/transactions-crypto";
import { getLocalAccounts } from "@/lib/accounts-db";
import type { NeedSelection, Transaction, TransactionCategory, TransactionFilter } from "@/lib/transactions-types";

const DB_NAME = "transactions.db";
const TXN_TABLE = "transactions";
const DB_SCHEMA_VERSION = 2;

type StoredTransactionRow = {
  client_txn_id: string;
  account_json: string;
  domain_json: string;
  user_id: string;
  original_date: string;
  new_date: string | null;
  original_description: string;
  new_description: string | null;
  original_amount: number;
  new_amount: number | null;
  type: "credit" | "debit";
  user_type: "credit" | "debit" | null;
  refunded: number;
  email_body_encrypted: string;
  category_id: string | null;
  category_name: string | null;
  need_key: NeedSelection["key"] | null;
  need_label: string | null;
  need_word: string | null;
  need_color: string | null;
  need_context_with: string | null;
  need_context_where: string | null;
  need_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
const getDb = () => {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbPromise;
};

const parseTransactionRow = async (row: StoredTransactionRow): Promise<Transaction> => {
  const emailBody = await decryptSensitive(row.email_body_encrypted);

  const categoryId: TransactionCategory | undefined =
    row.category_id && row.category_name
      ? {
          _id: row.category_id,
          name: row.category_name,
        }
      : undefined;

  const needSelection: NeedSelection | undefined =
    row.need_key && row.need_label && row.need_word && row.need_color
      ? {
          key: row.need_key,
          label: row.need_label,
          word: row.need_word,
          color: row.need_color,
          contextWith: row.need_context_with ?? undefined,
          contextWhere: row.need_context_where ?? undefined,
          completedAt: row.need_completed_at ?? undefined,
        }
      : undefined;

  return {
    clientTxnId: row.client_txn_id,
    accountId: JSON.parse(row.account_json),
    domainId: JSON.parse(row.domain_json),
    userId: row.user_id,
    originalDate: row.original_date,
    newDate: row.new_date ?? undefined,
    originalDescription: row.original_description,
    newDescription: row.new_description ?? undefined,
    originalAmount: row.original_amount,
    newAmount: row.new_amount ?? undefined,
    type: row.type,
    userType: row.user_type ?? undefined,
    refunded: Boolean(row.refunded),
    emailBody,
    categoryId,
    needSelection,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const initTransactionsDb = async () => {
  const db = await getDb();

  const versionRow = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version;",
  );
  if ((versionRow?.user_version ?? 0) < DB_SCHEMA_VERSION) {
    await db.execAsync(`DROP TABLE IF EXISTS ${TXN_TABLE};`);
    await db.execAsync(`PRAGMA user_version = ${DB_SCHEMA_VERSION};`);
  }

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS ${TXN_TABLE} (
      client_txn_id TEXT PRIMARY KEY NOT NULL,
      account_json TEXT NOT NULL,
      domain_json TEXT NOT NULL,
      user_id TEXT NOT NULL,
      original_date TEXT NOT NULL,
      new_date TEXT,
      original_description TEXT NOT NULL,
      new_description TEXT,
      original_amount REAL NOT NULL,
      new_amount REAL,
      type TEXT NOT NULL,
      user_type TEXT,
      refunded INTEGER NOT NULL DEFAULT 0,
      email_body_encrypted TEXT NOT NULL,
      category_id TEXT,
      category_name TEXT,
      need_key TEXT,
      need_label TEXT,
      need_word TEXT,
      need_color TEXT,
      need_context_with TEXT,
      need_context_where TEXT,
      need_completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_transactions_effective_date ON ${TXN_TABLE} (COALESCE(new_date, original_date) DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON ${TXN_TABLE} (category_id);
  `);

};

export const upsertTransactions = async (transactions: Transaction[]) => {
  if (!transactions.length) return;
  const db = await getDb();

  for (const tx of transactions) {
    const emailBodyEncrypted = await encryptSensitive(tx.emailBody || "");

    await db.runAsync(
      `INSERT INTO ${TXN_TABLE} (
        client_txn_id,
        account_json,
        domain_json,
        user_id,
        original_date,
        new_date,
        original_description,
        new_description,
        original_amount,
        new_amount,
        type,
        user_type,
        refunded,
        email_body_encrypted,
        category_id,
        category_name,
        need_key,
        need_label,
        need_word,
        need_color,
        need_context_with,
        need_context_where,
        need_completed_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(client_txn_id) DO UPDATE SET
        account_json = excluded.account_json,
        domain_json = excluded.domain_json,
        user_id = excluded.user_id,
        original_date = excluded.original_date,
        new_date = excluded.new_date,
        original_description = excluded.original_description,
        new_description = excluded.new_description,
        original_amount = excluded.original_amount,
        new_amount = excluded.new_amount,
        type = excluded.type,
        user_type = excluded.user_type,
        refunded = excluded.refunded,
        email_body_encrypted = excluded.email_body_encrypted,
        category_id = excluded.category_id,
        category_name = excluded.category_name,
        need_key = excluded.need_key,
        need_label = excluded.need_label,
        need_word = excluded.need_word,
        need_color = excluded.need_color,
        need_context_with = excluded.need_context_with,
        need_context_where = excluded.need_context_where,
        need_completed_at = excluded.need_completed_at,
        updated_at = excluded.updated_at`,
      tx.clientTxnId,
      JSON.stringify(tx.accountId),
      JSON.stringify(tx.domainId),
      tx.userId,
      tx.originalDate,
      tx.newDate ?? null,
      tx.originalDescription,
      tx.newDescription ?? null,
      tx.originalAmount,
      tx.newAmount ?? null,
      tx.type,
      tx.userType ?? null,
      tx.refunded ? 1 : 0,
      emailBodyEncrypted,
      tx.categoryId?._id ?? null,
      tx.categoryId?.name ?? null,
      tx.needSelection?.key ?? null,
      tx.needSelection?.label ?? null,
      tx.needSelection?.word ?? null,
      tx.needSelection?.color ?? null,
      tx.needSelection?.contextWith ?? null,
      tx.needSelection?.contextWhere ?? null,
      tx.needSelection?.completedAt ?? null,
      tx.createdAt,
      tx.updatedAt,
    );
  }
};

const buildFilterQuery = (filter?: TransactionFilter) => {
  const clauses: string[] = [];
  const params: Array<string | number> = [];

  if (filter?.fromDate) {
    clauses.push("COALESCE(new_date, original_date) >= ?");
    params.push(filter.fromDate);
  }

  if (filter?.toDate) {
    clauses.push("COALESCE(new_date, original_date) <= ?");
    params.push(filter.toDate);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return { where, params };
};

export const getTransactions = async (filter?: TransactionFilter) => {
  const db = await getDb();
  const { where, params } = buildFilterQuery(filter);
  const rows = await db.getAllAsync<StoredTransactionRow>(
    `SELECT * FROM ${TXN_TABLE} ${where} ORDER BY COALESCE(new_date, original_date) DESC`,
    ...params,
  );
  return Promise.all(rows.map(parseTransactionRow));
};

export const getTransactionById = async (clientTxnId: string) => {
  const db = await getDb();
  const row = await db.getFirstAsync<StoredTransactionRow>(
    `SELECT * FROM ${TXN_TABLE} WHERE client_txn_id = ?`,
    clientTxnId,
  );
  if (!row) return null;
  return parseTransactionRow(row);
};

type LocalTransactionPatch = {
  newDate?: string | null;
  newDescription?: string | null;
  newAmount?: number | null;
  refunded?: boolean;
  userType?: "credit" | "debit" | null;
  categoryId?: TransactionCategory | null;
  accountId?: string;
  accountMeta?: {
    _id: string;
    userId: string;
    title: string;
    currency: string;
    accountNumber?: string;
    fromEmail?: string;
  };
  needSelection?: NeedSelection | null;
};

type LocalCreateTransactionPayload = {
  clientTxnId: string;
  description: string;
  amount: number;
  date: string;
  userType: "credit" | "debit";
  accountId?: string;
  accountMeta?: {
    _id: string;
    userId: string;
    title: string;
    currency: string;
    accountNumber?: string;
    fromEmail?: string;
  };
  categoryId?: TransactionCategory | null;
  refunded?: boolean;
};

export const createTransactionLocal = async (payload: LocalCreateTransactionPayload) => {
  const now = new Date().toISOString();
  const accounts = await getLocalAccounts();
  const accountFromPayload = payload.accountMeta
    ? {
        _id: payload.accountMeta._id,
        userId: payload.accountMeta.userId,
        title: payload.accountMeta.title,
        currency: payload.accountMeta.currency || "INR",
        accountNumber: payload.accountMeta.accountNumber,
        domainIds: payload.accountMeta.fromEmail
          ? [
              {
                _id: "manual-local-domain",
                userId: payload.accountMeta.userId,
                accountId: payload.accountMeta._id,
                fromEmail: payload.accountMeta.fromEmail,
              },
            ]
          : [],
      }
    : null;
  const selectedAccount = payload.accountId ? accounts.find((item) => item._id === payload.accountId) : null;
  const fallbackAccount = accounts[0] || accountFromPayload;
  const account = selectedAccount || accountFromPayload || fallbackAccount;
  const domain = account?.domainIds?.[0];

  const transaction: Transaction = {
    clientTxnId: payload.clientTxnId,
    accountId: account
      ? {
          _id: account._id,
          userId: account.userId,
          title: account.title,
          currency: account.currency || "INR",
          accountNumber: account.accountNumber,
        }
      : {
          _id: "manual-local-account",
          userId: "manual-local-user",
          title: "Manual Entry",
          currency: "INR",
        },
    domainId: domain
      ? {
          _id: domain._id,
          userId: domain.userId,
          accountId: domain.accountId,
          fromEmail: domain.fromEmail,
        }
      : {
          _id: "manual-local-domain",
          userId: "manual-local-user",
          accountId: account?._id || "manual-local-account",
          fromEmail: "manual@local",
        },
    userId: account?.userId || "manual-local-user",
    originalDate: payload.date,
    newDate: payload.date,
    originalDescription: payload.description,
    newDescription: payload.description,
    originalAmount: payload.amount,
    newAmount: payload.amount,
    type: payload.userType,
    userType: payload.userType,
    refunded: Boolean(payload.refunded),
    emailBody: "",
    categoryId: payload.categoryId ?? undefined,
    createdAt: now,
    updatedAt: now,
  };

  await upsertTransactions([transaction]);
  return getTransactionById(payload.clientTxnId);
};

export const updateTransactionLocal = async (
  clientTxnId: string,
  patch: LocalTransactionPatch,
) => {
  const db = await getDb();
  const updates: string[] = [];
  const params: Array<string | number | null> = [];

  if (Object.prototype.hasOwnProperty.call(patch, "newDate")) {
    updates.push("new_date = ?");
    params.push(patch.newDate ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "newDescription")) {
    updates.push("new_description = ?");
    params.push(patch.newDescription ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "newAmount")) {
    updates.push("new_amount = ?");
    params.push(patch.newAmount ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "refunded")) {
    updates.push("refunded = ?");
    params.push(patch.refunded ? 1 : 0);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "userType")) {
    updates.push("user_type = ?");
    params.push(patch.userType ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "categoryId")) {
    updates.push("category_id = ?");
    params.push(patch.categoryId?._id ?? null);
    updates.push("category_name = ?");
    params.push(patch.categoryId?.name ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "accountId") || Object.prototype.hasOwnProperty.call(patch, "accountMeta")) {
    const accounts = await getLocalAccounts();
    const accountFromPayload = patch.accountMeta
      ? {
          _id: patch.accountMeta._id,
          userId: patch.accountMeta.userId,
          title: patch.accountMeta.title,
          currency: patch.accountMeta.currency || "INR",
          accountNumber: patch.accountMeta.accountNumber,
          domainIds: patch.accountMeta.fromEmail
            ? [
                {
                  _id: "manual-local-domain",
                  userId: patch.accountMeta.userId,
                  accountId: patch.accountMeta._id,
                  fromEmail: patch.accountMeta.fromEmail,
                },
              ]
            : [],
        }
      : null;
    const selectedAccount = patch.accountId ? accounts.find((item) => item._id === patch.accountId) : null;
    const account = selectedAccount || accountFromPayload || accounts[0] || null;
    const domain = account?.domainIds?.[0] || null;

    if (account) {
      updates.push("account_json = ?");
      params.push(
        JSON.stringify({
          _id: account._id,
          userId: account.userId,
          title: account.title,
          currency: account.currency || "INR",
          accountNumber: account.accountNumber,
        }),
      );
      updates.push("user_id = ?");
      params.push(account.userId || "local");
      updates.push("domain_json = ?");
      params.push(
        JSON.stringify({
          _id: domain?._id || "manual-local-domain",
          userId: domain?.userId || account.userId || "local",
          accountId: domain?.accountId || account._id,
          fromEmail: domain?.fromEmail || patch.accountMeta?.fromEmail || "manual@local",
        }),
      );
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, "needSelection")) {
    updates.push("need_key = ?");
    params.push(patch.needSelection?.key ?? null);
    updates.push("need_label = ?");
    params.push(patch.needSelection?.label ?? null);
    updates.push("need_word = ?");
    params.push(patch.needSelection?.word ?? null);
    updates.push("need_color = ?");
    params.push(patch.needSelection?.color ?? null);
    updates.push("need_context_with = ?");
    params.push(patch.needSelection?.contextWith ?? null);
    updates.push("need_context_where = ?");
    params.push(patch.needSelection?.contextWhere ?? null);
    updates.push("need_completed_at = ?");
    params.push(patch.needSelection?.completedAt ?? null);
  }

  if (!updates.length) return getTransactionById(clientTxnId);

  updates.push("updated_at = ?");
  params.push(new Date().toISOString());
  params.push(clientTxnId);

  await db.runAsync(
    `UPDATE ${TXN_TABLE} SET ${updates.join(", ")} WHERE client_txn_id = ?`,
    ...params,
  );
  return getTransactionById(clientTxnId);
};

export const deleteTransactionLocal = async (clientTxnId: string) => {
  const db = await getDb();
  await db.runAsync(`DELETE FROM ${TXN_TABLE} WHERE client_txn_id = ?`, clientTxnId);
};

export const clearAllTransactionsLocal = async () => {
  const db = await getDb();
  await db.runAsync(`DELETE FROM ${TXN_TABLE}`);
};
