import { parsers as typescriptParsers } from 'prettier/parser-typescript';
import { parsers as flowParsers } from 'prettier/parser-flow';
import { parsers as babelParsers } from 'prettier/parser-babel';
import { myPlugin } from './sortImports';
import { TOptions } from './type';

const options: Record<keyof TOptions, any> = {
  importOrder: {
    type: 'string',
    category: 'Global',
    array: true,
    default: [{ value: [] }],
    description: 'Provide an order to sort imports.',
  },
  importOrderSeparation: {
    type: 'boolean',
    category: 'Global',
    default: true,
    description: 'Should imports be separated by new line?',
  },
  importOrderAddComments: {
    type: 'boolean',
    category: 'Global',
    default: true,
    description: 'Should comments be added to the imports?',
  },
  importOrderSortByLength: {
    type: 'boolean',
    category: 'Global',
    default: false, // importOrderSortByLength === true
    description: 'Should imports be sorted by length?',
  },
  importOrderSplitType: {
    type: 'boolean',
    category: 'Global',
    default: true,
    description: 'Should imports be split by type?',
  },
};

module.exports = {
  parsers: {
    babel: {
      ...babelParsers.babel,
      preprocess: myPlugin,
    },
    typescript: {
      ...typescriptParsers.typescript,
      preprocess: myPlugin,
    },
    flow: {
      ...flowParsers.flow,
      preprocess: myPlugin,
    },
  },
  options,
};
