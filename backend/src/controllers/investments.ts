import express from 'express';
import { AuthRequest } from '../middlewares/auth';
import { getInvestmentByUserId } from '../db/investmentModel';

const isStock = (isin?: string | null) =>
  typeof isin === 'string' && isin.startsWith('INE');

const safeNumber = (value?: number | null) => value ?? 0;

export const getMyInvestments = async (
  req: AuthRequest,
  res: express.Response
) => {
  try {
    const userId = req.userId;
    if (!userId) return res.sendStatus(401);

    const investment = await getInvestmentByUserId(userId);
    if (!investment) return res.status(200).json(null);

    /**
     * equityValue represents STOCKS ONLY for percentage calculation
     */
    const equityValue = safeNumber(investment.summary?.equityValue);

    // 1. Process Stocks (keeping the existing percentage logic)
    const stocks = investment.stocks.map(stock => {
      const currentValue = safeNumber(stock.currentValue);

      const currentPercentage =
        isStock(stock.isin) && equityValue > 0
          ? Number(((currentValue / equityValue) * 100).toFixed(2))
          : 0;

      return {
        ...stock.toObject?.() ?? stock,
        currentValue,
        marketPrice: safeNumber(stock.marketPrice),
        currentPercentage,
        isEtf: !isStock(stock.isin),
      };
    });

    const mutualFunds = (investment.mutualFunds || []).map(fund => {
      const sipMonthlyAmount = safeNumber((fund as any).sipMonthlyAmount);
      return {
        ...(fund as any).toObject?.() ?? fund,
        sipActive: Boolean((fund as any).sipActive) && sipMonthlyAmount > 0,
        sipMonthlyAmount: Number(sipMonthlyAmount.toFixed(2)),
      };
    });

    const activeSipFunds = mutualFunds.filter(fund => fund.sipActive).length;
    const totalMonthlySipAmount = Number(
      mutualFunds.reduce((sum, fund) => sum + safeNumber(fund.sipMonthlyAmount), 0).toFixed(2)
    );

    // 2. Return the full document structure
    return res.status(200).json({
      pan: investment.pan,
      lastSyncedAt: investment.lastSyncedAt,
      casId: investment.casId,
      statementPeriod: investment.statementPeriod,
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
    });

  } catch (error) {
    console.error('Get investments error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
