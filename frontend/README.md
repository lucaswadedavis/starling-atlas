# Starling Atlas Frontend

This is a React + TypeScript + Vite project for a polished web front end to the Optimus Space astrodynamics API, specifically focusing on the `astro/orbit_prop` endpoints. The UI is designed for clarity and future extensibility, including planned 3D visualization with THREE.js.

## Project Purpose

- Provide a user-friendly, modern web interface for astrodynamics routines (satellite orbit propagation, etc.)
- Integrate with the Optimus API (https://api.optimus-space.com/docs#/), focusing on the `astro/orbit_prop` endpoints
- Use Tailwind CSS for rapid, consistent, and beautiful UI development
- Future: Add 3D visualization of orbits with THREE.js

## Tech Stack

- React + TypeScript (Vite)
- Tailwind CSS (utility-first styling)
- (Planned) THREE.js for 3D visualization

## Tailwind CSS Integration

Tailwind is installed and configured manually due to issues with the init command. The following steps were performed:

1. Installed dependencies:
   ```sh
   npm install tailwindcss postcss autoprefixer --save
   ```
2. Created `tailwind.config.js`:
   ```js
   module.exports = {
     content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
     theme: { extend: {} },
     plugins: [],
   };
   ```
3. Created `postcss.config.js`:
   ```js
   module.exports = {
     plugins: {
       tailwindcss: {},
       autoprefixer: {},
     },
   };
   ```
4. Added Tailwind directives to `src/index.css`:
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

## Running the Frontend

- Start the dev server:
  ```sh
  npm run dev
  ```
- The app will be available at http://localhost:5173

## Next Steps

- Build a form UI for the `astro/orbit_prop` endpoints
- Integrate with the Optimus API
- Display results and (eventually) visualize orbits
