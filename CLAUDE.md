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
- **State**: Zustand v5 with `persist` middleware (IndexedDB)
- **UI**: shadcn/ui (`radix-lyra` style), Base UI, Radix UI
- **Icons**: Tabler Icons (`@tabler/icons-react`)
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite`, inline theme in CSS)
- **Build**: Vite + Nitro
- **Testing**: Vitest + Testing Library

## Project Structure

```
src/
  routes/                     # File-based routes (TanStack Router)
  components/
    ui/                       # shadcn/ui components
    studio/                   # Node-based editor components
      floating-add-node.tsx   # Floating action menu
      node-inspector-panel.tsx # Properties/settings panel
      preview-modal.tsx       # Image preview dialog
      studio-canvas.tsx       # Main XYFlow canvas
      studio-toolbar.tsx      # Top action bar
      workflow-panel.tsx      # Workflow list/management
      nodes/                  # Custom node types
        index.ts              # Barrel export
        base-node.tsx         # Base node wrapper
        input-node.tsx        # Input image loader (single + batch)
        output-node.tsx       # Output exporter
        crop-node.tsx
        resolution-node.tsx
        color-node.tsx
        normalmap-node.tsx
        displacement-node.tsx
        aomap-node.tsx
        slider-row.tsx        # Reusable slider UI component
  hooks/                      # Custom React hooks
    index.ts                  # Barrel export
    use-directory-picker.ts   # File System Access API wrapper
    use-node-connection.ts    # Query upstream results + validation
    use-node-updater.ts       # Update node data with live-mode debounce
  types/
    studio.ts                 # All TypeScript definitions (node kinds, data, results)
  lib/
    utils.ts                  # cn() helper (clsx + tailwind-merge)
    workflow.ts               # Node factory, NODE_META, and createInitialGraph()
    workflow-types.ts         # WorkflowDef/WorkflowStore/StoreSet/StoreGet interfaces
    workflow-store.ts         # Zustand store assembler + selectors (~94 lines)
    workflow-crud.ts          # buildCrudActions() — add/delete/duplicate/import/export
    workflow-graph.ts         # buildGraphActions() — node/edge mutations
    workflow-execution.ts     # buildExecutionActions() — run/batch/reset
    execution.ts              # Pure Canvas 2D execution engine (topoSort, runWorkflow)
    directory-store.ts        # Zustand store for FileSystemDirectoryHandle (IndexedDB)
    processors/               # Canvas 2D image processors (one file per node type)
      index.ts
      input.ts / crop.ts / resolution.ts / color.ts
      normalmap.ts / displacement.ts / aomap.ts
      output.ts / utils.ts
  styles.css                  # Global styles + Tailwind (with React Flow overrides)
```

## Architecture

- **Store pattern**: Three action builder modules (`buildCrudActions`, `buildGraphActions`, `buildExecutionActions`) are assembled in `workflow-store.ts`. Sub-modules import from `workflow-types.ts` only — no circular imports.
- **Execution**: `execution.ts` is a pure functional engine (toposort → run processors). `workflow-execution.ts` wraps it with store mutations and file I/O.
- **File I/O**: `directory-store.ts` holds `FileSystemDirectoryHandle` refs via IndexedDB. Not serialized into the main workflow store.

## Hooks

- `useNodeConnection(nodeId)` → `{ result, upstreamId, hasValidInput }`
- `useNodeUpdater<T>(nodeId, { live, hasValidInput, isRunning })` → `{ update, toggleDisabled, toggleLive }`
- `useDirectoryPicker(mode)` → `{ supportsDirectoryPicker, pickDirectory }`

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
