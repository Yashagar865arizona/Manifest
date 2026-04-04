# Manifest — Brand Reference

> Version 1.0 · April 2026

---

## Design Direction

**Aesthetic:** Clean, minimal, professional. Linear-density. Information over decoration.

**Audience:** Founders and managers who want clarity — not colorful dashboards, not playful SaaS.

**Voice:** Precise, direct, confident. No fluff.

**Not:** Rounded cartoony logos. Startup-toy pastels. Decorative gradients.

---

## Color Palette

### Primary Brand Colors

| Token | Hex | Usage |
|---|---|---|
| `--color-slate-900` | `#0F172A` | Primary text, headings, wordmark |
| `--color-blue-600` | `#2563EB` | Accent — CTAs, links, highlights |
| `--color-slate-50` | `#F8FAFC` | Page background |
| `--color-slate-800` | `#1E293B` | Dark surfaces (sidebar, header) |

### Text Tokens

| Token | Hex | Usage |
|---|---|---|
| `--text-primary` | `#0F172A` | Body text, labels |
| `--text-secondary` | `#475569` | Secondary labels, captions |
| `--text-muted` | `#94A3B8` | Placeholders, hints, timestamps |
| `--text-accent` | `#2563EB` | Links, badge text |

### Background Tokens

| Token | Hex | Usage |
|---|---|---|
| `--bg-base` | `#F8FAFC` | Page background |
| `--bg-elevated` | `#FFFFFF` | Cards, modals, dropdowns |
| `--bg-subtle` | `#F1F5F9` | Hover states, row highlights |
| `--bg-muted` | `#E2E8F0` | Disabled fields, tag backgrounds |
| `--bg-inverse` | `#0F172A` | Inverted surfaces |

### Border Tokens

| Token | Hex | Usage |
|---|---|---|
| `--border-default` | `#E2E8F0` | Standard dividers |
| `--border-strong` | `#CBD5E1` | Emphasized borders |
| `--border-focus` | `#2563EB` | Focus rings |

### Semantic Colors

| Token | Hex | Usage |
|---|---|---|
| `--color-red-600` | `#DC2626` | Error, alert, destructive |
| `--color-amber-600` | `#D97706` | Warning |
| `--color-green-600` | `#059669` | Success, positive signal |

---

## Typography

**Primary font:** Geist (loaded from Next.js Google Fonts)

**Fallback stack:** Inter → -apple-system → BlinkMacSystemFont → Segoe UI → sans-serif

**Mono font:** Geist Mono → JetBrains Mono → Fira Code → ui-monospace

### Scale

| Token | Size | Use |
|---|---|---|
| `--font-size-xs` | 12px | Fine print, legal, timestamps |
| `--font-size-sm` | 14px | UI labels, table cells, captions |
| `--font-size-base` | 16px | Body text |
| `--font-size-lg` | 18px | Large body, intro text |
| `--font-size-xl` | 20px | Section headings |
| `--font-size-2xl` | 24px | Page headings |
| `--font-size-3xl` | 30px | Hero headings |

### Weights

- **Normal (400):** Body text
- **Medium (500):** Labels, nav items
- **Semibold (600):** Headings, wordmark, emphasis
- **Bold (700):** Reserved for large display only

---

## Wordmark

**Typeface:** Geist semibold (600), mixed case

**Letter-spacing:** –0.6px (tight, authoritative)

**Variants:**

| File | Foreground | For |
|---|---|---|
| `public/brand/manifest-dark.svg` | `#0F172A` | Light backgrounds |
| `public/brand/manifest-light.svg` | `#F8FAFC` | Dark backgrounds |

### Usage Rules

- Minimum width: 120px
- Clear space: at least 1× the wordmark height on all sides
- Do not rotate, stretch, or recolor
- Do not add drop shadows or outlines to the wordmark
- Do not use the dark variant on dark backgrounds

---

## Spacing

4px base unit. All spacing tokens are multiples: `--space-1` (4px) → `--space-24` (96px).

Standard layout constants:
- Sidebar: `--sidebar-width` → 224px
- Header: `--header-height` → 56px
- Content max-width: `--content-max-width` → 1152px

---

## Border Radius

Intentionally restrained. No pill buttons on primary actions.

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 4px | Input fields, inline tags |
| `--radius-md` | 6px | Buttons, chips |
| `--radius-lg` | 8px | Cards, panels |
| `--radius-xl` | 12px | Modals, popovers |
| `--radius-full` | 9999px | Avatars, pills |

---

## Shadows

Subtle. Never decorative.

| Token | Use |
|---|---|
| `--shadow-xs` | Raised inline elements |
| `--shadow-sm` | Cards in default state |
| `--shadow-md` | Dropdowns, elevated cards |
| `--shadow-lg` | Modals, command palette |
| `--shadow-focus` | Focus ring (blue, 3px) |

---

## Do / Don't

| Do | Don't |
|---|---|
| Use `--text-primary` on `--bg-elevated` | Mix accent blue with secondary backgrounds |
| Use `--border-focus` for all focus states | Use `outline: none` without a visible replacement |
| Prefer `--radius-md` on interactive elements | Use `--radius-full` on primary action buttons |
| Let density carry the design | Add decorative gradients or drop shadows to text |
| Use `--text-muted` for secondary metadata | Use red outside of error/destructive contexts |

---

*Brand tokens are defined in `src/styles/brand-tokens.css` and imported in `src/app/globals.css`.*
