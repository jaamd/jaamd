# @jaamd/site

The site shell shared by [JAAD](https://docs.jaamd.org/jaad) and JAAB: header, footer, search palette, themes, fonts, interface strings, and the Markdown export behind `.md` pages and `llms.txt`.

Each of them includes the site integration before its own. The first in the project acts for all: it checks that they share one version, the same site options and a base each, then registers JAAMD, the sitemap, the fonts, Tailwind, the 404 and the root `llms.txt` once. A page of the project on a route of theirs stops the build.

It is internal. Its modules change with JAAD and JAAB, in any release, with no semver promise, and each of them pins it to its own version. Install `@jaamd/jaad` or `@jaamd/jaab` instead, and import from them.

## License

MIT
