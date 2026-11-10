import { defineJaadConfig } from "@lancher-dev/jaad";

export default defineJaadConfig({
  site: "https://docs.example.com",
  title: "Fixture",
  lang: "en",
  routeBase: "/docs",
  description: "Build fixture for the jaad package tests.",
  tailwind: true,
  astro: {
    redirects: {
      "/docs/retired": "/docs/markdown",
    },
  },
});
