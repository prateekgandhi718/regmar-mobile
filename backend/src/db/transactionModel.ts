import mongoose from 'mongoose';
const TransactionSchema = new mongoose.Schema({
  clientTxnId: { type: String, unique: true, index: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  domainId: { type: mongoose.Schema.Types.ObjectId, ref: 'Domain' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  originalDate: Date, newDate: Date, originalDescription: String, newDescription: String,
  originalAmount: Number, newAmount: Number, type: { type: String, enum: ['credit', 'debit'] },
  userType: { type: String, enum: ['credit', 'debit', null] }, refunded: { type: Boolean, default: false },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' }, emailBody: String,
  isProcessed: { type: Boolean, default: true }, needSelection: mongoose.Schema.Types.Mixed,
}, { timestamps: true });
export const TransactionModel = mongoose.model('Transaction', TransactionSchema);
export const getTransactionsByUserId = (userId: string, filter: Record<string, unknown> = {}) => TransactionModel.find({ userId, ...filter }).sort({ newDate: -1, originalDate: -1 }).populate('categoryId', 'name').populate('accountId').populate('domainId');
export const createTransaction = (values: Record<string, unknown>) => new TransactionModel(values).save();
const idFilter = (id: string) => mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { clientTxnId: id }] } : { clientTxnId: id };
export const updateTransactionById = (id: string, userId: string, values: Record<string, unknown>) => TransactionModel.findOneAndUpdate({ ...idFilter(id), userId }, values, { new: true }).populate('categoryId', 'name').populate('accountId').populate('domainId');
export const deleteTransactionById = (id: string, userId: string) => TransactionModel.findOneAndDelete({ ...idFilter(id), userId });
export const deleteTransactionsByAccountId = (accountId: string) => TransactionModel.deleteMany({ accountId });
