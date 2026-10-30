NEW = {"name": "edge-router-99", "mac": "AA:BB:CC:DD:EE:01", "ip": "10.0.9.9", "vlan": 120}


def test_health(client):
    assert client.get("/api/health").get_json() == {"status": "ok"}


def test_list_devices(client):
    r = client.get("/api/devices")
    assert r.status_code == 200
    assert len(r.get_json()) == 12


def test_filter_by_status(client):
    r = client.get("/api/devices?status=online")
    assert r.status_code == 200
    assert r.get_json() and all(d["status"] == "online" for d in r.get_json())


def test_unknown_status_is_400(client):
    assert client.get("/api/devices?status=bogus").status_code == 400


def test_search_by_ip(client):
    r = client.get("/api/devices?q=10.0.0.10")
    assert [d["id"] for d in r.get_json()] == ["1"]


def test_get_device_and_404(client):
    assert client.get("/api/devices/1").get_json()["name"] == "edge-router-01"
    r = client.get("/api/devices/nope")
    assert r.status_code == 404
    assert "error" in r.get_json()


def test_create_device(client):
    r = client.post("/api/devices", json=NEW)
    assert r.status_code == 201
    body = r.get_json()
    assert body["status"] == "provisioning" and body["id"]
    assert client.get(f"/api/devices/{body['id']}").status_code == 200


def test_create_requires_json_object(client):
    assert client.post("/api/devices", data="nope", content_type="text/plain").status_code == 400


def test_create_validation(client):
    bad = {"name": "X", "mac": "zz", "ip": "999.1.1.1", "vlan": 5000}
    r = client.post("/api/devices", json=bad)
    assert r.status_code == 400
    assert set(r.get_json()["fields"]) == {"name", "mac", "ip", "vlan"}


def test_create_missing_fields(client):
    r = client.post("/api/devices", json={"name": "edge-router-50"})
    assert r.status_code == 400
    assert {"mac", "ip", "vlan"} <= set(r.get_json()["fields"])


def test_duplicate_mac_is_409_case_insensitive(client):
    assert client.post("/api/devices", json=NEW).status_code == 201
    dup = {**NEW, "name": "edge-router-98", "mac": NEW["mac"].lower()}
    assert client.post("/api/devices", json=dup).status_code == 409


def test_patch_device(client):
    r = client.patch("/api/devices/1", json={"vlan": 300})
    assert r.status_code == 200 and r.get_json()["vlan"] == 300
    assert client.patch("/api/devices/1", json={"vlan": 0}).status_code == 400
    assert client.patch("/api/devices/1", json={"mac": "AA:BB:CC:DD:EE:FF"}).status_code == 400
    assert client.patch("/api/devices/nope", json={"vlan": 10}).status_code == 404


def test_delete_device(client):
    assert client.delete("/api/devices/2").status_code == 204
    assert client.get("/api/devices/2").status_code == 404
    assert client.delete("/api/devices/2").status_code == 404


def test_version(client, monkeypatch):
    monkeypatch.setenv("APP_VERSION", "1.2.3")
    from app import create_app
    assert create_app().test_client().get("/api/version").get_json()["version"] == "1.2.3"
