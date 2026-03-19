import requests
import pytest
import random

BASE_URL = "https://et-backend-psi.vercel.app/api/v1/users"


# Fixture: Register user (clean)
@pytest.fixture(scope="session")
def registered_user():
    url = f"{BASE_URL}/register"

    #  unique username + email (fix duplicate issue)
    username = f"user{random.randint(10000,99999)}"
    email = f"{username}@gmail.com"

    payload = {
        "username": username,
        "email": email,
        "password": "Password@123"
    }

    res = requests.post(url, json=payload)

    assert res.status_code == 201, f"Register failed: {res.json().get('message')}"

    return {
        "email": email,
        "password": "Password@123"
    }


# TC1: Login Success
def test_login_success(registered_user):
    url = f"{BASE_URL}/login"

    res = requests.post(url, json=registered_user)

    assert res.status_code == 200

    data = res.json()

    assert "token" in data
    assert data["email"] == registered_user["email"]

    #  performance check
    assert res.elapsed.total_seconds() < 3


# TC2: Wrong Password
def test_login_wrong_password(registered_user):
    url = f"{BASE_URL}/login"

    payload = {
        "email": registered_user["email"],
        "password": "WrongPassword"
    }

    res = requests.post(url, json=payload)

    assert res.status_code == 401
    assert "Invalid" in res.text


# TC3: Non-existing User
def test_login_invalid_user():
    url = f"{BASE_URL}/login"

    payload = {
        "email": f"nouser{random.randint(1000,9999)}@gmail.com",
        "password": "Password@123"
    }

    res = requests.post(url, json=payload)

    assert res.status_code == 401


# TC4: Missing Fields
def test_login_missing_fields():
    url = f"{BASE_URL}/login"

    payload = {
        "email": ""
    }

    res = requests.post(url, json=payload)

    assert res.status_code == 400


# TC5: Empty Payload
def test_login_empty_payload():
    url = f"{BASE_URL}/login"

    res = requests.post(url, json={}) 

    assert res.status_code == 400