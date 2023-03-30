import { parse } from '@babel/parser';
import { ImportDeclaration } from '@babel/types';

function getImportNodes(ast: any) {
  return ast.program.body.filter(
    (node: any) => node.type === 'ImportDeclaration'
  ) as ImportDeclaration[];
}

function getImportKey(node: ImportDeclaration) {
  return node.importKind === 'type'
    ? `${node.source.value} type`
    : node.source.value;
}

function addImportToMap(
  importDeclarations: { [key: string]: ImportDeclaration },
  node: ImportDeclaration
) {
  const importKey = getImportKey(node);
  if (!importDeclarations[importKey]) {
    importDeclarations[importKey] = node;
  } else {
    importDeclarations[importKey].specifiers.push(...node.specifiers);
  }
}

export function combineImports(code: string) {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });

  const importDeclarations: { [key: string]: ImportDeclaration } = {};

  getImportNodes(ast).forEach((node) =>
    addImportToMap(importDeclarations, node)
  );

  return Object.values(importDeclarations);
}
