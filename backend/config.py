"""2 mock mover personas + move details schema."""

# The 2 mock movers we call in parallel
MOCK_MOVERS = [
    {
        "id": "mover_1",
        "company_name": "UmzugsProfis Berlin",
        "persona": "Established mid-tier moving company, professional but firm on price",
        "base_price": 2400,
        "minimum_price": 1900,
        "negotiation_style": "firm",
        "voice_hint": "Professional, slightly pushy sales rep",
    },
    {
        "id": "mover_2",
        "company_name": "SchnellMove GmbH",
        "persona": "Budget mover, hungry for new business, willing to negotiate",
        "base_price": 2100,
        "minimum_price": 1800,
        "negotiation_style": "desperate",
        "voice_hint": "Friendly, eager to close the deal",
    },
]

# For the demo — the phone number that receives all calls (your phone or friends')
# Change this to whatever number you want to demo with
DEMO_PHONE_NUMBER = "+4915210411145"