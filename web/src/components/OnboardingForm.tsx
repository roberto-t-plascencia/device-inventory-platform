import { useState, type FormEvent } from "react";
import { createDevice } from "../api";
import type { Device } from "../types";
import { toNewDevice, validate, type FormErrors, type FormValues } from "./validation";

const empty: FormValues = { name: "", mac: "", ip: "", vlan: "" };

export function OnboardingForm() {
  const [values, setValues] = useState<FormValues>(empty);
  const [touched, setTouched] = useState<Partial<Record<keyof FormValues, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [created, setCreated] = useState<Device | null>(null);

  const errors: FormErrors = validate(values);
  const isValid = Object.keys(errors).length === 0;

  const set = (k: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({ name: true, mac: true, ip: true, vlan: true });
    if (!isValid || submitting) return;
    setSubmitting(true);
    setServerError(null);
    try {
      setCreated(await createDevice(toNewDevice(values)));
      setValues(empty);
      setTouched({});
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to create device");
    } finally {
      setSubmitting(false);
    }
  }

  const field = (k: keyof FormValues, label: string, placeholder: string) => (
    <div className="field">
      <label htmlFor={k}>{label}</label>
      <input
        id={k}
        value={values[k]}
        placeholder={placeholder}
        onChange={set(k)}
        onBlur={() => setTouched((t) => ({ ...t, [k]: true }))}
        aria-invalid={!!(touched[k] && errors[k])}
      />
      {touched[k] && errors[k] && <small className="error">{errors[k]}</small>}
    </div>
  );

  return (
    <form onSubmit={onSubmit} noValidate>
      {field("name", "Device name", "edge-router-13")}
      {field("mac", "MAC address", "00:1A:2B:3C:4D:5E")}
      {field("ip", "IP address", "10.0.3.25")}
      {field("vlan", "VLAN", "110")}
      <button type="submit" disabled={submitting}>
        {submitting ? "Onboarding…" : "Onboard device"}
      </button>
      {serverError && <p className="error">{serverError}</p>}
      {created && <p>Created {created.name} (id {created.id}) — status: {created.status}</p>}
    </form>
  );
}
