const DEBIT_EXCLUSION_CATEGORY_NAMES = ["investment", "self transfer"] as const;

export const normalizeCategoryName = (name?: string | null) => name?.trim().toLowerCase() ?? "";

export const isDebitExcludedCategory = (name?: string | null) =>
  DEBIT_EXCLUSION_CATEGORY_NAMES.includes(normalizeCategoryName(name) as (typeof DEBIT_EXCLUSION_CATEGORY_NAMES)[number]);

export const debitExclusionCategoryNames = [...DEBIT_EXCLUSION_CATEGORY_NAMES];
