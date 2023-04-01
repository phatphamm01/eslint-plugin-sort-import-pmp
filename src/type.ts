export interface TOptions {
  importOrder: (string | [string, string])[];
  importOrderSeparation: boolean;
  importOrderSortByLength: boolean;
  importOrderSplitType: boolean;
  importWithSemicolon: boolean;
}

export type TOptionsInput = Omit<TOptions, "importOrder"> & {
  importOrder: string[];
};
