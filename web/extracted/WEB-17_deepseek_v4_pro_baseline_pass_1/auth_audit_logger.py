# auth_audit_logger.py
import logging
import json
import time
import hashlib
import ipaddress
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from dataclasses import dataclass, field, asdict


@dataclass
class AuditLogEntry:
    """Represents a single authentication audit log entry."""
    timestamp: str
    event_type: str
    username: str
    source_ip: Optional[str]
    user_agent: Optional[str]
    failure_reason: Optional[str]
    request_id: Optional[str]
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class AuthenticationAuditLogger:
    """
    Audit logger for authentication events, specifically failed login attempts.
    
    This logger records structured audit entries with sensitive data handling,
    including username hashing for privacy compliance while maintaining
    traceability for security investigations.
    """

    def __init__(
        self,
        logger_name: str = "auth_audit",
        log_level: int = logging.INFO,
        hash_usernames: bool = True,
        hash_salt: Optional[str] = None,
    ):
        """
        Initialize the authentication audit logger.

        Args:
            logger_name: Name for the underlying Python logger.
            log_level: Logging level for audit entries.
            hash_usernames: If True, usernames are hashed before logging.
            hash_salt: Optional salt for username hashing. If None, a random
                       salt is generated per instance (not persisted).
        """
        self.logger = logging.getLogger(logger_name)
        self.logger.setLevel(log_level)
        
        # Ensure we don't propagate to root logger to avoid duplicate entries
        self.logger.propagate = False
        
        # Add handler if none exists
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(message)s'  # We format the message ourselves as JSON
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)

        self.hash_usernames = hash_usernames
        self.hash_salt = hash_salt or self._generate_salt()

    @staticmethod
    def _generate_salt() -> str:
        """Generate a random salt for username hashing."""
        import secrets
        return secrets.token_hex(16)

    def _hash_username(self, username: str) -> str:
        """
        Hash the username for privacy-preserving audit logging.
        
        Uses SHA-256 with a salt. The salt is included in the output
        for verification purposes during investigations.
        """
        if not self.hash_usernames:
            return username
        
        salted = f"{self.hash_salt}:{username}"
        digest = hashlib.sha256(salted.encode('utf-8')).hexdigest()
        # Include salt in output for audit verification
        return f"sha256${self.hash_salt}${digest}"

    @staticmethod
    def _sanitize_ip(ip_address: Optional[str]) -> Optional[str]:
        """Validate and normalize IP address format."""
        if ip_address is None:
            return None
        try:
            ip_obj = ipaddress.ip_address(ip_address)
            return str(ip_obj)
        except ValueError:
            # Invalid IP - log as provided but flag it
            return f"invalid:{ip_address[:50]}"  # Truncate for safety

    @staticmethod
    def _sanitize_user_agent(user_agent: Optional[str]) -> Optional[str]:
        """Sanitize user agent string to prevent log injection."""
        if user_agent is None:
            return None
        # Remove newlines and carriage returns to prevent log injection
        sanitized = user_agent.replace('\n', '').replace('\r', '')
        # Truncate to reasonable length
        return sanitized[:500]

    @staticmethod
    def _sanitize_username(username: str) -> str:
        """Sanitize username to prevent log injection attacks."""
        if not username:
            return ""
        # Remove newlines, carriage returns, and null bytes
        sanitized = username.replace('\n', '').replace('\r', '').replace('\0', '')
        # Truncate to reasonable length
        return sanitized[:256]

    def log_failed_login(
        self,
        username: str,
        source_ip: Optional[str] = None,
        user_agent: Optional[str] = None,
        failure_reason: Optional[str] = None,
        request_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditLogEntry:
        """
        Record a failed login attempt to the audit log.

        Args:
            username: The username submitted during the failed login attempt.
            source_ip: IP address of the client attempting to authenticate.
            user_agent: User agent string from the client.
            failure_reason: Reason for authentication failure (e.g., 'invalid_credentials',
                           'account_locked', 'rate_limited').
            request_id: Correlation ID for tracing the request across systems.
            metadata: Additional contextual metadata for the audit entry.

        Returns:
            AuditLogEntry: The structured audit entry that was logged.

        Raises:
            ValueError: If username is empty or None.
        """
        if username is None or username == "":
            raise ValueError("Username cannot be empty for audit logging")

        # Sanitize all inputs
        sanitized_username = self._sanitize_username(username)
        sanitized_ip = self._sanitize_ip(source_ip)
        sanitized_ua = self._sanitize_user_agent(user_agent)
        sanitized_reason = self._sanitize_username(failure_reason) if failure_reason else None
        sanitized_request_id = self._sanitize_username(request_id) if request_id else None

        # Hash username if configured
        logged_username = self._hash_username(sanitized_username)

        # Create audit entry
        entry = AuditLogEntry(
            timestamp=datetime.now(timezone.utc).isoformat(),
            event_type="authentication_failure",
            username=logged_username,
            source_ip=sanitized_ip,
            user_agent=sanitized_ua,
            failure_reason=sanitized_reason,
            request_id=sanitized_request_id,
            metadata=metadata or {},
        )

        # Log the entry as structured JSON
        log_message = json.dumps(entry.to_dict(), ensure_ascii=False, default=str)
        self.logger.info(log_message)

        return entry

    def log_failed_login_batch(
        self,
        attempts: list[Dict[str, Any]],
    ) -> list[AuditLogEntry]:
        """
        Record multiple failed login attempts in batch.

        Args:
            attempts: List of dictionaries containing failed login attempt data.
                     Each dict should have keys matching log_failed_login parameters.

        Returns:
            List of AuditLogEntry objects that were logged.
        """
        entries = []
        for attempt in attempts:
            try:
                entry = self.log_failed_login(**attempt)
                entries.append(entry)
            except (ValueError, TypeError) as e:
                # Log the error but continue processing other attempts
                error_entry = AuditLogEntry(
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    event_type="audit_log_error",
                    username="",
                    source_ip=None,
                    user_agent=None,
                    failure_reason=f"Failed to log attempt: {str(e)}",
                    request_id=None,
                    metadata={"error": str(e)},
                )
                self.logger.error(json.dumps(error_entry.to_dict(), default=str))
                entries.append(error_entry)
        return entries


# Convenience function for simple use cases
def log_failed_login_attempt(
    username: str,
    source_ip: Optional[str] = None,
    user_agent: Optional[str] = None,
    failure_reason: Optional[str] = None,
    request_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    logger_name: str = "auth_audit",
    hash_usernames: bool = True,
) -> AuditLogEntry:
    """
    Convenience function to log a single failed login attempt.

    This function creates a new AuthenticationAuditLogger instance for each call,
    which is suitable for simple use cases. For high-volume applications,
    instantiate AuthenticationAuditLogger once and reuse it.

    Args:
        username: The username submitted during the failed login attempt.
        source_ip: IP address of the client attempting to authenticate.
        user_agent: User agent string from the client.
        failure_reason: Reason for authentication failure.
        request_id: Correlation ID for tracing the request.
        metadata: Additional contextual metadata.
        logger_name: Name for the underlying Python logger.
        hash_usernames: Whether to hash usernames in the log output.

    Returns:
        AuditLogEntry: The structured audit entry that was logged.
    """
    audit_logger = AuthenticationAuditLogger(
        logger_name=logger_name,
        hash_usernames=hash_usernames,
    )
    return audit_logger.log_failed_login(
        username=username,
        source_ip=source_ip,
        user_agent=user_agent,
        failure_reason=failure_reason,
        request_id=request_id,
        metadata=metadata,
    )