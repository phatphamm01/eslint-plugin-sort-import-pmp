import { parse } from "@babel/parser";
import { CommentBlock, CommentLine, ImportDeclaration } from "@babel/types";
import generator from "babel-generator";

interface TOptions {
  importOrder: (string | [string, string])[];
  importOrderSeparation?: boolean;
  importOrderSortByLength?: boolean;
  importOrderSplitType?: boolean;
  importWithSemicolon?: boolean;
  importOrderAddComments?: boolean;
}

type TOptionsInput = Omit<TOptions, "importOrder"> & {
  importOrder: string[];
};

const convertListImport = (arr: ImportDeclaration[]) => {
  return arr.map((value: any) => {
    return generator(value, {
      comments: true,
      retainLines: true,
    }).code.replace(/^[\n]*/, "");
  });
};

const DEFAULT_IMPORT = [
  "<RELATIVE_MODULES>",
  "<TYPES_MODULES>",
  "<THIRD_PARTY_MODULES>",
  // '<ARRAY_REGEX_MODULES>',
];

const parseCodeToAst = (code: string) => {
  return parse(code, {
    sourceType: "module",
    plugins: [
      "typescript",
      "jsx",
      "classProperties",
      "objectRestSpread",
      "decorators",
    ],
  });
};

const insertModule = (insertedModule: string, imports: string[]) => {
  if (imports.includes(insertedModule)) {
    return;
  }

  const index = imports.findIndex((value) => !DEFAULT_IMPORT.includes(value));
  imports.splice(index, 0, insertedModule);
};

const insertModules = (insertedModules: string[], imports: string[]) => {
  insertedModules.forEach((insertedModule) => {
    insertModule(insertedModule, imports);
  });
};

const handleImportOrderDefault = (imports: (string | [string, string])[]) => {
  const sortImports = imports.map((value) =>
    Array.isArray(value) ? value[0] : value
  );

  insertModule("<ARRAY_REGEX_MODULES>", sortImports);
  insertModules(DEFAULT_IMPORT, sortImports);

  return sortImports;
};

function getImportOrder(options: TOptions) {
  if (options.importOrder) {
    return handleImportOrderDefault(options.importOrder);
  }
  return [];
}

const importTypes = {
  isTypeImport: (node: ImportDeclaration) => {
    return node.importKind === "type";
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

function getImportNodes(ast: any) {
  return ast.program.body.filter(
    (node: any) => node.type === "ImportDeclaration"
  ) as ImportDeclaration[];
}

function formatOptions(options: TOptionsInput) {
  return {
    ...options,
    importOrder: options.importOrder.map((item) => {
      return item.split("--comment").map((item) => item.trim());
    }),
  };
}

function sortByAlphaB(array: ImportDeclaration[]) {
  array.sort((a, b) => a.source.value.localeCompare(b.source.value));
}

function importOrderSortByLength(array: Parameters<typeof generator>[0][]) {
  const generatorWithOutComments = (node: any) =>
    generator(node, { comments: false }).code;
  array.sort(
    (a, b) =>
      generatorWithOutComments(a).length - generatorWithOutComments(b).length
  );
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
    if (node.type === "ImportDeclaration") {
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

function sortImports(body: ImportDeclaration[], options: TOptions) {
  const importOrder = getImportOrder(options);

  const imports = cleanImports(body, options);

  const importsList: Record<string, ImportDeclaration[]> = {
    "<THIRD_PARTY_MODULES>": imports.thirdPartyImports,
    "<TYPES_MODULES>": imports.importTypeImports,
    ...imports.arrayRegexImports,
    "<RELATIVE_MODULES>": imports.relativePathImports,
  };

  let newCode = "";
  let newLine = "";

  if (options.importOrderSeparation) {
    newLine = "\n\n";
  } else {
    newLine = "\n";
  }

  importOrder.forEach((importType) => {
    if (!importsList?.[importType]) return;
    const group = importsList[importType];
    if (group.length === 0) return;

    if (options.importOrderAddComments) {
      const comment = options.importOrder.find((value) => {
        if (Array.isArray(value)) {
          return value[0] === importType;
        }
      })?.[1];

      newCode +=
        `//${comment || importType}\n` +
        convertListImport(group).join("\n") +
        newLine;
    } else {
      newCode += convertListImport(group).join("\n") + newLine;
    }
  });

  if (!options.importWithSemicolon) {
    newCode = newCode.replace(new RegExp(";", "g"), "");
  } else {
    newCode = newCode.replace(new RegExp(newLine + "$"), "");
  }

  return newCode;
}
type Position = {
  line: number;
  column: number;
  index: number;
};
type Loc = {
  start: Position;
  end: Position;
};

const sortImportPlugin = (code: string, mergeOptions: TOptions) => {
  //handle options
  const commentsCustom = mergeOptions.importOrder
    .map((value) => value?.[1])
    .filter(Boolean);

  //parse code
  const parseCode = parseCodeToAst(code);
  const allImports = getImportNodes(parseCode);
  console.log({ code });

  let firstImportOrComment:
    | ImportDeclaration
    | Comment
    | CommentBlock
    | CommentLine
    | undefined = allImports[0];
  if (
    firstImportOrComment.leadingComments &&
    firstImportOrComment.leadingComments.length > 0
  ) {
    firstImportOrComment = firstImportOrComment.leadingComments[0];
  }
  const lastImport = allImports[allImports.length - 1];

  if (!firstImportOrComment?.loc || !lastImport?.loc)
    throw new Error("No import found");

  const firstImportLoc = firstImportOrComment.loc as unknown as Loc;
  const lastImportLoc = lastImport.loc as unknown as Loc;

  const newAllImports = allImports.map((node) => {
    const { trailingComments, leadingComments, ...rest } = node;
    if (leadingComments && leadingComments.length > 0) {
      const filteredComments = leadingComments.filter(
        (comment) =>
          !Boolean(commentsCustom.find((value) => comment.value.match(value)))
      );

      return filteredComments.length === 0
        ? rest
        : { ...rest, leadingComments: filteredComments };
    }
    return rest;
  });

  const newCode = sortImports(newAllImports as any, mergeOptions).replace(
    /[\n]*$/,
    ""
  );

  const textToFirstImport = code.slice(0, firstImportLoc.start.index);
  const sortedImports = getImportNodes(
    parseCodeToAst(textToFirstImport + newCode)
  );

  const loc = {
    start: firstImportLoc.start,
    end: lastImportLoc.end,
  };

  const allImportWithMessage = allImports.map((node) => {
    let newImport = sortedImports.find(
      (value) => value.source.value === node.source.value
    );
    if (!newImport) return;
    const lineCurrent = node.loc?.end.line;
    let lineNew = newImport.loc?.end.line;

    if (lineCurrent !== lineNew) {
      return {
        message: `Import ${node.source.value} moved from line ${lineCurrent} to line ${lineNew}`,
        node,
      };
    }

    return {
      node,
    };
  });

  return {
    allImportWithMessage,
    loc,
    newCode,
  };
};

const optionsDefault = {
  importOrder: [
    "<THIRD_PARTY_MODULES> --comment THIRD PARTY MODULES",
    //regex
    "<RELATIVE_MODULES> --comment RELATIVE MODULES",
    "<TYPES_MODULES> --comment TYPES MODULES",
  ],
  importOrderSeparation: true,
  importOrderSortByLength: true,
  importOrderSplitType: true,
  importWithSemicolon: false,
  // importOrderAddComments: true,
};

module.exports = {
  rules: {
    "sort-imports": {
      meta: { fixable: "code" },
      create(context) {
        const options = context.options[0] || {};
        const mergeOptions = {
          ...formatOptions(optionsDefault),
          ...formatOptions(options),
        } as TOptions;
        const pluginName = "plugin sort-imports wrongs";

        return {
          Program() {
            try {
              const code = context.getSourceCode().getText();
              const result = sortImportPlugin(code, mergeOptions);

              if (!result.loc) return;
              let flag = false;

              result.allImportWithMessage.forEach((value) => {
                if (value?.message) {
                  flag = true;
                  context.report({
                    node: value.node,
                    loc: value.node.loc,
                    message: value.message,
                  });
                  return true;
                }
                return false;
              });
              if (flag) {
                context.report({
                  loc: result.loc,
                  message: "Sort imports",
                  fix(fixer) {
                    return fixer.replaceTextRange(
                      [result.loc.start.index, result.loc.end.index],
                      result.newCode
                    );
                  },
                });
              }
            } catch (error) {
              console.error(`Error in ${pluginName}:`, error);
            }
          },
        };
      },
    },
  },
};
