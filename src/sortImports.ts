import { splitCode } from './utils/splitCode';
import { combineImports } from './utils/combineImports';
import { sortImports } from './utils/imports';
import { TOptions, TOptionsInput } from './type';
import formatOptions from './utils/formatOption';

const optionsDefault: TOptionsInput = {
  importOrder: [
    '<THIRD_PARTY_MODULES> --comment THIRD PARTY MODULES',

    '(layout)|(components) --comment layout, component',
    '(_@shared) --comment shared',
    '(server) --comment server',
    '(context) --comment context',

    '<RELATIVE_MODULES> --comment RELATIVE MODULES',
    '<TYPES_MODULES> --comment TYPES MODULES',
  ],
  importOrderSeparation: false,
  importOrderAddComments: true,
  importOrderSortByLength: true,
  importOrderSplitType: true,
};

export function myPlugin(code: string, options: TOptionsInput) {
  let mergeOptions = {
    ...formatOptions(optionsDefault),
    ...formatOptions(options),
  } as TOptions;
  console.log({ options: mergeOptions.importOrder });

  try {
    const { imports, restOfTheCode } = splitCode(code, mergeOptions);
    const body = combineImports(imports);

    return sortImports(body, mergeOptions) + restOfTheCode;
  } catch (error) {
    console.log('error === ', error);
  }
}
