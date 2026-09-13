import mongoose from 'mongoose';
const InvestmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  pan: String, lastSyncedAt: Date, lastSyncedEmailUid: Number, casId: String, statementPeriod: String,
  summary: mongoose.Schema.Types.Mixed, historicalValuation: [mongoose.Schema.Types.Mixed],
  mutualFunds: [mongoose.Schema.Types.Mixed], stocks: [mongoose.Schema.Types.Mixed],
}, { timestamps: true });
export const InvestmentModel = mongoose.model('Investment', InvestmentSchema);
export const getInvestmentByUserId = (userId: string) => InvestmentModel.findOne({ userId });
export const updateInvestmentByUserId = (userId: string, values: Record<string, unknown>) => InvestmentModel.findOneAndUpdate({ userId }, { ...values, userId }, { upsert: true, new: true });
