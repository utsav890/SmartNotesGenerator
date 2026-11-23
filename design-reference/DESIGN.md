---
name: NoteFlow
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#464555'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4c42e9'
  primary: '#493ee5'
  on-primary: '#ffffff'
  primary-container: '#635bff'
  on-primary-container: '#fefaff'
  inverse-primary: '#c3c0ff'
  secondary: '#6b38d4'
  on-secondary: '#ffffff'
  secondary-container: '#8455ef'
  on-secondary-container: '#fffbff'
  tertiary: '#9d00b4'
  on-tertiary: '#ffffff'
  tertiary-container: '#bf27d6'
  on-tertiary-container: '#fffafa'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#321ed2'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#5516be'
  tertiary-fixed: '#ffd6fd'
  tertiary-fixed-dim: '#fbabff'
  on-tertiary-fixed: '#36003e'
  on-tertiary-fixed-variant: '#7c008e'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.025em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  margin: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system powers NoteFlow, an AI lecture notes generator built for university students, researchers, and lifelong learners. The interface evokes **clarity, calm focus, and intellectual momentum**, transforming dense audio and video lectures into structured, scannable knowledge without visual clutter.

The aesthetic blends **Minimalism** with **Corporate / Modern** SaaS precision:
- **Generous Whitespace:** Layouts breathe, allowing long-form lecture notes, transcripts, and AI summaries to remain readable for hours.
- **Restrained Accents:** A neutral, high-contrast canvas keeps attention on the content, while vibrant purple-to-violet gradients signal primary AI actions and key states.
- **Crisp Iconography:** Consistent, 1.5px-stroke Lucide-style outline icons reinforce a lightweight, technical, and approachable feel.

## Colors

The palette is anchored in a bright, airy light mode designed for extended reading and note-taking sessions.

- **Primary (`#635BFF`):** Deep Purple used for active navigation states, focus rings, links, and the starting stop of primary CTA gradients.
- **Secondary (`#8B5CF6`):** Violet used for hover states, secondary accents, and the ending stop of primary CTA gradients (`linear-gradient(135deg, #635BFF 0%, #8B5CF6 100%)`).
- **Tertiary (`#D946EF`):** Subtle Pink reserved exclusively for AI-generation highlights, subtle gradient flourishes, and "New" or "AI Summary" badges.
- **Canvas & Surfaces:** The global application background uses a very light lavender-tinted white (`#F8F9FF`) to reduce starkness, while elevated cards and panels use pure white (`#FFFFFF`).
- **Borders:** Hairline dividers use `#E5E7EB` for neutral separation and `#EEF0FF` for subtle purple-tinted card outlines.
- **Text Hierarchy:** Primary text uses `#111827` for maximum legibility; secondary metadata, timestamps, and captions use `#6B7280`. All text pairings meet WCAG AA contrast standards.

## Typography

**Inter** is used across all typographic roles to maintain a unified, distraction-free reading environment.

- **Tabular Numbers:** All statistical readouts, lecture durations, word counts, and timestamps must apply `font-variant-numeric: tabular-nums` so columns of figures align vertically without jitter.
- **Line Height & Measure:** Long-form AI lecture notes (`body-lg` and `body-md`) use generous line heights (1.55x–1.62x) and should be constrained to a comfortable reading measure of `65ch–75ch`.
- **Responsive Scaling:** On mobile viewports, `display-lg` steps down to `display-lg-mobile` (28px) to prevent awkward wrapping on narrow screens.

## Layout & Spacing

The workspace uses a **12-column fluid grid** paired with a fixed-width collapsible left sidebar (`240px` expanded, `64px` collapsed) on desktop.

- **Breakpoints & Reflow:**
  - **Desktop (`> 1024px`):** 12-column fluid grid with `1.5rem` outer margins and `1.25rem` gutters. Dashboard overview cards span 4 columns; the main note editor and transcript split-view spans 8 and 4 columns respectively.
  - **Tablet (`640px – 1024px`):** 8-column fluid grid. The sidebar collapses into a slide-over drawer, and split-views stack vertically.
  - **Mobile (`< 640px`):** 4-column fluid grid with `1rem` outer margins. All cards span full width.
- **Spacing Rhythm:** Component internals rely on `space-sm` (`8px`) and `space-md` (`16px`) for tight, scannable groupings, while `space-lg` (`24px`) and `space-xl` (`32px`) separate distinct dashboard sections.

## Elevation & Depth

Visual hierarchy is achieved through **low-contrast outlines** paired with **ambient shadows**, avoiding heavy drop shadows or stark borders.

- **Surface Separation:** Pure white cards (`#FFFFFF`) sit cleanly above the `#F8F9FF` background, framed by a 1px solid `#EEF0FF` or `#E5E7EB` hairline border.
- **Ambient Shadows:** Interactive cards and floating menus use ultra-diffused, purple-tinted shadows (`0 2px 8px -2px rgba(99, 91, 255, 0.06), 0 1px 3px 0 rgba(17, 24, 39, 0.04)`) to create subtle lift.
- **Modals & Popovers:** Command palettes and dropdowns elevate with a slightly deeper ambient shadow (`0 12px 32px -4px rgba(17, 24, 39, 0.08)`) and a `1px solid #E5E7EB` border.

## Shapes

This design system uses a **Rounded** shape language (`0.5rem` / `8px` base) to balance modern SaaS precision with approachable softness.

- **Cards & Containers:** Primary dashboard cards, note containers, and modal dialogs use `12px` to `18px` corner radii (`rounded-lg` / `1rem` for standard cards, `12px` for compact panels).
- **Interactive Controls:** Buttons, input fields, and sidebar navigation items use `8px` (`0.5rem`) corners.
- **Pills & Badges:** Status tags, subject chips, and AI-generated indicators use full pill rounding (`9999px`).

## Components

All components pair crisp `Inter` typography with 1.5px-stroke Lucide-style outline icons.

- **Buttons:**
  - *Primary CTA:* Uses a smooth purple-to-violet gradient (`linear-gradient(135deg, #635BFF 0%, #8B5CF6 100%)`), white text, `8px` radius, and a subtle `#635BFF` glow on hover.
  - *Secondary / Ghost:* Pure white or transparent background with a `1px solid #E5E7EB` border, `#111827` text, and `#F8F9FF` hover fill.
- **Cards:** Pure white (`#FFFFFF`) with `16px` (`1rem`) corner radius, `1px solid #EEF0FF` border, `space-lg` (`24px`) internal padding, and ambient shadow. Stat cards display tabular numbers in `headline-lg` above `body-sm` labels.
- **Chips & Tags:** Compact pills (`label-md`) with `4px 10px` padding. Subject tags use soft tinted backgrounds (e.g., `#EEF0FF` with `#635BFF` text), while AI-processed badges incorporate a subtle `#D946EF` accent.
- **Input Fields:** `40px` height, `#FFFFFF` background, `1px solid #E5E7EB` border, `8px` radius, and a `2px` `#635BFF` focus ring with `0.2` opacity.
- **Lists & Lecture Rows:** Clean horizontal rows separated by `1px solid #EEF0FF` dividers, featuring a leading Lucide icon, lecture title (`headline-sm`), duration/date metadata in `tabular-nums`, and trailing quick-action icons.
- **Checkboxes & Radio Buttons:** `16px` controls with `#E5E7EB` borders that fill with `#635BFF` and crisp white checkmarks when active.
- **Product-Specific Components:**
  - *AI Key-Takeaway Callout:* A `#F8F9FF` container with a `3px` left accent border in `#8B5CF6` and a sparkle icon header.
  - *Transcript Sync Player:* A sticky bottom or side bar with `#FFFFFF` surface, `1px solid #E5E7EB` top border, and a `#635BFF` progress scrubber.