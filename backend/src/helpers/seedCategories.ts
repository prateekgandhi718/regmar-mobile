import { CategoryModel } from '../db/categoryModel';

const defaultCategories = [
  { name: 'Food & Dining', sortOrder: 1, isActive: true },
  { name: 'Transport', sortOrder: 2, isActive: true },
  { name: 'Shopping', sortOrder: 3, isActive: true },
  { name: 'Health', sortOrder: 4, isActive: true },
  { name: 'Bills & Utilities', sortOrder: 5, isActive: true },
  { name: 'Entertainment', sortOrder: 6, isActive: true },
  { name: 'Travel', sortOrder: 7, isActive: true },
  { name: 'Investments', sortOrder: 8, isActive: true },
  { name: 'Income', sortOrder: 9, isActive: true },
  { name: 'Transfers', sortOrder: 10, isActive: true },
  { name: 'Other', sortOrder: 11, isActive: true },
];

export const seedCategories = async () => {
  try {
    for (const category of defaultCategories) {
      await CategoryModel.findOneAndUpdate(
        { name: category.name },
        category,
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );
    }
    console.log('Default categories synced successfully');
  } catch (error) {
    console.error('Error seeding categories:', error);
  }
};
