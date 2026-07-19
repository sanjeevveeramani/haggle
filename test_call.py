"""Quick test: trigger a negotiation via the API."""
import httpx
import json

payload = {
    "from_address": "Mannheim, Germany",
    "to_address": "Berlin, Germany",
    "home_size": "2-bedroom apartment",
    "move_date": "August 15, 2026",
    "special_items": "piano, fridge, washing machine",
    "distance_km": 580,
}

response = httpx.post(
    "http://localhost:8000/negotiate",
    json=payload,
    timeout=10.0,
)

print("Status:", response.status_code)
print("Response:", json.dumps(response.json(), indent=2))