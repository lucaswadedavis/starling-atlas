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

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 flex flex-col items-center">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-center text-blue-700">
          Starling Atlas: Astrodynamics Propagation
        </h1>
        {/* Tabs */}
        <div className="flex border-b mb-6">
          <button
            className={classNames(
              "px-4 py-2 font-medium focus:outline-none",
              tab === "TLE"
                ? "border-b-2 border-blue-600 text-blue-700"
                : "text-gray-500 hover:text-blue-600"
            )}
            onClick={() => setTab("TLE")}
          >
            TLE Propagation
          </button>
          <button
            className={classNames(
              "ml-4 px-4 py-2 font-medium focus:outline-none",
              tab === "StateVector"
                ? "border-b-2 border-blue-600 text-blue-700"
                : "text-gray-500 hover:text-blue-600"
            )}
            onClick={() => setTab("StateVector")}
          >
            State Vector Propagation
          </button>
        </div>

        {/* TLE Propagation Form */}
        {tab === "TLE" && (
          <form className="space-y-4" onSubmit={handleTleSubmit}>
            <div>
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
            <div>
              <label className="block text-sm font-medium text-gray-700">
                TLE Line 1
              </label>
              <input
                name="tle_line1"
                value={tleForm.tle_line1}
                onChange={handleTleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono"
                required
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                TLE Line 2
              </label>
              <input
                name="tle_line2"
                value={tleForm.tle_line2}
                onChange={handleTleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono"
                required
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Start Time (UTC)
              </label>
              <input
                name="start_time"
                type="datetime-local"
                value={tleForm.start_time}
                onChange={handleTleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">
                  Step (minutes)
                </label>
                <input
                  name="step_minutes"
                  type="number"
                  min={1}
                  value={tleForm.step_minutes}
                  onChange={handleTleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">
                  Count
                </label>
                <input
                  name="count"
                  type="number"
                  min={1}
                  value={tleForm.count}
                  onChange={handleTleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-md shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={tleLoading}
            >
              {tleLoading ? "Propagating..." : "Propagate"}
            </button>
            {tleError && (
              <div className="text-red-600 text-sm mt-2">{tleError}</div>
            )}
          </form>
        )}

        {/* TLE Results Table */}
        {tab === "TLE" && tleResults && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-2">Results</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full border text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-2 py-1 border">Time</th>
                    <th className="px-2 py-1 border">Position (km)</th>
                    <th className="px-2 py-1 border">Velocity (km/s)</th>
                    <th className="px-2 py-1 border">LLA</th>
                    <th className="px-2 py-1 border">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {tleResults.map((row, i) => (
                    <tr key={i} className="even:bg-gray-50">
                      <td className="px-2 py-1 border whitespace-nowrap">
                        {row.time}
                      </td>
                      <td className="px-2 py-1 border font-mono">
                        {row.pos_km?.join(", ")}
                      </td>
                      <td className="px-2 py-1 border font-mono">
                        {row.vel_kms?.join(", ")}
                      </td>
                      <td className="px-2 py-1 border font-mono">
                        {row.lla?.join(", ")}
                      </td>
                      <td className="px-2 py-1 border text-red-600">
                        {row.error}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* State Vector Propagation Tab (form to be implemented next) */}
        {tab === "StateVector" && (
          <div className="text-gray-500 text-center py-12">
            <p>State Vector propagation form coming next...</p>
          </div>
        )}
      </div>
    </div>
  );
}
