import { convertListImport } from './imports/common';
import { getImportOrder } from './imports/getImportOrder';
import { importTypes } from './imports/importTypes';
import generator from 'babel-generator';
import { ImportDeclaration } from '@babel/types';
import { TOptions } from '../type';

function sortByAlphaB(array: ImportDeclaration[]) {
  array.sort((a, b) => a.source.value.localeCompare(b.source.value));
}

function importOrderSortByLength(array: Parameters<typeof generator>[0][]) {
  array.sort((a, b) => generator(a).code.length - generator(b).code.length);
}

function sortTypes(array: ImportDeclaration[], options: TOptions) {
  if (options.importOrderSortByLength) {
    importOrderSortByLength(array as any);
  } else {
    sortByAlphaB(array);
  }
}

function cleanImports(body: ImportDeclaration[], _options: TOptions) {
  const importTypeImports: ImportDeclaration[] = [];
  const thirdPartyImports: ImportDeclaration[] = [];
  const arrayRegexImports: Record<string, ImportDeclaration[]> = {};
  const relativePathImports: ImportDeclaration[] = [];

  const options = {
    ..._options,
    importOrder: _options.importOrder.map((value) =>
      Array.isArray(value) ? value[0] : value
    ),
  };

  body.forEach((node) => {
    if (node.type === 'ImportDeclaration') {
      if (options.importOrderSplitType && importTypes.isTypeImport(node)) {
        importTypeImports.push(node);
      } else if (importTypes.isThirdPartyImport(node, options)) {
        thirdPartyImports.push(node);
      } else if (importTypes.isRelativePathImport(node)) {
        relativePathImports.push(node);
      } else {
        const regex = importTypes.isArrayRegexImport(node, options);
        if (regex) {
          if (!arrayRegexImports[regex]) arrayRegexImports[regex] = [];
          arrayRegexImports[regex].push(node);
        }
      }
    }
  });

  sortTypes(importTypeImports, options);
  sortTypes(thirdPartyImports, options);
  sortTypes(relativePathImports, options);

  Object.values(arrayRegexImports).forEach((array: any) => {
    sortTypes(array, options);
  });

  return {
    importTypeImports,
    thirdPartyImports,
    arrayRegexImports,
    relativePathImports,
  };
}

export function sortImports(body: ImportDeclaration[], options: TOptions) {
  const importOrder = getImportOrder(options);

  const imports = cleanImports(body, options);

  const importsList: Record<string, ImportDeclaration[]> = {
    '<THIRD_PARTY_MODULES>': imports.thirdPartyImports,
    '<TYPES_MODULES>': imports.importTypeImports,
    ...imports.arrayRegexImports,
    '<RELATIVE_MODULES>': imports.relativePathImports,
  };

  let newCode = '';
  let newLine = '\n';

  if (options.importOrderSeparation) {
    newLine = '\n\n';
  }
  console.log({ importOrder });

  importOrder.forEach((importType, index) => {
    if (!importsList?.[importType]) return;

    const group = importsList?.[importType];
    if (group.length === 0) return;

    if (options.importOrderAddComments) {
      const comment = options.importOrder.find((value) => {
        if (Array.isArray(value)) {
          return value[0] === importType;
        }
      })?.[1];

      newCode +=
        `//${comment || importType}\n` +
        convertListImport(group).join('\n') +
        newLine;
    } else {
      newCode += convertListImport(group).join('\n') + newLine;
    }
  });

  if (!options.importOrderSeparation) {
    newCode += '\n';
  }

  return newCode;
}
