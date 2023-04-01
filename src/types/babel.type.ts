import {
  CommentBlock,
  CommentLine,
  ImportDeclaration,
  SourceLocation,
} from "@babel/types";
import generator from "babel-generator";

type Ast = { program: { body: Node[] } };

type Position = {
  line: number;
  column: number;
  index: number;
};

type Loc = {
  start: Position;
  end: Position;
};

type Node = Parameters<typeof generator>[0];

interface Context {
  options: any[];
  getSourceCode(): {
    getText(): string;
  };
  report(options: {
    node?: Node;
    loc?: SourceLocation | null | undefined;
    message: string;
    fix?: (fixer: {
      replaceTextRange: (range: number[], text: string) => void;
    }) => void;
  }): void;
}

export {
  Ast,
  CommentBlock,
  CommentLine,
  ImportDeclaration,
  Loc,
  Node,
  Context,
};
