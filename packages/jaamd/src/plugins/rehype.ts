/** rehype plugins for the unified processor. */

import type { Element, ElementContent, Root } from "hast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { TABLE_WRAPPER_CLASS } from "../scripts/utils.js";
import { headingLinkHtml } from "./render.js";

/** Wraps tables in a scroll container. */
export const rehypeTableWrapper: Plugin<[], Root> = () => (tree) => {
  visit(tree, "element", (node, index, parent) => {
    if (node.tagName !== "table" || index === undefined || !parent) return;

    const wrapper: Element = {
      type: "element",
      tagName: "div",
      properties: { className: [TABLE_WRAPPER_CLASS] },
      children: [node],
    };
    parent.children[index] = wrapper;
    return index + 1;
  });
};

/** Text Astro slugs: text nodes, raw HTML tags left out. */
function textOf(node: ElementContent): string {
  if (node.type === "text") return node.value;
  return "children" in node ? node.children.map(textOf).join("") : "";
}

function hasExpression(node: ElementContent): boolean {
  if ((node.type as string) === "mdxTextExpression") return true;
  return "children" in node && node.children.some(hasExpression);
}

/**
 * Appends the anchor to headings that have an id. Astro assigns ids after user
 * plugins: register its `rehypeHeadingIds` before this one, as the integration
 * does; Astro's later pass keeps the ids it finds.
 */
export const rehypeHeadingLinks: Plugin<[], Root> = () => (tree) => {
  visit(tree, "element", (node) => {
    if (!/^h[1-6]$/.test(node.tagName)) return;
    const id = node.properties.id;
    // Astro resolves MDX expressions in these: left to the client.
    if (typeof id !== "string" || hasExpression(node)) return;

    node.children.push({
      type: "raw",
      value: headingLinkHtml(id, textOf(node)),
    } as unknown as ElementContent);
  });
};
