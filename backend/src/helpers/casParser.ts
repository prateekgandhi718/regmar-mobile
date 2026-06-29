import { getStockByIsin } from "./stockMaster";

export interface ParsedCAS {
  casId: string;
  statementPeriod: string;
  summary: {
    totalValue: number;
    equityValue: number;
    mfFolioValue: number;
    mfDematValue: number;
  };
  historicalValuation: Array<{
    monthYear: string;
    value: number;
    changeValue: number;
    changePercentage: number;
  }>;
  mutualFunds: Array<{
    name: string;
    amc: string;
    isin: string;
    folio: string;
    type: 'Regular' | 'Direct';
    units: number;
    nav: number;
    investedValue: number;
    currentValue: number;
    unrealizedPnL: number;
    unrealizedPnLPercentage: number;
    sipActive: boolean;
    sipMonthlyAmount: number;
  }>;
  stocks: Array<{
    name: string;
    ticker: string;
    isin: string;
    currentBalance: number;
    frozenBalance: number;
    pledgeBalance: number;
    freeBalance: number;
    marketPrice: number;
    currentValue: number;
  }>;
}

type MFMeta = {
  amc: string;
  scheme: string;
  folio: string;
};


const parseAmount = (val: string | undefined): number => {
  if (!val || val === '--' || val.toLowerCase() === 'n.a') return 0;
  const cleaned = val.replace(/[^\d.-]/g, '').trim();
  return parseFloat(cleaned) || 0;
};

const cleanStockName = (name: string): string => {
  return name
    // corporate action noise
    .replace(/RS\.?\s*\d+\/-?/gi, '')
    .replace(/WITH\s+FACE\s+VALUE.*$/gi, '')
    .replace(/AFTER\s+(SUB[-\s]?DIVISION|SPLIT).*/gi, '')
    .replace(/SUB[-\s]?DIVISION/gi, '')
    .replace(/EQUITY\s+SHARES?/gi, '')
    .replace(/FULLY\s+PAID/gi, '')
    .replace(/NEW/gi, '')

    // ordering garbage
    .replace(/^(LIMITED|SHARES|DIVISION)\s+/gi, '')
    .replace(/\s+(LIMITED)$/gi, ' LIMITED')

    // junk symbols
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const cleanMFName = (name: string): string => {
  return name
    .replace(/Scheme Name\s*:/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const extractTrailingNumber = (val: string | undefined): number => {
  if (!val) return 0;
  const trailingNumber = val.match(/(-?\d[\d,]*(?:\.\d+)?)\s*$/);
  if (trailingNumber) return parseAmount(trailingNumber[1]);
  return parseAmount(val);
};

const extractFirstDecimalAfterDate = (line: string): number => {
  const dateMatch = line.match(/\b\d{2}-\d{2}-\d{4}\b/);
  if (!dateMatch) return 0;
  const dateStart = dateMatch.index || 0;
  const afterDate = line.slice(dateStart + dateMatch[0].length);
  const decimalAmountMatch = afterDate.match(/-?\d[\d,]*\.\d+/);
  return parseAmount(decimalAmountMatch?.[0]);
};

const extractMfSipAmountsByIsin = (lines: string[]): Record<string, number> => {
  const sipAmountByIsin: Record<string, number> = {};
  const sipKeywordRegex = /\b(sip|systematic)\b/i;
  const startRegex = /statement of transactions for the period/i;
  const endRegex = /mutual fund units held as on/i;

  let inMfTransactionSection = false;
  let currentIsin = '';
  let sipMarkerWindow = 0;

  for (const line of lines) {
    if (startRegex.test(line)) {
      inMfTransactionSection = true;
      currentIsin = '';
      sipMarkerWindow = 0;
      continue;
    }

    if (inMfTransactionSection && endRegex.test(line)) {
      inMfTransactionSection = false;
      currentIsin = '';
      sipMarkerWindow = 0;
      continue;
    }

    if (!inMfTransactionSection) continue;

    const isinMatch = line.match(/ISIN\s*:\s*(INF[A-Z0-9]{9})/i);
    if (isinMatch) {
      currentIsin = isinMatch[1];
    }

    if (sipKeywordRegex.test(line)) {
      sipMarkerWindow = 5;
    }

    const amount = extractFirstDecimalAfterDate(line);
    if (currentIsin && amount > 0 && sipMarkerWindow > 0) {
      sipAmountByIsin[currentIsin] = (sipAmountByIsin[currentIsin] || 0) + amount;
    }

    if (sipMarkerWindow > 0) sipMarkerWindow -= 1;
  }

  return sipAmountByIsin;
};

export const parseCASText = (fullText: string): ParsedCAS | null => {
  try {
    const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    const result: ParsedCAS = {
      casId: '',
      statementPeriod: '',
      summary: {
        totalValue: 0,
        equityValue: 0,
        mfFolioValue: 0,
        mfDematValue: 0,
      },
      historicalValuation: [],
      mutualFunds: [],
      stocks: [],
    };

    const mfSipAmountByIsin = extractMfSipAmountsByIsin(lines);

    // ---- MF META LOOKUP (from MF DETAILS section) ----
    const mfMetaByIsin: Record<string, MFMeta> = {};
    let mfCurrentAMC = '';
    let mfCurrentScheme = '';
    let mfCurrentFolio = '';
    let inMFDetailsSection = false;

    // 1. Metadata
    const casIdMatch = fullText.match(/CAS ID:\s*([A-Z0-9]+)/i);
    if (casIdMatch) result.casId = casIdMatch[1];

    const periodMatch = fullText.match(/Statement for the period from\s+(.+?)\s+to\s+(.+?)(?:\s|$)/i);
    if (periodMatch) result.statementPeriod = `${periodMatch[1]} - ${periodMatch[2]}`;
    
    // 2. Section Based Parsing
    let currentSection: 'NONE' | 'HISTORICAL' | 'SUMMARY' | 'STOCKS' | 'MFS' = 'NONE';
    let lastIsinIdx = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // ========== MF DETAILS PARSING (METADATA EXTRACTION) ==========
      // Check if we're entering/exiting MF details section
      if (line.includes('MF Folios') || line.includes('AMC Name :')) {
        inMFDetailsSection = true;
      }
      
      // Reset AMC when we encounter a new AMC line
      if (inMFDetailsSection && /^AMC Name\s*:/i.test(line)) {
        mfCurrentAMC = line.split(':')[1]?.trim() || '';
        // Reset scheme and folio when AMC changes
        mfCurrentScheme = '';
        mfCurrentFolio = '';
        continue;
      }

      if (inMFDetailsSection && /^Scheme Name\s*:/i.test(line)) {
        mfCurrentScheme = line.split(':')[1]?.trim() || '';
        continue;
      }

      if (inMFDetailsSection && /^Folio No\.?\s*:/i.test(line)) {
        mfCurrentFolio = line.split(':')[1]?.trim() || '';
        continue;
      }

      // Look for ISIN in MF details section
      if (inMFDetailsSection) {
        const mfIsinMatch = line.match(/ISIN\s*:\s*(INF[A-Z0-9]{9})/i);
        if (mfIsinMatch) {
          const isin = mfIsinMatch[1];
          
          // Only store if we have all required info
          if (mfCurrentAMC && mfCurrentScheme) {
            mfMetaByIsin[isin] = {
              amc: mfCurrentAMC,
              scheme: mfCurrentScheme,
              folio: mfCurrentFolio || '',
            };
            
            // Reset scheme and folio for next MF, but keep AMC
            mfCurrentScheme = '';
            mfCurrentFolio = '';
          }
          continue;
        }
      }
      
      // Exit MF details section when we encounter other sections
      if (inMFDetailsSection && (line.includes('DP Name :') || line.includes('NOTES TO CAS') || line.includes('SUMMARY OF INVESTMENTS'))) {
        inMFDetailsSection = false;
        mfCurrentAMC = '';
        mfCurrentScheme = '';
        mfCurrentFolio = '';
      }
      // ========== END MF DETAILS PARSING ==========


      const lower = line.toLowerCase();

      // Section Transitions
      if (lower.includes('valuation for year') || (lower.includes('month-year') && lower.includes('changes'))) {
        currentSection = 'HISTORICAL';
        continue;
      } else if (lower.includes('assets class') || (lower.includes('equity') && lower.includes('%') && lower.includes('value'))) {
        currentSection = 'SUMMARY';
        continue;
      } else if (lower.includes('holding statement as on') || (lower.includes('isin') && lower.includes('security') && lower.includes('current balance'))) {
        currentSection = 'STOCKS';
        lastIsinIdx = -1;
        continue;
      } else if (lower.includes('mutual fund units held as on')) {
        currentSection = 'MFS';
        lastIsinIdx = -1;
        continue;
      }

      if (currentSection === 'HISTORICAL') {
        const histMatch = line.match(/^([A-Z][a-z]{2}\s+\d{4})\s+([\d,]+\.\d+)/);
        if (histMatch) {
          const parts = line.split(/\s{2,}/).filter(p => p.length > 0);
          if (parts.length >= 2) {
            result.historicalValuation.push({
              monthYear: parts[0],
              value: parseAmount(parts[1]),
              changeValue: parseAmount(parts[2]),
              changePercentage: parseAmount(parts[3])
            });
          }
        } else if (result.historicalValuation.length > 0 && !lower.includes('asset class')) {
           // End historical section if we find something else
           // But let's keep it until next section transition
        }
      } else if (currentSection === 'SUMMARY') {
        const amountMatch = line.match(/([\d,]+\.\d+)/);
        if (amountMatch) {
          const val = parseAmount(amountMatch[1]);
          if (lower.includes('mutual fund folios')) result.summary.mfFolioValue = val;
          else if (lower.includes('equity') && !lower.includes('mutual')) result.summary.equityValue = val;
          else if (lower.includes('demat form')) result.summary.mfDematValue = val;
          else if (lower.includes('total') && !lower.includes('isins')) result.summary.totalValue = val;
        }
      } else if (currentSection === 'STOCKS') {
        const isinMatch = line.match(/(INE[A-Z0-9]{9}|INF[A-Z0-9]{9})/);
        if (isinMatch && line.match(/[\d,]+\.\d+/)) {
          const isin = isinMatch[1];
          const parts = line.split(/\s{2,}/).filter(p => p.length > 0);
          const idxInParts = parts.findIndex(p => p.includes(isin));
          
          if (idxInParts !== -1 && parts.length >= idxInParts + 4) {
             const securityOrCurrentPart = parts[idxInParts + 1] || '';
             const hasSecurityText = /[A-Za-z]/.test(securityOrCurrentPart);

             let currentBalance = 0;
             let frozenIndex = idxInParts + 2;

             if (hasSecurityText) {
               const trailingCurrent = extractTrailingNumber(securityOrCurrentPart);
               if (trailingCurrent !== 0 || /\d/.test(securityOrCurrentPart)) {
                 currentBalance = trailingCurrent;
                 frozenIndex = idxInParts + 2;
               } else {
                 currentBalance = parseAmount(parts[idxInParts + 2]);
                 frozenIndex = idxInParts + 3;
               }
             } else {
               currentBalance = parseAmount(securityOrCurrentPart);
               frozenIndex = idxInParts + 2;
             }

             let nameParts = [];
             for (let j = Math.max(lastIsinIdx + 1, i - 2); j < i; j++) {
               if (!lines[j].includes('---') && !lines[j].includes('Page')) nameParts.push(lines[j]);
             }
             nameParts.push(parts[0].replace(isin, '').trim());
             
             const stockMeta = getStockByIsin(isin)
             result.stocks.push({
               isin,
               name: stockMeta?.name || cleanStockName(nameParts.join(' ')),
               ticker: stockMeta?.symbol || '',
               currentBalance,
               frozenBalance: parseAmount(parts[frozenIndex]),
               pledgeBalance: parseAmount(parts[frozenIndex + 1]),
               freeBalance: parseAmount(parts[frozenIndex + 3]),
               marketPrice: parseAmount(parts[frozenIndex + 4]),
               currentValue: parseAmount(parts[frozenIndex + 5])
             });
             lastIsinIdx = i;
          }
        }
      } else if (currentSection === 'MFS') {
        const isinMatch = line.match(/(INF[A-Z0-9]{9})/);
        if (isinMatch && line.match(/[\d,]+\.\d+/)) {
          const isin = isinMatch[1];
          const parts = line.split(/\s{2,}/).filter(p => p.length > 0);
          const idxInParts = parts.findIndex(p => p.includes(isin));
      
          if (idxInParts !== -1 && parts.length >= idxInParts + 5) {
            // Get metadata for this ISIN
            const meta = mfMetaByIsin[isin];
            
            // Extract scheme name from the line
            let schemeName = '';
            if (meta?.scheme) {
              // Use the scheme from metadata
              schemeName = meta.scheme;
            } else {
              // Fallback: try to extract from the line
              const nameStart = parts.slice(0, idxInParts).join(' ');
              schemeName = cleanMFName(nameStart);
            }
            
            // Determine fund type
            const isDirect = /direct/i.test(schemeName);
            
            result.mutualFunds.push({
              isin,
              name: cleanMFName(schemeName),
              amc: meta?.amc || '',
              folio: meta?.folio || parts[idxInParts + 1] || '',
              units: parseAmount(parts[idxInParts + 2]),
              nav: parseAmount(parts[idxInParts + 3]),
              investedValue: parseAmount(parts[idxInParts + 4]),
              currentValue: parseAmount(parts[idxInParts + 5]),
              unrealizedPnL: parseAmount(parts[idxInParts + 6]),
              unrealizedPnLPercentage: parseAmount(parts[idxInParts + 7]),
              sipActive: (mfSipAmountByIsin[isin] || 0) > 0,
              sipMonthlyAmount: Number((mfSipAmountByIsin[isin] || 0).toFixed(2)),
              type: isDirect ? 'Direct' : 'Regular',
            });
            
            lastIsinIdx = i;
          }
        }
      }
    }

    // Final fallback for total value
    if (result.summary.totalValue === 0) {
      const totalMatch = fullText.match(/Total Portfolio Value\s+(?:across investments\s+)?(?:₹|`|Rs\.)?\s*([\d,]+\.\d+)/i);
      if (totalMatch) result.summary.totalValue = parseAmount(totalMatch[1]);
    }

    return result;
  } catch (error) {
    console.error('Final Refined CAS Parsing Error:', error);
    return null;
  }
};
