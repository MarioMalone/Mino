# Mino

A lightweight Markdown editor built with Tauri v2, Svelte 5, and Milkdown.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Shell | Tauri v2 (Rust) |
| UI | Svelte 5 + SvelteKit |
| Editor | Milkdown (ProseMirror) |
| Styling | Tailwind CSS |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 22
- [Rust](https://rustup.rs/) (stable, MSVC toolchain)
- [VS Build Tools 2022](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (C++ build tools workload)

### Install

```bash
npm install
```

### Development

```bash
npm run tauri dev
```

### Build

```bash
npm run tauri build
```

## Project Structure

```
src/                # Svelte frontend
  lib/              # Shared components
  routes/           # SvelteKit pages
  styles/           # Global styles
src-tauri/          # Rust backend
  src/
    main.rs         # Entry point
    lib.rs          # Tauri commands & plugins
```

## License

MIT
