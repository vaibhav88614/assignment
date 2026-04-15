from datetime import datetime

from pydantic import BaseModel


class LetterResponse(BaseModel):
    id: str
    request_id: str
    letter_number: str
    investor_name: str
    verification_method: str
    issued_at: datetime
    expires_at: datetime
    is_valid: bool = True

    model_config = {"from_attributes": True}
