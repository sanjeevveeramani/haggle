"""FastAPI app entry point."""
import os
import uuid
import asyncio
from datetime import datetime
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from models import MoveDetails, LogQuoteWebhook, Quote, NegotiationJob
from storage import save_job, get_job, all_jobs
from config import MOCK_MOVERS, DEMO_PHONE_NUMBER
from orchestrator import run_round_1, run_round_2

load_dotenv()

app = FastAPI(title="Haggle Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# How long to wait after Round 1's last call for the final quote's webhook
# to land before deciding to move on to Round 2. Sequential calls mean each
# call's quote arrives as it ends, so this only cushions the final one.
POST_ROUND_WAIT_SECONDS = 90


@app.get("/")
def root():
    return {"status": "haggle backend running", "movers": len(MOCK_MOVERS)}


@app.post("/negotiate")
async def start_negotiation(move: MoveDetails, background: BackgroundTasks):
    """Kick off a negotiation job — spawns real outbound calls."""
    job_id = str(uuid.uuid4())[:8]
    job = NegotiationJob(
        job_id=job_id,
        status="round_1",
        move_details=move,
    )
    save_job(job)

    background.add_task(run_negotiation_job, job_id, move.dict())

    return {"job_id": job_id, "status": "started", "movers_to_call": len(MOCK_MOVERS)}


async def run_negotiation_job(job_id: str, move_dict: dict):
    """Background task: run round 1 sequentially, then round 2 sequentially."""
    print(f"\n[JOB {job_id}] Starting negotiation")

    # ---- ROUND 1 ----
    round_1_results = await run_round_1(
        move_details=move_dict,
        movers=MOCK_MOVERS,
        to_number=DEMO_PHONE_NUMBER,
    )
    print(f"[JOB {job_id}] Round 1 triggered: {round_1_results}")

    # Sequential calls mean each quote is logged as its call ends. Just cushion
    # the very last call before evaluating.
    print(f"[JOB {job_id}] Waiting {POST_ROUND_WAIT_SECONDS}s for last R1 quote...")
    await asyncio.sleep(POST_ROUND_WAIT_SECONDS)

    job = get_job(job_id)
    round_1_quotes = {q.mover_id: q.price for q in job.quotes if q.round_number == 1}
    print(f"[JOB {job_id}] Round 1 quotes: {round_1_quotes}")

    if not round_1_quotes:
        print(f"[JOB {job_id}] No quotes from round 1, ending")
        job.status = "completed"
        save_job(job)
        return

    # ---- ROUND 2 ----
    job.status = "round_2"
    save_job(job)
    round_2_results = await run_round_2(
        move_details=move_dict,
        movers=MOCK_MOVERS,
        round_1_quotes=round_1_quotes,
        to_number=DEMO_PHONE_NUMBER,
    )
    print(f"[JOB {job_id}] Round 2 triggered")

    print(f"[JOB {job_id}] Waiting {POST_ROUND_WAIT_SECONDS}s for last R2 quote...")
    await asyncio.sleep(POST_ROUND_WAIT_SECONDS)

    # ---- FINALIZE ----
    job = get_job(job_id)
    r1_quotes = [q for q in job.quotes if q.round_number == 1]
    r2_quotes = [q for q in job.quotes if q.round_number == 2]

    # Winner = cheapest final quote. Prefer R2 (post-negotiation), fall back to R1.
    final_pool = r2_quotes if r2_quotes else r1_quotes
    winner = min(final_pool, key=lambda q: q.price) if final_pool else None

    # Savings = highest R1 quote (baseline) minus winning price
    if winner and r1_quotes:
        baseline = max(q.price for q in r1_quotes)
        job.total_saved = round(baseline - winner.price, 2)
    else:
        job.total_saved = 0.0

    job.winner = winner
    job.status = "completed"
    save_job(job)

    if winner:
        print(f"[JOB {job_id}] Complete. Winner: {winner.mover_name} @ €{winner.price} "
              f"(saved €{job.total_saved})")
    else:
        print(f"[JOB {job_id}] Complete. No winner determined.")


@app.get("/status/{job_id}")
def get_status(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.post("/webhook/log_quote")
def log_quote(payload: LogQuoteWebhook):
    """Called by ElevenLabs when MoverNegotiator calls the log_quote tool."""
    print(f"[WEBHOOK] Quote received: {payload.mover_name} -> €{payload.price}")
    print(f"[WEBHOOK] Notes: {payload.notes}")

    # Match to a mover_id
    mover_id = None
    for mover in MOCK_MOVERS:
        name_in = payload.mover_name.lower()
        name_cfg = mover["company_name"].lower()
        if name_in in name_cfg or name_cfg in name_in:
            mover_id = mover["id"]
            break

    if not mover_id:
        mover_id = "unknown"

    # Attach to the most recent active job (single-demo assumption)
    active_jobs = [j for j in all_jobs().values() if j.status in ("round_1", "round_2")]
    if active_jobs:
        job = active_jobs[-1]
        round_num = 1 if job.status == "round_1" else 2

        # De-dupe: if this mover already logged in this round, keep the latest (overwrite)
        job.quotes = [
            q for q in job.quotes
            if not (q.mover_id == mover_id and q.round_number == round_num)
        ]

        quote = Quote(
            mover_id=mover_id,
            mover_name=payload.mover_name,
            price=payload.price,
            notes=payload.notes,
            round_number=round_num,
            timestamp=datetime.now(),
        )
        job.quotes.append(quote)
        save_job(job)
        print(f"[WEBHOOK] Attached to job {job.job_id} as round {round_num}")
    else:
        print(f"[WEBHOOK] No active job — quote discarded")

    return {"ok": True}


@app.get("/jobs")
def list_jobs():
    return all_jobs()