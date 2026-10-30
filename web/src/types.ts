export type DeviceStatus = "online" | "offline" | "provisioning" | "error";

export interface Device {
  id: string;
  name: string;
  mac: string;          // "AA:BB:CC:DD:EE:FF"
  ip: string;           // IPv4
  vlan: number;         // 1–4094
  status: DeviceStatus;
  firmware: string;
}

export type NewDevice = Omit<Device, "id" | "status" | "firmware">;
