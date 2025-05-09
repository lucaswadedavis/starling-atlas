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

  const renderForm = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg  p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Starling Atlas: Astrodynamics Propagation
          </h1>
          {/* Tabs */}
          <div className="flex space-x-4 border-b mb-6">
            <button
              className={`px-4 py-2 ${
                tab === "TLE"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500"
              }`}
              onClick={() => setTab("TLE")}
            >
              TLE Propagation
            </button>
            <button
              className={`px-4 py-2 ${
                tab === "StateVector"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500"
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
                <label className="block text-sm font-medium text-gray-700">
                  Propagator
                </label>
                <select
                  name="propagator"
                  value={tleForm.propagator}
                  onChange={handleTleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {propagatorsTLE.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  TLE Line 1
                </label>
                <input
                  name="tle_line1"
                  value={tleForm.tle_line1}
                  onChange={handleTleChange}
                  required
                  autoComplete="off"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  TLE Line 2
                </label>
                <input
                  name="tle_line2"
                  value={tleForm.tle_line2}
                  onChange={handleTleChange}
                  required
                  autoComplete="off"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Start Time (UTC)
                </label>
                <input
                  name="start_time"
                  type="datetime-local"
                  value={tleForm.start_time}
                  onChange={handleTleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <div className="flex space-x-4">
                  <div className="w-1/2">
                    <label className="block text-sm font-medium text-gray-700">
                      Step (minutes)
                    </label>
                    <input
                      name="step_minutes"
                      type="number"
                      min={1}
                      value={tleForm.step_minutes}
                      onChange={handleTleChange}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-sm font-medium text-gray-700">
                      Count
                    </label>
                    <input
                      name="count"
                      type="number"
                      min={1}
                      value={tleForm.count}
                      onChange={handleTleChange}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={tleLoading}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md"
              >
                {tleLoading ? "Propagating..." : "Propagate"}
              </button>
              {tleError && <div className="text-red-500">{tleError}</div>}
            </form>
          )}

          {/* TLE Results Table */}
          {tab === "TLE" && tleResults && (
            <div className="mt-4">
              <h2 className="text-lg font-semibold">Results</h2>
              <div className="mt-2">
                <table className="table-auto w-full">
                  <thead>
                    <tr>
                      <th className="px-4 py-2">Time</th>
                      <th className="px-4 py-2">Position (km)</th>
                      <th className="px-4 py-2">Velocity (km/s)</th>
                      <th className="px-4 py-2">LLA</th>
                      <th className="px-4 py-2">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tleResults.map((row, i) => (
                      <tr key={i}>
                        <td className="border px-4 py-2">{row.time}</td>
                        <td className="border px-4 py-2">
                          {row.pos_km?.join(", ")}
                        </td>
                        <td className="border px-4 py-2">
                          {row.vel_kms?.join(", ")}
                        </td>
                        <td className="border px-4 py-2">
                          {row.lla?.join(", ")}
                        </td>
                        <td className="border px-4 py-2">{row.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* State Vector Propagation Tab (form to be implemented next) */}
          {tab === "StateVector" && (
            <div>
              <p>State Vector propagation form coming next...</p>
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
        <div className="text-xl text-white">Satellites</div>
        <ul className="space-y-2">
          {satellites.map((sat) => (
            <li
              key={sat.id}
              className={`p-2 rounded cursor-pointer ${
                sat.id === selectedSatelliteId
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-900 hover:bg-blue-100"
              }`}
              onClick={() => setSelectedSatelliteId(sat.id)}
            >
              <span
                className="inline-block w-3 h-3 rounded-full mr-2 align-middle"
                style={{ backgroundColor: sat.color }}
              ></span>
              {sat.displayName}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-transparent">
      <div className="w-[400px] overflow-y-auto border-r">{renderForm()}</div>
      <div className="flex-1 flex items-center justify-center p-0 bg-transparent">
        <GlobeCanvas />
      </div>
      <div className="w-[300px] overflow-y-auto border-l border-gray-200 bg-gray-500 p-8">
        {renderSatelliteList()}
      </div>
    </div>
  );
}
