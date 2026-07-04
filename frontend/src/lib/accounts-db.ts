import * as Crypto from "expo-crypto";
import * as SQLite from "expo-sqlite";

const DB_NAME = "transactions.db";
const ACCOUNTS_TABLE = "accounts_local";
const DOMAINS_TABLE = "domains_local";
const SYNC_STATE_TABLE = "txn_sync_state_local";

type StoredAccountRow = {
  client_account_id: string;
  title: string;
  currency: string;
  account_number: string | null;
};

type StoredDomainRow = {
  client_domain_id: string;
  client_account_id: string;
  from_email: string;
};

export interface LocalDomain {
  _id: string;
  userId: string;
  accountId: string;
  fromEmail: string;
}

export interface LocalAccount {
  _id: string;
  userId: string;
  title: string;
  currency: string;
  accountNumber?: string;
  domainIds: LocalDomain[];
}

type AddLocalAccountPayload = {
  title: string;
  currency: string;
  domainNames: string[];
  accountNumber?: string;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const getDb = () => {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbPromise;
};

const nowIso = () => new Date().toISOString();

const normalizeDomain = (domain: string) => domain.trim().toLowerCase();

const generateId = () => Crypto.randomUUID();

export const initAccountsDb = async () => {
  const db = await getDb();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ${ACCOUNTS_TABLE} (
      client_account_id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      currency TEXT NOT NULL,
      account_number TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ${DOMAINS_TABLE} (
      client_domain_id TEXT PRIMARY KEY NOT NULL,
      client_account_id TEXT NOT NULL,
      from_email TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_domains_account_id ON ${DOMAINS_TABLE} (client_account_id);
    CREATE TABLE IF NOT EXISTS ${SYNC_STATE_TABLE} (
      client_domain_id TEXT PRIMARY KEY NOT NULL,
      last_uid INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
  `);
};

export const getLocalAccounts = async (): Promise<LocalAccount[]> => {
  const db = await getDb();
  const [accounts, domains] = await Promise.all([
    db.getAllAsync<StoredAccountRow>(`SELECT * FROM ${ACCOUNTS_TABLE} ORDER BY updated_at DESC`),
    db.getAllAsync<StoredDomainRow>(`SELECT * FROM ${DOMAINS_TABLE}`),
  ]);

  const domainsByAccount = new Map<string, LocalDomain[]>();
  for (const domain of domains) {
    const list = domainsByAccount.get(domain.client_account_id) || [];
    list.push({
      _id: domain.client_domain_id,
      userId: "local",
      accountId: domain.client_account_id,
      fromEmail: domain.from_email,
    });
    domainsByAccount.set(domain.client_account_id, list);
  }

  return accounts.map((account) => ({
    _id: account.client_account_id,
    userId: "local",
    title: account.title,
    currency: account.currency,
    accountNumber: account.account_number || undefined,
    domainIds: domainsByAccount.get(account.client_account_id) || [],
  }));
};

export const addLocalAccount = async (payload: AddLocalAccountPayload): Promise<LocalAccount> => {
  const db = await getDb();
  const accountId = generateId();
  const timestamp = nowIso();
  const normalizedDomains = payload.domainNames
    .map(normalizeDomain)
    .filter(Boolean);

  await db.runAsync(
    `INSERT INTO ${ACCOUNTS_TABLE} (
      client_account_id,
      title,
      currency,
      account_number,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    accountId,
    payload.title.trim(),
    payload.currency || "INR",
    payload.accountNumber ?? null,
    timestamp,
    timestamp,
  );

  const domainIds: LocalDomain[] = [];
  for (const fromEmail of normalizedDomains) {
    const domainId = generateId();
    await db.runAsync(
      `INSERT INTO ${DOMAINS_TABLE} (
        client_domain_id,
        client_account_id,
        from_email,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?)`,
      domainId,
      accountId,
      fromEmail,
      timestamp,
      timestamp,
    );
    domainIds.push({
      _id: domainId,
      userId: "local",
      accountId,
      fromEmail,
    });
  }

  return {
    _id: accountId,
    userId: "local",
    title: payload.title.trim(),
    currency: payload.currency || "INR",
    accountNumber: payload.accountNumber,
    domainIds,
  };
};

export const deleteLocalAccount = async (clientAccountId: string) => {
  const db = await getDb();
  const domains = await db.getAllAsync<StoredDomainRow>(
    `SELECT client_domain_id FROM ${DOMAINS_TABLE} WHERE client_account_id = ?`,
    clientAccountId,
  );

  await db.runAsync(
    `DELETE FROM ${SYNC_STATE_TABLE} WHERE client_domain_id IN (
      SELECT client_domain_id FROM ${DOMAINS_TABLE} WHERE client_account_id = ?
    )`,
    clientAccountId,
  );
  await db.runAsync(`DELETE FROM ${DOMAINS_TABLE} WHERE client_account_id = ?`, clientAccountId);
  await db.runAsync(`DELETE FROM ${ACCOUNTS_TABLE} WHERE client_account_id = ?`, clientAccountId);

  return domains.length > 0;
};

export const getSyncStateMap = async (): Promise<Record<string, number>> => {
  const db = await getDb();
  const rows = await db.getAllAsync<{ client_domain_id: string; last_uid: number }>(
    `SELECT client_domain_id, last_uid FROM ${SYNC_STATE_TABLE}`,
  );
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.client_domain_id] = Number(row.last_uid || 0);
    return acc;
  }, {});
};

export const upsertSyncStateUpdates = async (updates: Record<string, number>) => {
  const entries = Object.entries(updates || {});
  if (!entries.length) return;

  const db = await getDb();
  const timestamp = nowIso();
  for (const [clientDomainId, lastUid] of entries) {
    await db.runAsync(
      `INSERT INTO ${SYNC_STATE_TABLE} (client_domain_id, last_uid, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(client_domain_id) DO UPDATE SET
         last_uid = excluded.last_uid,
         updated_at = excluded.updated_at`,
      clientDomainId,
      Number(lastUid || 0),
      timestamp,
    );
  }
};

export const buildSyncAccountsPayload = async () => {
  const accounts = await getLocalAccounts();
  return accounts.map((account) => ({
    clientAccountId: account._id,
    title: account.title,
    currency: account.currency,
    accountNumber: account.accountNumber,
    domains: (account.domainIds || []).map((domain) => ({
      clientDomainId: domain._id,
      fromEmail: domain.fromEmail,
    })),
  }));
};
