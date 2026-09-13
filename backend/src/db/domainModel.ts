import mongoose from 'mongoose';
const DomainSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
  fromEmail: { type: String, required: true, trim: true },
}, { timestamps: true });
export const DomainModel = mongoose.model('Domain', DomainSchema);
export const getDomainsByAccountId = (accountId: string) => DomainModel.find({ accountId });
export const createDomain = (values: Record<string, unknown>) => new DomainModel(values).save();
export const deleteDomainById = (id: string) => DomainModel.findByIdAndDelete(id);
export const deleteDomainsByAccountId = (accountId: string) => DomainModel.deleteMany({ accountId });
