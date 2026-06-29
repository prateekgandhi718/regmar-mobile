import fs from 'fs';
import path from 'path';

export type StockMasterEntry = {
  isin: string;
  symbol: string;
  name: string;
};

const stockByIsin: Record<string, StockMasterEntry> = {};

export const loadStockMaster = () => {
  const filePath = path.join(
    process.cwd(),
    'data',
    'EQUITY_L.csv'
  );

  const raw = fs.readFileSync(filePath, 'utf-8');

  const lines = raw
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const cols = line.split(',').map(c => c.trim());

    if (cols.length < 4) continue;

    const symbol = cols[0];
    const name = cols[1];
    const isin = cols[3];

    if (!isin || !/^(INE|INF)[A-Z0-9]{9}$/.test(isin)) continue;

    stockByIsin[isin] = {
      isin,
      symbol,
      name,
    };
  }

  console.log(
    `[StockMaster] Loaded ${Object.keys(stockByIsin).length} equity ISINs`
  );
};

export const getStockByIsin = (isin: string): StockMasterEntry => {
  return stockByIsin[isin];
};
