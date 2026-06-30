import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, unique: true, sparse: true },
  deviceUuid: { type: String, required: true, unique: true, index: true },
  pan: { type: String },
  refreshTokenHash: { type: String },
  primaryColor: { type: String, default: '#f97316' },
}, { timestamps: true });

export const UserModel = mongoose.model('User', UserSchema);

export const getUserByEmail = (email: string) => UserModel.findOne({ email });
export const getUserByDeviceUuid = (deviceUuid: string) => UserModel.findOne({ deviceUuid });
export const getUserById = (id: string) => UserModel.findById(id);
export const createUser = (values: Record<string, any>) => new UserModel(values).save();
export const updateUserById = (id: string, values: Record<string, any>) => UserModel.findByIdAndUpdate(id, values, { new: true });
