def test_unauthenticated_request_rejected(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401

def test_authenticated_profile(client, staff_headers):
    response = client.get("/api/v1/auth/me", headers=staff_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "staff@test.com"
    assert data["role"] == "STAFF"

def test_role_enforcement_admin_required(client, staff_headers, admin_headers):
    # Staff attempting to list users -> 403 Forbidden
    resp_staff = client.get("/api/v1/auth/users", headers=staff_headers)
    assert resp_staff.status_code == 403

    # Admin attempting to list users -> 200 OK
    resp_admin = client.get("/api/v1/auth/users", headers=admin_headers)
    assert resp_admin.status_code == 200
    assert isinstance(resp_admin.json(), list)

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
