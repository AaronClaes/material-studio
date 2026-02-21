# material-studio

A TanStack Start project with React 19, TypeScript, Tailwind CSS v4, and shadcn/ui.

## Commands

```bash
pnpm dev          # Start dev server on port 3000
pnpm build        # Production build
pnpm test         # Run tests with Vitest
pnpm lint         # Run ESLint
pnpm check        # Prettier format + ESLint fix
```

## Tech Stack

- **Framework**: TanStack Start (SSR) + TanStack Router (file-based)
- **UI**: shadcn/ui (`radix-lyra` style), Base UI, Radix UI
- **Icons**: Tabler Icons (`@tabler/icons-react`)
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite`)
- **Build**: Vite + Nitro
- **Testing**: Vitest + Testing Library

## Project Structure

```
src/
  routes/         # File-based routes (TanStack Router)
  components/
    ui/           # shadcn/ui components
  lib/
    utils.ts      # cn() helper (clsx + tailwind-merge)
  styles.css      # Global styles + Tailwind
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
