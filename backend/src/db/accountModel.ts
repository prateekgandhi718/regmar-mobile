import mongoose from 'mongoose';

const AccountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  icon: { type: String },
  currency: { type: String, required: true, default: 'INR' },
  accountNumber: { type: String },
  domainIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Domain' }],
}, { timestamps: true });

export const AccountModel = mongoose.model('Account', AccountSchema);

export const getAccountsByUserId = (userId: string) => AccountModel.find({ userId }).populate('domainIds');
export const getAccountById = (id: string) => AccountModel.findById(id);
export const createAccount = (values: Record<string, any>) => new AccountModel(values).save();
export const updateAccountById = (id: string, values: Record<string, any>) => AccountModel.findByIdAndUpdate(id, values, { new: true });
export const deleteAccountById = (id: string) => AccountModel.findByIdAndDelete(id);
