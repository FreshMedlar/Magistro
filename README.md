# Magistro

**An adaptive AI learning harness: guided teaching, active practice, and a persistent knowledge graph.**

Magistro uses AI agents to map what you already understand, plan a dependency path to your goal, teach one reasoning step at a time, and run adaptive practice sessions backed by a persistent knowledge graph.

## How it works

1. **Measure.** Before teaching, the agent locates where your understanding ends on each prerequisite of your goal.
2. **Plan.** It constructs a dependency map from that starting point to your target, adapting dynamically as you respond.
3. **Teach.** Each step builds on concepts you already hold, using predictions, targeted explanations, and repair before moving forward.
4. **Practice.** Separate practice sessions pose varied problems and adapt hints to your reasoning.

## Getting started (with the Magistro proxy)

Magistro connects to the separate Magistro OpenAI-compatible token proxy service (`http://localhost:8000/v1` by default for local development), or to any custom/BYOK provider you configure in **Settings → Providers**.

### Local development

```bash
npm ci
npm run plugins:setup
npm run dev        # http://localhost:3000
npm test           # offline test suite
```

To connect to your local Magistro proxy, set your personal API token in `.env.local` (never commit secrets) or configure it in **Settings → Providers → Custom endpoint** (`http://localhost:8000/v1`):

```bash
MAGISTRO_API_BASE_URL=http://localhost:8000/v1
MAGISTRO_API_KEY=<your-personal-magistro-token>
```

See [docs/README.md](docs/README.md) for architecture, plugin authoring, themes, keyboard shortcuts, and desktop build instructions.

## Desktop builds

```bash
npm run build
node scripts/build-server.mjs
npx electron-builder --linux --x64 --publish never   # or --win / --mac
```

## Attribution

Based on [learnharness](https://github.com/amosblomqvist/learnharness) by amosblomqvist, AGPL-3.0. This project is an independent fork and is not endorsed by or affiliated with the original author.

## License

Licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE). All modifications to this repository inherit AGPL-3.0, and all original copyright notices and license texts are preserved.
