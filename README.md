# Starling Atlas

## Frontend (localhost:5173)

### 3D Globe Visualization

- Uses [three-globe](https://github.com/vasturiano/three-globe) for rendering a 3D globe with Three.js.
- Satellites are now rendered using `.objectsData` and `objectThreeObject` (custom small mesh for each satellite), instead of `.pointsData`.
- This change was made to match the visual style of the [three-globe satellites example](https://github.com/vasturiano/three-globe/blob/master/example/satellites/index.html), and to ensure satellites appear just above the globe surface, not far away.
- Each satellite is a small white sphere mesh, positioned using latitude, longitude, and altitude (relative to the globe's radius).
- The fallback wireframe sphere and the globe are both scaled to 0.95 for visual alignment.

### Why objectsData?

- `.pointsData` creates larger spheres that can appear visually farther from the globe, and their size is in globe radius units.
- `.objectsData` with `objectThreeObject` allows precise control over the mesh size and appearance, making satellites look like "particles" in orbit, as in the official example.

## Satellite Management (Frontend)

The frontend now supports persistent management of satellites using the browser's localStorage. Each time you propagate a TLE, the parameters are saved as a new "satellite" object in a local collection. When results come back, they are attached to the corresponding satellite record.

- **Persistence:** All satellites are stored in localStorage, so they persist across page reloads.
- **Display:** The right panel shows a list of all satellites, with their display name and creation time.
- **Selection:** Clicking a satellite in the list loads its parameters and results into the form and results table, allowing you to review or re-propagate.
- **Creation:** Each propagation creates a new satellite record with a unique ID and display name (e.g., "Sat 1").
- **Update:** When propagation results are received, they are attached to the correct satellite record.
- **Color:** Each satellite is assigned a unique color (random HSL, fixed saturation and lightness) on creation, which is shown in the UI and persisted in localStorage.

This system is entirely client-side and does not affect the backend or any server-side storage.

## User-Generated Satellites on the Globe

- When a user submits a satellite via the TLE form in the frontend, it is added to the list of satellites and displayed on the interactive 3D globe.
- The frontend passes the TLE data, color, and display name for each satellite to the `GlobeCanvas` component.
- `GlobeCanvas` uses [satellite.js](https://github.com/shashwatak/satellite-js) to propagate each satellite's position in real time, converting TLEs to latitude, longitude, and altitude.
- The globe updates every animation frame to show the current position of all user-generated satellites.
- The frontend client runs at [http://localhost:5173](http://localhost:5173).

---

See the code in `frontend/src/GlobeCanvas.tsx` for implementation details.
