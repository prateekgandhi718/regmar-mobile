import mongoose from 'mongoose';

const LinkedAccountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  provider: { type: String, required: true, default: 'gmail' },
  email: { type: String, required: true },
  appPassword: { type: String, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const LinkedAccountModel = mongoose.model('LinkedAccount', LinkedAccountSchema);

export const getLinkedAccountsByUserId = (userId: string) => LinkedAccountModel.find({ userId });
export const getActiveLinkedAccountByUserId = (userId: string) => LinkedAccountModel.findOne({ userId, isActive: true });
export const createLinkedAccount = (values: Record<string, any>) => new LinkedAccountModel(values).save();
export const updateLinkedAccountById = (id: string, values: Record<string, any>) => LinkedAccountModel.findByIdAndUpdate(id, values, { new: true });
export const deleteLinkedAccountById = (id: string) => LinkedAccountModel.findByIdAndDelete(id);
export const deleteLinkedAccountsByUserId = (userId: string) => LinkedAccountModel.deleteMany({ userId });

