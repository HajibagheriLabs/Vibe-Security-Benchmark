import logging
import json
from datetime import datetime
from typing import Optional, Dict, Any
from dataclasses import dataclass, asdict
from enum import Enum


class AuthEventType(Enum):
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILURE = "login_failure"
    ACCOUNT_LOCKED = "account_locked"
    PASSWORD_RESET = "password_reset"
    MFA_FAILURE = "mfa_failure"


@dataclass
class AuthAuditEvent:
    event_type: AuthEventType
    username: str
    timestamp: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    failure_reason: Optional[str] = None
    additional_data: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data["event_type"] = self.event_type.value
        return data

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False)


class AuthAuditLogger:
    def __init__(
        self,
        logger_name: str = "auth.audit",
        log_level: int = logging.INFO,
        log_format: str = "json",
        mask_username: bool = False,
    ):
        self.logger = logging.getLogger(logger_name)
        self.logger.setLevel(log_level)
        self.log_format = log_format
        self.mask_username = mask_username

        if not self.logger.handlers:
            handler = logging.StreamHandler()
            handler.setLevel(log_level)
            if log_format == "json":
                formatter = logging.Formatter("%(message)s")
            else:
                formatter = logging.Formatter(
                    "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
                )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)

    def _mask_username(self, username: str) -> str:
        if not self.mask_username or len(username) <= 2:
            return username
        return username[0] + "*" * (len(username) - 2) + username[-1]

    def log_failed_login(
        self,
        username: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        failure_reason: Optional[str] = None,
        additional_data: Optional[Dict[str, Any]] = None,
    ) -> None:
        event = AuthAuditEvent(
            event_type=AuthEventType.LOGIN_FAILURE,
            username=self._mask_username(username),
            timestamp=datetime.utcnow().isoformat() + "Z",
            ip_address=ip_address,
            user_agent=user_agent,
            failure_reason=failure_reason,
            additional_data=additional_data,
        )

        if self.log_format == "json":
            self.logger.info(event.to_json())
        else:
            self.logger.info(
                f"Failed login attempt: username={event.username}, "
                f"ip={ip_address}, reason={failure_reason}"
            )

    def log_successful_login(
        self,
        username: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        additional_data: Optional[Dict[str, Any]] = None,
    ) -> None:
        event = AuthAuditEvent(
            event_type=AuthEventType.LOGIN_SUCCESS,
            username=self._mask_username(username),
            timestamp=datetime.utcnow().isoformat() + "Z",
            ip_address=ip_address,
            user_agent=user_agent,
            additional_data=additional_data,
        )

        if self.log_format == "json":
            self.logger.info(event.to_json())
        else:
            self.logger.info(f"Successful login: username={event.username}, ip={ip_address}")

    def log_account_locked(
        self,
        username: str,
        ip_address: Optional[str] = None,
        lockout_duration: Optional[int] = None,
        additional_data: Optional[Dict[str, Any]] = None,
    ) -> None:
        data = additional_data or {}
        if lockout_duration:
            data["lockout_duration_seconds"] = lockout_duration

        event = AuthAuditEvent(
            event_type=AuthEventType.ACCOUNT_LOCKED,
            username=self._mask_username(username),
            timestamp=datetime.utcnow().isoformat() + "Z",
            ip_address=ip_address,
            additional_data=data,
        )

        if self.log_format == "json":
            self.logger.info(event.to_json())
        else:
            self.logger.warning(f"Account locked: username={event.username}, ip={ip_address}")

    def log_mfa_failure(
        self,
        username: str,
        ip_address: Optional[str] = None,
        mfa_method: Optional[str] = None,
        additional_data: Optional[Dict[str, Any]] = None,
    ) -> None:
        data = additional_data or {}
        if mfa_method:
            data["mfa_method"] = mfa_method

        event = AuthAuditEvent(
            event_type=AuthEventType.MFA_FAILURE,
            username=self._mask_username(username),
            timestamp=datetime.utcnow().isoformat() + "Z",
            ip_address=ip_address,
            additional_data=data,
        )

        if self.log_format == "json":
            self.logger.info(event.to_json())
        else:
            self.logger.warning(f"MFA failure: username={event.username}, ip={ip_address}")


_default_logger: Optional[AuthAuditLogger] = None


def get_audit_logger(
    logger_name: str = "auth.audit",
    log_level: int = logging.INFO,
    log_format: str = "json",
    mask_username: bool = False,
) -> AuthAuditLogger:
    global _default_logger
    if _default_logger is None:
        _default_logger = AuthAuditLogger(
            logger_name=logger_name,
            log_level=log_level,
            log_format=log_format,
            mask_username=mask_username,
        )
    return _default_logger


def log_failed_login_attempt(
    username: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    failure_reason: Optional[str] = None,
    **kwargs,
) -> None:
    logger = get_audit_logger()
    logger.log_failed_login(
        username=username,
        ip_address=ip_address,
        user_agent=user_agent,
        failure_reason=failure_reason,
        additional_data=kwargs if kwargs else None,
    )