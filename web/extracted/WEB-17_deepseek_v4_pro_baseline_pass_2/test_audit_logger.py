"""
Unit tests for the authentication audit logging module.
"""

import json
import logging
import unittest
from io import StringIO

from audit_logger import AuditLogger, AuditLogEntry, AuthEventType, log_failed_login_attempt


class TestAuditLogger(unittest.TestCase):
    """Test cases for AuditLogger and related functions."""

    def setUp(self) -> None:
        """Set up a logger that captures output to a string buffer."""
        self.log_stream = StringIO()
        self.handler = logging.StreamHandler(self.log_stream)
        self.handler.setFormatter(logging.Formatter("%(message)s"))

        self.logger = logging.getLogger("test.auth.audit")
        self.logger.setLevel(logging.INFO)
        self.logger.propagate = False
        self.logger.handlers = [self.handler]

        self.audit_logger = AuditLogger(logger=self.logger)

    def tearDown(self) -> None:
        """Clean up logger handlers."""
        self.logger.handlers = []
        self.logger.propagate = True

    def test_log_failed_login_basic(self) -> None:
        """Test logging a failed login with minimal fields."""
        self.audit_logger.log_failed_login("alice")

        output = self.log_stream.getvalue().strip()
        self.assertTrue(output)

        entry = json.loads(output)
        self.assertEqual(entry["event_type"], "login_failure")
        self.assertEqual(entry["username"], "alice")
        self.assertIn("timestamp", entry)
        self.assertIsNone(entry["source_ip"])
        self.assertIsNone(entry["user_agent"])
        self.assertIsNone(entry["reason"])
        self.assertEqual(entry["additional_context"], {})

    def test_log_failed_login_full(self) -> None:
        """Test logging a failed login with all optional fields."""
        self.audit_logger.log_failed_login(
            "bob",
            source_ip="192.168.1.100",
            user_agent="Mozilla/5.0",
            reason="invalid_credentials",
            additional_context={"attempt_count": 3, "geo": {"country": "US"}},
        )

        entry = json.loads(self.log_stream.getvalue().strip())
        self.assertEqual(entry["username"], "bob")
        self.assertEqual(entry["source_ip"], "192.168.1.100")
        self.assertEqual(entry["user_agent"], "Mozilla/5.0")
        self.assertEqual(entry["reason"], "invalid_credentials")
        self.assertEqual(entry["additional_context"]["attempt_count"], 3)
        self.assertEqual(entry["additional_context"]["geo"]["country"], "US")

    def test_log_failed_login_empty_username_raises(self) -> None:
        """Test that an empty username raises ValueError."""
        with self.assertRaises(ValueError):
            self.audit_logger.log_failed_login("")

        with self.assertRaises(ValueError):
            self.audit_logger.log_failed_login("   ")

    def test_log_failed_login_non_string_username_raises(self) -> None:
        """Test that a non-string username raises ValueError."""
        with self.assertRaises(ValueError):
            self.audit_logger.log_failed_login(123)  # type: ignore[arg-type]

        with self.assertRaises(ValueError):
            self.audit_logger.log_failed_login(None)  # type: ignore[arg-type]

    def test_module_level_function(self) -> None:
        """Test the module-level convenience function."""
        # Use a fresh logger to avoid shared state issues
        stream = StringIO()
        handler = logging.StreamHandler(stream)
        handler.setFormatter(logging.Formatter("%(message)s"))

        test_logger = logging.getLogger("test.module.level")
        test_logger.setLevel(logging.INFO)
        test_logger.propagate = False
        test_logger.handlers = [handler]

        audit = AuditLogger(logger=test_logger)
        log_failed_login_attempt("carol", reason="account_locked", logger=audit)

        entry = json.loads(stream.getvalue().strip())
        self.assertEqual(entry["username"], "carol")
        self.assertEqual(entry["reason"], "account_locked")

        test_logger.handlers = []
        test_logger.propagate = True

    def test_audit_log_entry_to_dict(self) -> None:
        """Test AuditLogEntry serialization."""
        entry = AuditLogEntry(
            event_type=AuthEventType.LOGIN_FAILURE,
            username="dave",
            reason="expired_password",
        )
        data = entry.to_dict()
        self.assertEqual(data["event_type"], "login_failure")
        self.assertEqual(data["username"], "dave")
        self.assertEqual(data["reason"], "expired_password")

    def test_log_event_method(self) -> None:
        """Test logging a pre-built AuditLogEntry."""
        entry = AuditLogEntry(
            event_type=AuthEventType.LOGIN_LOCKOUT,
            username="erin",
            reason="too_many_attempts",
        )
        self.audit_logger.log_event(entry)

        data = json.loads(self.log_stream.getvalue().strip())
        self.assertEqual(data["event_type"], "login_lockout")
        self.assertEqual(data["username"], "erin")


if __name__ == "__main__":
    unittest.main()