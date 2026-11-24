# Contributing to Magistro

Bug reports, focused fixes, documentation, and tests are welcome.

## Development setup

```bash
npm ci
npm run plugins:setup
npm run typecheck
npm test
npm run lint
```

## Pull requests

- Keep each PR focused on one coherent change.
- Include tests and documentation updates where appropriate.
- Do not commit API keys, tokens, `.env*` files, `auth.json`, or private learning data.

Magistro is licensed under [AGPL-3.0](LICENSE).
