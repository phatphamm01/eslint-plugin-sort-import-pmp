import { parsers as typescriptParsers } from "prettier/parser-typescript";
import { parsers as flowParsers } from "prettier/parser-flow";
import { parsers as babelParsers } from "prettier/parser-babel";
import { splitCode } from "./utils/splitCode";
import { combineImports } from "./utils/combineImports";
import { sortImports } from "./utils/imports";
import { TOptions, TOptionsInput } from "./type";
import formatOptions from "./utils/formatOption";

const optionsDefault: TOptionsInput = {
  importOrder: [
    "<THIRD_PARTY_MODULES> --comment THIRD PARTY MODULES",

    "(layout)|(components) --comment layout, component",
    "(_@shared) --comment shared",
    "(server) --comment server",
    "(context) --comment context",

    "<RELATIVE_MODULES> --comment RELATIVE MODULES",
    "<TYPES_MODULES> --comment TYPES MODULES",
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
    console.log("error === ", error);
  }
}

const options: Record<keyof TOptions, any> = {
  importOrder: {
    type: "string",
    category: "Global",
    array: true,
    default: [{ value: [] }],
    description: "Provide an order to sort imports.",
  },
  importOrderSeparation: {
    type: "boolean",
    category: "Global",
    default: true,
    description: "Should imports be separated by new line?",
  },
  importOrderAddComments: {
    type: "boolean",
    category: "Global",
    default: true,
    description: "Should comments be added to the imports?",
  },
  importOrderSortByLength: {
    type: "boolean",
    category: "Global",
    default: false, // importOrderSortByLength === true
    description: "Should imports be sorted by length?",
  },
  importOrderSplitType: {
    type: "boolean",
    category: "Global",
    default: true,
    description: "Should imports be split by type?",
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
