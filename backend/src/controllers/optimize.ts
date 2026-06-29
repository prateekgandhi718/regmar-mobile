import express from 'express';
import { AuthRequest } from '../middlewares/auth';

const OPTIMIZER_BASE_URL =
  process.env.PYTHON_API_URL || 'http://localhost:8000';

export const runPortfolioOptimizer = async (
  req: AuthRequest,
  res: express.Response
) => {
  try {
    const userId = req.userId;
    const { tickers, period, riskFreeRate } = req.body as {
      tickers?: string[];
      period?: string;
      riskFreeRate?: number;
    };

    if (!userId) return res.sendStatus(401);

    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return res.status(400).json({ message: 'tickers must be a non-empty array' });
    }

    const response = await fetch(`${OPTIMIZER_BASE_URL}/optimize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tickers,
        period: period ?? '5y',
        riskFreeRate: riskFreeRate ?? 0.03,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.error(
        'Optimizer service error:',
        response.status,
        response.statusText,
        errorBody
      );

      // Forward 4xx from optimizer as-is, treat others as 500
      if (response.status >= 400 && response.status < 500) {
        return res
          .status(response.status)
          .json({ message: 'Optimization request invalid' });
      }

      return res
        .status(500)
        .json({ message: 'Optimization service failed' });
    }

    const result = await response.json();
    return res.status(200).json(result);
  } catch (error) {
    console.error('Run optimizer error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};