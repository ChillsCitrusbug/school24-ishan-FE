import type { Config } from 'tailwindcss'
import designConfig from '../school24-DESIGN/theme/tailwind.theme'

/**
 * School24 FE — Tailwind config.
 *
 * ⚠️ This is NOT a second token source. All tokens come from the shared
 * design system at `../school24-DESIGN/theme/tailwind.theme.ts`, which
 * re-exports `../school24-DESIGN/tailwind.config.ts` (the single source of
 * truth). Never hardcode a second palette here — edit tokens upstream in
 * the DESIGN repo, not in this file.
 *
 * Note: we import the shim's `default` export (the full design config) and
 * read `.theme.extend` off it, rather than importing the shim's named
 * `theme` export directly. Verified by probing Tailwind's own TS config
 * loader (`tailwindcss/loadConfig.js`, which falls back to jiti for `.ts`
 * configs since Node has no native TS loader): when this file is loaded as
 * a *nested* import chain (FE config -> shim -> design config), jiti's
 * CJS/ESM interop collides the shim's named `theme` export with the design
 * config's own `.theme` field (both literally named `theme`), silently
 * yielding the wrong (nested `{ extend: {...} }`) shape and breaking every
 * token class (e.g. `bg-canvas`) at build time with no import error.
 * Reading `designConfig.theme.extend` off the default-exported config
 * sidesteps that collision and was confirmed correct end-to-end via
 * `vite build` (see scaffold report).
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: designConfig.theme?.extend ?? {},
  },
  plugins: [],
} satisfies Config
