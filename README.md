# Starling Atlas

## Frontend (localhost:5173)

### 3D Globe Visualization

- Uses [three-globe](https://github.com/vasturiano/three-globe) for rendering a 3D globe with Three.js.
- The globe is rendered once and persists across React prop changes, thanks to a React/Three.js integration pattern:
  - The Three.js scene, camera, and globe are set up in a `useEffect` with an empty dependency array (`[]`), so they are only created once.
  - Satellite data is updated in a separate `useEffect` that depends on the `satellites` prop, so only the satellite positions are updated without re-initializing the scene or replaying intro animations.
- Satellites are rendered using `.particlesData` (with a single group), and their positions are updated every animation frame.
- The globe and animation do **not** reset or replay intro animations when satellites are added or selected; only the satellite data is updated.

### Why objectsData?

- `.pointsData` creates larger spheres that can appear visually farther from the globe, and their size is in globe radius units.
- `.objectsData` with `objectThreeObject` allows precise control over the mesh size and appearance, making satellites look like "particles" in orbit, as in the official example.

### Satellite Management (Frontend)

- The frontend supports persistent management of satellites using the browser's localStorage. Each time you propagate a TLE, the parameters are saved as a new "satellite" object in a local collection. When results come back, they are attached to the corresponding satellite record.
- **Persistence:** All satellites are stored in localStorage, so they persist across page reloads.
- **Display:** The right panel shows a list of all satellites, with their display name and creation time.
- **Selection:** Clicking a satellite in the list loads its parameters and results into the form and results table, allowing you to review or re-propagate.
- **Creation:** Each propagation creates a new satellite record with a unique ID and display name (e.g., "Sat 1").
- **Update:** When propagation results are received, they are attached to the correct satellite record.
- **Color:** Each satellite is assigned a unique color (random HSL, fixed saturation and lightness) on creation, which is shown in the UI and persisted in localStorage.
- This system is entirely client-side and does not affect the backend or any server-side storage.

### User-Generated Satellites on the Globe

- When a user submits a satellite via the TLE form in the frontend, it is added to the list of satellites and displayed on the interactive 3D globe.
- The frontend passes the TLE data, color, and display name for each satellite to the `GlobeCanvas` component.
- `GlobeCanvas` uses [satellite.js](https://github.com/shashwatak/satellite-js) to propagate each satellite's position in real time, converting TLEs to latitude, longitude, and altitude.
- The globe updates every animation frame to show the current position of all user-generated satellites.
- A **virtual time system** is used for satellite animation, so satellites move much faster than real time (default: 1 minute per animation frame, adjustable via a constant in `GlobeCanvas.tsx`).
- The frontend client runs at [http://localhost:5173](http://localhost:5173).

### React/Three.js Integration Pattern

- The Three.js scene and globe are created once in a `useEffect` with an empty dependency array.
- The globe instance is stored in a `useRef`, so it persists across renders.
- Satellite data is updated in a separate `useEffect` that depends on the `satellites` prop, ensuring that only the satellite positions are updated when the data changes.
- The animation loop and virtual time are managed independently and are not reset by React prop changes.
- This pattern ensures smooth, persistent 3D visualization and efficient updates.

---

See the code in `frontend/src/GlobeCanvas.tsx` for implementation details.

## Frontend CSS Setup (as of Tailwind v4+)

- **Tailwind CSS** is now configured using the `@tailwindcss/vite` plugin in `vite.config.ts`.
- **PostCSS** is no longer used or required. The `postcss.config.cjs` file has been deleted.
- **autoprefixer** and **postcss** dependencies have been removed from `package.json`.
- If you need additional PostCSS plugins, you will need to reintroduce a PostCSS config and dependencies.

The frontend client runs at [http://localhost:5173](http://localhost:5173).
