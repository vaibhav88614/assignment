"""
Comprehensive tests for the Accredited Investor Verification API.
Covers: auth, verification CRUD, state transitions, documents, messages,
admin assignment, and 404 / permission edge cases.
"""
import asyncio
import os
import tempfile

# Force local storage (no Cloudinary) and test DB before any app imports
os.environ["CLOUDINARY_URL"] = ""
os.environ["RESEND_API_KEY"] = ""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Reload settings to pick up env overrides
import app.config
app.config.settings = app.config.Settings()

# Force storage service to local mode with a temp directory
import app.services.cloud_storage_service as _css
_css._cloudinary_configured = False
_test_upload_dir = tempfile.mkdtemp()
_css.storage_service = _css.StorageService(upload_dir=_test_upload_dir)
import app.services.storage_service as _ss
_ss.storage_service = _css.storage_service

from app.database import Base, get_db
from app.main import app

# ---------------------------------------------------------------------------
# Test database setup – in-memory SQLite
# ---------------------------------------------------------------------------
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestSession = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def _override_get_db():
    async with TestSession() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture(scope="session")
def event_loop_policy():
    return asyncio.DefaultEventLoopPolicy()


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def register_user(client: AsyncClient, email: str, role: str = "INVESTOR", first_name: str = "Test", last_name: str = "User"):
    resp = await client.post("/api/auth/register", json={
        "email": email,
        "password": "TestPass123!",
        "first_name": first_name,
        "last_name": last_name,
        "role": role,
    })
    return resp


async def login_user(client: AsyncClient, email: str) -> str:
    resp = await client.post("/api/auth/login", json={
        "email": email,
        "password": "TestPass123!",
    })
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def create_and_submit_request(client: AsyncClient, token: str) -> str:
    """Create a request, upload a doc, and submit it. Returns request id."""
    # Create
    resp = await client.post("/api/verification/requests", json={
        "investor_type": "INDIVIDUAL",
        "verification_method": "INCOME",
        "self_attestation_data": {"annual_income_year1": 250000, "annual_income_year2": 260000},
    }, headers=auth_headers(token))
    assert resp.status_code == 201, resp.text
    req_id = resp.json()["id"]

    # Upload a dummy doc (minimal pdf-like bytes)
    import io
    file = io.BytesIO(b"%PDF-1.4 test content")
    resp = await client.post(
        f"/api/documents/{req_id}",
        files={"file": ("test.pdf", file, "application/pdf")},
        data={"document_type": "TAX_RETURN"},
        headers=auth_headers(token),
    )
    assert resp.status_code == 201, resp.text

    # Submit
    resp = await client.post(f"/api/verification/requests/{req_id}/submit", json={
        "attestation_confirmed": True,
    }, headers=auth_headers(token))
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "SUBMITTED"
    return req_id


# ===========================================================================
# AUTH TESTS
# ===========================================================================
class TestAuth:
    @pytest.mark.asyncio
    async def test_register_and_login(self, client):
        resp = await register_user(client, "auth@test.com")
        assert resp.status_code == 201
        assert resp.json()["email"] == "auth@test.com"

        resp = await client.post("/api/auth/login", json={
            "email": "auth@test.com", "password": "TestPass123!",
        })
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client):
        await register_user(client, "wrong_pw@test.com")
        resp = await client.post("/api/auth/login", json={
            "email": "wrong_pw@test.com", "password": "WrongPassword!",
        })
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_me_requires_auth(self, client):
        resp = await client.get("/api/auth/me")
        assert resp.status_code == 403  # No bearer token

    @pytest.mark.asyncio
    async def test_me_returns_user(self, client):
        await register_user(client, "me@test.com")
        token = await login_user(client, "me@test.com")
        resp = await client.get("/api/auth/me", headers=auth_headers(token))
        assert resp.status_code == 200
        assert resp.json()["email"] == "me@test.com"


# ===========================================================================
# VERIFICATION REQUEST LIFECYCLE
# ===========================================================================
class TestVerificationLifecycle:
    @pytest.mark.asyncio
    async def test_create_request(self, client):
        await register_user(client, "inv1@test.com")
        token = await login_user(client, "inv1@test.com")

        resp = await client.post("/api/verification/requests", json={
            "investor_type": "INDIVIDUAL",
            "verification_method": "INCOME",
            "self_attestation_data": {"income": 200000},
        }, headers=auth_headers(token))
        assert resp.status_code == 201
        assert resp.json()["status"] == "DRAFT"

    @pytest.mark.asyncio
    async def test_draft_reuse_prevents_duplicates(self, client):
        await register_user(client, "inv_dup@test.com")
        token = await login_user(client, "inv_dup@test.com")

        resp1 = await client.post("/api/verification/requests", json={
            "investor_type": "INDIVIDUAL",
            "verification_method": "INCOME",
            "self_attestation_data": {"income": 200000},
        }, headers=auth_headers(token))
        id1 = resp1.json()["id"]

        resp2 = await client.post("/api/verification/requests", json={
            "investor_type": "INDIVIDUAL",
            "verification_method": "NET_WORTH",
            "self_attestation_data": {"assets": 1000000},
        }, headers=auth_headers(token))
        id2 = resp2.json()["id"]

        assert id1 == id2, "Should reuse existing DRAFT"

    @pytest.mark.asyncio
    async def test_submit_requires_doc(self, client):
        await register_user(client, "inv_nodoc@test.com")
        token = await login_user(client, "inv_nodoc@test.com")

        resp = await client.post("/api/verification/requests", json={
            "investor_type": "INDIVIDUAL",
            "verification_method": "INCOME",
            "self_attestation_data": {"income": 200000},
        }, headers=auth_headers(token))
        req_id = resp.json()["id"]

        resp = await client.post(f"/api/verification/requests/{req_id}/submit", json={
            "attestation_confirmed": True,
        }, headers=auth_headers(token))
        assert resp.status_code == 400
        assert "document" in resp.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_full_approve_flow(self, client):
        # Register investor
        await register_user(client, "inv_flow@test.com")
        inv_token = await login_user(client, "inv_flow@test.com")

        # Register reviewer
        await register_user(client, "rev_flow@test.com", role="REVIEWER", first_name="Rev", last_name="One")
        rev_token = await login_user(client, "rev_flow@test.com")

        # Create & submit
        req_id = await create_and_submit_request(client, inv_token)

        # Reviewer claims
        resp = await client.post(f"/api/verification/requests/{req_id}/transition", json={
            "new_status": "UNDER_REVIEW",
        }, headers=auth_headers(rev_token))
        assert resp.status_code == 200
        assert resp.json()["status"] == "UNDER_REVIEW"

        # Reviewer approves
        resp = await client.post(f"/api/verification/requests/{req_id}/transition", json={
            "new_status": "APPROVED",
        }, headers=auth_headers(rev_token))
        assert resp.status_code == 200
        assert resp.json()["status"] == "APPROVED"
        assert resp.json()["expires_at"] is not None

    @pytest.mark.asyncio
    async def test_deny_requires_reason(self, client):
        await register_user(client, "inv_deny@test.com")
        inv_token = await login_user(client, "inv_deny@test.com")
        await register_user(client, "rev_deny@test.com", role="REVIEWER")
        rev_token = await login_user(client, "rev_deny@test.com")

        req_id = await create_and_submit_request(client, inv_token)

        # Claim
        await client.post(f"/api/verification/requests/{req_id}/transition", json={
            "new_status": "UNDER_REVIEW",
        }, headers=auth_headers(rev_token))

        # Deny without reason → 400
        resp = await client.post(f"/api/verification/requests/{req_id}/transition", json={
            "new_status": "DENIED",
        }, headers=auth_headers(rev_token))
        assert resp.status_code == 400
        assert "reason" in resp.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_info_requested_and_provide_info(self, client):
        """Investor provides info → status goes to UNDER_REVIEW."""
        await register_user(client, "inv_info@test.com")
        inv_token = await login_user(client, "inv_info@test.com")
        await register_user(client, "rev_info@test.com", role="REVIEWER")
        rev_token = await login_user(client, "rev_info@test.com")

        req_id = await create_and_submit_request(client, inv_token)

        # Claim
        await client.post(f"/api/verification/requests/{req_id}/transition", json={
            "new_status": "UNDER_REVIEW",
        }, headers=auth_headers(rev_token))

        # Request info
        resp = await client.post(f"/api/verification/requests/{req_id}/transition", json={
            "new_status": "INFO_REQUESTED",
            "message": "Need more docs",
            "deadline_hours": 48,
        }, headers=auth_headers(rev_token))
        assert resp.status_code == 200
        assert resp.json()["status"] == "INFO_REQUESTED"

        # Investor provides info → should go to UNDER_REVIEW
        resp = await client.post(
            f"/api/verification/requests/{req_id}/provide-info",
            headers=auth_headers(inv_token),
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "UNDER_REVIEW"


# ===========================================================================
# ADMIN ASSIGNMENT TESTS
# ===========================================================================
class TestAdminAssignment:
    @pytest.mark.asyncio
    async def test_admin_cannot_self_claim(self, client):
        """Admin should not be able to claim requests via transition."""
        await register_user(client, "inv_admin@test.com")
        inv_token = await login_user(client, "inv_admin@test.com")
        await register_user(client, "admin_claim@test.com", role="ADMIN")
        admin_token = await login_user(client, "admin_claim@test.com")

        req_id = await create_and_submit_request(client, inv_token)

        resp = await client.post(f"/api/verification/requests/{req_id}/transition", json={
            "new_status": "UNDER_REVIEW",
        }, headers=auth_headers(admin_token))
        assert resp.status_code == 403
        assert "assign" in resp.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_admin_assign_reviewer(self, client):
        """Admin can assign a reviewer to a request."""
        await register_user(client, "inv_assign@test.com")
        inv_token = await login_user(client, "inv_assign@test.com")
        await register_user(client, "rev_assign@test.com", role="REVIEWER", first_name="Rev", last_name="Assign")
        await register_user(client, "admin_assign@test.com", role="ADMIN")
        admin_token = await login_user(client, "admin_assign@test.com")

        req_id = await create_and_submit_request(client, inv_token)

        # Get reviewers list
        resp = await client.get("/api/admin/reviewers", headers=auth_headers(admin_token))
        assert resp.status_code == 200
        reviewers = resp.json()
        assert len(reviewers) >= 1
        rev_id = reviewers[0]["id"]

        # Assign
        resp = await client.post(f"/api/admin/requests/{req_id}/assign", json={
            "reviewer_id": rev_id,
        }, headers=auth_headers(admin_token))
        assert resp.status_code == 200

        # Verify status changed
        resp = await client.get(f"/api/verification/requests/{req_id}", headers=auth_headers(admin_token))
        assert resp.json()["status"] == "UNDER_REVIEW"
        assert resp.json()["assigned_reviewer_id"] == rev_id

    @pytest.mark.asyncio
    async def test_reviewer_workload_count(self, client):
        """Reviewer workload should reflect active reviews count."""
        await register_user(client, "inv_wl@test.com")
        inv_token = await login_user(client, "inv_wl@test.com")
        await register_user(client, "rev_wl@test.com", role="REVIEWER", first_name="Rev", last_name="Workload")
        await register_user(client, "admin_wl@test.com", role="ADMIN")
        admin_token = await login_user(client, "admin_wl@test.com")

        req_id = await create_and_submit_request(client, inv_token)

        # Before assignment: 0 active
        resp = await client.get("/api/admin/reviewers", headers=auth_headers(admin_token))
        rev = [r for r in resp.json() if r["email"] == "rev_wl@test.com"][0]
        assert rev["active_reviews"] == 0

        # Assign
        await client.post(f"/api/admin/requests/{req_id}/assign", json={
            "reviewer_id": rev["id"],
        }, headers=auth_headers(admin_token))

        # After assignment: 1 active
        resp = await client.get("/api/admin/reviewers", headers=auth_headers(admin_token))
        rev = [r for r in resp.json() if r["email"] == "rev_wl@test.com"][0]
        assert rev["active_reviews"] == 1


# ===========================================================================
# 404 / PERMISSION EDGE CASES
# ===========================================================================
class TestEdgeCases:
    @pytest.mark.asyncio
    async def test_nonexistent_request_404(self, client):
        await register_user(client, "inv_404@test.com")
        token = await login_user(client, "inv_404@test.com")

        resp = await client.get(
            "/api/verification/requests/nonexistent-id",
            headers=auth_headers(token),
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_nonexistent_document_404(self, client):
        await register_user(client, "inv_doc404@test.com")
        token = await login_user(client, "inv_doc404@test.com")

        resp = await client.get(
            "/api/documents/download/nonexistent-id",
            headers=auth_headers(token),
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_nonexistent_letter_404(self, client):
        await register_user(client, "inv_let404@test.com")
        token = await login_user(client, "inv_let404@test.com")

        resp = await client.get(
            "/api/admin/letters/nonexistent-id/download",
            headers=auth_headers(token),
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_investor_cannot_access_other_request(self, client):
        await register_user(client, "inv_a@test.com")
        token_a = await login_user(client, "inv_a@test.com")
        await register_user(client, "inv_b@test.com")
        token_b = await login_user(client, "inv_b@test.com")

        req_id = await create_and_submit_request(client, token_a)

        resp = await client.get(
            f"/api/verification/requests/{req_id}",
            headers=auth_headers(token_b),
        )
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_investor_cannot_claim_request(self, client):
        await register_user(client, "inv_claim@test.com")
        token = await login_user(client, "inv_claim@test.com")

        req_id = await create_and_submit_request(client, token)

        resp = await client.post(f"/api/verification/requests/{req_id}/transition", json={
            "new_status": "UNDER_REVIEW",
        }, headers=auth_headers(token))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_invalid_transition_400(self, client):
        """DRAFT → APPROVED should be rejected."""
        await register_user(client, "inv_trans@test.com")
        token = await login_user(client, "inv_trans@test.com")
        await register_user(client, "rev_trans@test.com", role="REVIEWER")
        rev_token = await login_user(client, "rev_trans@test.com")

        resp = await client.post("/api/verification/requests", json={
            "investor_type": "INDIVIDUAL",
            "verification_method": "INCOME",
            "self_attestation_data": {"income": 200000},
        }, headers=auth_headers(token))
        req_id = resp.json()["id"]

        resp = await client.post(f"/api/verification/requests/{req_id}/transition", json={
            "new_status": "APPROVED",
        }, headers=auth_headers(rev_token))
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_health_endpoint(self, client):
        resp = await client.get("/api/health")
        assert resp.status_code == 200
        assert "status" in resp.json()

    @pytest.mark.asyncio
    async def test_nonexistent_api_route_404(self, client):
        """Undefined API routes should return 404, not 500."""
        resp = await client.get("/api/nonexistent")
        assert resp.status_code in (404, 405)


# ===========================================================================
# MESSAGES TESTS
# ===========================================================================
class TestMessages:
    @pytest.mark.asyncio
    async def test_send_and_retrieve_messages(self, client):
        await register_user(client, "inv_msg@test.com")
        inv_token = await login_user(client, "inv_msg@test.com")
        await register_user(client, "rev_msg@test.com", role="REVIEWER")
        rev_token = await login_user(client, "rev_msg@test.com")

        req_id = await create_and_submit_request(client, inv_token)

        # Reviewer claims
        await client.post(f"/api/verification/requests/{req_id}/transition", json={
            "new_status": "UNDER_REVIEW",
        }, headers=auth_headers(rev_token))

        # Reviewer sends message
        resp = await client.post(f"/api/messages/{req_id}", json={
            "content": "Hello investor!",
        }, headers=auth_headers(rev_token))
        assert resp.status_code == 201

        # Investor retrieves messages
        resp = await client.get(f"/api/messages/{req_id}", headers=auth_headers(inv_token))
        assert resp.status_code == 200
        items = resp.json()["items"]
        user_msgs = [m for m in items if not m["is_system_message"]]
        assert any("Hello investor!" in m["content"] for m in user_msgs)

    @pytest.mark.asyncio
    async def test_messages_for_nonexistent_request(self, client):
        await register_user(client, "inv_msg404@test.com")
        token = await login_user(client, "inv_msg404@test.com")

        resp = await client.get("/api/messages/nonexistent-id", headers=auth_headers(token))
        assert resp.status_code == 404
