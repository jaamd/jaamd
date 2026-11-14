import type { Locale } from './locales.ts'
import config from 'virtual:jaad/config'
import * as locales from './locales.ts'
import { uiString, type UiKey } from './ui.ts'

/** The virtual config, read once. */
export const LOCALES: Locale[] = config.locales
export const DEFAULT_LOCALE: string = config.defaultLocale

export const localePrefix = (locale?: string) => locales.localePrefix(locale, DEFAULT_LOCALE)

export const buildLocales = () => locales.routedLocales(LOCALES)

export const prefixedCodes = () => locales.prefixedLocales(LOCALES, DEFAULT_LOCALE)

/** The interface strings for a page, already resolved. */
export function ui(locale: string = DEFAULT_LOCALE) {
    return (key: UiKey) => uiString(config.ui, locale, key)
}
