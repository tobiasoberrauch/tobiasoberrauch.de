# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Communitas Cotidiana

This repository also hosts the [Communitas Cotidiana](https://tobiasoberrauch.de/communitas/) feature — a small, deliberately quiet membership platform layered onto the same Astro deployment.

- Specification: `specs/001-communitas-cotidiana/` (spec, plan, data model, contracts, tasks)
- Operations runbook: `docs/communitas/operations.md`
- Data policy / DSGVO: `docs/communitas/data-policy.md`
- Migrations: `migrations/communitas/*.sql`
- Server code: `src/lib/communitas/`, `src/pages/api/communitas/`, `src/pages/communitas/`, `src/pages/communitas-mitglied/`
- Unit tests: `tests/communitas/unit/` (run via `npm run test:unit`)
