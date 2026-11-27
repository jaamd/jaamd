import { defineJaadConfig } from "@jaamd/jaad";

export default defineJaadConfig({
  title: "__SITE_TITLE__",
  routeBase: "/docs",
  nav: [{ label: "Docs", href: "/docs/" }],
});
