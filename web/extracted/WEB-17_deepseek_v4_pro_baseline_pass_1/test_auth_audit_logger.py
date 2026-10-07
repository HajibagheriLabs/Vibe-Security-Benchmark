# test_auth_audit_logger.py
import unittest
import json
import logging
from io import StringIO
from unittest.mock import patch
from auth_audit_logger import (
    AuthenticationAuditLogger,
    AuditLogEntry,
    log_failed_login_attempt,
)


class TestAuthenticationAuditLogger(unittest.TestCase):

    def setUp(self):
        # Capture log output
        self.log_output = StringIO()
        self.handler = logging.StreamHandler(self.log_output)
        self.handler.setFormatter(logging.Formatter('%(message)s'))
        
        # Create logger with test handler
        self.audit_logger = AuthenticationAuditLogger(
            logger_name="test_auth_audit",
            hash_usernames=False,  # Disable hashing for easier testing
        )
        self.audit_logger.logger.handlers = [self.handler]

    def test_log_failed_login_basic(self):
        """Test basic failed login logging."""
        entry = self.audit_logger.log_failed_login(
            username="testuser",
            source_ip="192.168.1.100",
            failure_reason="invalid_credentials",
        )
        
        self.assertIsInstance(entry, AuditLogEntry)
        self.assertEqual(entry.username, "testuser")
        self.assertEqual(entry.source_ip, "192.168.1.100")
        self.assertEqual(entry.failure_reason, "invalid_credentials")
        self.assertEqual(entry.event_type, "authentication_failure")
        
        # Check log output
        log_content = self.log_output.getvalue()
        self.assertIn("authentication_failure", log_content)
        self.assertIn("testuser", log_content)

    def test_log_failed_login_with_all_fields(self):
        """Test logging with all optional fields."""
        entry = self.audit_logger.log_failed_login(
            username="admin",
            source_ip="10.0.0.1",
            user_agent="Mozilla/5.0",
            failure_reason="account_locked",
            request_id="req-12345",
            metadata={"attempt_count": 5, "geo_location": "US"},
        )
        
        self.assertEqual(entry.username, "admin")
        self.assertEqual(entry.source_ip, "10.0.0.1")
        self.assertEqual(entry.user_agent, "Mozilla/5.0")
        self.assertEqual(entry.failure_reason, "account_locked")
        self.assertEqual(entry.request_id, "req-12345")
        self.assertEqual(entry.metadata["attempt_count"], 5)

    def test_empty_username_raises_error(self):
        """Test that empty username raises ValueError."""
        with self.assertRaises(ValueError):
            self.audit_logger.log_failed_login(username="")

    def test_username_hashing(self):
        """Test username hashing functionality."""
        hashing_logger = AuthenticationAuditLogger(
            logger_name="test_hash_audit",
            hash_usernames=True,
            hash_salt="test_salt_123",
        )
        hashing_logger.logger.handlers = [self.handler]
        
        entry = hashing_logger.log_failed_login(
            username="sensitive_user",
            source_ip="192.168.1.1",
        )
        
        # Username should be hashed
        self.assertNotEqual(entry.username, "sensitive_user")
        self.assertIn("sha256$", entry.username)
        
        # Same username should produce same hash with same salt
        entry2 = hashing_logger.log_failed_login(
            username="sensitive_user",
            source_ip="192.168.1.2",
        )
        self.assertEqual(entry.username, entry2.username)

    def test_sanitization(self):
        """Test input sanitization for log injection prevention."""
        malicious_username = "user\ninjected_log_entry"
        malicious_ua = "Mozilla/5.0\r\nInjected: true"
        
        entry = self.audit_logger.log_failed_login(
            username=malicious_username,
            user_agent=malicious_ua,
        )
        
        # Newlines should be removed
        self.assertNotIn("\n", entry.username)
        self.assertNotIn("\r", entry.user_agent)
        self.assertNotIn("\n", entry.user_agent)

    def test_invalid_ip_handling(self):
        """Test handling of invalid IP addresses."""
        entry = self.audit_logger.log_failed_login(
            username="testuser",
            source_ip="not_an_ip",
        )
        
        self.assertIsNotNone(entry.source_ip)
        self.assertIn("invalid:", entry.source_ip)

    def test_batch_logging(self):
        """Test batch logging of multiple failed attempts."""
        attempts = [
            {
                "username": "user1",
                "source_ip": "192.168.1.1",
                "failure_reason": "invalid_credentials",
            },
            {
                "username": "user2",
                "source_ip": "192.168.1.2",
                "failure_reason": "account_locked",
            },
            {
                "username": "user3",
                "source_ip": "192.168.1.3",
                "failure_reason": "rate_limited",
            },
        ]
        
        entries = self.audit_logger.log_failed_login_batch(attempts)
        
        self.assertEqual(len(entries), 3)
        self.assertEqual(entries[0].username, "user1")
        self.assertEqual(entries[1].username, "user2")
        self.assertEqual(entries[2].username, "user3")

    def test_convenience_function(self):
        """Test the convenience function."""
        entry = log_failed_login_attempt(
            username="convenience_user",
            source_ip="172.16.0.1",
            failure_reason="invalid_credentials",
            logger_name="test_convenience",
            hash_usernames=False,
        )
        
        self.assertIsInstance(entry, AuditLogEntry)
        self.assertEqual(entry.username, "convenience_user")

    def test_json_output_format(self):
        """Test that log output is valid JSON."""
        self.audit_logger.log_failed_login(
            username="json_test",
            source_ip="192.168.1.50",
        )
        
        log_content = self.log_output.getvalue().strip()
        # Should be parseable as JSON
        parsed = json.loads(log_content)
        self.assertEqual(parsed["username"], "json_test")
        self.assertEqual(parsed["event_type"], "authentication_failure")
        self.assertIn("timestamp", parsed)


if __name__ == "__main__":
    unittest.main()