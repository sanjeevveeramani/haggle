"""In-memory job storage. Fine for a hackathon."""
from typing import Dict
from models import NegotiationJob

jobs: Dict[str, NegotiationJob] = {}


def save_job(job: NegotiationJob):
    jobs[job.job_id] = job


def get_job(job_id: str) -> NegotiationJob | None:
    return jobs.get(job_id)


def all_jobs() -> Dict[str, NegotiationJob]:
    return jobs