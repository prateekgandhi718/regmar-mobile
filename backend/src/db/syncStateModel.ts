import mongoose from 'mongoose';

const SyncStateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  domainId: { type: mongoose.Schema.Types.ObjectId, ref: 'Domain', required: true },
  lastUid: { type: Number, default: 0 },
}, { timestamps: true });

// Ensure unique sync state per user and domain
SyncStateSchema.index({ userId: 1, domainId: 1 }, { unique: true });

export const SyncStateModel = mongoose.model('SyncState', SyncStateSchema);

export const getSyncState = (userId: string, domainId: string) => SyncStateModel.findOne({ userId, domainId });
export const updateSyncState = (userId: string, domainId: string, lastUid: number) => 
  SyncStateModel.findOneAndUpdate({ userId, domainId }, { lastUid }, { upsert: true, new: true });
export const deleteSyncStatesByDomainId = (domainId: string) => SyncStateModel.deleteMany({ domainId });
export const deleteSyncStatesByUserId = (userId: string) => SyncStateModel.deleteMany({ userId });
