import * as SQLite from "expo-sqlite";
import { decryptSensitive, encryptSensitive } from "@/lib/transactions-crypto";
import type { Transaction, TransactionCategory, TransactionFilter } from "@/lib/transactions-types";

const DB_NAME = "transactions.db";
const TXN_TABLE = "transactions";

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
  type_confidence: number | null;
  is_transaction_confidence: number | null;
  user_type: "credit" | "debit" | null;
  ner_model: string | null;
  entities_encrypted: string;
  corrected_entities_json: string | null;
  refunded: number;
  email_body_encrypted: string;
  category_id: string | null;
  category_name: string | null;
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
  const [emailBody, entitiesRaw] = await Promise.all([
    decryptSensitive(row.email_body_encrypted),
    decryptSensitive(row.entities_encrypted),
  ]);

  const categoryId: TransactionCategory | undefined =
    row.category_id && row.category_name
      ? {
          _id: row.category_id,
          name: row.category_name,
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
    typeConfidence: row.type_confidence ?? undefined,
    isTransactionConfidence: row.is_transaction_confidence ?? undefined,
    userType: row.user_type ?? undefined,
    nerModel: row.ner_model ?? undefined,
    entities: entitiesRaw ? JSON.parse(entitiesRaw) : [],
    correctedEntities: row.corrected_entities_json
      ? JSON.parse(row.corrected_entities_json)
      : null,
    refunded: Boolean(row.refunded),
    emailBody,
    categoryId,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const initTransactionsDb = async () => {
  const db = await getDb();

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
      type_confidence REAL,
      is_transaction_confidence REAL,
      user_type TEXT,
      ner_model TEXT,
      entities_encrypted TEXT NOT NULL,
      corrected_entities_json TEXT,
      refunded INTEGER NOT NULL DEFAULT 0,
      email_body_encrypted TEXT NOT NULL,
      category_id TEXT,
      category_name TEXT,
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
    const [emailBodyEncrypted, entitiesEncrypted] = await Promise.all([
      encryptSensitive(tx.emailBody || ""),
      encryptSensitive(JSON.stringify(tx.entities || [])),
    ]);

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
        type_confidence,
        is_transaction_confidence,
        user_type,
        ner_model,
        entities_encrypted,
        corrected_entities_json,
        refunded,
        email_body_encrypted,
        category_id,
        category_name,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        type_confidence = excluded.type_confidence,
        is_transaction_confidence = excluded.is_transaction_confidence,
        user_type = excluded.user_type,
        ner_model = excluded.ner_model,
        entities_encrypted = excluded.entities_encrypted,
        corrected_entities_json = excluded.corrected_entities_json,
        refunded = excluded.refunded,
        email_body_encrypted = excluded.email_body_encrypted,
        category_id = excluded.category_id,
        category_name = excluded.category_name,
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
      tx.typeConfidence ?? null,
      tx.isTransactionConfidence ?? null,
      tx.userType ?? null,
      tx.nerModel ?? null,
      entitiesEncrypted,
      tx.correctedEntities ? JSON.stringify(tx.correctedEntities) : null,
      tx.refunded ? 1 : 0,
      emailBodyEncrypted,
      tx.categoryId?._id ?? null,
      tx.categoryId?.name ?? null,
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

