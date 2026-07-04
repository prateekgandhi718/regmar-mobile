export interface InvestmentSummary {
  totalValue: number;
  equityValue: number;
  mfFolioValue: number;
  mfDematValue: number;
}

export interface HistoricalValuation {
  monthYear: string;
  value: number;
  changeValue: number;
  changePercentage: number;
}

export interface MutualFund {
  name: string;
  amc: string;
  isin: string;
  folio: string;
  type: "Regular" | "Direct";
  units: number;
  nav: number;
  investedValue: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercentage: number;
  sipActive: boolean;
  sipMonthlyAmount: number;
}

export interface SipSummary {
  activeFunds: number;
  totalMonthlyAmount: number;
}

export interface Stock {
  name: string;
  ticker: string;
  isin: string;
  isEtf: boolean;
  currentBalance: number;
  frozenBalance: number;
  pledgeBalance: number;
  freeBalance: number;
  marketPrice: number;
  currentValue: number;
  currentPercentage: number;
}

export interface InvestmentData {
  pan: string;
  lastSyncedAt: string | null;
  lastSyncedEmailUid: number | null;
  casId: string;
  statementPeriod: string;
  summary: InvestmentSummary;
  sipSummary: SipSummary;
  historicalValuation: HistoricalValuation[];
  mutualFunds: MutualFund[];
  stocks: Stock[];
}
