// Thin typed client for the device inventory API. In dev, Vite proxies /api to Flask;
// in the container, nginx proxies /api to the API service.
import type { Device, NewDevice } from "./types";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...init });
  const body = res.status === 204 ? null : await res.json();
  if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
  return body as T;
}

export const listDevices = () => http<Device[]>("/api/devices");
export const getDevice = (id: string) => http<Device>(`/api/devices/${id}`);
export const createDevice = (input: NewDevice) =>
  http<Device>("/api/devices", { method: "POST", body: JSON.stringify(input) });
export const getVersion = () => http<{ version: string; hostname: string }>("/api/version");
