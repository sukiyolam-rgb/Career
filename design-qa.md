# Design QA — selected option 3

Source visual truth: `assets/design-previews/option-3.png` (1487 × 1058 pixels).
Final implementation screenshot: `/tmp/career-option3-desktop-final.png` (1487 × 1058 pixels).
Additional browser evidence: `/tmp/career-option3-mobile.png`, `/tmp/career-option3-tablet.png`, `/tmp/career-option3-service.png`, `/tmp/career-option3-login.png`.
Browser: installed Chromium driven by Python Playwright. Desktop CSS viewport 1487 × 1058, deviceScaleFactor 1. No density conversion, device frame or crop. Mobile CSS viewport 390 × 844 and tablet 768 × 1024, full-page captures.
State: public homepage, all filters clear, four illustrative jobs. First two job records match the reference content. Supabase job requests were intercepted with a contract fixture; no real recruitment or account data was changed by validation.

## Comparison evidence

The source and final browser screenshot were opened together in a single comparison tool output. Full-view comparison covered composition and the five required fidelity surfaces. Typography, icons, dates and card controls are readable at original resolution, so a separate crop was not needed. The comparison explicitly inspected the hero text, search input, filter strip and first two cards as focused regions within these full-resolution images.

## Comparison history

First browser capture (the initial tool output retains the evidence; the temporary capture filename was later reused):
- [P2, imagery/layout] Artwork stopped around x1448 instead of reaching the 1487px viewport edge. Fixed the art's offset relative to the full-width hero.
- [P2, typography] Supporting hero text/service chips were undersized and the search placeholder inherited semibold label weight. Increased desktop sizes and explicitly applied normal input weight.
- [P2, spacing] Grid began at y761, and first-row cards were 271px tall, reducing visibility of the next row. Reduced heading gap/card margins while improving card type sizes.

Post-fix capture: `/tmp/career-option3-desktop-final.png`. Art now reaches viewport right edge; supporting type is restored and search placeholder is normal weight. Grid begins at y756; first-row cards are 261px tall. The next row is visible at the bottom of the matched viewport. Remaining small differences in text metrics and dynamic card density are P3, not functional or hierarchy regressions.

## Required fidelity surfaces

- Fonts/typography: native system sans with installed Chinese fallback; strong ~64px hero, 28px section heading, 26px desktop job titles/salary and 13–16px supporting UI. Text remains semantic HTML with appropriate wrapping and a compact mobile scale. Exact font rendering of the generated mock is not reproducible; hierarchy and optical weight are preserved.
- Spacing/layout: full-width 75px header, ~363px hero, overlapping standalone search, compact four-filter band, two-column job cards. At 1487px, content starts at x83.5 with 1320px width. Mobile uses a two-column filter layout and one-column cards; no viewport overflow in captured public, service or login pages.
- Colors/tokens: dominant #126b64 green, warm off-white #f6f9f5, pale sage surfaces and restrained location-tag colors. No replacement gradients or CSS illustration art. Focus outlines and text-bearing color tags remain visible; labels do not rely solely on color.
- Image quality/assets: a separately generated 1536 × 1024 emerald arch/leaves/Macau illustration reproduces the selected image's art direction. It is an actual raster asset, not a drawing made from CSS or inline SVG. Phosphor regular icons are unmodified vendored library assets with MIT attribution. The supplied existing 青 brand mark is retained.
- Copy/content: real service name, supplied contact information and existing dynamic job fields are retained. Generated sample jobs are only test fixtures. Removed youth/case-file sentence stays removed. Results count and manual refresh are intentional working-product additions relative to the mock.

## Interactions and verification

Passed the existing API-contract browser suite: login gate, rejected nonstaff UI access, CRUD, separate-context shared reads, combined education/location/industry/type filters, pasted-copy extraction, legacy categories, backup restore, logout, setup/network failure, mobile layout and service-page content.

Additional browser checks passed: hero/icon image loading, search submit, live text search, location filtering, reset, desktop/tablet/mobile overflow, service/login layout and no JavaScript page errors. Focus states are defined for native controls; labels and new-window link descriptions retained. Decorative art/icons have empty alt text. Reduced-motion preference disables smooth scrolling/transitions.

These are browser and simulated API checks. Real Supabase authorization/synchronization and remote GitHub Pages publication were not revalidated in this restricted environment.

## Findings / follow-up polish

No actionable P0/P1/P2 findings remain.
- [P3] Generated illustration composition and platform font metrics differ slightly from the mock; its visual direction and focal point match.
- [P3] Dynamic long salaries/titles may increase card height intentionally; no truncation of essential job information.

## Implementation checklist

Completed: assets, semantic layout, responsive styles, core interactions, regression suite, matched captures, post-fix comparison. No database migration is required for this visual update.

final result: passed
