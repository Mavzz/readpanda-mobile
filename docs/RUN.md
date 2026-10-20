# Running the App

ReadPanda is a bare React Native app (no Expo) with native iOS code: the PDF
reader, the comment sheet and the home screen widget are Swift. iOS is the
primary platform.

You build it yourself, with Metro and Xcode on your Mac, and run it in the
simulator or on your iPhone. The app needs a backend: your own local one, or
production on Cloud Run.

## Build it yourself

### 1. Prerequisites

- macOS with **Xcode** (from the App Store) and its iOS Simulator
- **Node 22** and **Yarn 1** (`npm i -g yarn`). Use Yarn, not npm: the
  lockfile is `yarn.lock`.
- **CocoaPods** (`brew install cocoapods`)
- **Watchman** (`brew install watchman`), used by Metro

### 2. Install

```bash
git clone https://github.com/Mavzz/readpanda-mobile.git
cd readpanda-mobile
yarn install
yarn pods          # pod install in ios/
```

### 3. Files you get from a maintainer

These hold keys, so they're gitignored and never in the repo:

| File | Needed for |
|---|---|
| `ios/GoogleService-Info.plist` | iOS build: Firebase, push, Google sign-in. The build fails without it. |
| `android/app/google-services.json` | Android build only |

### 4. Point the app at a backend

There are two environments, each in its own gitignored file:

| File | App talks to |
|---|---|
| `.env.dev` | `http://<Local_IP>:3000/api/v1`, a backend on your machine (`BACKEND_URL` empty) |
| `.env.prod` | `https://readpanda-backend-439290157125.asia-south1.run.app/api/v1`, production on Cloud Run |

Create both from the template (see the comments in `.env.example`):

```bash
cp .env.example .env.dev
cp .env.example .env.prod   # then set BACKEND_URL to the Cloud Run URL
```

Switch between them with:

```bash
yarn start:dev     # use .env.dev and start Metro with a clean cache
yarn start:prod    # use .env.prod and start Metro with a clean cache
```

Both copy the chosen file over `.env`, the one file the app reads
(`src/utils/Helper.js` builds every API URL from it), and print which backend
is now active. `yarn env:dev` / `yarn env:prod` switch without starting Metro,
for example before an Xcode build.

- Leave `/api/v1` off `BACKEND_URL`: `API_VERSION` is appended automatically.
- With a local backend, `Local_IP` depends on where the app runs: `localhost`
  for the iOS Simulator, `10.0.2.2` for the Android emulator, and your Mac's
  LAN IP for a physical phone.
- To run the backend locally, see `packages/api-go/README.md` in the
  [readpanda](https://github.com/Mavzz/readpanda) repo.
- Don't edit `.env` directly; the next switch overwrites it. Edit `.env.dev`
  or `.env.prod`.
- Don't name an environment `.env.local`: `react-native-dotenv` always loads
  that file on top of `.env`, whichever environment you picked.

**The values are compiled in.** Metro has to restart with a clean cache after
a switch. `start:dev` / `start:prod` do that; if Metro is already running,
stop it first. The app you already installed doesn't need rebuilding, it just
reloads.

### 5. Run

```bash
yarn start:dev              # terminal 1: Metro, against your local backend
yarn ios                    # terminal 2: builds, installs and opens the simulator
```

Android: `yarn android`, with an emulator already running.

## On your own iPhone

The phone has to be registered to the Apple Developer team (`6F6H5A6JCC`):
plug it in, trust the Mac, turn on Developer Mode, and let Xcode's automatic
signing register it the first time.

**With hot reload** (debug build, JS from Metro over Wi-Fi): open
`ios/ReadPanda.xcworkspace`, pick the phone, and Run, with `yarn start:prod`
(or `start:dev` and your Mac's LAN IP) running.

**Standalone** (Release, JS bundled in, no Metro needed):

```bash
yarn ipa              # ios/build/ipa/ReadPanda.ipa, against production
yarn ipa --install    # and install it on the connected iPhone
yarn ipa --adhoc      # Ad Hoc signing, e.g. for Firebase App Distribution
```

`yarn ipa` switches `.env` to production first; run `yarn env:dev` to go back.
The `.ipa` only installs on devices registered to the team. Anyone else
needs TestFlight.

### Firebase App Distribution

```bash
yarn release                                 # build Ad Hoc and send it to testers
yarn release notes:"Fixes the comment sheet"  # write the release notes yourself
```

By default the release notes are the `feat` and `fix` commit subjects since the
last release, without their prefix. Commits scoped `release` or `ci` (changes
to this tooling) are left out. Each release's notes end with `Build <sha>`,
which is how the next run knows where to start. The first release, or one
after a build uploaded by hand, uses the last 20 commits.

Each release's build number is one past the latest release's in Firebase, so
the project file keeps `1` and doesn't need bumping.

It only runs on `master` with a clean working tree that matches
`origin/master`, so every build testers get is a pushed commit on the main
line. It pulls the device IDs of testers who registered through their Firebase
invite, registers any new ones with Apple, makes fresh Ad Hoc profiles that
include them, builds with `yarn ipa --adhoc` signed with those profiles,
checks that every tester device made it into the profiles, and uploads to the
groups in `FIREBASE_GROUPS`. A tester who registers afterwards gets the next
release, not this one.

Setup, once:

1. `brew install ruby` (macOS's Ruby 2.6 is too old for fastlane). The first
   run installs the gems into `vendor/bundle`.
2. In App Store Connect → Users and Access → Integrations, create a Team Key
   with the App Manager role and download the `.p8` (you only get one chance).
3. In Firebase → Project settings → Service accounts, generate a private key
   and give that service account the Firebase App Distribution Admin role in
   Google Cloud IAM.
4. Copy `fastlane/.env.example` to `fastlane/.env` and fill it in. Keep the
   `.p8` and the JSON outside the repo.

#### From GitHub Actions

**Actions → Firebase - Release → Run workflow** on `master` runs the same lane
on a macOS runner, with optional release notes. It needs these repository
secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `ASC_KEY_ID`, `ASC_ISSUER_ID` | as in `fastlane/.env` |
| `ASC_KEY_P8` | the contents of the `.p8` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | the contents of the service account JSON |
| `FIREBASE_GROUPS` | as in `fastlane/.env` |
| `ENV_PROD` | the contents of `.env.prod` |
| `GOOGLE_SERVICE_INFO` | the contents of `ios/GoogleService-Info.plist` (the Analyze workflow uses it too) |
| `CERT_P12_BASE64`, `CERT_P12_PASSWORD` | the signing certificates, below |

The runner has no certificates of its own. You need an **Apple Distribution**
certificate as well as Apple Development; if Keychain Access doesn't list one,
create it in Xcode → Settings → Accounts → the team → Manage Certificates →
+ → Apple Distribution. Then in Keychain Access → My Certificates, select both,
right-click → Export 2 items as a `.p12` with a password, and copy it base64'd:

```bash
base64 -i Certificates.p12 | pbcopy    # paste into CERT_P12_BASE64
```

Delete the `.p12` afterwards. Certificates expire after a year; when you renew
them, update the secret.

## Before you push

```bash
yarn lint:check    # ESLint, zero warnings allowed
yarn test          # Jest
```

Tests live in `__tests__` folders next to the code they cover. Native modules
don't exist under Jest: `jest.setup.js` stubs the ones most components use
(icons, gradients, the logger), and a test that needs storage or the API mocks
`enhancedStorage` or the service module itself (see
`src/stores/__tests__/readingProgressStore.test.js`). CI runs them on every
pull request (`.github/workflows/test.yml`).

For Swift changes, run the **Xcode - Build and Analyze** workflow before
merging (`gh workflow run xcode-build-analyze.yml --ref <branch>`). It's manual
only, and compiles with the Xcode on GitHub's `macos-latest` image, which can
be older than yours. Code that builds locally can fail there.
Type inference is the usual difference: a key path like `\.$face` may need its
root type spelled out (`\ReadPandaWidgetIntent.$face`).

## Troubleshooting

| Symptom | Fix |
|---|---|
| The app still calls the old backend after editing `.env` | `yarn start --reset-cache`. Babel caches `@env` values. |
| Network errors against a local backend | Is the Go server running on port 3000? Is `Local_IP` right for your simulator or device (step 4)? |
| iOS build fails on a missing `GoogleService-Info.plist` | Get it from a maintainer and put it in `ios/`. |
| Pod or native build errors after pulling | `yarn pods`. If that fails, `yarn reset:all` for a clean reinstall. |
| Push notifications never arrive in the simulator | Expected. Test push on a physical device. |
| A 500 from the backend | The cause is in the backend's logs. See `DEPLOYMENT.md` in the readpanda repo. |
