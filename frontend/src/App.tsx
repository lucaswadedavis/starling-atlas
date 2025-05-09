import React, { useState } from "react";

const propagatorsTLE = ["SKYFIELD", "SGP4-PY", "ASTRO"];
const propagatorsSV = ["RK"];

// Example TLE for the ISS (ZARYA)
const DEFAULT_TLE_LINE1 =
  "1 25544U 98067A   24128.51835648  .00016717  00000-0  10270-3 0  9002";
const DEFAULT_TLE_LINE2 =
  "2 25544  51.6417  13.2342 0003782  80.8882  37.2822 15.50394291447097";

function getNowLocalISOString() {
  const now = new Date();
  // Pad to YYYY-MM-DDTHH:MM (no seconds/millis)
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

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

  // Handle TLE form submit
  async function handleTleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTleLoading(true);
    setTleError(null);
    setTleResults(null);
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

  const renderPlanetView = () => {
    return <div className="text-xl text-gray-600">Planet View</div>;
  };

  const renderSatelliteList = () => {
    return <div className="text-xl text-white">Satellite List</div>;
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      <div className="w-[400px] overflow-y-auto border-r">{renderForm()}</div>
      <div className="flex-1 flex items-center justify-center bg-gray-100 p-8">
        {renderPlanetView()}
      </div>
      <div className="w-[300px] overflow-y-auto border-l border-gray-200 bg-gray-500 p-8">
        {renderSatelliteList()}
      </div>
    </div>
  );
}
