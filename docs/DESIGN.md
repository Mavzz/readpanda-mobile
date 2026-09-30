```markdown
# Design System Strategy: The Nocturnal Sanctuary

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Digital Curator."** 

This system moves away from the utilitarian "app" look and toward a high-end editorial experience. It is designed to feel like a private library at midnight—hushed, premium, and deeply immersive. We break the "template" look by rejecting rigid grids in favor of intentional asymmetry, overlapping elements, and generous negative space (Deep Navy). This isn't just a place to track books; it is a sanctuary for thought. By using high-contrast typography and tonal depth instead of structural lines, we create a fluid, organic interface that prioritizes the reading experience.

---

## 2. Colors & Surface Logic
The palette is built on the interplay between the vastness of the night (`background`) and the warm glow of a reading lamp (`primary`).

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections or cards. Boundaries must be defined solely through background color shifts.
*   **Example:** A `surface-container-low` (#131b2e) card sitting on a `surface` (#0b1326) background creates a soft, natural edge that feels more sophisticated than a stroke.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of frosted glass.
*   **Level 0 (Base):** `surface` (#0b1326) for main application backgrounds.
*   **Level 1 (Nesting):** `surface-container` (#171f33) for secondary content areas.
*   **Level 2 (Elevation):** `surface-container-high` (#222a3e) for interactive elements and modals.
*   **Deep Contrast:** Use `surface-container-lowest` (#060d20) for "sunken" areas like search bars or inactive feed backgrounds to provide structural grounding.

### The "Glass & Gradient" Rule
To achieve the "Nocturnal Sanctuary" vibe, use **Glassmorphism** for floating elements (e.g., bottom navigation bars, sticky headers). 
*   **Execution:** Use `surface-container` at 70% opacity with a `backdrop-blur` of 20px. 
*   **Signature Textures:** Apply subtle linear gradients (e.g., `primary` #ffddb8 to `primary-container` #ffb95f) for Hero CTAs to provide a glow effect that mimics candlelight.

---

## 3. Typography
We use **Manrope** exclusively. Its geometric yet humanist qualities provide an authoritative editorial voice that remains legible during late-night reading sessions.

*   **Display (Large/Medium):** Reserved for book titles and major editorial headings. Use `tertiary` (#dae2fd) to ensure a soft, low-strain contrast.
*   **Headline & Title:** Used for section headers. These should be set with generous tracking (-1%) to feel more established.
*   **Body:** Use `body-lg` (1rem) for book descriptions to ensure readability. 
*   **Labels:** Use `on-surface-variant` (#d6c3b2) for metadata (e.g., "Published 1924") to create a clear visual hierarchy without adding noise.

*Hierarchy Note:* Contrast is achieved through scale, not just weight. A `display-lg` headline paired with a `body-md` description creates the "magazine" feel central to this system.

---

## 4. Elevation & Depth
In this system, depth is felt, not seen. We avoid heavy shadows in favor of **Tonal Layering**.

*   **The Layering Principle:** Stacking tiers (e.g., a `surface-container-highest` card over a `surface` background) creates a "soft lift."
*   **Ambient Shadows:** If a floating effect is required (e.g., a modal), use a wide, diffused shadow.
    *   *Values:* Offset: 0, 20px. Blur: 40px. Color: `background` at 40% opacity. This mimics natural ambient light.
*   **The "Ghost Border" Fallback:** If accessibility requires a border, use `outline-variant` (#514537) at **15% opacity**. Never use 100% opaque borders.
*   **Glassmorphism:** Use semi-transparent layers for elements that should feel light and "floating" above the main content stream.

---

## 5. Components

### Buttons
*   **Primary:** Rounded-full (`3rem`). Background: Gradient of `primary` to `secondary`. Text: `on-primary` (#472a00). No border.
*   **Secondary:** Rounded-full (`3rem`). Background: `surface-container-high`. Text: `primary`. 
*   **Tertiary/Ghost:** Text-only in `primary`. Underline on hover only.

### Cards & Lists
*   **Forbid Dividers:** Do not use lines to separate list items. Use vertical spacing (Scale `8` or `10`) or subtle background shifts.
*   **Book Cards:** Use `surface-container-low` with high `xl` (3rem) rounding. Overlap the book jacket image slightly over the card edge to break the container's rigidity.

### Input Fields
*   **Text Inputs:** Use `surface-container-lowest` (#060d20) as a "sunken" field. Rounding: `md` (1.5rem). 
*   **Focus State:** A soft outer glow using `primary` at 20% opacity. No harsh solid strokes.

### Selection (Chips & Radio)
*   **Chips:** Use `full` rounding (9999px). Unselected: `surface-container-high`. Selected: `primary` with `on-primary` text.
*   **Checkboxes:** Replace traditional boxes with custom "toggle-circles" to maintain the soft aesthetic of the system.

### Custom App Components
*   **The "Reading Progress" Bar:** A thin, high-glow gradient line (`primary` to `secondary`) that sits at the very top of the screen, appearing to float above the content.
*   **Annotation Pop-ups:** Use the Glassmorphism rule (70% opacity + blur) to allow the book's text to remain visible beneath the note.

---

## 6. Do’s and Don’ts

### Do:
*   **Embrace Negative Space:** Use spacing tokens `16` and `20` to separate major content blocks. Let the Deep Navy breathe.
*   **Use Asymmetry:** Place text left-aligned with images right-aligned and slightly offset to create an editorial layout.
*   **Prioritize Eye Comfort:** Always use `tertiary` (#dae2fd) or `on-surface-variant` for long-form text; avoid pure white.

### Don’t:
*   **No 1px Lines:** Do not use dividers or borders to separate content. Use color blocks or space.
*   **No Sharp Corners:** Never use a rounding value less than `md` (1.5rem). 
*   **No High-Opacity Shadows:** Avoid "drop shadows" that look like they were made for a light-mode app. Shadows must be dark, wide, and subtle.
*   **No Generic Grids:** Avoid placing three cards in a perfect row. Try varying the widths (e.g., 60% / 40%) to create visual interest.