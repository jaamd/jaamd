/// <reference path="./env.d.ts" />

import type { Locale } from './locales.ts'
import config from 'virtual:jaamd/site'
import * as locales from './locales.ts'
import { uiString, type UiKey } from './ui.ts'

/** The virtual config, read once. */
export const LOCALES: Locale[] = config.locales
export const DEFAULT_LOCALE: string = config.defaultLocale

export const localePrefix = (locale?: string) => {
    return locales.localePrefix(locale, DEFAULT_LOCALE)
}

export const buildLocales = () => {
    return locales.routedLocales(LOCALES)
}

export const prefixedCodes = () => {
    return locales.prefixedLocales(LOCALES, DEFAULT_LOCALE)
}

/** The language tag of a locale's pages; `lang` when the site is not localised. */
export function languageOf(locale: string = DEFAULT_LOCALE): string {
    return (
        LOCALES.find((known) => {
            return known.code === locale
        })?.tag ?? config.lang
    )
}

/** The interface strings for a page, already resolved. */
export function ui(locale: string = DEFAULT_LOCALE) {
    return (key: UiKey) => {
        return uiString(config.ui, locale, key)
    }
}

/** `read`, run once per build and shared after; in dev, where files come and
 *  go, run on every call. The first call's arguments win: pass only what a
 *  build holds fixed, such as `site`. */
export function oncePerBuild<Args extends unknown[], Result>(
    read: (...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result> {
    let cached: Promise<Result> | undefined

    return (...args) => {
        if (!import.meta.env.PROD) {
            return read(...args)
        }
        cached ??= read(...args)
        return cached
    }
}
