import pytest


@pytest.fixture()
def client(app):
    return app.test_client()


def test_register_and_login(client):
    register_response = client.post(
        "/api/auth/register",
        json={
            "username": "tester",
            "email": "tester@example.com",
            "password": "secret123",
        },
    )
    assert register_response.status_code == 201

    login_response = client.post(
        "/api/auth/login",
        json={"email": "tester@example.com", "password": "secret123"},
    )
    assert login_response.status_code == 200
    data = login_response.get_json()
    assert "access_token" in data
