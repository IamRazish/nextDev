// postcss-less ships no types; it exports a postcss Syntax like postcss-scss does.
declare module "postcss-less" {
  import type { Syntax } from "postcss";
  const syntax: Syntax;
  export default syntax;
}
