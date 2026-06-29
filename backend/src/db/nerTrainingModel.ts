import mongoose from 'mongoose';

const NerEntitySchema = new mongoose.Schema({
  label: { type: String, required: true },
  start: { type: Number, required: true },
  end: { type: Number, required: true },
  text: { type: String, required: true },
});

const NerTrainingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true, unique: true},

  emailText: { type: String, required: true },

  modelEntities: [NerEntitySchema], // what model predicted
  correctedEntities: [NerEntitySchema], // what user fixed

  nerModelVersion: { type: String }, // model used at time

  source: {
    type: String,
    enum: ['user_feedback', 'manual_seed'],
    default: 'user_feedback',
  },

  reviewed: { type: Boolean, default: false },

  usedForTraining: { type: Boolean, default: false },
  trainedAt: { type: Date, default: null },

}, { timestamps: true });

export const NerTrainingModel = mongoose.model(
  'NerTraining',
  NerTrainingSchema
);

export const createNerTraining = (values: Record<string, any>) =>
  new NerTrainingModel(values).save();
