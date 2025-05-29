import React, { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import ThreeGlobe from "three-globe";
import GlobeCanvas from "./GlobeCanvas";
import earthImg from "./assets/earth-blue-marble.jpg";
import { createNameId } from "./utils";

const propagatorsTLE = ["SKYFIELD", "SGP4-PY", "ASTRO"];
const propagatorsSV = ["RK"];

// Example TLE for the ISS (ZARYA)
const DEFAULT_TLE_LINE1 =
  "1 25544U 98067A   24128.51835648  .00016717  00000-0  10270-3 0  9002";
const DEFAULT_TLE_LINE2 =
  "2 25544  51.6417  13.2342 0003782  80.8882  37.2822 15.50394291447097";

export default function App() {
  const [tab, setTab] = useState<"TLE" | "StateVector">("TLE");

  // TLE form state
  const [tleForm, setTleForm] = useState({
    propagator: propagatorsTLE[0],
    tle_line1: DEFAULT_TLE_LINE1,
    tle_line2: DEFAULT_TLE_LINE2,
    start_time: getNowLocalISOString(),
    step_minutes: 1,
    count: 1,
  });
  const [tleResults, setTleResults] = useState<any[] | null>(null);
  const [tleLoading, setTleLoading] = useState(false);
  const [tleError, setTleError] = useState<string | null>(null);

  // State Vector form state
  const [svForm, setSvForm] = useState({
    propagator: propagatorsSV[0],
    position: [7000, 0, 0], // km
    velocity: [0, 7.5, 0], // km/s
    start_time: getNowLocalISOString(),
    step_minutes: 10,
    count: 20,
  });
  const [svResults, setSvResults] = useState<any[] | null>(null);
  const [svLoading, setSvLoading] = useState(false);
  const [svError, setSvError] = useState<string | null>(null);

  // --- Satellite Types ---
  type Satellite = {
    id: string;
    displayName: string;
    form: typeof tleForm;
    results?: any[];
    createdAt: string;
    color: string;
  };

  // --- Utility for localStorage ---
  function loadSatellites(): Satellite[] {
    try {
      const raw = localStorage.getItem("satellites");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveSatellites(sats: Satellite[]) {
    localStorage.setItem("satellites", JSON.stringify(sats));
  }

  function getNowLocalISOString() {
    const now = new Date();
    // Pad to YYYY-MM-DDTHH:MM (no seconds/millis)
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate()
    )}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  const globeRef = useRef<HTMLDivElement>(null);
  const [satellites, setSatellites] = useState<Satellite[]>(() =>
    loadSatellites()
  );
  const [selectedSatelliteId, setSelectedSatelliteId] = useState<string | null>(
    null
  );

  // Add state for overflow menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!globeRef.current) return;
    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      globeRef.current.clientWidth / globeRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 3;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(
      globeRef.current.clientWidth,
      globeRef.current.clientHeight
    );
    globeRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    // three-globe setup: just the globe, no polygons
    const globe = new (ThreeGlobe as any)();
    scene.add(globe);

    // Dummy satellite: a single point above the globe
    const satellites = [
      {
        lat: 0, // Equator
        lng: 0, // Prime meridian
        alt: 1.2, // 20% above the globe surface
        size: 0.03,
        color: "red",
        name: "DummySat-1",
      },
    ];
    globe
      .pointsData(satellites)
      .pointLat("lat")
      .pointLng("lng")
      .pointAltitude("alt")
      .pointColor("color")
      .pointRadius("size");

    // Animation loop
    let frameId: number;
    const animate = () => {
      globe.rotation.y += 0.002;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!globeRef.current) return;
      camera.aspect =
        globeRef.current.clientWidth / globeRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(
        globeRef.current.clientWidth,
        globeRef.current.clientHeight
      );
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(frameId);
      renderer.dispose();
      globeRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  // When satellites change, persist to localStorage
  useEffect(() => {
    saveSatellites(satellites);
  }, [satellites]);

  // When selectedSatelliteId changes, load its form values
  useEffect(() => {
    if (!selectedSatelliteId) return;
    const sat = satellites.find((s) => s.id === selectedSatelliteId);
    if (sat) {
      setTleForm(sat.form);
      setTleResults(sat.results || null);
    }
  }, [selectedSatelliteId]);

  // Handle TLE form input
  function handleTleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setTleForm((prev) => ({
      ...prev,
      [name]:
        name === "step_minutes" || name === "count" ? Number(value) : value,
    }));
  }

  // Handle State Vector form input
  function handleSvChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    if (name.startsWith("position") || name.startsWith("velocity")) {
      const [field, idx] = name.split("-");
      if (field === "position" || field === "velocity") {
        setSvForm((prev) => ({
          ...prev,
          [field]: (prev as any)[field].map((v: number, i: number) =>
            i === Number(idx) ? Number(value) : v
          ),
        }));
      }
    } else {
      setSvForm((prev) => ({
        ...prev,
        [name]:
          name === "step_minutes" || name === "count" ? Number(value) : value,
      }));
    }
  }

  // --- Utility for random color ---
  function randomHslColor() {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 50%)`;
  }

  // Handle TLE form submit
  async function handleTleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTleLoading(true);
    setTleError(null);
    setTleResults(null);

    // Create new satellite record
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const displayName = createNameId();
    const color = randomHslColor();
    const newSat: Satellite = {
      id,
      displayName,
      form: { ...tleForm },
      createdAt: new Date().toISOString(),
      color,
    };
    setSatellites((prev) => [...prev, newSat]);
    setSelectedSatelliteId(id);

    try {
      const res = await fetch("http://localhost:3001/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: `https://api.optimus-space.com/astro/orbit_prop/analytic/sgp4/tle/${tleForm.propagator}`,
          method: "POST",
          body: {
            tle_line1: tleForm.tle_line1,
            tle_line2: tleForm.tle_line2,
            start_time: tleForm.start_time,
            step_minutes: tleForm.step_minutes,
            count: tleForm.count,
          },
        }),
      });
      if (!res.ok) {
        let err;
        try {
          err = await res.json();
        } catch {
          err = { detail: res.statusText };
        }
        throw new Error(err.error || err.detail?.[0]?.msg || res.statusText);
      }
      const data = await res.json();
      setTleResults(data);
      // Update satellite with results
      setSatellites((prev) =>
        prev.map((s) => (s.id === id ? { ...s, results: data } : s))
      );
    } catch (err: any) {
      setTleError(err.message || "Unknown error");
    } finally {
      setTleLoading(false);
    }
  }

  // Handle State Vector form submit
  async function handleSvSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSvLoading(true);
    setSvError(null);
    setSvResults(null);
    try {
      const res = await fetch("http://localhost:3001/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: `https://api.optimus-space.com/astro/orbit_prop/numerical/sv/${svForm.propagator}`,
          method: "POST",
          body: {
            position: svForm.position,
            velocity: svForm.velocity,
            start_time: svForm.start_time,
            step_minutes: svForm.step_minutes,
            count: svForm.count,
          },
        }),
      });
      if (!res.ok) {
        let err;
        try {
          err = await res.json();
        } catch {
          err = { detail: res.statusText };
        }
        throw new Error(err.error || err.detail?.[0]?.msg || res.statusText);
      }
      const data = await res.json();
      setSvResults(data);
    } catch (err: any) {
      setSvError(err.message || "Unknown error");
    } finally {
      setSvLoading(false);
    }
  }

  function handleDeleteSatellite(id: string) {
    setSatellites((prev) => prev.filter((sat) => sat.id !== id));
    if (selectedSatelliteId === id) {
      setSelectedSatelliteId(null);
    }
    setOpenMenuId(null);
  }

  const renderTleResults = () => {
    if (!tleResults) return null;
    return (
      <div className=" overflow-x-auto text-xs">
        <table className="table-auto w-full text-left border-collapse bg-surface rounded shadow">
          <thead>
            <tr>
              <th className="px-4 py-2 text-accent border-b border-surface-dark">
                Time
              </th>
              <th className="px-4 py-2 text-accent border-b border-surface-dark">
                Position (km)
              </th>
              <th className="px-4 py-2 text-accent border-b border-surface-dark">
                Velocity (km/s)
              </th>
              <th className="px-4 py-2 text-accent border-b border-surface-dark">
                LLA
              </th>
              <th className="px-4 py-2 text-accent border-b border-surface-dark">
                Error
              </th>
            </tr>
          </thead>
          <tbody>
            {tleResults.map((row, i) => (
              <tr key={i} className="hover:bg-surface-light transition-colors">
                <td className="border-b border-surface-dark px-4 py-2 text-text-muted">
                  {row.time}
                </td>
                <td className="border-b border-surface-dark px-4 py-2 text-text">
                  {row.pos_km?.join(", ")}
                </td>
                <td className="border-b border-surface-dark px-4 py-2 text-text">
                  {row.vel_kms?.join(", ")}
                </td>
                <td className="border-b border-surface-dark px-4 py-2 text-text">
                  {row.lla?.join(", ")}
                </td>
                <td className="border-b border-surface-dark px-4 py-2 text-text">
                  {row.error}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderForm = () => {
    return (
      <div className="space-y-6">
        <div className="bg-surface p-2 border-r border-surface-dark">
          <h1 className="text-xl mb-6 tracking-wide">
            Astrodynamics Propagation
          </h1>
          {/* Tabs */}
          <div className="flex space-x-4 border-b border-surface-dark mb-6">
            <button
              className={`px-4 py-2 font-semibold transition-colors duration-200 rounded-t-md focus:outline-none focus:ring-2 focus:ring-accent ${
                tab === "TLE"
                  ? "border-b-4 border-accent text-accent bg-primary"
                  : "text-text-muted hover:text-accent hover:bg-surface-light"
              }`}
              onClick={() => setTab("TLE")}
            >
              TLE Propagation
            </button>
            <button
              className={`px-4 py-2 font-semibold transition-colors duration-200 rounded-t-md focus:outline-none focus:ring-2 focus:ring-accent ${
                tab === "StateVector"
                  ? "border-b-4 border-accent text-accent bg-primary"
                  : "text-text-muted hover:text-accent hover:bg-surface-light"
              }`}
              onClick={() => setTab("StateVector")}
            >
              State Vector Propagation
            </button>
          </div>

          {/* TLE Propagation Form */}
          {tab === "TLE" && (
            <form onSubmit={handleTleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-accent">
                  Propagator
                </label>
                <select
                  name="propagator"
                  value={tleForm.propagator}
                  onChange={handleTleChange}
                  className="mt-1 block w-full rounded-md border border-surface-dark bg-primary text-text focus:border-accent focus:ring-accent"
                >
                  {propagatorsTLE.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text">
                  TLE Line 1
                </label>
                <input
                  name="tle_line1"
                  value={tleForm.tle_line1}
                  onChange={handleTleChange}
                  required
                  autoComplete="off"
                  className="mt-1 block w-full rounded-md border border-surface-dark bg-primary text-text focus:border-accent focus:ring-accent"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text">
                  TLE Line 2
                </label>
                <input
                  name="tle_line2"
                  value={tleForm.tle_line2}
                  onChange={handleTleChange}
                  required
                  autoComplete="off"
                  className="mt-1 block w-full rounded-md border border-surface-dark bg-primary text-text focus:border-accent focus:ring-accent"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text">
                  Start Time (UTC)
                </label>
                <input
                  name="start_time"
                  type="datetime-local"
                  value={tleForm.start_time}
                  onChange={handleTleChange}
                  required
                  className="mt-1 block w-full rounded-md border border-surface-dark bg-primary text-text focus:border-accent focus:ring-accent"
                />
              </div>
              <div className="space-y-2">
                <div className="flex space-x-4">
                  <div className="w-1/2">
                    <label className="block text-sm font-medium text-text">
                      Step (minutes)
                    </label>
                    <input
                      name="step_minutes"
                      type="number"
                      min={1}
                      value={tleForm.step_minutes}
                      onChange={handleTleChange}
                      required
                      className="mt-1 block w-full rounded-md border border-surface-dark bg-primary text-text focus:border-accent focus:ring-accent"
                    />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-sm font-medium text-text">
                      Count
                    </label>
                    <input
                      name="count"
                      type="number"
                      min={1}
                      value={tleForm.count}
                      onChange={handleTleChange}
                      required
                      className="mt-1 block w-full rounded-md border border-surface-dark bg-primary text-text focus:border-accent focus:ring-accent"
                    />
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={tleLoading}
                className="border cursor-pointer mt-4 px-4 py-2 bg-accent text-primary font-bold rounded-md shadow hover:bg-accent-dark transition-colors duration-200 disabled:opacity-60"
              >
                {tleLoading ? "Propagating..." : "Propagate"}
              </button>
              {tleError && <div className="text-red-500 mt-2">{tleError}</div>}
            </form>
          )}

          {/* State Vector Propagation Tab (form to be implemented next) */}
          {tab === "StateVector" && (
            <form onSubmit={handleSvSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text">
                  Propagator
                </label>
                <select
                  name="propagator"
                  value={svForm.propagator}
                  onChange={handleSvChange}
                  className="mt-1 block w-full rounded-md border border-surface-dark bg-primary text-text focus:border-accent focus:ring-accent"
                >
                  {propagatorsSV.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text">
                  Position (km)
                </label>
                <div className="flex space-x-2">
                  {svForm.position.map((v, i) => (
                    <input
                      key={i}
                      name={`position-${i}`}
                      type="number"
                      value={v}
                      onChange={handleSvChange}
                      required
                      className="mt-1 block w-full rounded-md border border-surface-dark bg-primary text-text focus:border-accent focus:ring-accent"
                      placeholder={["x", "y", "z"][i]}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text">
                  Velocity (km/s)
                </label>
                <div className="flex space-x-2">
                  {svForm.velocity.map((v, i) => (
                    <input
                      key={i}
                      name={`velocity-${i}`}
                      type="number"
                      value={v}
                      onChange={handleSvChange}
                      required
                      className="mt-1 block w-full rounded-md border border-surface-dark bg-primary text-text focus:border-accent focus:ring-accent"
                      placeholder={["vx", "vy", "vz"][i]}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text">
                  Start Time (UTC)
                </label>
                <input
                  name="start_time"
                  type="datetime-local"
                  value={svForm.start_time}
                  onChange={handleSvChange}
                  required
                  className="mt-1 block w-full rounded-md border border-surface-dark bg-primary text-text focus:border-accent focus:ring-accent"
                />
              </div>
              <div className="space-y-2">
                <div className="flex space-x-4">
                  <div className="w-1/2">
                    <label className="block text-sm font-medium text-text">
                      Step (minutes)
                    </label>
                    <input
                      name="step_minutes"
                      type="number"
                      min={1}
                      value={svForm.step_minutes}
                      onChange={handleSvChange}
                      required
                      className="mt-1 block w-full rounded-md border border-surface-dark bg-primary text-text focus:border-accent focus:ring-accent"
                    />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-sm font-medium text-text">
                      Count
                    </label>
                    <input
                      name="count"
                      type="number"
                      min={1}
                      value={svForm.count}
                      onChange={handleSvChange}
                      required
                      className="mt-1 block w-full rounded-md border border-surface-dark bg-primary text-text focus:border-accent focus:ring-accent"
                    />
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={svLoading}
                className="mt-4 px-4 py-2 bg-accent text-primary font-bold rounded-md shadow hover:bg-accent-dark transition-colors duration-200 disabled:opacity-60"
              >
                {svLoading ? "Propagating..." : "Propagate"}
              </button>
              {svError && <div className="text-red-500 mt-2">{svError}</div>}
            </form>
          )}
          {/* SV Results Table */}
          {tab === "StateVector" && svResults && (
            <div className="mt-4">
              <h2 className="text-lg font-semibold text-accent">Results</h2>
              <div className="mt-2 overflow-x-auto">
                <table className="table-auto w-full text-left border-collapse bg-surface shadow">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-accent border-b border-surface-dark">
                        Time
                      </th>
                      <th className="px-4 py-2 text-accent border-b border-surface-dark">
                        Position (km)
                      </th>
                      <th className="px-4 py-2 text-accent border-b border-surface-dark">
                        Velocity (km/s)
                      </th>
                      <th className="px-4 py-2 text-accent border-b border-surface-dark">
                        LLA
                      </th>
                      <th className="px-4 py-2 text-accent border-b border-surface-dark">
                        Error
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {svResults.map((row, i) => (
                      <tr
                        key={i}
                        className="hover:bg-surface-light transition-colors"
                      >
                        <td className="border-b border-surface-dark px-4 py-2 text-text-muted">
                          {row.time}
                        </td>
                        <td className="border-b border-surface-dark px-4 py-2 text-text">
                          {row.pos_km?.join(", ")}
                        </td>
                        <td className="border-b border-surface-dark px-4 py-2 text-text">
                          {row.vel_kms?.join(", ")}
                        </td>
                        <td className="border-b border-surface-dark px-4 py-2 text-text">
                          {row.lla?.join(", ")}
                        </td>
                        <td className="border-b border-surface-dark px-4 py-2 text-text">
                          {row.error}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSatelliteList = () => {
    if (!satellites.length) {
      return <div className="text-white">No satellites yet.</div>;
    }
    return (
      <div>
        <div className="text-xl text-accent mb-4">Satellites</div>
        <ul className="space-y-2">
          {satellites.map((sat) => (
            <li
              key={sat.id}
              className={`relative p-2 rounded-lg cursor-pointer flex items-center justify-between group transition-colors duration-200 border border-surface-dark shadow-sm ${
                sat.id === selectedSatelliteId
                  ? "bg-primary text-accent border-accent"
                  : "bg-surface text-text hover:bg-surface-light hover:text-accent"
              }`}
              onClick={() => setSelectedSatelliteId(sat.id)}
            >
              <span className="flex items-center">
                <span
                  className="inline-block w-3 h-3 rounded-full mr-2 align-middle border border-accent"
                  style={{ backgroundColor: sat.color }}
                ></span>
                {sat.displayName}
              </span>
              <button
                className="ml-2 p-1 rounded hover:bg-accent/20 group-hover:visible focus:visible invisible menu-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(openMenuId === sat.id ? null : sat.id);
                }}
                aria-label="Satellite options"
              >
                <svg
                  width="18"
                  height="18"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <circle cx="4" cy="10" r="2" />
                  <circle cx="10" cy="10" r="2" />
                  <circle cx="16" cy="10" r="2" />
                </svg>
              </button>
              {openMenuId === sat.id && (
                <div
                  className="sat-popover absolute right-2 top-8 z-10 bg-white border border-surface-dark rounded shadow-lg py-1 w-28"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-accent/10 rounded"
                    onClick={() => handleDeleteSatellite(sat.id)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // Prepare svPaths for GlobeCanvas
  const svPaths =
    svResults && svResults.length > 0
      ? [
          {
            color: "#ff00aa", // Use a fixed color for now, or pick from a palette
            path: svResults
              .filter((row) => Array.isArray(row.lla) && row.lla.length === 3)
              .map((row) => ({
                lat: row.lla[0],
                lng: row.lla[1],
                alt: row.lla[2] / 6371, // Convert km to Earth radii for three-globe
              })),
          },
        ]
      : [];

  // Add this useEffect after the other useEffects
  useEffect(() => {
    if (!openMenuId) return;
    function handleClickOutside(e: MouseEvent) {
      // Close if click is outside any .sat-popover or .menu-button
      if (
        !(e.target as HTMLElement).closest(".sat-popover") &&
        !(e.target as HTMLElement).closest(".menu-button")
      ) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuId]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-primary">
      <div className="flex flex-1">
        <div className="w-[400px] overflow-y-auto  bg-surface p-0">
          {renderForm()}
        </div>
        <div className="flex-1 flex items-center justify-center p-0 bg-black">
          <GlobeCanvas satellites={satellites} />
        </div>
        <div className="w-[300px] overflow-y-auto border-l border-surface-dark bg-surface p-2">
          {renderSatelliteList()}
        </div>
      </div>
      <div className="w-full h-[200px] overflow-y-auto border-t border-surface-dark bg-surface p-4 ">
        {renderTleResults()}
      </div>
    </div>
  );
}
