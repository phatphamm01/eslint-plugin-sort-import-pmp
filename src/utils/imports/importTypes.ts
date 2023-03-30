import { ImportDeclaration } from '@babel/types';
import { TOptions } from '../../type';

export const importTypes = {
  isTypeImport: (node: ImportDeclaration) => {
    return node.importKind === 'type';
  },
  isThirdPartyImport: (node: ImportDeclaration, options: TOptions) => {
    return (
      !options?.importOrder?.some((regex) =>
        new RegExp(regex as string).test(node.source.value)
      ) && !new RegExp(/^\./).test(node.source.value)
    );
  },
  isArrayRegexImport: (node: ImportDeclaration, options: TOptions) => {
    return options?.importOrder?.find((regex) =>
      new RegExp(regex as string).test(node.source.value)
    ) as string;
  },
  isRelativePathImport: (node: ImportDeclaration) => {
    return new RegExp(/^\./).test(node.source.value);
  },
};
