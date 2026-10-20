# ReadPanda+ off switch: Requirements

Status: Approved <!-- Draft → Approved -->
Design handoff: none (hides existing UI)

## Goal
ReadPanda launches without ReadPanda+ (decided 2026-10-20): first build a
user base, then charge. Today the free limits apply in every release build
whether or not anyone can buy ReadPanda+:
- 1 hosted room
- 3 custom buckets

Without a RevenueCat key the paywall can't sell anything, so a reader who
hits a limit lands on a dead end. App Review also rejects a paywall with no
working purchase.

This adds one switch. With ReadPanda+ off, there are no limits, no paywall
and no mention of ReadPanda+. Turning it on later is a config change and a
release, not a code change.

## Out of scope
- A server-side switch or remote config. Turning ReadPanda+ on needs a
  release anyway (store products, App Review).
- A member cap on the server. The API doesn't enforce one today
  (`JoinRoom` has no count), and nothing in the app does either. The
  paywall's "rooms fit 5" copy is for later.
- What happens to rooms and buckets made over the limits once ReadPanda+
  is on. That's for the launch-Plus spec (see Open questions).
- The site's terms and privacy pages. They already say "If ReadPanda+ is
  offered" and "If you subscribe".

## Requirements

### R1. The switch
**User story:** As the developer, I want to turn ReadPanda+ on or off per
build, so that I can launch free and add it later without touching code.

**Acceptance criteria**
1. THE app SHALL read the switch from `.env` (`PLUS_ENABLED`).
2. THE app SHALL treat ReadPanda+ as on only WHEN `PLUS_ENABLED` is `true`
   AND a RevenueCat key is set for the platform. Anything else, including
   a missing value, is off.
3. THE switch SHALL be defined in one place that every ReadPanda+ check
   reads.
4. `.env.example` SHALL document the switch.

### R2. No limits while off
**User story:** As a reader, I want to create rooms and buckets freely, so
that I'm never stopped by a plan I can't buy.

**Acceptance criteria**
1. WHILE ReadPanda+ is off, WHEN the reader creates a room or a bucket THE
   app SHALL go straight to the create screen, however many they already
   have.
2. WHILE ReadPanda+ is off THE paywall SHALL never open.
3. WHILE ReadPanda+ is on THE free limits SHALL work as they do today.

### R3. No ReadPanda+ in the app while off
**User story:** As a reader, I don't want to see a plan that doesn't exist.

**Acceptance criteria**
1. WHILE ReadPanda+ is off THE Settings screen SHALL NOT show the
   ReadPanda+ group.
2. WHILE ReadPanda+ is off THE Delete account confirmation SHALL NOT show
   the "doesn't cancel ReadPanda+" note.
3. WHILE ReadPanda+ is off THE app SHALL NOT configure RevenueCat or call
   it, so no purchase data leaves the device.

## Open questions
- [ ] When ReadPanda+ is turned on, readers will already have more rooms or
      buckets than the free limits allow. The proposal: keep what they
      have, and only creating a new one goes to the paywall (which is what
      the gate does today). Decide in the launch-Plus spec.
