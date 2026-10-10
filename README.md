# Veedu Simulator

A story simulation inside a traditional Kerala nalukettu. Do the housework, answer the quizzes, and let the family story unfold in Malayalam.

## Features & Gameplay

- **Authentic Environment**: Explore a detailed traditional Kerala nalukettu with 128px material textures, detailed sprites, and dynamic audio and weather events.
- **Progression System**: Includes 100 score-gated activity unlocks, starting with eight starter activities and five inventory capacity milestones.
- **Interactive Housework**: Use specific tools for different activities (e.g., cloth for polishing, brush for grooming). Work features multiple stages, including strokes/turns and holding mechanics for pouring/heating. Partial work progress persists.
- **Dynamic Elements**: Swept leaf piles shrink, taps can be repaired to stop dripping, and lamps light up contextually. Dropped items remain in the environment physically until picked up.
- **Malayalam Localization**: Activity instructions, UI, story, events, and a comprehensive trivia system featuring 100 authored Kerala/safety questions and 900 household arithmetic scenarios are fully translated in Malayalam.
- **Trivia & Events**: Quizzes appear dynamically during gameplay to challenge you on Kerala culture, safety, and household arithmetic.

## Tech Stack

- **Framework**: [React 19](https://react.dev/) for building the user interface.
- **Bundler**: [Vite](https://vitejs.dev/) for fast development and building.
- **Build Plugin**: `vite-plugin-singlefile` to bundle the entire game into a single HTML file for easy distribution.
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) for utility-first styling.
- **Styling Utilities**: `clsx` and `tailwind-merge` for conditionally merging tailwind classes without conflicts.
- **Language**: TypeScript for static type checking and structural integrity.

## Project Structure

```text
├── src/
│   ├── game/        # Core game mechanics, state, and rendering
│   ├── ui/          # UI components, menus, and overlays
│   ├── utils/       # Utility functions and helpers
│   ├── App.tsx      # Main application component
│   ├── main.tsx     # Application entry point
│   └── index.css    # Global styles and Tailwind configuration
├── scripts/         # Scripts like check-restoration.mjs for headless testing
├── package.json     # Project dependencies and scripts
├── RESTORATION.md   # Details on gameplay fixes and restorations
└── vite.config.ts   # Vite configuration including single-file plugin
```

## Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. Clone the repository and navigate to the project folder.
2. Install the dependencies:
   ```bash
   npm install
   ```

### Development

To start the development server:

```bash
npm run dev
```

### Building for Production

To create a single-file production-ready build:

```bash
npm run build
```
