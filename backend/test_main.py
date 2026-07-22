import pytest
from fastapi.testclient import TestClient
from main import app, MOCK_EXTRACTION_PAYLOAD
from clash_engine import ClashEngine

client = TestClient(app)

def test_successful_file_upload():
    """Test standard PDF upload workflow and chunked limits"""
    files = {"file": ("blueprint.pdf", b"%PDF-1.4 mock content", "application/pdf")}
    response = client.post("/api/v1/blueprints/upload", files=files)
    
    assert response.status_code == 200
    data = response.json()
    assert data["graph_summary"]["status"] == "ANALYSIS_COMPLETE"

def test_file_upload_too_large():
    """Test standard PDF upload workflow but oversized"""
    # Create 11MB file
    files = {"file": ("blueprint.pdf", b"%PDF-1.4 mock content" + b"0" * (11 * 1024 * 1024), "application/pdf")}
    response = client.post("/api/v1/blueprints/upload", files=files)
    
    assert response.status_code == 413
    assert "File too large" in response.json()["detail"]

def test_malformed_json_payload():
    """Test strict Pydantic validation on the direct JSON endpoint"""
    # Missing required bbox fields and types
    bad_payload = {"nodes": [{"id": "bad-node"}]}
    response = client.post("/api/v1/analyze", json=bad_payload)
    
    # 422 Unprocessable Entity confirms Pydantic blocked the malformed graph
    assert response.status_code == 422 

def test_critical_thermal_clash_logic():
    """Unit test for the exact 300kW AI Server retrofit clash scenario"""
    engine = ClashEngine()
    engine.load_data(MOCK_EXTRACTION_PAYLOAD)
    
    clashes = engine.detect_clashes()
    
    # Verify the specific critical clash was flagged
    critical_clash = next((c for c in clashes if c["type"] == "CRITICAL_THERMAL_CLASH"), None)
    
    assert critical_clash is not None
    assert "LC-101" in critical_clash["nodes"]
    assert "HV-202" in critical_clash["nodes"]
    assert critical_clash["severity"] == "HIGH"
