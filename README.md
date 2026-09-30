# ReadPanda

A React Native app for reading books together. Readers form small rooms around
a book and comment on passages, and a comment unlocks for the others only once
they've read that far, so nobody hits spoilers.

The backend (Go API, writer portal) is in the
[readpanda](https://github.com/Mavzz/readpanda) repo.

## Getting started

**[docs/RUN.md](docs/RUN.md)** covers setup, pointing the app at a local or
production backend, CI simulator builds and troubleshooting.

The short version, once you have `ios/GoogleService-Info.plist` from a
maintainer:

```bash
yarn install && yarn pods
cp .env.example .env        # empty BACKEND_URL = backend on localhost:3000
yarn start --reset-cache    # terminal 1
yarn ios                    # terminal 2
```

## More docs

- [docs/TECHNICAL_DOCUMENTATION.md](docs/TECHNICAL_DOCUMENTATION.md): architecture
- [docs/DESIGN.md](docs/DESIGN.md): design system
- [docs/API_RETRY_DOCUMENTATION.md](docs/API_RETRY_DOCUMENTATION.md): request retries and token refresh
- [docs/sequence_diagrams](docs/sequence_diagrams): key flows
