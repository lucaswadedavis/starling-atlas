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

---

See the code in `frontend/src/GlobeCanvas.tsx` for implementation details.
