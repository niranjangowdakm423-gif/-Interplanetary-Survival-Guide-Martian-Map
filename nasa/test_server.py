import sys
import json
import io
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import server

class MockSocket:
    def __init__(self, request_bytes):
        self.rfile = io.BytesIO(request_bytes)
        self.wfile = io.BytesIO()

    def makefile(self, mode, *args, **kwargs):
        if 'r' in mode:
            return self.rfile
        return self.wfile

    def sendall(self, data):
        self.wfile.write(data)

def test_request(method, path, body=None):
    body_str = json.dumps(body) if body is not None else ""
    body_bytes = body_str.encode("utf-8")
    
    lines = [
        f"{method} {path} HTTP/1.1",
        "Host: localhost",
        f"Content-Length: {len(body_bytes)}",
        "Content-Type: application/json" if body is not None else "",
        "",
        ""
    ]
    raw = "\r\n".join(lines).encode("utf-8") + body_bytes
    sock = MockSocket(raw)
    
    class DummyServer:
        pass
    
    try:
        handler = server.AresNavHandler(sock, ("127.0.0.1", 54321), DummyServer())
    except Exception as e:
        pass

    raw_output = sock.wfile.getvalue()
    if not raw_output:
        print(f"FAIL: No output for {method} {path}")
        return None, 500

    parts = raw_output.split(b"\r\n\r\n", 1)
    header_part = parts[0].decode("utf-8", errors="replace")
    body_part = parts[1] if len(parts) > 1 else b""
    status_line = header_part.split("\r\n")[0]
    status_code = int(status_line.split(" ")[1]) if " " in status_line else 500
    
    print(f"[{status_code}] {method} {path} -> {status_line}")
    try:
        json_data = json.loads(body_part.decode("utf-8"))
        return json_data, status_code
    except Exception:
        return body_part.decode("utf-8", errors="replace"), status_code

def run():
    print("=== Testing ARES-NAV Server API Endpoints & P0 Integrations ===")
    
    # 1. GET /api/sites
    data, code = test_request("GET", "/api/sites")
    assert code == 200, f"Expected 200, got {code}"
    assert "sites" in data and len(data["sites"]) >= 10, "Failed to list sites"
    print(f"  -> Found {len(data['sites'])} sites")

    # 2. Verify all 10 sites have non-zero, realistic elevation and slope
    print("\n--- Verifying Topography & Provenance across all 10 sites ---")
    for site_meta in data["sites"]:
        sid = site_meta["id"]
        sdata, scode = test_request("GET", f"/api/site?id={sid}")
        assert scode == 200, f"Failed to get site {sid}"
        elev = sdata["layers"]["elevation"]
        slope = sdata["layers"]["slope"]
        min_z = min(min(r) for r in elev)
        max_z = max(max(r) for r in elev)
        avg_s = sum(sum(r) for r in slope) / (80 * 80)
        max_s = max(max(r) for r in slope)
        
        # Verify elevation spans genuine physical depth/height
        assert max_z > min_z, f"Elevation for {sid} is flat!"
        assert avg_s > 0.5, f"Slope for {sid} is zero!"
        
        prov = sdata.get("real_data_provenance", {}).get("elevation_layer", {})
        status = prov.get("status")
        acc = prov.get("vertical_accuracy")
        print(f"  -> {sid.ljust(8)}: Elev [{min_z}m, {max_z}m], Max slope: {round(max_s, 1)}°, Status: {status} ({acc})")

    # 3. GET /api/provenance
    data, code = test_request("GET", "/api/provenance")
    assert code == 200
    print(f"\n  -> Provenance keys: {list(data.keys())}")

    # 4. POST /api/plan_route (nominal)
    nominal_route, code = test_request("POST", "/api/plan_route", {
        "site_id": "jezero",
        "waypoints": [{"gx": 18, "gy": 62}, {"gx": 42, "gy": 50}],
        "mode": "balanced",
        "max_slope_deg": 15.0
    })
    assert code == 200, f"Route planning failed: {nominal_route}"
    assert "path" in nominal_route and len(nominal_route["path"]) > 0, "No path returned"
    dist = nominal_route.get("telemetry", {}).get("summary", {}).get("distance_m")
    print(f"  -> Nominal route: {len(nominal_route['path'])} steps, distance {dist}m")

    # 5. Route Planning with User Hazard Avoidance
    # Inject a hazard directly across the nominal path mid-point
    mid_idx = len(nominal_route["path"]) // 2
    hazard_cell = nominal_route["path"][mid_idx]
    print(f"\n--- Testing Route Avoidance around User Hazard at ({hazard_cell['gx']}, {hazard_cell['gy']}) ---")
    
    avoided_route, code = test_request("POST", "/api/plan_route", {
        "site_id": "jezero",
        "waypoints": [{"gx": 18, "gy": 62}, {"gx": 42, "gy": 50}],
        "mode": "balanced",
        "max_slope_deg": 15.0,
        "user_hazards": [{
            "gx": hazard_cell["gx"],
            "gy": hazard_cell["gy"],
            "radius_cells": 3.0,
            "source": "Rover Navcam Obstacle"
        }]
    })
    assert code == 200
    avoided_path = [(p["gx"], p["gy"]) for p in avoided_route["path"]]
    # Verify the avoided route stepped away from the exact hazard center
    assert (hazard_cell["gx"], hazard_cell["gy"]) not in avoided_path, "Route did not avoid hazard cell!"
    print(f"  -> SUCCESS: Route actively circumvented user hazard ({hazard_cell['gx']}, {hazard_cell['gy']})")
    print(f"  -> User hazards applied: {avoided_route.get('user_hazards_applied')}")

    # 6. POST /api/emergency_abort
    data, code = test_request("POST", "/api/emergency_abort", {
        "site_id": "jezero",
        "gx": 30,
        "gy": 40
    })
    assert code == 200, f"Abort failed: {data}"
    assert "destination" in data, "No destination found in abort response"
    print(f"\n  -> Shelter abort target: {data['destination'].get('name')}")

    # 7. POST /api/upload_dataset with Persistence
    upload_res, code = test_request("POST", "/api/upload_dataset", {
        "name": "HiRISE Delta Boulders",
        "type": "hazard",
        "file_type": "json",
        "source": "HiRISE RDR Manual Observation",
        "data": [{"gx": 40, "gy": 50, "boulder_density": 0.8}]
    })
    assert code == 200, f"Upload failed: {upload_res}"
    ds_id = upload_res.get("id")
    print(f"  -> Dataset uploaded with ID: {ds_id}")

    # 8. GET /api/user_datasets
    data, code = test_request("GET", "/api/user_datasets")
    assert code == 200, f"List user datasets failed: {data}"
    assert any(d.get("id") == ds_id for d in data.get("datasets", [])), "Uploaded dataset not found"
    print(f"  -> User datasets count: {len(data['datasets'])}")

    # 9. GET /api/user_dataset?id={id}
    data, code = test_request("GET", f"/api/user_dataset?id={ds_id}")
    assert code == 200, f"Get dataset failed: {data}"
    assert data.get("id") == ds_id
    print(f"  -> Retrieved dataset: {data.get('name')}")

    # 10. DELETE /api/user_dataset?id={id}
    data, code = test_request("DELETE", f"/api/user_dataset?id={ds_id}")
    assert code == 200, f"Delete failed: {data}"
    print(f"  -> Dataset deleted: {data.get('message')}")

    # 11. GET /api/planetary_ephemeris (P2.1 Endpoint Verification)
    print("\n--- Testing P2.1 GET /api/planetary_ephemeris ---")
    data, code = test_request("GET", "/api/planetary_ephemeris?site_id=jezero&utc_iso=2026-11-15T12:00:00Z&sol=89")
    assert code == 200, f"Ephemeris endpoint failed: {data}"
    assert "ephemeris" in data, "No ephemeris block in response"
    assert "communications_latency" in data, "No communications_latency block in response"
    assert "environmental_context" in data, "No environmental_context block in response"
    assert data["ephemeris"]["solar_longitude_deg"] > 0, "Invalid Ls"
    assert data["communications_latency"]["one_way_light_time_min"] > 0, "Invalid OWLT"
    assert data["environmental_context"]["in_situ_station_present"] is True, "Jezero should have MEDA station"
    assert data["environmental_context"]["station_name"] == "Mars Environmental Dynamics Analyzer (MEDA)"
    print(f"  -> Jezero Ephemeris: Ls = {data['ephemeris']['solar_longitude_deg']}°, OWLT = {data['communications_latency']['one_way_light_time_min']} min")
    print(f"  -> Jezero Environment: Station = {data['environmental_context']['station_name']}, Provenance = {data['environmental_context']['data_provenance']}")

    data_gale, code_gale = test_request("GET", "/api/planetary_ephemeris?site_id=gale&sol=1000")
    assert code_gale == 200, f"Gale ephemeris failed: {data_gale}"
    assert data_gale["environmental_context"]["station_name"] == "Rover Environmental Monitoring Station (REMS)"
    print(f"  -> Gale Environment: Station = {data_gale['environmental_context']['station_name']}, Sol = {data_gale['environmental_context']['historical_sol']}")

    data_melas, code_melas = test_request("GET", "/api/planetary_ephemeris?site_id=melas&dsn_delay=3.5&relay_delay=2.0")
    assert code_melas == 200, f"Melas ephemeris failed: {data_melas}"
    assert data_melas["environmental_context"]["in_situ_station_present"] is False
    assert data_melas["environmental_context"]["data_provenance"] == "ANALYTICAL_HYDROSTATIC_MODEL"
    assert data_melas["communications_latency"]["configured_dsn_schedule_delay_min"] == 3.5
    assert data_melas["communications_latency"]["configured_relay_store_forward_delay_min"] == 2.0
    print(f"  -> Melas Analytical Context: Provenance = {data_melas['environmental_context']['data_provenance']}, Pressure = {data_melas['environmental_context']['climatological_summary']['estimated_surface_pressure_pa']} Pa")
    print(f"  -> Configurable Comm Delays: DSN = {data_melas['communications_latency']['configured_dsn_schedule_delay_min']}m, Relay = {data_melas['communications_latency']['configured_relay_store_forward_delay_min']}m")

    print("\n=======================================================")
    print("ALL 10 SITES TOPOGRAPHY & USER HAZARD AVOIDANCE VERIFIED!")
    print("=======================================================")

if __name__ == "__main__":
    run()
