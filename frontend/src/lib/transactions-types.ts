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

export interface TransactionCategory {
  _id: string;
  name: string;
}

export interface NeedSelection {
  key: "protection" | "fuel" | "connection" | "freedom";
  label: string;
  word: string;
  color: string;
  contextWith?: string;
  contextWhere?: string;
  completedAt?: string;
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
  userType?: "credit" | "debit";
  refunded: boolean;
  emailBody: string;
  categoryId?: TransactionCategory;
  needSelection?: NeedSelection;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionFilter {
  fromDate?: string;
  toDate?: string;
}
