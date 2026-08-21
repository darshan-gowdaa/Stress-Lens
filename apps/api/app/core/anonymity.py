import hashlib
import os
from app.core.config import settings

try:
    from presidio_analyzer import AnalyzerEngine
    from presidio_anonymizer import AnonymizerEngine
    _analyzer = AnalyzerEngine()
    _anonymizer = AnonymizerEngine()
    _PRESIDIO_AVAILABLE = True
except (Exception, SystemExit):
    _PRESIDIO_AVAILABLE = False

# PII entity types to detect
_ENTITIES = [
    "PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER",
    "LOCATION", "DATE_TIME", "NRP", "MEDICAL_LICENSE", "URL",
]


def redact_text(text: str) -> str:
    if not text:
        return text
    if not _PRESIDIO_AVAILABLE:
        return text
    try:
        results = _analyzer.analyze(text=text, entities=_ENTITIES, language="en")
        return _anonymizer.anonymize(text=text, analyzer_results=results).text
    except Exception:
        # don't crash the request if presidio fails
        return text


def salt_hash(value: str) -> str:
    if not value:
        return ""
    salt = os.getenv("ANONYMITY_SALT", settings.ANONYMITY_SALT)
    return hashlib.sha256((salt + value).encode()).hexdigest()
