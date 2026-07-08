import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const CategoryModel = mongoose.model('Category', CategorySchema);

export const getCategories = () =>
  CategoryModel.find({ isActive: true })
    .sort({ sortOrder: 1, createdAt: 1 })
    .select('name sortOrder');
