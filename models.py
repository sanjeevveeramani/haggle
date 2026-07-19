"""Pydantic models for API requests/responses."""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class MoveDetails(BaseModel):
    from_address: str
    to_address: str
    home_size: str  # e.g. "2-bedroom apartment"
    move_date: str  # e.g. "August 15, 2026"
    special_items: str = ""  # e.g. "piano, fridge"
    distance_km: int


class Quote(BaseModel):
    mover_id: str
    mover_name: str
    price: float
    notes: str
    round_number: int
    timestamp: datetime
    conversation_id: Optional[str] = None


class LogQuoteWebhook(BaseModel):
    """Payload sent by ElevenLabs when log_quote tool fires."""
    price: float
    mover_name: str
    notes: str


class NegotiationJob(BaseModel):
    job_id: str
    status: str  # "pending", "round_1", "round_2", "completed"
    move_details: MoveDetails
    quotes: List[Quote] = []
    winner: Optional[Quote] = None
    total_saved: float = 0.0