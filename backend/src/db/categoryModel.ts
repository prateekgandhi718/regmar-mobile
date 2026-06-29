import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
}, { timestamps: true });

export const CategoryModel = mongoose.model('Category', CategorySchema);

export const getCategories = () => CategoryModel.find().select('name');
export const getCategoryById = (id: string) => CategoryModel.findById(id);
export const createCategory = (values: Record<string, any>) => new CategoryModel(values).save();
export const deleteCategoryById = (id: string) => CategoryModel.findByIdAndDelete(id);
export const getCategoryByName = (name: string) => CategoryModel.findOne({ name });
