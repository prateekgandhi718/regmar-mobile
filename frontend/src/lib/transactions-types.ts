export interface Domain {
  _id: string;
  userId: string;
  accountId: string;
  fromEmail: string;
}

export interface Account {
  _id: string;
  userId: string;
  title: string;
  currency: string;
  accountNumber?: string;
}

export interface EntityData {
  label: string;
  start: number;
  end: number;
  text: string;
}

export interface TransactionCategory {
  _id: string;
  name: string;
}

export interface Transaction {
  clientTxnId: string;
  accountId: Account;
  domainId: Domain;
  userId: string;
  originalDate: string;
  newDate?: string;
  originalDescription: string;
  newDescription?: string;
  originalAmount: number;
  newAmount?: number;
  type: "credit" | "debit";
  typeConfidence?: number;
  isTransactionConfidence?: number;
  userType?: "credit" | "debit";
  nerModel?: string;
  entities: EntityData[];
  correctedEntities: EntityData[] | null;
  refunded: boolean;
  emailBody: string;
  categoryId?: TransactionCategory;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionFilter {
  fromDate?: string;
  toDate?: string;
}

