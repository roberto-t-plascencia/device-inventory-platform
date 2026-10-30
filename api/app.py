"""Device inventory API: onboarding and configuration for network devices."""
import ipaddress
import logging
import os
import re
import uuid

from flask import Flask, jsonify, request

STATUSES = {"online", "offline", "provisioning", "error"}
MAC_RE = re.compile(r"^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$")
NAME_RE = re.compile(r"^[a-z0-9-]{3,32}$")


def seed():
    return {
        str(i): {
            "id": str(i),
            "name": f"edge-router-{i:02d}",
            "mac": f"00:1A:2B:3C:4D:{i + 15:02X}",
            "ip": f"10.0.{(i - 1) // 4}.{9 + i}",
            "vlan": 100 + ((i - 1) % 3) * 10,
            "status": sorted(STATUSES)[(i - 1) % 4],
            "firmware": f"2.{(i - 1) % 3}.0",
        }
        for i in range(1, 13)
    }


def validate(data, partial=False):
    """Return a dict of field -> error message. Empty dict means valid."""
    errors = {}
    required = ("name", "mac", "ip", "vlan")
    if not partial:
        for f in required:
            if f not in data:
                errors[f] = "required"

    if "name" in data and not (isinstance(data["name"], str) and NAME_RE.match(data["name"])):
        errors["name"] = "3-32 chars: lowercase letters, digits, dashes"
    if "mac" in data and not (isinstance(data["mac"], str) and MAC_RE.match(data["mac"])):
        errors["mac"] = "format AA:BB:CC:DD:EE:FF"
    if "ip" in data:
        try:
            ipaddress.IPv4Address(data["ip"])
        except (ipaddress.AddressValueError, ValueError, TypeError):
            errors["ip"] = "invalid IPv4 address"
    if "vlan" in data:
        v = data["vlan"]
        if not (isinstance(v, int) and not isinstance(v, bool) and 1 <= v <= 4094):
            errors["vlan"] = "integer 1-4094"
    return errors


def error(message, status, **extra):
    return jsonify(error=message, **extra), status


def create_app():
    app = Flask(__name__)
    devices = seed()

    logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO").upper())
    version = os.environ.get("APP_VERSION", "dev")

    @app.get("/api/health")
    def health():
        return jsonify(status="ok")

    @app.get("/api/version")
    def get_version():
        return jsonify(version=version, hostname=os.environ.get("HOSTNAME", "local"))

    @app.get("/api/devices")
    def list_devices():
        status = request.args.get("status")
        q = (request.args.get("q") or "").lower()
        if status and status not in STATUSES:
            return error(f"unknown status '{status}'", 400)
        result = [
            d for d in devices.values()
            if (not status or d["status"] == status)
            and (not q or any(q in d[f].lower() for f in ("name", "ip", "mac")))
        ]
        return jsonify(result)

    @app.get("/api/devices/<device_id>")
    def get_device(device_id):
        d = devices.get(device_id)
        return jsonify(d) if d else error("device not found", 404)

    @app.post("/api/devices")
    def create_device():
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return error("request body must be a JSON object", 400)
        errors = validate(data)
        if errors:
            return error("validation failed", 400, fields=errors)
        mac = data["mac"].upper()
        if any(d["mac"] == mac for d in devices.values()):
            return error("a device with that MAC already exists", 409)
        device = {
            "id": uuid.uuid4().hex[:8],
            "name": data["name"],
            "mac": mac,
            "ip": data["ip"],
            "vlan": data["vlan"],
            "status": "provisioning",
            "firmware": "2.2.0",
        }
        devices[device["id"]] = device
        app.logger.info("onboarded device %s (%s)", device["name"], device["mac"])
        return jsonify(device), 201, {"Location": f"/api/devices/{device['id']}"}

    @app.patch("/api/devices/<device_id>")
    def update_device(device_id):
        d = devices.get(device_id)
        if not d:
            return error("device not found", 404)
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return error("request body must be a JSON object", 400)
        allowed = {"name", "ip", "vlan"}
        unknown = set(data) - allowed
        if unknown:
            return error(f"fields not updatable: {sorted(unknown)}", 400)
        errors = validate(data, partial=True)
        if errors:
            return error("validation failed", 400, fields=errors)
        d.update(data)
        return jsonify(d)

    @app.delete("/api/devices/<device_id>")
    def delete_device(device_id):
        if devices.pop(device_id, None) is None:
            return error("device not found", 404)
        return "", 204

    return app


app = create_app()  # WSGI entry point for gunicorn: "app:app"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
