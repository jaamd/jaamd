import pkg from "../../../packages/jaamd/package.json";
import readme from "../../../packages/jaamd/README.md?raw";

/** The package README as plain text for language models: a markdown title and
 *  summary, then the README without its HTML header block. */
export const GET = () => {
  const body = readme.slice(readme.indexOf("\n---\n") + 5).trimStart();
  return new Response(`# jaamd\n\n> ${pkg.description}\n\n${body}`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
