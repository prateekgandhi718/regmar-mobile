import mongoose from 'mongoose';

const DomainSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  fromEmail: { type: String, required: true },
}, { timestamps: true });

export const DomainModel = mongoose.model('Domain', DomainSchema);

export const getDomainsByAccountId = (accountId: string) => DomainModel.find({ accountId });
export const getDomainById = (id: string) => DomainModel.findById(id);
export const createDomain = (values: Record<string, any>) => new DomainModel(values).save();
export const updateDomainById = (id: string, values: Record<string, any>) => DomainModel.findByIdAndUpdate(id, values, { new: true });
export const deleteDomainById = (id: string) => DomainModel.findByIdAndDelete(id);
export const deleteDomainsByAccountId = (accountId: string) => DomainModel.deleteMany({ accountId });
