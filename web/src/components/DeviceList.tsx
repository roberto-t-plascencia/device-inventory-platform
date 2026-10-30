import { useCallback, useEffect, useMemo, useState } from "react";
import { listDevices } from "../api";
import type { Device, DeviceStatus } from "../types";

type Filter = DeviceStatus | "all";

export function DeviceList() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Filter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDevices(await listDevices());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Derived state: compute, don't store
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return devices.filter(
      (d) =>
        (status === "all" || d.status === status) &&
        (!q || [d.name, d.ip, d.mac].some((v) => v.toLowerCase().includes(q)))
    );
  }, [devices, query, status]);

  if (loading) return <p>Loading devices…</p>;
  if (error)
    return (
      <p className="error">
        {error} <button onClick={load}>Retry</button>
      </p>
    );

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          placeholder="Search name, IP, MAC"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value as Filter)}>
          {["all", "online", "offline", "provisioning", "error"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button onClick={load}>Refresh</button>
        <span>{visible.length} of {devices.length}</span>
      </div>
      {visible.length === 0 ? (
        <p>No devices match.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Name</th><th>IP</th><th>MAC</th><th>VLAN</th><th>Status</th><th>Firmware</th></tr>
          </thead>
          <tbody>
            {visible.map((d) => (
              <tr key={d.id}>
                <td>{d.name}</td><td>{d.ip}</td><td>{d.mac}</td><td>{d.vlan}</td>
                <td><span className={`badge ${d.status}`}>{d.status}</span></td>
                <td>{d.firmware}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
