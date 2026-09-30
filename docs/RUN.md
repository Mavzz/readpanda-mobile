# Running the App

ReadPanda is a bare React Native app (no Expo) with native iOS code: the PDF
reader, the comment sheet and the home screen widget are Swift. iOS is the
primary platform.

There are two ways to get the app into a simulator:

- **Build it yourself** (most development): Metro and Xcode on your Mac, with
  hot reload.
- **Download a CI build**: a ready-made simulator `.app` from GitHub Actions,
  for trying a branch without a local build.

Either way, the app needs a backend: your own local one, or production on
Cloud Run.

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

```bash
cp .env.example .env
```

`src/utils/Helper.js` builds every API URL from these values:

| `.env` | App talks to |
|---|---|
| `BACKEND_URL=` (empty) | `http://<Local_IP>:3000/api/v1`, a backend on your machine |
| `BACKEND_URL=https://readpanda-backend-439290157125.asia-south1.run.app` | Production on Cloud Run |

- Leave `/api/v1` off `BACKEND_URL`: `API_VERSION` is appended automatically.
- With a local backend, `Local_IP` depends on where the app runs: `localhost`
  for the iOS Simulator, `10.0.2.2` for the Android emulator, and your Mac's
  LAN IP for a physical phone.
- To run the backend locally, see `packages/api-go/README.md` in the
  [readpanda](https://github.com/Mavzz/readpanda) repo.

**The values are compiled in.** After editing `.env`, restart Metro with
`yarn start --reset-cache`, or the app keeps the old values.

### 5. Run

```bash
yarn start --reset-cache    # terminal 1: Metro
yarn ios                    # terminal 2: builds, installs and opens the simulator
```

Android: `yarn android`, with an emulator already running.

## Download a CI build

The **Build Simulator & Emulator Apps** workflow
(`.github/workflows/build-dev-artifacts.yml`) builds a standalone iOS
Simulator app with the JavaScript bundled in, so no Metro is needed. It runs on
every push to `master`, and on demand for any branch:

```bash
gh workflow run build-dev-artifacts.yml --ref <branch>
gh run watch
```

You can also start it from GitHub: **Actions**, then **Build Simulator &
Emulator Apps**, then **Run workflow**, and pick the branch. Only what's
pushed gets built.

When it finishes, download the `ReadPanda-iOS-Simulator` artifact from the
run's page (kept for 14 days), then:

```bash
unzip ReadPanda-Simulator.zip
xcrun simctl install booted ReadPanda.app
```

The workflow writes `.env` from repository secrets, so your local `.env` has
no effect on CI builds:

| Secret | Purpose |
|---|---|
| `BACKEND_URL` | The backend the build talks to. Currently production. Empty means `127.0.0.1:3000`. |
| `GOOGLE_SERVICE_INFO` | Contents of `GoogleService-Info.plist`. Required. |
| `LOCAL_IP`, `API_VERSION` | Optional; default to `127.0.0.1` and `/api/v1` |

Changing `BACKEND_URL` only affects builds made after the change. An `.app`
you already downloaded keeps the URL it was built with.

A second workflow, **Xcode - Build and Analyze**, runs Xcode's static analyzer
on pushes to `master`.

## Before you push

```bash
yarn lint:check    # ESLint, zero warnings allowed
```

For Swift changes, CI compiles with the Xcode on GitHub's `macos-latest`
image, which can be older than yours. Code that builds locally can fail there.
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
