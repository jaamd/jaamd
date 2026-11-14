import type { UiCatalog } from '../src/site/ui.ts'

/** Copy this file into packages/jaad/src/site/ui/, rename the constant, then fill
 *  every value. Registering an unfinished catalogue makes the tests fail. */
export const UI_LOCALE = {
    'breadcrumb.label': '',
    home: '',
    'locale.change': '',
    'nav.documentation': '',
    'nav.mobile': '',
    'nav.page': '',
    'page.copied': '',
    'page.copy': '',
    'page.edit': '',
    'page.lastUpdated': '',
    'search.all': '',
    'search.close': '',
    'search.empty': '',
    'search.label': '',
    'search.loading': '',
    'search.navigate': '',
    'search.open': '',
    'search.placeholder': '',
    'search.results': '',
    'search.sections': '',
    'search.trigger': '',
    'theme.toggle': '',
    'toc.label': '',
    'toc.title': '',
} satisfies UiCatalog
