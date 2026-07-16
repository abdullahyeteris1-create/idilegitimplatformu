export const UNTITLED_TEXT_FALLBACK = "Başlıksız Metin";
export const UNCATEGORIZED_TEXT_FALLBACK = "Diğer";

export function normalizeTextTitle(value: unknown): string {
  return String(value ?? "").trim();
}

export function normalizeTextCategory(value: unknown): string {
  return String(value ?? "").trim() || UNCATEGORIZED_TEXT_FALLBACK;
}

export function getDisplayTextTitle(value: unknown): string {
  return normalizeTextTitle(value) || UNTITLED_TEXT_FALLBACK;
}

export function compareTurkishTextTitles(a: string, b: string): number {
  const left = normalizeTextTitle(a);
  const right = normalizeTextTitle(b);

  if (!left && !right) {
    return 0;
  }

  if (!left) {
    return 1;
  }

  if (!right) {
    return -1;
  }

  return left.localeCompare(right, "tr-TR", {
    sensitivity: "base",
    numeric: true,
  });
}

type SortByCategoryAndTitleOptions = {
  categoryOrder?: string[];
};

export function sortByCategoryAndTitle<T extends { category?: unknown; title?: unknown }>(
  items: T[],
  options: SortByCategoryAndTitleOptions = {},
): T[] {
  const categoryOrder = options.categoryOrder?.map((item) => normalizeTextCategory(item)) ?? [];
  const categoryIndexByName = new Map(categoryOrder.map((item, index) => [item, index]));

  return [...items].sort((leftItem, rightItem) => {
    const leftCategory = normalizeTextCategory(leftItem.category);
    const rightCategory = normalizeTextCategory(rightItem.category);

    const leftOrderIndex = categoryIndexByName.get(leftCategory);
    const rightOrderIndex = categoryIndexByName.get(rightCategory);

    if (leftOrderIndex !== undefined && rightOrderIndex !== undefined && leftOrderIndex !== rightOrderIndex) {
      return leftOrderIndex - rightOrderIndex;
    }

    if (leftOrderIndex !== undefined && rightOrderIndex === undefined) {
      return -1;
    }

    if (leftOrderIndex === undefined && rightOrderIndex !== undefined) {
      return 1;
    }

    const categoryCompare = leftCategory.localeCompare(rightCategory, "tr-TR", {
      sensitivity: "base",
      numeric: true,
    });

    if (categoryCompare !== 0) {
      return categoryCompare;
    }

    return compareTurkishTextTitles(
      normalizeTextTitle(leftItem.title),
      normalizeTextTitle(rightItem.title),
    );
  });
}
