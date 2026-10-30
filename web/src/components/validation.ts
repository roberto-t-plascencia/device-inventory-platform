import type { NewDevice } from "../types";

export const MAC_RE = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;

export function isValidIPv4(ip: string): boolean {
  const parts = ip.split(".");
  return (
    parts.length === 4 &&
    parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255 && String(Number(p)) === p)
  );
}

export type FormValues = { name: string; mac: string; ip: string; vlan: string };
export type FormErrors = Partial<Record<keyof FormValues, string>>;

export function validate(v: FormValues): FormErrors {
  const e: FormErrors = {};
  if (!v.name.trim()) e.name = "Name is required";
  else if (!/^[a-z0-9-]{3,32}$/.test(v.name)) e.name = "3–32 chars: lowercase, digits, dashes";
  if (!MAC_RE.test(v.mac)) e.mac = "Format AA:BB:CC:DD:EE:FF";
  if (!isValidIPv4(v.ip)) e.ip = "Invalid IPv4 address";
  const vlan = Number(v.vlan);
  if (!Number.isInteger(vlan) || vlan < 1 || vlan > 4094) e.vlan = "VLAN must be 1–4094";
  return e;
}

export function toNewDevice(v: FormValues): NewDevice {
  return { name: v.name.trim(), mac: v.mac.toUpperCase(), ip: v.ip, vlan: Number(v.vlan) };
}
