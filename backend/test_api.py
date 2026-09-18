import urllib.request
import json
import time

def test_api():
    print("Testing backend endpoints on http://localhost:8000 ...")
    base_url = "http://127.0.0.1:8000"

    # 1. Test GET /
    try:
        req = urllib.request.urlopen(f"{base_url}/")
        assert req.status == 200
        html = req.read().decode("utf-8")
        assert "BO MOTOR AI" in html
        print("[PASS] GET / serves modern React SPA index.html")
    except Exception as e:
        print("[FAIL] GET /:", e)

    # 2. Test GET /api/status
    try:
        req = urllib.request.urlopen(f"{base_url}/api/status")
        data = json.loads(req.read().decode("utf-8"))
        print(f"[PASS] GET /api/status: Connection={data['connection_state']}, Records={data['total_records_count']} ({data['synthetic_records_count']} synthetic, {data['real_records_count']} real)")
    except Exception as e:
        print("[FAIL] GET /api/status:", e)

    # 3. Test GET /api/overview
    try:
        req = urllib.request.urlopen(f"{base_url}/api/overview")
        data = json.loads(req.read().decode("utf-8"))
        kpis = data["kpis"]
        print(f"[PASS] GET /api/overview: Temp={kpis['temperature']['value']}C, VibRMS={kpis['vibration_rms']['value']}g, Health={kpis['motor_health']['value']}%, Anomaly={kpis['anomaly']['score']}, RPM={kpis['speed']['estimated_rpm']}")
    except Exception as e:
        print("[FAIL] GET /api/overview:", e)

    # 4. Test POST /api/ingest with exact user specified schema
    try:
        payload = {
            "motor_id": "BO_MOTOR_01",
            "temperature": 42.5,
            "ax": 0.21,
            "ay": 0.34,
            "az": 1.08,
            "gyro_x": 0.01,
            "gyro_y": 0.02,
            "gyro_z": 0.03,
            "pwm_duty": 80,
            "timestamp": "2026-09-17T14:20:00",
            "source": "real"
        }
        post_data = json.dumps(payload).encode("utf-8")
        post_req = urllib.request.Request(f"{base_url}/api/ingest", data=post_data, headers={"Content-Type": "application/json"})
        resp = urllib.request.urlopen(post_req)
        resp_data = json.loads(resp.read().decode("utf-8"))
        assert resp_data["status"] == "success"
        pred = resp_data["prediction"]
        print(f"[PASS] POST /api/ingest: Successfully ingested reading #{pred['reading_id']}. Anomaly={pred['anomaly']['score']} ({pred['anomaly']['status']}), Health={pred['health_intelligence']['health_score']}%, Suspected={pred['fault_classification']['fault_pattern']}")
    except Exception as e:
        print("[FAIL] POST /api/ingest:", e)

    # 5. Verify status updated to LIVE ESP32 CONNECTED
    try:
        req = urllib.request.urlopen(f"{base_url}/api/status")
        data = json.loads(req.read().decode("utf-8"))
        assert data["connection_state"] == "live"
        print(f"[PASS] Connection state immediately switched to: '{data['connection_label']}'")
    except Exception as e:
        print("[FAIL] Connection state verification:", e)

    # 6. Test GET /api/charts/vibration
    try:
        req = urllib.request.urlopen(f"{base_url}/api/charts/vibration?range=1H")
        data = json.loads(req.read().decode("utf-8"))
        print(f"[PASS] GET /api/charts/vibration: returned {len(data['data'])} telemetry points")
    except Exception as e:
        print("[FAIL] GET /api/charts/vibration:", e)

    # 7. Test GET /api/charts/fault-distribution
    try:
        req = urllib.request.urlopen(f"{base_url}/api/charts/fault-distribution")
        data = json.loads(req.read().decode("utf-8"))
        print(f"[PASS] GET /api/charts/fault-distribution: returned {len(data['distribution'])} fault categories")
    except Exception as e:
        print("[FAIL] GET /api/charts/fault-distribution:", e)

    # 8. Test GET /api/model/performance
    try:
        req = urllib.request.urlopen(f"{base_url}/api/model/performance")
        data = json.loads(req.read().decode("utf-8"))
        print(f"[PASS] GET /api/model/performance: Accuracy={data.get('accuracy')}%, Precision={data.get('precision')}%, F1={data.get('f1_score')}%")
    except Exception as e:
        print("[FAIL] GET /api/model/performance:", e)

if __name__ == "__main__":
    test_api()
