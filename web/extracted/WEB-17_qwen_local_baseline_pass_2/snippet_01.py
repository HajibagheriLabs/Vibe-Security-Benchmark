import logging
import datetime
from typing import Optional

# Configure the logger
logger = logging.getLogger('auth_audit')
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

def log_failed_login_attempt(username: str, ip_address: Optional[str] = None, reason: str = "Invalid credentials") -> None:
    """
    Records a failed login attempt to the authentication audit log.

    Args:
        username (str): The username submitted during the failed login.
        ip_address (Optional[str]): The IP address of the client (optional).
        reason (str): The reason for the failure (default: "Invalid credentials").
    """
    timestamp = datetime.datetime.now().isoformat()
    log_entry = f"Failed login attempt - Username: '{username}', IP: {ip_address or 'N/A'}, Reason: {reason}, Time: {timestamp}"
    logger.warning(log_entry)