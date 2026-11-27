import { defineJaadConfig } from "@jaamd/jaad";

export default defineJaadConfig({
  title: "__SITE_TITLE__",
  // The public URL: llms.txt and the sitemap link with it.
  // site: "https://example.com",
  routeBase: "/docs",
  nav: [{ label: "Docs", href: "/docs/" }],
});
