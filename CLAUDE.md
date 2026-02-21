# material-studio

A node-based texture/image processing studio built with TanStack Start, React 19, TypeScript, Tailwind CSS v4, and shadcn/ui.

## Commands

```bash
pnpm dev          # Start dev server on port 3000
pnpm build        # Production build
pnpm test         # Run tests with Vitest
pnpm lint         # Run ESLint
pnpm check        # Prettier format + ESLint fix
```

## Tech Stack

- **Framework**: TanStack Start (SSR via Nitro) + TanStack Router (file-based)
- **Node Editor**: `@xyflow/react` — core canvas for the workflow/node graph
- **UI**: shadcn/ui (`radix-lyra` style), Base UI, Radix UI
- **Icons**: Tabler Icons (`@tabler/icons-react`)
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite`, inline theme in CSS)
- **Build**: Vite + Nitro
- **Testing**: Vitest + Testing Library

## Project Structure

```
src/
  routes/         # File-based routes (TanStack Router)
  components/
    ui/           # shadcn/ui components
    studio/       # Node-based editor components
      nodes/      # Custom node types (input, output, crop, color, resolution)
  types/
    studio.ts     # Type definitions for workflow nodes
  lib/
    utils.ts      # cn() helper (clsx + tailwind-merge)
    workflow.ts   # Workflow node factory and metadata
  styles.css      # Global styles + Tailwind (with React Flow overrides)
```

## Path Aliases

`@/` maps to `src/` (configured via `vite-tsconfig-paths`).

## Code Style

Prettier config: no semicolons, single quotes, trailing commas.

```ts
// Good
import { cn } from '@/lib/utils'
```

## shadcn/ui

- Style: `radix-lyra`, base color: `neutral`
- CSS variables enabled
- Icon library: `tabler`
- Add components: `pnpm shadcn add <component>`
