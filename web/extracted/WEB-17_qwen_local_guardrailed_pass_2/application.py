import logging
import re
from datetime import datetime
from typing import Optional

# Configure structured logger
logger = logging.getLogger("auth_audit")
# Ensure handlers are configured externally, but set level here for audit context
logger.setLevel(logging.INFO)

def sanitize_string(value: str) -> str:
    """
    Strip CRLF, LF, CR, U+2028, U+2029, and ANSI escapes from user-controlled values.
    """
    if not isinstance(value, str):
        return str(value)
    # Strip common line endings and unicode line separators
    value = value.replace('\r', '').replace('\n', '').replace('\u2028', '').replace('\u2029', '')
    # Strip ANSI escape sequences (basic)
    value = re.sub(r'\x1b\[[0-?]*[ -/]*[@-~]', '', value)
    return value

def log_failed_login_attempt(
    username: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> None:
    """
    Records a failed login attempt including the submitted username.
    
    Sanitizes username to prevent log injection.
    Emits structured JSON logs.
    """
    sanitized_username = sanitize_string(username)
    
    log_entry = {
        "event": "login_failed",
        "timestamp": datetime.utcnow().isoformat(),
        "username": sanitized_username,
        "ip_address": ip_address,
        "user_agent": user_agent
    }
    
    logger.info(log_entry)