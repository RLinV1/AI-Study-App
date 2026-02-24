# AI-Study-App/backend/ai/ai_app/tests.py
import json
import pytest
from django.test import Client

from ai_app import views

# ===============================
# Mock LLaMA for CI/testing
# ===============================
def dummy_generate_ai_response(conversation):
    return "DUMMY RESPONSE"

# Patch the views function
views.generate_ai_response = dummy_generate_ai_response

# ===============================
# Fixtures
# ===============================
@pytest.fixture
def client():
    return Client()

# ===============================
# Tests
# ===============================

def test_get_csrf_token(client):
    response = client.get("/api/get-csrf/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert data["message"] == "CSRF cookie set"

def test_quiz_endpoint_valid_url(client):
    # Replace with a valid public YouTube ID if needed
    payload = {"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}
    response = client.post("/api/quiz/", data=json.dumps(payload), content_type="application/json")
    
    assert response.status_code == 200
    data = response.json()
    assert "quiz" in data
    assert data["quiz"] == "DUMMY RESPONSE"

def test_generate_summary_endpoint_valid_url(client):
    payload = {"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}
    response = client.post("/api/summary/", data=json.dumps(payload), content_type="application/json")
    
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert data["summary"] == "DUMMY RESPONSE"
    assert "transcript" in data

def test_get_videos_empty(client):
    response = client.get("/api/videos/")
    assert response.status_code == 200
    data = response.json()
    assert "videos" in data
    # Initially empty
    assert isinstance(data["videos"], list)
