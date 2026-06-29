export interface ClassifyEmailResponse {
  label?: number | null; // 0 = non-transaction, 1 = transaction
  is_transaction?: boolean | null;
  confidence: number;
  probabilities: Record<string, number>;
  error?: string | null;
}

export interface ClassifyTransactionTypeResponse {
  label?: number | null; // 0 = credit, 1 = debit
  type?: "credit" | "debit" | null;
  confidence: number;
  probabilities: Record<string, number>;
  error?: string | null;
}

export interface EntityData {
  text: string;
  label: string; // 'AMOUNT' or 'MERCHANT'
  start: number;
  end: number;
}

export interface ExtractEntitiesResponse {
  text: string;
  entities: EntityData[];
  model_version?: string;
  error?: string | null;
}

export interface TestResultEntry {
  emailSnippet: string;
  date: string | Date;
  emailClassification?: {
    label?: number | null;
    isTransaction?: boolean | null;
    confidence: number;
    probabilities: Record<string, number>;
  };
  typeClassification?:
    | {
        label?: number | null;
        type?: "credit" | "debit" | null;
        confidence: number;
        probabilities: Record<string, number>;
      }
    | { error: string };
  entities?: EntityData[] | { error: string };
  error?: string;
}