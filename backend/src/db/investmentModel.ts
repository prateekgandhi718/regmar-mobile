import mongoose from 'mongoose';

const InvestmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pan: { type: String, required: true },
  lastSyncedAt: { type: Date },
  lastSyncedEmailUid: { type: Number },
  casId: { type: String },
  statementPeriod: { type: String },
  summary: {
    totalValue: { type: Number },
    equityValue: { type: Number },
    mfFolioValue: { type: Number },
    mfDematValue: { type: Number },
  },
  historicalValuation: [{
    monthYear: { type: String },
    value: { type: Number },
    changeValue: { type: Number },
    changePercentage: { type: Number },
  }],
  mutualFunds: [{
    name: { type: String },
    amc: { type: String },
    isin: { type: String },
    folio: { type: String },
    type: { type: String, enum: ['Regular', 'Direct'] },
    units: { type: Number },
    nav: { type: Number },
    investedValue: { type: Number },
    currentValue: { type: Number },
    unrealizedPnL: { type: Number },
    unrealizedPnLPercentage: { type: Number },
    sipActive: { type: Boolean, default: false },
    sipMonthlyAmount: { type: Number, default: 0 },
  }],
  stocks: [{
    name: { type: String },
    ticker: { type: String },
    isin: { type: String },
    currentBalance: { type: Number },
    frozenBalance: { type: Number },
    pledgeBalance: { type: Number },
    freeBalance: { type: Number },
    marketPrice: { type: Number },
    currentValue: { type: Number },
  }],
}, { timestamps: true });

export const InvestmentModel = mongoose.model('Investment', InvestmentSchema);

export const getInvestmentByUserId = (userId: string) => InvestmentModel.findOne({ userId });
export const createInvestment = (values: Record<string, any>) => new InvestmentModel(values).save();
export const updateInvestmentByUserId = (userId: string, values: Record<string, any>) => 
  InvestmentModel.findOneAndUpdate({ userId }, values, { new: true, upsert: true });
