import logging
import time
from typing import Optional

# Configure the logger for authentication audits
audit_logger = logging.getLogger("auth_audit")
if not audit_logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    audit_logger.addHandler(handler)
    audit_logger.setLevel(logging.INFO)

def log_failed_login_attempt(username: str, source_ip: Optional[str] = None) -> None:
    """
    Records a failed login attempt in the audit log.

    Args:
        username: The username submitted during the failed login attempt.
        source_ip: The IP address of the client making the request (optional).
    """
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    ip_info = f" - Source IP: {source_ip}" if source_ip else ""
    
    message = f"Failed login attempt for user '{username}' at {timestamp}{ip_info}"
    audit_logger.warning(message)