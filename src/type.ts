export interface TOptions {
  importOrder: (string | [string, string])[];
  importOrderSeparation: boolean;
  importOrderAddComments: boolean;
  importOrderSortByLength: boolean;
  importOrderSplitType: boolean;
}

export type TOptionsInput = Omit<TOptions, 'importOrder'> & {
  importOrder: string[];
};
