import mongoose from 'mongoose';

const OtpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, index: { expires: 300 } }, // Expires in 5 minutes
});

export const OtpModel = mongoose.model('Otp', OtpSchema);

export const getOtpByEmail = (email: string) => OtpModel.findOne({ email }).sort({ createdAt: -1 });
export const deleteOtpsByEmail = (email: string) => OtpModel.deleteMany({ email });
export const createOtp = (values: Record<string, any>) => new OtpModel(values).save();

