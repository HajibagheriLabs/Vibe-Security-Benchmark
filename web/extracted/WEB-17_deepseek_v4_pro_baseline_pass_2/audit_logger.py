"""
Authentication audit logging module.

Provides structured logging for authentication events, with a focus on
failed login attempts. All log entries are emitted as JSON for easy
machine consumption by SIEM or log aggregation systems.
"""

from __future__ import annotations

import json
import logging
import time
from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Optional


class AuthEventType(str, Enum):
    """Types of authentication events that can be logged."""

    LOGIN_FAILURE = "login_failure"
    LOGIN_SUCCESS = "login_success"
    LOGIN_LOCKOUT = "login_lockout"
    PASSWORD_RESET = "password_reset"


@dataclass(frozen=True, slots=True)
class AuditLogEntry:
    """Immutable data structure representing a single audit log entry."""

    event_type: AuthEventType
    username: str
    timestamp: str = field(default_factory=lambda: time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
    source_ip: Optional[str] = None
    user_agent: Optional[str] = None
    reason: Optional[str] = None
    additional_context: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Convert the entry to a JSON-serializable dictionary."""
        data = asdict(self)
        data["event_type"] = self.event_type.value
        return data

    def to_json(self) -> str:
        """Serialize the entry as a JSON string."""
        return json.dumps(self.to_dict(), sort_keys=True, default=str)


class AuditLogger:
    """
    Structured audit logger for authentication events.

    Emits JSON-formatted log records to a dedicated logger instance,
    allowing handlers to be configured independently from application logs.
    """

    LOGGER_NAME = "auth.audit"

    def __init__(self, logger: Optional[logging.Logger] = None) -> None:
        """
        Initialize the audit logger.

        Args:
            logger: Optional pre-configured logger instance. If not provided,
                a logger named ``auth.audit`` is created with a default
                StreamHandler at INFO level.
        """
        self._logger = logger or self._create_default_logger()

    @staticmethod
    def _create_default_logger() -> logging.Logger:
        """Create a default logger with a JSON-friendly stream handler."""
        logger = logging.getLogger(AuditLogger.LOGGER_NAME)
        logger.setLevel(logging.INFO)
        logger.propagate = False

        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter("%(message)s")
            handler.setFormatter(formatter)
            logger.addHandler(handler)

        return logger

    def log_failed_login(
        self,
        username: str,
        *,
        source_ip: Optional[str] = None,
        user_agent: Optional[str] = None,
        reason: Optional[str] = None,
        additional_context: Optional[dict[str, Any]] = None,
    ) -> None:
        """
        Record a failed login attempt to the audit log.

        Args:
            username: The username submitted during the failed attempt.
                This value is logged as-is and should be treated as
                untrusted input by downstream consumers.
            source_ip: Optional IP address of the client making the attempt.
            user_agent: Optional User-Agent string from the client.
            reason: Optional human-readable reason for the failure
                (e.g., "invalid_credentials", "account_locked").
            additional_context: Optional dictionary of extra structured
                data to include in the log entry.

        Raises:
            ValueError: If ``username`` is empty or not a string.
        """
        if not isinstance(username, str) or not username.strip():
            raise ValueError("username must be a non-empty string")

        entry = AuditLogEntry(
            event_type=AuthEventType.LOGIN_FAILURE,
            username=username,
            source_ip=source_ip,
            user_agent=user_agent,
            reason=reason,
            additional_context=additional_context or {},
        )

        self._logger.info(entry.to_json())

    def log_event(self, entry: AuditLogEntry) -> None:
        """
        Log a pre-constructed audit entry.

        Args:
            entry: The audit log entry to record.
        """
        self._logger.info(entry.to_json())


# Convenience module-level function for direct use
_default_logger: Optional[AuditLogger] = None


def log_failed_login_attempt(
    username: str,
    *,
    source_ip: Optional[str] = None,
    user_agent: Optional[str] = None,
    reason: Optional[str] = None,
    additional_context: Optional[dict[str, Any]] = None,
    logger: Optional[AuditLogger] = None,
) -> None:
    """
    Module-level convenience wrapper for logging a failed login attempt.

    Args:
        username: The username submitted during the failed attempt.
        source_ip: Optional client IP address.
        user_agent: Optional client User-Agent string.
        reason: Optional reason for the failure.
        additional_context: Optional extra structured data.
        logger: Optional AuditLogger instance. If omitted, a shared
            module-level logger is used.
    """
    global _default_logger

    if logger is None:
        if _default_logger is None:
            _default_logger = AuditLogger()
        logger = _default_logger

    logger.log_failed_login(
        username=username,
        source_ip=source_ip,
        user_agent=user_agent,
        reason=reason,
        additional_context=additional_context,
    )