// Reference template only — `.example.ts` so Playwright's default testMatch
// (**/*.@(test|spec).?(c|m)[jt]s) skips it; the placeholder screens/routes
// below don't exist yet. Per-ticket, copy the pattern into a real
// `<name>.spec.ts` in this folder with that ticket's actual screens
// (see design/index/component-map.md) at Step 17 (_visual-check).
//
// Baseline screenshots are generated from the APPROVED design component, not a previous build.
// First run with `--update-snapshots` against the approved render to set baselines, then commit them.

import { test, expect } from "@playwright/test";

// One entry per screen that has an approved component (from design/index/component-map.md).
const screens = [
  { id: "DS-07-1", name: "ranked-results", path: "/results" },
  { id: "DS-02-1", name: "upload",        path: "/upload" },
];

const breakpoints = [
  { label: "mobile",  width: 375,  height: 812 },
  { label: "tablet",  width: 768,  height: 1024 },
  { label: "desktop", width: 1280, height: 800 },
];

for (const s of screens) {
  for (const bp of breakpoints) {
    test(`${s.name} matches approved design @ ${bp.label}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(s.path);
      await page.waitForLoadState("networkidle");
      // Baseline = the approved screen. Tolerance kept small and explicit.
      await expect(page).toHaveScreenshot(`${s.name}-${bp.label}.png`, {
        maxDiffPixelRatio: 0.001, // ≤ 0.1%
        animations: "disabled",
      });
    });
  }
}
