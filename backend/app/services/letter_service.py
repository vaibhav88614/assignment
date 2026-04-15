import os
from datetime import datetime, timedelta, timezone

from jinja2 import Environment, FileSystemLoader
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User
from app.models.verification_letter import VerificationLetter
from app.models.verification_request import VerificationRequest

TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "..", "templates")
LETTERS_DIR = os.path.join(settings.UPLOAD_DIR, "letters")
os.makedirs(LETTERS_DIR, exist_ok=True)

jinja_env = Environment(loader=FileSystemLoader(TEMPLATE_DIR), autoescape=True)


async def generate_letter(
    db: AsyncSession, request: VerificationRequest, investor: User
) -> VerificationLetter:
    """Generate a verification letter PDF for an approved request."""
    issued_at = datetime.now(timezone.utc)
    expires_at = issued_at + timedelta(days=settings.LETTER_VALIDITY_DAYS)

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
    pdf_path = os.path.join(LETTERS_DIR, pdf_filename)

    try:
        from weasyprint import HTML
        HTML(string=html_content).write_pdf(pdf_path)
    except ImportError:
        # WeasyPrint not installed — save HTML as fallback
        pdf_path = pdf_path.replace(".pdf", ".html")
        with open(pdf_path, "w", encoding="utf-8") as f:
            f.write(html_content)

    letter = VerificationLetter(
        request_id=request.id,
        letter_number=letter_number,
        sequence_num=seq,
        investor_name=investor_name,
        verification_method=request.verification_method.value,
        issued_at=issued_at,
        expires_at=expires_at,
        pdf_path=pdf_path,
        letter_html=html_content,
    )
    db.add(letter)
    await db.flush()
    return letter
