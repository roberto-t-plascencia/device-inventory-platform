import { useEffect, useRef, useState } from "react";
import { getDevice } from "../api";
import type { Device } from "../types";

const POLL_MS = 3000;

export function DeviceStatusMonitor() {
  const [id, setId] = useState("3");
  const [device, setDevice] = useState<Device | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [paused, setPaused] = useState(false);
  const failures = useRef(0);

  useEffect(() => {
    if (paused) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    setDevice(null);
    failures.current = 0;

    // setTimeout chain (not setInterval) so a slow request never overlaps the next one
    async function tick() {
      try {
        const d = await getDevice(id);
        if (cancelled) return;              // ignore responses for an old id / unmounted
        setDevice(d);
        setError(null);
        setLastUpdated(new Date());
        failures.current = 0;
      } catch (e) {
        if (cancelled) return;
        failures.current += 1;
        setError(`${e instanceof Error ? e.message : "Error"} (attempt ${failures.current})`);
      }
      if (!cancelled) {
        // simple backoff on repeated failures, capped at 30 s
        const delay = Math.min(POLL_MS * 2 ** failures.current, 30000);
        timer = setTimeout(tick, delay);
      }
    }
    tick();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id, paused]);

  return (
    <>
      <label>
        Device id{" "}
        <select value={id} onChange={(e) => setId(e.target.value)}>
          {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>{" "}
      <button onClick={() => setPaused((p) => !p)}>{paused ? "Resume" : "Pause"}</button>
      {!device && !error && <p>Loading…</p>}
      {device && (
        <p>
          <b>{device.name}</b> <span className={`badge ${device.status}`}>{device.status}</span>{" "}
          {device.ip} · fw {device.firmware}
        </p>
      )}
      {error && <p className="error">{error}</p>}
      {lastUpdated && <small>Last updated {lastUpdated.toLocaleTimeString()}</small>}
    </>
  );
}
