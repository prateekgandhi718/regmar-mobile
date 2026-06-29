import mongoose from "mongoose";

const TxnClassificationTrainingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
    emailText: { type: String, required: true },
    sourceDomain: { type: String },
    isTransactionLabel: { type: Number, required: true }, // 0 or 1
    txnTypeLabel: { type: String, enum: ["credit", "debit"] },
    isTransactionConfidence: { type: Number },
    typeConfidence: { type: Number },
    classifierModelVersion: { type: String },
    typeModelVersion: { type: String },
    source: {
      type: String,
      enum: ["user_feedback", "manual_seed"],
      default: "user_feedback",
    },
    usedForTraining: { type: Boolean, default: false },
    trainedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const TxnClassificationTrainingModel = mongoose.model(
  "TxnClassificationTraining",
  TxnClassificationTrainingSchema,
);

export const createTxnClassificationTraining = (values: Record<string, any>) =>
  new TxnClassificationTrainingModel(values).save();
