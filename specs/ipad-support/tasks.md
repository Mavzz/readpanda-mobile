# iPad Support: Tasks

Each task should be small enough to review in one diff. Tick a task when it's
done and `yarn lint:check` passes. Every screen task includes checking
`compact` (iPhone) for regressions. Tasks 1–4 unblock `specs/home-redesign/`.

### Foundation
- [ ] 1. Turn on the native iPad target for the app and widget (R1.1–R1.4)
- [ ] 2. Add `DS.layout`, `DS.type.pageTitleLarge` and the `useLayout()` hook (R2.1, R2.2, R2.4)
- [ ] 3. Add the `ReadableColumn` and `SplitLayout` components (R2.4)
- [ ] 4. Tab bar: centered with icons beside labels on large layouts, height from safe-area insets (R3.1–R3.3)

### Presentation
- [ ] 5. Form sheets for Create room (all steps), New bucket and Paywall on large layouts (R4.1)
- [ ] 6. `Popover` component, with PickerSheet/sort rendering through it on large layouts (R4.2)

### Screens
- [ ] 7. Onboarding (14a) and Login/SignUp (15a) (R5.1, R5.2)
- [ ] 8. Book detail (14c) (R5.3)
- [ ] 9. Cover grid (14d), buckets grid (14e) and New bucket picker (15h) (R5.4, R5.5, R5.11)
- [ ] 10. Discover (15c/15o) (R5.6)
- [ ] 11. My Books (15d) and Currently reading (15g) (R5.7, R5.10)
- [ ] 12. My bucket (15e) and Curated bucket (15f) (R5.8, R5.9)
- [ ] 13. Rooms (15i) (R5.12)
- [ ] 14. Room (14i / 15k), including the right-column comments (R5.13)
- [ ] 15. Profile (15l) and Settings (15m) (R5.14, R5.15)

### Reader (native)
- [ ] 16. Bounds-only layout, keep the anchor on resize/rotate, cap the comments sheet at 640 (R6.1, R6.6, R4.3)
- [ ] 17. Scroll fit-600 + zoom, Spread book layout, the switch in the top bar, and the per-orientation setting in `readerSettings` (R6.2–R6.5, R6.7)
- [ ] 18. The room chip / comment layer as a native popover (15n) (R4.2)

### Widgets and QA
- [ ] 19. `.systemExtraLarge` widget (14k), and check the existing sizes on iPad (R7.1, R7.2)
- [ ] 20. Deep links on iPad: widget taps and invites (R7.3)
- [ ] 21. Run the handoff §7 QA checklist on iPad mini, Air 11" and Pro 13" × portrait/landscape × full/Split ½/⅓, plus a full iPhone regression pass (all)

## Notes
