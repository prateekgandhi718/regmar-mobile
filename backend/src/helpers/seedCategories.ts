import { CategoryModel } from '../db/categoryModel';

const categoryNames = [
  'Investment',
  'Income',
  'Personal',
  'Work',
  'Business',
  'Restaurants',
  'Housing',
  'Electricity',
  'Transport & Fuel',
  'Food & Grocery',
  'Medical',
  'Travel',
  'Fitness',
  'Insurance',
  'Entertainment',
  'Internet & Telecom',
  'Gift',
  'Taxes',
  'Utility',
  'Shopping',
  'Card Repayment',
  'ATM',
  'Bank Charges',
  'Reimbursement',
  'Self Transfer',
  'Loan',
  'Education',
];

const defaultCategories = categoryNames.map((name, index) => ({
  name,
  sortOrder: index + 1,
  isActive: true,
}));

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
