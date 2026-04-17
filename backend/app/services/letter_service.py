import logging
import os
from datetime import datetime, timedelta, timezone

from jinja2 import Environment, FileSystemLoader
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User
from app.models.verification_letter import VerificationLetter
from app.models.verification_request import VerificationRequest
from app.services.storage_service import storage_service

TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "..", "templates")

jinja_env = Environment(loader=FileSystemLoader(TEMPLATE_DIR), autoescape=True)
logger = logging.getLogger("aiv.letter")


async def generate_letter(
    db: AsyncSession, request: VerificationRequest, investor: User
) -> VerificationLetter:
    """Generate a verification letter PDF for an approved request."""
    issued_at = datetime.now(timezone.utc)
    # Use the request's expires_at (set during approval) for consistency;
    # fall back to computing from issued_at if not set.
    expires_at = request.expires_at or (issued_at + timedelta(days=settings.LETTER_VALIDITY_DAYS))

    # Get next sequence number
    result = await db.execute(select(func.max(VerificationLetter.sequence_num)))
    max_seq = result.scalar() or 0
    seq = max_seq + 1
    letter_number = f"VL-{issued_at.year}-{seq:05d}"

    investor_name = f"{investor.first_name} {investor.last_name}"

    # Render HTML
    template = jinja_env.get_template("verification_letter.html")
    html_content = template.render(
        letter_number=letter_number,
        investor_name=investor_name,
        investor_email=investor.email,
        verification_method=request.verification_method.value.replace("_", " ").title(),
        investor_type=request.investor_type.value.title(),
        issued_date=issued_at.strftime("%B %d, %Y"),
        expiry_date=expires_at.strftime("%B %d, %Y"),
        issuer_org=settings.ISSUER_ORG_NAME,
        issuer_address=settings.ISSUER_ORG_ADDRESS,
    )

    # Generate PDF
    pdf_filename = f"letter_{letter_number.replace('-', '_')}.pdf"

    try:
        import io as _io
        from xhtml2pdf import pisa

        pdf_buffer = _io.BytesIO()
        pisa_status = pisa.CreatePDF(html_content, dest=pdf_buffer)
        if pisa_status.err:
            raise RuntimeError(f"xhtml2pdf error count: {pisa_status.err}")
        pdf_bytes = pdf_buffer.getvalue()
        stored_path = await storage_service.save_letter(pdf_bytes, pdf_filename, is_pdf=True)
    except Exception as e:
        logger.warning("PDF generation failed (%s); falling back to HTML letter.", e)
        html_filename = pdf_filename.replace(".pdf", ".html")
        stored_path = await storage_service.save_letter(html_content, html_filename, is_pdf=False)

    letter = VerificationLetter(
        request_id=request.id,
        letter_number=letter_number,
        sequence_num=seq,
        investor_name=investor_name,
        verification_method=request.verification_method.value,
        issued_at=issued_at,
        expires_at=expires_at,
        pdf_path=stored_path,
        letter_html=html_content,
    )
    db.add(letter)
    await db.flush()
    return letter
