import hashlib
import os
from app.core.config import settings

import re

# Regex patterns for fast PII redaction without heavy models
_EMAIL_RE = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
_PHONE_RE = re.compile(r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b')
_URL_RE = re.compile(r'https?://\S+|www\.\S+')
_STUDENT_ID_RE = re.compile(r'\b\d{7,10}\b')

def redact_text(text: str) -> str:
    if not text:
        return text

    cleaned = _EMAIL_RE.sub('<EMAIL_ADDRESS>', text)
    cleaned = _PHONE_RE.sub('<PHONE_NUMBER>', cleaned)
    cleaned = _URL_RE.sub('<URL>', cleaned)
    cleaned = _STUDENT_ID_RE.sub('<STUDENT_ID>', cleaned)
    return cleaned



def salt_hash(value: str) -> str:
    if not value:
        return ""
    salt = os.getenv("ANONYMITY_SALT", settings.ANONYMITY_SALT)
    return hashlib.sha256((salt + value).encode()).hexdigest()
