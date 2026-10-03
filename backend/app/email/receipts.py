"""Billing receipt email — built only from persisted records, no secrets."""

from __future__ import annotations

from datetime import datetime

from app.email.service import send_email


def send_payment_receipt(
    *,
    recipient: str,
    customer_name: str,
    plan_name: str,
    amount_minor: int,
    currency: str,
    invoice_number: str,
    paid_at: datetime,
) -> bool:
    amount = f"{currency} {amount_minor / 100:,.2f}"
    paid_date = paid_at.strftime("%d %b %Y")
    subject = f"Your Pithros receipt — {invoice_number}"
    text = (
        f"Dear {customer_name},\n\n"
        "Thank you. Your payment has been received and your preservation plan is active.\n\n"
        f"Receipt number: {invoice_number}\n"
        f"Plan: {plan_name}\n"
        f"Amount paid: {amount}\n"
        f"Payment date: {paid_date}\n\n"
        "You can view this invoice and receipt any time from your billing page.\n\n"
        "— Pithros\n"
    )
    return send_email(to=recipient, subject=subject, text=text)
