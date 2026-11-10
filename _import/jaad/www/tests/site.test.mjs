import { test } from "node:test";
import assert from "node:assert/strict";
import { page, allCss } from "../../../../packages/jaad/tests/dist.mjs";

// With routeBase set, JAAD injects no 404: the site has to bring its own.
test("the site answers a wrong url with its own page", () => {
  const missing = page("404.html");
  assert.match(missing, /<title>404 \| JAAD<\/title>/);
  assert.match(missing, /<body[^>]*data-site-layout/);
  assert.match(missing, /href="\/docs"/, "no way back into the documentation");
});

test("the landing page shares the docs measure without using its frame", () => {
  const home = page("index.html");
  const css = allCss().replace(/\s+/g, "");

  assert.match(home, /<body[^>]*data-site-layout/);
  assert.doesNotMatch(home, /jaad-chrome|data-jaad-default-frame/);
  assert.match(
    css,
    /\.site-chrome\{[^}]*max-width:var\(--site-content-width\)/,
  );
  assert.match(css, /\.site-main\{[^}]*max-width:var\(--site-content-width\)/);
  assert.match(home, /<site-theme-toggle>/);
});
