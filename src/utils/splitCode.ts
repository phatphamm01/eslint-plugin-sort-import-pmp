import { parse } from '@babel/parser';
import { Node } from '@babel/types';
import { TOptions } from '../type';

export function splitCode(code: string, options: TOptions) {
  let imports = '';
  let restOfTheCode = '';
  let comments = '';

  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript', 'classProperties', 'decorators-legacy'],
  });

  ast.program.body.forEach((node: Node) => {
    if (node.type === 'ImportDeclaration') {
      comments = '';
      imports += code.slice(node.start!, node.end!) + '\n';
    } else {
      if (node.leadingComments && node.leadingComments.length) {
        comments += node.leadingComments
          .map((c: { value: string }) => `//${c.value}\n`)
          .join('');
      }

      restOfTheCode += comments + code.slice(node.start!, node.end!) + '\n\n';
      comments = '';
    }
  });

  return { imports: imports.trim(), restOfTheCode: restOfTheCode.trim() };
}
