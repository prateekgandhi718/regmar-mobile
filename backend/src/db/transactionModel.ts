import mongoose from 'mongoose';
import { NerTrainingModel } from './nerTrainingModel';

const TransactionSchema = new mongoose.Schema({
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  domainId: { type: mongoose.Schema.Types.ObjectId, ref: 'Domain' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  originalDate: { type: Date, required: true },
  newDate: { type: Date },
  originalDescription: { type: String, required: true },
  newDescription: { type: String },
  originalAmount: { type: Number, required: true },
  newAmount: { type: Number },
  type: { type: String, enum: ['credit', 'debit'], required: true },
  typeConfidence: { type: Number },
  isTransactionConfidence: { type: Number },
  userType: { type: String, enum: ['credit', 'debit'] },
  isProcessed: { type: Boolean, required: true },
  refunded: { type: Boolean, default: false },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  emailBody: { type: String },
  // optional: which NER model produced the entities (name/version)
  nerModel: { type: String },
  // entities extracted by NER -- include model confidence and model name
  entities: [{
    label: { type: String },
    start: { type: Number },
    end: { type: Number },
    text: { type: String },
    // optional: user who corrected/created this span
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
}, { timestamps: true });

export const TransactionModel = mongoose.model('Transaction', TransactionSchema);

export const getTransactionsByAccountId = (accountId: string) => TransactionModel.find({ accountId }).populate('categoryId', 'name');
export const getTransactionsByUserId = (userId: string) => TransactionModel.find({ userId, isProcessed: true })
  .populate('categoryId', 'name')
  .populate({
    path: 'accountId',
    populate: { path: 'domainIds' }
  })
  .populate('domainId');
export const getUnprocessedTransactionsByUserAndDomain = (
  userId: string,
  domainId: string
) => TransactionModel.find({ userId, domainId, isProcessed: false });
export const createTransaction = (values: Record<string, any>) => new TransactionModel(values).save();
export const updateTransactionById = (id: string, values: Record<string, any>) => TransactionModel.findByIdAndUpdate(id, values, { new: true })
  .populate('categoryId', 'name')
  .populate({
    path: 'accountId',
    populate: { path: 'domainIds' }
  })
  .populate('domainId');
export const deleteTransactionById = (id: string) => TransactionModel.findByIdAndDelete(id);
export const deleteTransactionsByAccountId = (accountId: string) => TransactionModel.deleteMany({ accountId });

export const getLatestCorrectionsForTransactions = async (
  transactionIds: string[]
) => {
  const docs = await NerTrainingModel.find(
    {
      transactionId: {
        $in: transactionIds.map(id => new mongoose.Types.ObjectId(id)),
      },
    },
    {
      transactionId: 1,
      correctedEntities: 1,
    }
  ).lean()

  const map = new Map<string, typeof docs[number]['correctedEntities']>()

  docs.forEach(doc => {
    map.set(doc.transactionId.toString(), doc.correctedEntities)
  })

  return map
}
