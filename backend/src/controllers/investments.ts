import express from 'express';
import { AuthRequest } from '../middlewares/auth';

const isStock = (isin?: string | null) =>
  typeof isin === 'string' && isin.startsWith('INE');

const safeNumber = (value?: number | null) => value ?? 0;

type InvestmentStock = {
  isin?: string;
  currentValue?: number | null;
  marketPrice?: number | null;
  [key: string]: unknown;
};

type InvestmentMutualFund = {
  sipActive?: boolean | null;
  sipMonthlyAmount?: number | null;
  [key: string]: unknown;
};

type InvestmentShape = {
  pan?: string;
  lastSyncedAt?: Date | string;
  lastSyncedEmailUid?: number;
  casId?: string;
  statementPeriod?: string;
  summary?: {
    totalValue?: number | null;
    equityValue?: number | null;
    mfFolioValue?: number | null;
    mfDematValue?: number | null;
  };
  stocks?: InvestmentStock[];
  mutualFunds?: InvestmentMutualFund[];
  historicalValuation?: unknown[];
};

export const formatInvestmentPayload = (investment: InvestmentShape) => {
  const equityValue = safeNumber(investment.summary?.equityValue);

  const stocks = (investment.stocks || []).map((stock) => {
    const currentValue = safeNumber(stock.currentValue);
    const currentPercentage =
      isStock(stock.isin) && equityValue > 0
        ? Number(((currentValue / equityValue) * 100).toFixed(2))
        : 0;

    return {
      ...stock,
      currentValue,
      marketPrice: safeNumber(stock.marketPrice),
      currentPercentage,
      isEtf: !isStock(stock.isin),
    };
  });

  const mutualFunds = (investment.mutualFunds || []).map((fund) => {
    const sipMonthlyAmount = safeNumber(fund.sipMonthlyAmount);
    return {
      ...fund,
      sipActive: Boolean(fund.sipActive) && sipMonthlyAmount > 0,
      sipMonthlyAmount: Number(sipMonthlyAmount.toFixed(2)),
    };
  });

  const activeSipFunds = mutualFunds.filter((fund) => fund.sipActive).length;
  const totalMonthlySipAmount = Number(
    mutualFunds
      .reduce((sum, fund) => sum + safeNumber(fund.sipMonthlyAmount), 0)
      .toFixed(2),
  );

  return {
    pan: investment.pan || '',
    lastSyncedAt: investment.lastSyncedAt || null,
    lastSyncedEmailUid: investment.lastSyncedEmailUid || null,
    casId: investment.casId || '',
    statementPeriod: investment.statementPeriod || '',
    summary: {
      totalValue: safeNumber(investment.summary?.totalValue),
      equityValue,
      mfFolioValue: safeNumber(investment.summary?.mfFolioValue),
      mfDematValue: safeNumber(investment.summary?.mfDematValue),
    },
    sipSummary: {
      activeFunds: activeSipFunds,
      totalMonthlyAmount: totalMonthlySipAmount,
    },
    stocks,
    mutualFunds,
    historicalValuation: investment.historicalValuation || [],
  };
};

export const getMyInvestments = async (
  req: AuthRequest,
  res: express.Response
) => {
  try {
    const userId = req.userId;
    if (!userId) return res.sendStatus(401);
    return res.status(200).json({
      message:
        'Investments are stored locally on the device. Call POST /sync/investments to fetch latest data.',
      investment: null,
    });

  } catch (error) {
    console.error('Get investments error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
