import generator from "babel-generator";
import { Node } from "../types/babel.type";

export const convertNodesToString = (arr: Node[]) => {
  return arr.map((value) => {
    return generator(value, {
      comments: true,
      retainLines: true,
    }).code.replace(/^[\n]*/, "");
  });
};
