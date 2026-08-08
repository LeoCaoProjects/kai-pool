---
name: Kai Pool
colors:
  surface: '#fdf9f0'
  surface-dim: '#dedad1'
  surface-bright: '#fdf9f0'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f3ea'
  surface-container: '#f2ede4'
  surface-container-high: '#ece8df'
  surface-container-highest: '#e6e2d9'
  on-surface: '#1c1c16'
  on-surface-variant: '#424844'
  inverse-surface: '#32302a'
  inverse-on-surface: '#f5f0e7'
  outline: '#727973'
  outline-variant: '#c2c8c2'
  surface-tint: '#496455'
  primary: '#173124'
  on-primary: '#ffffff'
  primary-container: '#2d4739'
  on-primary-container: '#98b5a3'
  inverse-primary: '#b0cdbb'
  secondary: '#4e635a'
  on-secondary: '#ffffff'
  secondary-container: '#cee5da'
  on-secondary-container: '#52675e'
  tertiary: '#4c1e00'
  on-tertiary: '#ffffff'
  tertiary-container: '#6e2f00'
  on-tertiary-container: '#f49760'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ccead6'
  primary-fixed-dim: '#b0cdbb'
  on-primary-fixed: '#062014'
  on-primary-fixed-variant: '#324c3e'
  secondary-fixed: '#d1e8dd'
  secondary-fixed-dim: '#b5ccc1'
  on-secondary-fixed: '#0b1f18'
  on-secondary-fixed-variant: '#374b43'
  tertiary-fixed: '#ffdbc9'
  tertiary-fixed-dim: '#ffb68e'
  on-tertiary-fixed: '#331200'
  on-tertiary-fixed-variant: '#753403'
  background: '#fdf9f0'
  on-background: '#1c1c16'
  surface-variant: '#e6e2d9'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  title-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  button:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 40px
---

## Brand & Style

The design system focuses on **Community Minimalism**. It is built to facilitate connection and food sharing within New Zealand neighborhoods, evoking a sense of calm, trust, and shared responsibility. The aesthetic is "Organic Modernism"—balancing the utility of a digital tool with the warmth of a physical community noticeboard.

The design style avoids digital artifice like glassmorphism or neomorphism in favor of high-quality typography, generous whitespace, and a grounded color palette. Every element serves a functional purpose, ensuring that the food and the people remain the focal point. The emotional response should be one of "quiet reliability" and "neighborly warmth."

## Colors

The palette is inspired by the New Zealand landscape—deep forest greens, coastal silvers, and earthy clays.

*   **Primary (#2D4739):** Used for key branding, primary buttons, and active states. It represents growth and stability.
*   **Secondary (#8DA399):** Used for secondary actions, supporting icons, and decorative elements. It provides a soft bridge between green and neutral.
*   **Neutral (#E5E1D8):** Used for subtle backgrounds, dividers, and surface containers that need to recede.
*   **Accent (#D17B47):** A restrained ochre used exclusively for high-priority calls to action (e.g., "Claim Food" or "Confirm Match") and critical notifications.
*   **Background (#FAF9F6):** A warm off-white that reduces eye strain and provides a paper-like feel.

## Typography

The design system utilizes **Inter** for its exceptional legibility and neutral, modern character. 

Hierarchy is established through weight and scale rather than color. Headlines use a semi-bold weight with tight letter spacing to feel "contained" and professional. Body text uses a generous line height (1.5x) to ensure readability, especially for food descriptions and community guidelines. Labels use a slightly increased letter spacing and medium weight for quick scanning in dense UI areas like metadata or timestamps.

## Layout & Spacing

This design system is built on a strict **8pt grid**. All margins, paddings, and component heights must be multiples of 8 (or 4 for micro-adjustments).

*   **Grid:** A fluid 4-column grid for mobile and a 12-column centered grid for desktop (max-width 1200px).
*   **Margins:** 20px on mobile to provide a comfortable "breathable" frame around the content.
*   **Rhythm:** Vertical rhythm is maintained by using the `lg` (24px) unit between major sections and `md` (16px) between related elements within a card or list item.

## Elevation & Depth

To maintain a clean and minimal look, the design system avoids traditional heavy shadows. Instead, it uses **Tonal Layering** and **Low-Contrast Outlines**.

*   **Level 0 (Base):** The #FAF9F6 background.
*   **Level 1 (Cards/Sheets):** White (#FFFFFF) surfaces with a subtle 1px border using the #E5E1D8 neutral color.
*   **Level 2 (Interaction/Popovers):** A very soft, diffused shadow (0px 4px 20px rgba(0,0,0,0.04)) used only for elements that float above the main UI, such as Dialogs or Toasts.
*   **Depth through contrast:** Instead of shadows, use color shifts (e.g., a slightly darker neutral background) to indicate nested content or separate sections.

## Shapes

The shape language is "Soft-Modern." Using a base radius of 12px-16px creates an approachable and friendly feel without looking childish.

*   **Small Components:** (Chips, Checkboxes) use 8px (rounded-md).
*   **Standard Components:** (Buttons, Input Fields, Cards) use 12px (rounded-lg).
*   **Large Components:** (Dialogs, Bottom Sheets) use 24px (rounded-2xl) on top corners to emphasize their "container" nature.

## Components

*   **Bottom Navigation:** 5 items (Home, Map, Post, Matches, Profile). Height: 64px. Icons are 2px stroke weight. The active state is indicated by the Primary Green color and a subtle 4px dot below the icon.
*   **Food & Marketplace Cards:** White background with 1px #E5E1D8 border. Use a 4:3 aspect ratio for images. Title in `title-lg`, metadata (distance, time) in `label-md` using Sage Green.
*   **Match Cards:** Slightly different treatment; use a subtle Primary Green tint (#F0F4F2) background to indicate an active "connection" or transaction.
*   **Profile Rows:** Simple 56px height rows with 16px horizontal padding. Use chevron-right icons in #8DA399 for navigation.
*   **Segmented Controls:** A "pill" container with a #E5E1D8 background. The active segment is a white card with a subtle shadow, sliding between options.
*   **Dialogs:** Centered with 24px internal padding. Primary buttons in Ochre (#D17B47) for destructive or critical actions; Primary Green for standard confirmations.
*   **Toasts:** Floating at the top of the screen. Dark charcoal (#1A1A1A) background with white text for high legibility and contrast against the warm UI.
*   **Input Fields:** 12px rounded corners, 1px #E5E1D8 border. On focus, the border thickens to 2px Primary Green.