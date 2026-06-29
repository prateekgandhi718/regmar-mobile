import { CategoryModel } from '../db/categoryModel';

const defaultCategories = [
  { name: 'Investment' },
  { name: 'Income' },
  { name: 'Personal' },
  { name: 'Work' },
  { name: 'Business' },
  { name: 'Restaurants' },
  { name: 'Housing' },
  { name: 'Electricity' },
  { name: 'Transport & Fuel' },
  { name: 'Food & Grocery' },
  { name: 'Medical' },
  { name: 'Travel' },
  { name: 'Fitness' },
  { name: 'Insurance' },
  { name: 'Entertainment' },
  { name: 'Internet & Telecom' },
  { name: 'Gift' },
  { name: 'Taxes' },
  { name: 'Utility' },
  { name: 'Shopping' },
  { name: 'Card Repayment' },
  { name: 'ATM' },
  { name: 'Bank Charges' },
  { name: 'Reimbursement' },
  { name: 'Self Transfer' },
  { name: 'Loan' },
  { name: 'Education' }
];

export const seedCategories = async () => {
  try {
    for (const cat of defaultCategories) {
      await CategoryModel.findOneAndUpdate(
        { name: cat.name },
        { name: cat.name },
        { upsert: true, new: true }
      );
    }
    console.log('Default categories synced successfully');
  } catch (error) {
    console.error('Error seeding categories:', error);
  }
};
