import { ImportDeclaration } from '@babel/types';
import generator from 'babel-generator';

export const convertListImport = (arr: ImportDeclaration[]) => {
  return arr.map((value: any) => generator(value).code);
};
