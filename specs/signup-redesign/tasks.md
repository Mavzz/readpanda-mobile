# Sign Up Redesign: Tasks

Each task should be small enough to review in one diff. Tick a task when it's
done and `yarn lint:check` passes (and `go build ./... && go vet ./...` for
backend tasks). Backend tasks are in `readpanda/packages/api-go`.

### Backend
- [ ] 1. `/signup` validation and errors: username rules and password ≥ 8 → 400 with `field`; 409 with `field` (username vs email) (R3.1, R8.3, R8.4)
- [ ] 2. `GET /signup/available` with suggestion and rate limiting (R8.2, R3.2)
- [ ] 3. `POST /auth/apple`: JWKS verify, sign in, link or create, private relay (R8.1)
- [ ] 4. `ROUTES.md` for the above (R8.1–R8.4)

### App
- [ ] 5. Apple sign-in plumbing: approve and add the library, entitlement, `appleSignUpLogin()`, `SignUpType.Apple` (R1.2)
- [ ] 6. `useSignUpForm`: fields, validation, availability on blur, server-error mapping, no Alerts (R3.1–R3.5, R4.1, R4.2)
- [ ] 7. `SignUpForm` and `OneTapButtons`: labels, eye, content types, Return chain, hints and check marks, inactive Create account (R1.1, R2.1–R2.4, R3.4, R3.5)
- [ ] 8. Phone layout (17a/17b), with keyboard behaviour (R6.1, R5.1, R7.1)
- [ ] 9. iPad layouts: centred card (17d) and split (17c, rewritten panel line), with keyboard behaviour (R6.2–R6.4, R5.2, R7.1)
- [ ] 10. Terms line with toast links (R7.1, R7.2)
- [ ] 11. QA: Apple (new, returning, hidden email, cancelled), Google, email (taken name, taken email, short password, offline), every layout, rotation mid-typing; confirm the new screen doesn't ship before Apple works (R1.3, all)

## Notes
