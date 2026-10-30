import { useEffect, useState } from "react";
import { getVersion } from "./api";
import { DeviceList } from "./components/DeviceList";
import { OnboardingForm } from "./components/OnboardingForm";
import { DeviceStatusMonitor } from "./components/DeviceStatusMonitor";

const tabs = {
  Devices: DeviceList,
  "Onboard device": OnboardingForm,
  "Status monitor": DeviceStatusMonitor,
};
type Tab = keyof typeof tabs;

export default function App() {
  const [tab, setTab] = useState<Tab>("Devices");
  const [version, setVersion] = useState<string>("");
  useEffect(() => {
    getVersion()
      .then((v) => setVersion(`API ${v.version} · ${v.hostname}`))
      .catch(() => setVersion("API unreachable"));
  }, []);
  const View = tabs[tab];
  return (
    <>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2>Device Inventory</h2>
        <small>{version}</small>
      </header>
      <nav>
        {(Object.keys(tabs) as Tab[]).map((t) => (
          <button key={t} className={t === tab ? "active" : ""} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>
      <View />
    </>
  );
}
