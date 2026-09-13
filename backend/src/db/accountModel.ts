import mongoose from 'mongoose';

const AccountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  icon: String,
  currency: { type: String, default: 'INR' },
  accountNumber: String,
  domainIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Domain' }],
}, { timestamps: true });

export const AccountModel = mongoose.model('Account', AccountSchema);
export const getAccountsByUserId = (userId: string) => AccountModel.find({ userId }).populate('domainIds');
export const getAccountById = (id: string) => AccountModel.findById(id);
export const createAccount = (values: Record<string, unknown>) => new AccountModel(values).save();
export const updateAccountById = (id: string, values: Record<string, unknown>) => AccountModel.findByIdAndUpdate(id, values, { new: true }).populate('domainIds');
export const deleteAccountById = (id: string) => AccountModel.findByIdAndDelete(id);
