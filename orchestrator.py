"""Triggers real outbound calls via ElevenLabs API."""
import os
import httpx
import asyncio
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
MOVER_NEGOTIATOR_AGENT_ID = os.getenv("MOVER_NEGOTIATOR_AGENT_ID")
MOVER_NEGOTIATOR_PHONE_ID = os.getenv("MOVER_NEGOTIATOR_PHONE_ID")

ELEVENLABS_BASE = "https://api.elevenlabs.io/v1"

# Delay between sequential calls in the same round (seconds)
CALL_GAP_SECONDS = 150


async def trigger_outbound_call(
    to_number: str,
    mover_config: dict,
    move_details: dict,
    round_number: int,
    competitor_quote: Optional[float] = None,
    competitor_name: Optional[str] = None,
) -> dict:
    """
    Triggers a real outbound call via ElevenLabs -> Twilio.
    The MoverNegotiator agent calls `to_number`, negotiates using the given
    mover persona as context, and logs a quote at the end.
    """
    url = f"{ELEVENLABS_BASE}/convai/twilio/outbound-call"
    
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
    }
    
    dynamic_vars = {
        "from_address": move_details.get("from_address", ""),
        "to_address": move_details.get("to_address", ""),
        "home_size": move_details.get("home_size", ""),
        "move_date": move_details.get("move_date", ""),
        "special_items": move_details.get("special_items", ""),
        "distance_km": str(move_details.get("distance_km", 0)),
        "round_number": str(round_number),
        "best_competitor_quote": str(competitor_quote) if competitor_quote else "none yet",
        "competitor_name": competitor_name or "no competitor",
        "target_mover_name": mover_config["company_name"],
    }
    
    payload = {
        "agent_id": MOVER_NEGOTIATOR_AGENT_ID,
        "agent_phone_number_id": MOVER_NEGOTIATOR_PHONE_ID,
        "to_number": to_number,
        "conversation_initiation_client_data": {
            "dynamic_variables": dynamic_vars,
        },
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        print(f"[CALL] Round {round_number} -> {mover_config['company_name']}: {response.status_code}")
        if response.status_code != 200:
            print(f"[CALL ERROR] {response.text}")
        return response.json() if response.status_code == 200 else {"error": response.text}


async def run_round_1(move_details: dict, movers: list, to_number: str) -> list:
    """Round 1: call each mover SEQUENTIALLY, no competitor context."""
    print(f"\n=== ROUND 1: Calling {len(movers)} movers sequentially ===")
    results = []
    for i, mover in enumerate(movers):
        result = await trigger_outbound_call(
            to_number=to_number,
            mover_config=mover,
            move_details=move_details,
            round_number=1,
        )
        results.append(result)
        if i < len(movers) - 1:
            print(f"[ROUND 1] Waiting {CALL_GAP_SECONDS}s before next call...")
            await asyncio.sleep(CALL_GAP_SECONDS)
    return results


async def run_round_2(
    move_details: dict,
    movers: list,
    round_1_quotes: dict,
    to_number: str,
) -> list:
    """Round 2: call each mover SEQUENTIALLY with best competitor quote."""
    print(f"\n=== ROUND 2: Negotiating with competitor prices ===")
    
    if not round_1_quotes:
        print("[ROUND 2] No quotes yet, skipping")
        return []
    
    best_price = min(round_1_quotes.values())
    best_mover = min(round_1_quotes, key=round_1_quotes.get)
    print(f"[ROUND 2] Best from round 1: {best_mover} at €{best_price}")
    
    results = []
    for i, mover in enumerate(movers):
        competing_quotes = {k: v for k, v in round_1_quotes.items() if k != mover["id"]}
        if competing_quotes:
            competitor_price = min(competing_quotes.values())
            competitor_id = min(competing_quotes, key=competing_quotes.get)
            competitor_name = next(m["company_name"] for m in movers if m["id"] == competitor_id)
        else:
            competitor_price = best_price
            competitor_name = best_mover
        
        result = await trigger_outbound_call(
            to_number=to_number,
            mover_config=mover,
            move_details=move_details,
            round_number=2,
            competitor_quote=competitor_price,
            competitor_name=competitor_name,
        )
        results.append(result)
        if i < len(movers) - 1:
            print(f"[ROUND 2] Waiting {CALL_GAP_SECONDS}s before next call...")
            await asyncio.sleep(CALL_GAP_SECONDS)
    
    return results