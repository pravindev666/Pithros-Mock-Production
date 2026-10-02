"""Account deletion and data-rights lifecycle.

Kept deliberately separate from billing: a payment failure never advances a
deletion, and a deletion request never creates payment debt (PRD §32).
"""
