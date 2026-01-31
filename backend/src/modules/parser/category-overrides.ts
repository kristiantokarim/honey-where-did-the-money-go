import { Category } from '../../common/enums/category.enum';

interface CategoryOverride {
  pattern: string;
  category: Category;
  description?: string;
}

const CATEGORY_OVERRIDES: CategoryOverride[] = [
  { pattern: 'MA RUF', category: Category.FASHION, description: 'Haircut' },
  { pattern: 'LINK NET', category: Category.WIFI, description: 'WiFi subscription' },
  { pattern: 'WAHYUDI', category: Category.MEALS, description: 'Mie Aceh' },
  { pattern: 'ADMAN RESKYANSYAH', category: Category.GROCERIES, description: 'Drinking water' },
  { pattern: 'TATYANA', category: Category.UTILITIES, description: 'Electricity/water bill' },
];

export function applyCategoryOverrides<T extends { to: string; category: string; expense: string }>(
  transactions: T[],
): T[] {
  return transactions.map((tx) => {
    const toUpper = tx.to.toUpperCase();
    for (const override of CATEGORY_OVERRIDES) {
      if (toUpper.includes(override.pattern.toUpperCase())) {
        return {
          ...tx,
          category: override.category,
          ...(override.description && { expense: override.description }),
        };
      }
    }
    return tx;
  });
}
