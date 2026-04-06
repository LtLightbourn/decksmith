# Decksmith — UI Review

**Audited:** 2026-04-05
**Baseline:** Abstract 6-pillar standards (no UI-SPEC.md present)
**Screenshots:** Not captured — no dev server detected at localhost:3000 or :5173. Audit is code-only.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Strong thematic voice, but a small cluster of generic "Something went wrong / try again" strings and one unanswered send button |
| 2. Visuals | 2/4 | Typography scale is micro-compressed — 90% of content lives at 7–11 px — creating a flat, low-contrast hierarchy |
| 3. Color | 2/4 | Gold (#c9a060) is applied to ~80 inline style occurrences with no token discipline; 30+ unique raw hex values in TSX files bypass the Tailwind system entirely |
| 4. Typography | 2/4 | 11 distinct arbitrary px sizes (7px–24px) used instead of the configured Tailwind scale; no type ramp produces consistent heading/body/label relationship |
| 5. Spacing | 3/4 | Standard Tailwind scale is used for most layout; a recurring pattern of `py-[2px]`, `py-[3px]`, `py-[4px]`, `py-[5px]` arbitrary values shows micro-spacing drift |
| 6. Experience Design | 3/4 | Loading and disabled states are present throughout; zero ErrorBoundary components in the tree; only 7 aria-label/role attributes across the entire codebase |

**Overall: 15/24**

---

## Top 3 Priority Fixes

1. **Establish a type ramp and stop using arbitrary px sizes** — Users are reading card names, stat labels, and chat at 8–11 px. At non-retina zoom levels this is near-illegible for anyone over 40, and the sheer number of distinct sizes (11) means nothing reads as a headline, body, or label — everything is the same optical weight. Fix: map all recurring sizes to the four or five Tailwind steps that are already configured (`text-xs` = 12px, `text-sm` = 14px, `text-base` = 16px) and delete the arbitrary `text-[7px]` through `text-[12px]` pattern. The design will feel immediately more legible without losing any aesthetic.

2. **Replace raw hex color literals in TSX with Tailwind tokens** — The config already defines `gold`, `gold-dim`, `gold-bright`, `stone-dark`, `stone-mid`, `purple-ai`. Despite this, `'#c9a060'` appears 80 times in inline styles, and 30+ additional unique hex values appear across components. This defeats the token system and makes global palette changes require grep-and-replace hunts. Fix: audit `style={{ color: '#c9a060' }}` instances and convert to `className="text-gold"`. For values that have no token (e.g. `#8a7a5a`, `#7a6a4a`, `#4a4030`), create three named shade tokens (`gold-muted`, `gold-faint`, `stone-text`) and apply them.

3. **Add an ErrorBoundary and expand ARIA coverage** — Zero ErrorBoundary components means an uncaught render error in WizardModal or AnalyticsSidebar will white-screen the entire app. The 7 aria-label/role attributes spread across ~40 interactive components means most buttons are invisible to screen readers and keyboard-only users. Fix: wrap AppShell's three column sections in a simple `<ErrorBoundary fallback={...}>`. Add `aria-label` to every icon-only button (the close ✕, the send ✦, the ↺ Refresh, the proxy checkbox, and the ▾/▸ section toggles).

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

The app has genuine voice throughout. "Forge your legacy · card by card", "The Undying Archives", "Your deck awaits. Search and add cards to begin forging your legacy" (DeckPanel.tsx:389) — these read as intentional, not lorem ipsum. The Merlin flow copy is consistently thematic.

**Issues:**

- `WizardModal.tsx:194` — `setStatusMsg(`Something went wrong: ${msg}`)` — a raw technical error string surfaces to users in the form phase status area. This could read: "Merlin lost the thread — ${msg}" to stay in voice.
- `WizardModal.tsx:155` — `throw new Error('Merlin did not name a commander — try again')` — "try again" is the lazy fallback. If this fires, users need an action: "Rephrase your vibe and Forge again."
- `BugReportModal.tsx:107` uses "Cancel" as a button label — the one genuinely generic label in a system that otherwise avoids them. "Dismiss" or "Never mind" would match the voice used in WizardModal.
- `DeckPanel.tsx:224` — the Log button shows `'…'` while loading. This is a text-only state change on a 8px button — easy to miss. A tooltip or toast acknowledgement would prevent repeat clicks.
- `WizardModal.tsx:582` — the chat send button renders only `✦` with no visible label. The `title="Send"` tooltip works for mouse users, but the button has no readable text and no aria-label.

**Positive:** Empty state in DeckPanel ("Your deck awaits...") is well-written. Error toasts use `addToast('Merlin failed to conjure your deck', 'error')` — flavored correctly.

---

### Pillar 2: Visuals (2/4)

The aesthetic intent is coherent — stone texture, iron bracket corners, vine overlays, torch flicker, crumble clip-path. These elements combine into a legible dark fantasy theme. The problems are in the information layer sitting on top of that backdrop.

**Issues:**

- **Micro-typography collapse:** `text-[7px]` appears 19 times, `text-[8px]` 99 times, `text-[9px]` 111 times. The statistical cluster of the entire UI between 8–10 px means section headers, card names, stat chip labels, button labels, and toast messages all render at similar optical sizes. There is no visual hierarchy — the eye has no obvious entry point when the deck panel is populated.

- **Header title at 18px inline style** (App.tsx:291) — the only element large enough to function as a landmark heading, but it's set via `style={{ fontSize: 18 }}` rather than a class, making it invisible to the token system.

- **DeckPanel header buttons** have no size separation from their content. The row of `[8px] font-cinzel uppercase` buttons for "Versions", "Playtest", "Log", "Share", "Export", "Proxy" creates a compressed toolbar where each button is visually identical to its neighbors — no primary/secondary affordance.

- **Commander zone** (DeckPanel.tsx:354) is a clear focal point when filled — the gold border glow and crown icon differentiate it well. This is the strongest visual hierarchy decision in the app.

- **Analytics sidebar collapse state** (AnalyticsSidebar.tsx:149): when collapsed to 28px, the only UI element is `◈` + rotated "Stats" text. The pull tab is functional but its target size (28px wide) is below the 44px minimum touch target recommendation.

- **Search bar** and **Ask Merlin button** sit in the same horizontal bar with similar visual weight. The primary action (Ask Merlin) is styled as a small inline button — it doesn't read as the primary CTA of the app.

**Positive:** The iron brackets, crumble clip, and vine pseudo-elements are creative and set the atmosphere without interfering with content. The orb state animation (idle/loading/success/error) on MerlinSprite gives meaningful visual feedback.

---

### Pillar 3: Color (2/4)

The palette intent is good: dark stone (#1a1612 base), gold accent (#c9a060), purple for AI/Merlin (rgba(60,35,90)), and semantic red/green for over-limit and complete states.

**Issues:**

- **80 occurrences of `'#c9a060'` in inline styles** — the Tailwind config defines `gold: '#c9a060'`, making `className="text-gold"` the correct usage. The inline style pattern means IDEs cannot refactor the color, and a palette change requires hunting across 20+ files. Same applies to `purple-ai: '#c8a8f0'`, which appears 4 times as `'#c8a8f0'` in raw hex.

- **30+ unique hex values** that have no Tailwind token: `#8a7a5a`, `#7a6a4a`, `#4a4030`, `#6a5e44`, `#5a5040`, `#3a3020`, `#b8a882` all appear multiple times as label/muted/faint variants of gold. The palette has at least 4 unlabeled stops between `gold` (#c9a060) and the darkest decorative text, with no semantic names.

- **Gold is used on everything** — active states, section headers, the main title, commander name display, stat values, price totals, active tab underlines, the "✦ Deck" panel label, and the analytics header. The 60/30/10 principle is inverted: gold is the dominant surface texture rather than an accent. This dilutes the moments where gold should signal "this matters."

- **Semantic colors are inconsistent:** error states use `#cc4444` in some places (App.tsx:472, DeckPanel.tsx:311) and `rgba(180,50,50,0.5)` in toast borders — same semantic meaning, three different expressions.

- **Positive:** The mana pip color system (`.pip-w`, `.pip-u`, etc. in index.css:243) is well-structured with CSS classes rather than inline styles. The bar chart color ramp in AnalyticsSidebar (`BAR_COLORS`) progresses logically from green to red by CMC, which is meaningful.

---

### Pillar 4: Typography (2/4)

The Tailwind config defines three font families correctly: `cinzel`, `cinzel-deco`, `body` (Georgia). The underlying font choices are strong for the aesthetic.

**What's broken is the size system.**

| Size | Occurrences | Used For |
|------|-------------|----------|
| text-[7px] | 19 | Grimoire count badge, StatChip label |
| text-[8px] | 99 | Button labels, price display, section sub-labels |
| text-[9px] | 111 | Panel headers, status bar, card row quantities |
| text-[10px] | 99 | WizardModal body, tab labels, chat input |
| text-[11px] | 32 | Card names, toast text |
| text-[12px] | 5 | Wizard input fields |
| text-[13px] | 4 | Surprise Me icon |
| text-[14px] | 2 | Mobile import button |
| text-[16px] | 4 | Close button ✕ |
| text-[24px] | 1 | One instance |
| text-[base/sm/lg/xl/2xl/3xl/4xl] | ~15 | Landing page and one-off uses |

The Tailwind config's named scale (`xs`=12px, `sm`=14px, `base`=16px, etc.) is almost entirely bypassed in the app shell. The result is 11 meaningfully distinct sizes, most of which fall in a 7–12px band where human perception cannot reliably distinguish hierarchy.

`font-bold` appears 7 times; `font-medium`, `font-semibold`, `font-light` appear zero times. Weight is not being used as a hierarchy tool at all.

**Fix path:** Collapse to 4 sizes — `text-xs` for metadata (prices, badges), `text-sm` for labels and button text, `text-base` for body content (chat messages, card names), and one display size for section headers. Drop all `text-[Npx]` arbitrary values.

---

### Pillar 5: Spacing (3/4)

The standard Tailwind scale is used for most structural layout: `px-3`, `py-2`, `gap-2`, `px-6` dominate the counts. Column and section spacing is consistent. The 4-unit Tailwind grid is the evident mental model.

**Issues:**

- **Micro-padding drift:** `py-[5px]` (11 uses), `py-[2px]` (8 uses), `py-[3px]` (5 uses), `py-[4px]` (4 uses) appear throughout button and header bars. These exist because standard `py-1` (4px) is too tight and `py-2` (8px) is too loose at the micro-button sizes in use. The root cause is the micro-typography problem (if buttons were `text-sm` they'd need `py-2` naturally). These arbitrary values are a symptom, not the primary problem.

- **DeckPanel stat strip** (DeckPanel.tsx:319) uses `py-[4px]` — functionally identical to `py-1` but expressed as an arbitrary value, breaking the grid.

- **Status bar** (App.tsx:459) uses `py-[5px]` — splitting the difference between `py-1` and `py-2` inconsistently with other bars in the same layout.

- The spacing between `gold-line` dividers in AnalyticsSidebar creates a readable rhythm. `my-1` is consistent there.

**Positive:** No rogue `mt-[37px]` or `pb-[13px]` style arbitrary spacing. The drift is confined to sub-8px vertical padding on compact UI elements, which is understandable at these dimensions.

---

### Pillar 6: Experience Design (3/4)

**What works:**

- Loading states are thorough. 73 references to loading/skeleton/pending patterns. The `orbState` machine in WizardModal (idle/loading/success/error) is clean and drives visual feedback correctly.
- Disabled states exist on 25 elements — Forge button while loading, send button while empty, refresh while fetching.
- The undo-restore pattern via `undoSnapshotRef` and toast action button is excellent UX — destructive version restore is reversible.
- Skeleton component exists (`Skeleton.tsx`) and is used in the search panel.
- The mismatch warning banner (DeckPanel.tsx:336) is proactive — tells the user about bracket violations before they share or print.

**Issues:**

- **Zero ErrorBoundary components** anywhere in the tree. The entire app renders inside `AppShell` with no safety net. A render crash in `AnalyticsSidebar` (which runs recharts, useMemo, and an async AI call simultaneously) takes down the full viewport.

- **Accessibility: only 7 aria-label/role attributes** across ~40+ interactive components. The close button in WizardModal uses `title="Close"` but no `aria-label`. The proxy checkbox (`DeckCardRow.tsx:57`) has a `title` but no `aria-label`. Section collapse buttons in DeckSection have no accessible state (`aria-expanded` is missing). The mobile bottom nav buttons have no `role="tab"` or `aria-selected`.

- **Chat send button** (WizardModal.tsx:564) is disabled when `chatInput.trim()` is empty — which is correct — but the disabled state only changes color. There's no cursor change or opacity shift distinguishing it from an active state at a glance (the color difference between `#5a4870` and `#c8a8f0` on a very dark background may be insufficient for low-vision users).

- **Tablet analytics drawer** has no keyboard trap or focus management. Opening it via the pull tab doesn't move focus inside the drawer, so keyboard users cannot access its content without tabbing through the entire deck column first.

- **"Prices not loaded" state** (DeckPanel.tsx:409): this is surfaced but there's no CTA — the "↺ Refresh" button is always present but its relationship to the "not loaded" state is visual proximity only, not explicit instruction.

---

## Files Audited

- `src/App.tsx` — main layout, title bar, search bar, column structure, mobile nav, FAB
- `src/pages/LandingPage.tsx` — landing page, pricing, feature grid, CTAs
- `src/components/WizardModal/WizardModal.tsx` — Merlin form/chat modal, all phases
- `src/components/DeckPanel/DeckPanel.tsx` — deck panel, header toolbar, stats strip
- `src/components/DeckPanel/DeckCardRow.tsx` — individual card rows
- `src/components/DeckPanel/DeckSection.tsx` — collapsible card type sections
- `src/components/AnalyticsSidebar/AnalyticsSidebar.tsx` — stats tab, charts, budget swaps
- `src/components/shared/Toast.tsx` — toast notification stack
- `src/index.css` — global styles, animation keyframes, pip classes, stone-bg, vine-wrap
- `tailwind.config.js` — design token definitions
