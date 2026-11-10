/// <reference types="astro/client" />

declare module "virtual:jaad/config" {
  // oxlint-disable-next-line typescript/consistent-type-imports
  const config: import("./config.ts").JaadResolvedConfig;
  export default config;
}

declare module "virtual:jaad/docs-frame" {
  // oxlint-disable-next-line typescript/consistent-type-imports
  const DocsFrame: typeof import("./layouts/DefaultDocsFrame.astro").default;
  export default DocsFrame;
}
