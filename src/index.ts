import { parse } from "@babel/parser";
import generator from "babel-generator";
import {
  Ast,
  CommentBlock,
  CommentLine,
  ImportDeclaration,
  Loc,
  Node,
  Context,
} from "./types/babel.type";
import { Options } from "./types/common.type";
import { parseCodeToAst } from "./common/parseCodeToAst";
import { convertNodesToString } from "./common/convertNodesToString";
import { getImportOrder } from "./common/handleImportOrderDefault";
import { cleanImports } from "./common/cleanImports";
import { getImportNodes } from "./common/getImportNodes";
import { formatOptions } from "./common/formatOptions";

const sortImports = (body: ImportDeclaration[], options: Options) => {
  const importOrder = getImportOrder(options);
  const imports = cleanImports(body, options);

  const importsList: Record<string, ImportDeclaration[]> = {
    "<THIRD_PARTY_MODULES>": imports.thirdPartyImports,
    "<TYPES_MODULES>": imports.importTypeImports,
    ...imports.arrayRegexImports,
    "<RELATIVE_MODULES>": imports.relativePathImports,
  };

  let newCode = "";
  let newLine = options.importOrderSeparation ? "\n\n" : "\n";

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
        convertNodesToString(group as Node[]).join("\n") +
        newLine;
    } else {
      newCode += convertNodesToString(group as Node[]).join("\n") + newLine;
    }
  });

  if (!options.importWithSemicolon) {
    newCode = newCode.replace(new RegExp(";", "g"), "");
  } else {
    newCode = newCode.replace(new RegExp(newLine + "$"), "");
  }

  return newCode;
};

const sortImportPlugin = (code: string, mergeOptions: Options) => {
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

  const newCode = sortImports(newAllImports, mergeOptions).replace(
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
      create(context: Context) {
        const options = context.options[0] || {};
        const mergeOptions = {
          ...formatOptions(optionsDefault),
          ...formatOptions(options),
        } as Options;
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
                    node: value.node as Node,
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
