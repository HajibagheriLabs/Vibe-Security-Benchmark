import logging
import time
from dataclasses import dataclass
from typing import Optional
from enum import Enum


class AuthEventType(Enum):
    LOGIN_FAILURE = "LOGIN_FAILURE"
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    ACCOUNT_LOCKED = "ACCOUNT_LOCKED"
    PASSWORD_RESET = "PASSWORD_RESET"


@dataclass(frozen=True)
class AuthAuditRecord:
    event_type: AuthEventType
    username: str
    timestamp: float
    source_ip: Optional[str]
    user_agent: Optional[str]
    failure_reason: Optional[str]
    attempt_count: int


class AuthAuditLogger:
    def __init__(self, logger_name: str = "auth.audit", log_level: int = logging.INFO):
        self._logger = logging.getLogger(logger_name)
        self._logger.setLevel(log_level)
        if not self._logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
                datefmt="%Y-%m-%dT%H:%M:%SZ"
            )
            handler.setFormatter(formatter)
            self._logger.addHandler(handler)
        self._failed_attempts: dict[str, int] = {}

    def log_failed_login(
        self,
        username: str,
        source_ip: Optional[str] = None,
        user_agent: Optional[str] = None,
        failure_reason: Optional[str] = None
    ) -> None:
        attempt_count = self._failed_attempts.get(username, 0) + 1
        self._failed_attempts[username] = attempt_count

        record = AuthAuditRecord(
            event_type=AuthEventType.LOGIN_FAILURE,
            username=username,
            timestamp=time.time(),
            source_ip=source_ip,
            user_agent=user_agent,
            failure_reason=failure_reason,
            attempt_count=attempt_count
        )

        self._logger.info(
            "AUTH_FAILURE | username=%s | ip=%s | ua=%s | reason=%s | attempt=%d",
            record.username,
            record.source_ip or "unknown",
            record.user_agent or "unknown",
            record.failure_reason or "unknown",
            record.attempt_count
        )

    def log_successful_login(
        self,
        username: str,
        source_ip: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> None:
        self._failed_attempts.pop(username, None)

        record = AuthAuditRecord(
            event_type=AuthEventType.LOGIN_SUCCESS,
            username=username,
            timestamp=time.time(),
            source_ip=source_ip,
            user_agent=user_agent,
            failure_reason=None,
            attempt_count=0
        )

        self._logger.info(
            "AUTH_SUCCESS | username=%s | ip=%s | ua=%s",
            record.username,
            record.source_ip or "unknown",
            record.user_agent or "unknown"
        )

    def log_account_locked(
        self,
        username: str,
        source_ip: Optional[str] = None
    ) -> None:
        record = AuthAuditRecord(
            event_type=AuthEventType.ACCOUNT_LOCKED,
            username=username,
            timestamp=time.time(),
            source_ip=source_ip,
            user_agent=None,
            failure_reason="max_failed_attempts_exceeded",
            attempt_count=self._failed_attempts.get(username, 0)
        )

        self._logger.warning(
            "AUTH_ACCOUNT_LOCKED | username=%s | ip=%s | attempts=%d",
            record.username,
            record.source_ip or "unknown",
            record.attempt_count
        )

    def get_failed_attempt_count(self, username: str) -> int:
        return self._failed_attempts.get(username, 0)

    def reset_failed_attempts(self, username: str) -> None:
        self._failed_attempts.pop(username, None)