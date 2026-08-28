from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

app = FastAPI(
    title="RecoverAI API",
    description="AI-powered revenue recovery engine",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Payment(BaseModel):
    id: str
    customer: str
    amount: float
    reason: str
    score: int
    recommended_action: str
    status: str


class RecoveryRequest(BaseModel):
    id: str
    customer: str
    amount: float
    reason: str
class RazorpayWebhook(BaseModel):
    payment_id: str
    customer: str
    amount: float
    failure_reason: str


payments = [
    Payment(
        id="PAY-10482",
        customer="Arjun Mehta",
        amount=2499,
        reason="Insufficient funds",
        score=86,
        recommended_action="Retry in 6 hours",
        status="Recoverable"
    ),
    Payment(
        id="PAY-10479",
        customer="Priya Sharma",
        amount=4999,
        reason="Card expired",
        score=94,
        recommended_action="Send payment update link",
        status="High Priority"
    ),
    Payment(
        id="PAY-10471",
        customer="Rahul Verma",
        amount=1299,
        reason="Bank timeout",
        score=71,
        recommended_action="Retry immediately",
        status="Recoverable"
    ),
    Payment(
        id="PAY-10463",
        customer="Sneha Rao",
        amount=7999,
        reason="Payment declined",
        score=42,
        recommended_action="Customer outreach",
        status="At Risk"
    )
]


def analyze_payment(reason: str, amount: float):

    reason_lower = reason.lower()

    # Insufficient funds
    if "insufficient" in reason_lower:
        score = 86
        action = "Retry in 6 hours"
        strategy = "Delayed retry"
        explanation = (
            "The payment appears recoverable because the failure is "
            "likely temporary. A delayed retry gives the customer time "
            "to restore sufficient balance."
        )

    # Expired card
    elif "expired" in reason_lower:
        score = 94
        action = "Send payment update link"
        strategy = "Payment method update"
        explanation = (
            "The payment method is expired. Updating the payment method "
            "is more effective than repeatedly retrying the transaction."
        )

    # Bank timeout
    elif "timeout" in reason_lower:
        score = 71
        action = "Retry immediately"
        strategy = "Immediate retry"
        explanation = (
            "The failure appears temporary and may have resulted from "
            "a banking or network timeout. An immediate retry is appropriate."
        )

    # Generic decline
    elif "declined" in reason_lower:
        score = 42
        action = "Customer outreach"
        strategy = "Personalized outreach"
        explanation = (
            "Repeated automated retries may not be effective. "
            "Customer outreach should be attempted before another retry."
        )

    else:
        score = 50
        action = "Manual review"
        strategy = "Human review"
        explanation = (
            "The failure reason is unclear, so RecoverAI recommends "
            "human review before taking an automated recovery action."
        )

    # Adjust priority for high-value transactions
    if amount >= 5000:
        priority = "Critical"
    elif amount >= 2500:
        priority = "High"
    else:
        priority = "Normal"

    return {
        "recovery_score": score,
        "recommended_action": action,
        "strategy": strategy,
        "priority": priority,
        "explanation": explanation
    }


@app.get("/")
def home():
    return {
        "service": "RecoverAI",
        "status": "online",
        "message": "AI Revenue Recovery Engine is running"
    }


@app.get("/api/payments", response_model=List[Payment])
def get_payments():
    return payments
@app.post("/api/payment-failed")
def payment_failed(request: RecoveryRequest):

    decision = analyze_payment(
        request.reason,
        request.amount
    )

    new_payment = Payment(
        id=request.id,
        customer=request.customer,
        amount=request.amount,
        reason=request.reason,
        score=decision["recovery_score"],
        recommended_action=decision["recommended_action"],
        status=(
            "High Priority"
            if decision["priority"] == "Critical"
            else "Recoverable"
        )
    )

    payments.insert(0, new_payment)

    return {
        "event": "payment.failed",
        "message": "Failed payment detected by RecoverAI",
        "payment": new_payment,
        "decision": decision
    }
@app.post("/api/webhook/razorpay")
def razorpay_webhook(event: RazorpayWebhook):

    decision = analyze_payment(
        event.failure_reason,
        event.amount
    )

    new_payment = Payment(
        id=event.payment_id,
        customer=event.customer,
        amount=event.amount,
        reason=event.failure_reason,
        score=decision["recovery_score"],
        recommended_action=decision["recommended_action"],
        status=(
            "High Priority"
            if decision["priority"] == "Critical"
            else "Recoverable"
        )
    )

    payments.insert(0, new_payment)

    return {
        "success": True,
        "event": "payment.failed",
        "source": "Razorpay",
        "message": "Razorpay payment failure received by RecoverAI",
        "payment": new_payment,
        "recovery_decision": decision
    }


@app.post("/api/analyze")
def analyze(request: RecoveryRequest):

    result = analyze_payment(
        request.reason,
        request.amount
    )

    return {
        "payment_id": request.id,
        "customer": request.customer,
        "amount": request.amount,
        "failure_reason": request.reason,
        "decision": result,
        "ai_model": "RecoverAI Decision Engine"
    }