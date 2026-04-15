"""Seed script — creates sample users, requests, and messages for demo purposes."""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.database import async_session, init_db
from app.models import (  # noqa: F401 — import all models to register them
    User, UserRole,
    VerificationRequest, InvestorType, RequestStatus, VerificationMethod,
    Document, DocumentType,
    Message,
    VerificationLetter,
)
from app.services.auth_service import hash_password
from datetime import datetime, timezone


async def seed():
    await init_db()

    async with async_session() as db:
        # --- Users ---
        investor1 = User(
            id="inv-001",
            email="investor@demo.com",
            password_hash=hash_password("Password1!"),
            first_name="Jane",
            last_name="Doe",
            phone="+1-555-0101",
            role=UserRole.INVESTOR,
            is_active=True,
            email_verified=True,
        )
        investor2 = User(
            id="inv-002",
            email="investor2@demo.com",
            password_hash=hash_password("Password1!"),
            first_name="Bob",
            last_name="Smith",
            phone="+1-555-0102",
            role=UserRole.INVESTOR,
            is_active=True,
            email_verified=True,
        )
        reviewer = User(
            id="rev-001",
            email="reviewer@demo.com",
            password_hash=hash_password("Password1!"),
            first_name="Alice",
            last_name="Reviewer",
            phone="+1-555-0201",
            role=UserRole.REVIEWER,
            is_active=True,
            email_verified=True,
        )
        admin_user = User(
            id="adm-001",
            email="admin@demo.com",
            password_hash=hash_password("Password1!"),
            first_name="Admin",
            last_name="User",
            phone="+1-555-0301",
            role=UserRole.ADMIN,
            is_active=True,
            email_verified=True,
        )

        for u in [investor1, investor2, reviewer, admin_user]:
            db.add(u)

        # --- Verification Requests ---

        # 1) Draft request
        req_draft = VerificationRequest(
            id="req-001",
            investor_id="inv-001",
            investor_type=InvestorType.INDIVIDUAL,
            verification_method=VerificationMethod.INCOME,
            status=RequestStatus.DRAFT,
            self_attestation_data={
                "annual_income_year1": 250000,
                "annual_income_year2": 260000,
                "expected_current_year": 270000,
                "filing_status": "individual",
            },
        )

        # 2) Submitted request
        req_submitted = VerificationRequest(
            id="req-002",
            investor_id="inv-001",
            investor_type=InvestorType.INDIVIDUAL,
            verification_method=VerificationMethod.NET_WORTH,
            status=RequestStatus.SUBMITTED,
            self_attestation_data={
                "total_assets": 2500000,
                "total_liabilities": 300000,
                "primary_residence_value": 500000,
                "net_worth_excluding_residence": 1700000,
            },
            submitted_at=datetime(2026, 4, 10, tzinfo=timezone.utc),
        )

        # 3) Under review request
        req_review = VerificationRequest(
            id="req-003",
            investor_id="inv-002",
            investor_type=InvestorType.INDIVIDUAL,
            verification_method=VerificationMethod.PROFESSIONAL_CREDENTIAL,
            status=RequestStatus.UNDER_REVIEW,
            assigned_reviewer_id="rev-001",
            self_attestation_data={
                "license_type": "Series 65",
                "license_number": "CRD#1234567",
                "issuing_authority": "FINRA",
                "license_status": "Active",
            },
            submitted_at=datetime(2026, 4, 8, tzinfo=timezone.utc),
        )

        # 4) Info requested
        req_info = VerificationRequest(
            id="req-004",
            investor_id="inv-002",
            investor_type=InvestorType.ENTITY,
            verification_method=VerificationMethod.ENTITY_ASSETS,
            status=RequestStatus.INFO_REQUESTED,
            assigned_reviewer_id="rev-001",
            self_attestation_data={
                "entity_name": "Smith Capital LLC",
                "entity_type": "LLC",
                "total_assets": 7500000,
                "formation_date": "2018-03-15",
                "purpose": "Investment management",
            },
            submitted_at=datetime(2026, 4, 5, tzinfo=timezone.utc),
        )

        # 5) Approved request
        req_approved = VerificationRequest(
            id="req-005",
            investor_id="inv-001",
            investor_type=InvestorType.INDIVIDUAL,
            verification_method=VerificationMethod.INCOME,
            status=RequestStatus.APPROVED,
            assigned_reviewer_id="rev-001",
            self_attestation_data={
                "annual_income_year1": 350000,
                "annual_income_year2": 380000,
                "expected_current_year": 400000,
                "filing_status": "joint",
            },
            submitted_at=datetime(2026, 3, 1, tzinfo=timezone.utc),
            reviewed_at=datetime(2026, 3, 5, tzinfo=timezone.utc),
            expires_at=datetime(2026, 6, 3, tzinfo=timezone.utc),
        )

        # 6) Denied request
        req_denied = VerificationRequest(
            id="req-006",
            investor_id="inv-002",
            investor_type=InvestorType.INDIVIDUAL,
            verification_method=VerificationMethod.NET_WORTH,
            status=RequestStatus.DENIED,
            assigned_reviewer_id="rev-001",
            self_attestation_data={
                "total_assets": 800000,
                "total_liabilities": 200000,
                "primary_residence_value": 400000,
                "net_worth_excluding_residence": 200000,
            },
            denial_reason="Net worth excluding primary residence does not meet the $1M threshold based on documents provided.",
            submitted_at=datetime(2026, 3, 10, tzinfo=timezone.utc),
            reviewed_at=datetime(2026, 3, 15, tzinfo=timezone.utc),
        )

        for r in [req_draft, req_submitted, req_review, req_info, req_approved, req_denied]:
            db.add(r)

        # --- Messages ---
        msg1 = Message(
            request_id="req-003",
            sender_id="rev-001",
            content="Status changed to UNDER_REVIEW",
            is_system_message=True,
        )
        msg2 = Message(
            request_id="req-004",
            sender_id="rev-001",
            content="Status changed to INFO_REQUESTED: Please provide audited financial statements from the last 12 months for Smith Capital LLC.",
            is_system_message=True,
        )
        msg3 = Message(
            request_id="req-004",
            sender_id="rev-001",
            content="Please provide audited financial statements from the last 12 months for Smith Capital LLC.",
            is_system_message=False,
        )
        msg4 = Message(
            request_id="req-005",
            sender_id="rev-001",
            content="Status changed to APPROVED",
            is_system_message=True,
        )
        msg5 = Message(
            request_id="req-006",
            sender_id="rev-001",
            content="Status changed to DENIED: Net worth excluding primary residence does not meet the $1M threshold.",
            is_system_message=True,
        )

        for m in [msg1, msg2, msg3, msg4, msg5]:
            db.add(m)

        await db.commit()

    print("Seed data created successfully!")
    print("\nDemo accounts:")
    print("  Investor:  investor@demo.com  / Password1!")
    print("  Investor2: investor2@demo.com / Password1!")
    print("  Reviewer:  reviewer@demo.com  / Password1!")
    print("  Admin:     admin@demo.com     / Password1!")


if __name__ == "__main__":
    asyncio.run(seed())
