"""
Email Notification Template Generator

A production-ready module for generating personalized HTML email notifications
by interpolating user profile attributes into configurable templates.
"""

from __future__ import annotations

import html
import re
import string
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Optional
from string import Template


class TemplateFormat(Enum):
    """Supported template formats."""
    HTML = "html"
    TEXT = "text"


class InterpolationError(Exception):
    """Raised when template interpolation fails."""
    pass


class ValidationError(Exception):
    """Raised when template or profile validation fails."""
    pass


@dataclass(frozen=True)
class UserProfile:
    """Immutable user profile with validated attributes."""
    user_id: str
    email: str
    first_name: str
    last_name: str
    display_name: Optional[str] = None
    locale: str = "en_US"
    timezone: str = "UTC"
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

    def __post_init__(self) -> None:
        if not self.user_id:
            raise ValidationError("user_id cannot be empty")
        if not self.email or "@" not in self.email:
            raise ValidationError("Invalid email address")
        if not self.first_name:
            raise ValidationError("first_name cannot be empty")
        if not self.last_name:
            raise ValidationError("last_name cannot be empty")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    @property
    def preferred_name(self) -> str:
        return self.display_name or self.first_name

    def to_dict(self) -> dict[str, Any]:
        """Convert profile to dictionary for template interpolation."""
        return {
            "user_id": self.user_id,
            "email": self.email,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "full_name": self.full_name,
            "preferred_name": self.preferred_name,
            "display_name": self.display_name or "",
            "locale": self.locale,
            "timezone": self.timezone,
            "created_at": self.created_at.isoformat() if self.created_at else "",
            "last_login": self.last_login.isoformat() if self.last_login else "",
            **self.metadata,
        }


@dataclass(frozen=True)
class EmailTemplate:
    """Immutable email template with subject and body."""
    template_id: str
    name: str
    subject: str
    html_body: str
    text_body: Optional[str] = None
    required_fields: frozenset[str] = field(default_factory=frozenset)
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.template_id:
            raise ValidationError("template_id cannot be empty")
        if not self.subject:
            raise ValidationError("subject cannot be empty")
        if not self.html_body:
            raise ValidationError("html_body cannot be empty")


class TemplateEngine(ABC):
    """Abstract base class for template engines."""

    @abstractmethod
    def render(self, template: str, context: dict[str, Any]) -> str:
        """Render template with context."""
        pass

    @abstractmethod
    def validate(self, template: str, required_fields: set[str]) -> list[str]:
        """Validate template and return missing required fields."""
        pass


class StringTemplateEngine(TemplateEngine):
    """Template engine using Python's string.Template (safe, no code execution)."""

    def __init__(self, delimiter: str = "${", pattern: Optional[str] = None):
        self.delimiter = delimiter
        self._pattern = pattern

    def render(self, template: str, context: dict[str, Any]) -> str:
        t = Template(template)
        t.delimiter = self.delimiter
        if self._pattern:
            t.pattern = re.compile(self._pattern)
        try:
            return t.safe_substitute(context)
        except Exception as e:
            raise InterpolationError(f"Template rendering failed: {e}") from e

    def validate(self, template: str, required_fields: set[str]) -> list[str]:
        t = Template(template)
        t.delimiter = self.delimiter
        if self._pattern:
            t.pattern = re.compile(self._pattern)
        found = set()
        for match in t.pattern.finditer(template):
            named = match.group("named") or match.group("braced")
            if named:
                found.add(named)
        return list(required_fields - found)


class JinjaLikeEngine(TemplateEngine):
    """Template engine with Jinja2-like syntax (if available, fallback to string.Template)."""

    def __init__(self):
        self._jinja_env = None
        try:
            from jinja2 import Environment, select_autoescape
            self._jinja_env = Environment(autoescape=select_autoescape(['html', 'xml']))
        except ImportError:
            self._fallback = StringTemplateEngine(delimiter="{{", pattern=r"\{\{(\w+)\}\}")

    def render(self, template: str, context: dict[str, Any]) -> str:
        if self._jinja_env:
            try:
                return self._jinja_env.from_string(template).render(**context)
            except Exception as e:
                raise InterpolationError(f"Jinja2 rendering failed: {e}") from e
        return self._fallback.render(template, context)

    def validate(self, template: str, required_fields: set[str]) -> list[str]:
        if self._jinja_env:
            try:
                ast = self._jinja_env.parse(template)
                found = set()
                for node in ast.find_all(self._jinja_env.nodes.Name):
                    found.add(node.name)
                return list(required_fields - found)
            except Exception:
                pass
        return self._fallback.validate(template, required_fields)


class HTMLEscaper:
    """Utility for HTML escaping with configurable strategies."""

    @staticmethod
    def escape(value: Any, escape_html: bool = True) -> str:
        """Escape value for safe HTML insertion."""
        if value is None:
            return ""
        str_value = str(value)
        if escape_html:
            return html.escape(str_value, quote=True)
        return str_value

    @staticmethod
    def escape_dict(data: dict[str, Any], escape_html: bool = True) -> dict[str, str]:
        """Escape all string values in a dictionary."""
        return {
            k: HTMLEscaper.escape(v, escape_html) if isinstance(v, str) else v
            for k, v in data.items()
        }


@dataclass
class RenderResult:
    """Result of template rendering."""
    template_id: str
    subject: str
    html_body: str
    text_body: Optional[str]
    missing_fields: list[str]
    warnings: list[str]
    success: bool

    @property
    def is_valid(self) -> bool:
        return self.success and not self.missing_fields


class EmailNotificationGenerator:
    """
    Main class for generating personalized email notifications.

    Features:
    - Multiple template engine support (string.Template, Jinja2)
    - HTML escaping for security
    - Template validation
    - Profile attribute interpolation
    - Custom filter/functions support
    """

    def __init__(
        self,
        engine: Optional[TemplateEngine] = None,
        escape_html: bool = True,
        strict_mode: bool = False,
        custom_filters: Optional[dict[str, Callable[[Any], Any]]] = None,
    ):
        self.engine = engine or StringTemplateEngine()
        self.escape_html = escape_html
        self.strict_mode = strict_mode
        self.custom_filters = custom_filters or {}
        self._templates: dict[str, EmailTemplate] = {}

    def register_template(self, template: EmailTemplate) -> None:
        """Register a template for later use."""
        self._templates[template.template_id] = template

    def register_template_from_file(
        self,
        template_id: str,
        name: str,
        subject_path: Path,
        html_path: Path,
        text_path: Optional[Path] = None,
        required_fields: Optional[set[str]] = None,
    ) -> None:
        """Register template from files."""
        subject = subject_path.read_text(encoding="utf-8").strip()
        html_body = html_path.read_text(encoding="utf-8")
        text_body = text_path.read_text(encoding="utf-8") if text_path else None
        template = EmailTemplate(
            template_id=template_id,
            name=name,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            required_fields=frozenset(required_fields or set()),
        )
        self.register_template(template)

    def unregister_template(self, template_id: str) -> bool:
        """Unregister a template."""
        return self._templates.pop(template_id, None) is not None

    def get_template(self, template_id: str) -> Optional[EmailTemplate]:
        """Get registered template by ID."""
        return self._templates.get(template_id)

    def list_templates(self) -> list[EmailTemplate]:
        """List all registered templates."""
        return list(self._templates.values())

    def _prepare_context(self, profile: UserProfile, extra: Optional[dict[str, Any]] = None) -> dict[str, Any]:
        """Prepare rendering context from profile and extra data."""
        context = profile.to_dict()
        if extra:
            context.update(extra)
        if self.escape_html:
            context = HTMLEscaper.escape_dict(context, escape_html=True)
        context.update(self.custom_filters)
        return context

    def render(
        self,
        template_id: str,
        profile: UserProfile,
        extra_context: Optional[dict[str, Any]] = None,
    ) -> RenderResult:
        """
        Render email for a user profile.

        Args:
            template_id: Registered template ID
            profile: User profile for interpolation
            extra_context: Additional context variables

        Returns:
            RenderResult with rendered content and validation info
        """
        template = self._templates.get(template_id)
        if not template:
            return RenderResult(
                template_id=template_id,
                subject="",
                html_body="",
                text_body=None,
                missing_fields=[],
                warnings=[f"Template '{template_id}' not found"],
                success=False,
            )

        context = self._prepare_context(profile, extra_context)
        missing_fields = self.engine.validate(template.html_body, set(template.required_fields))
        missing_fields += self.engine.validate(template.subject, set(template.required_fields))
        if template.text_body:
            missing_fields += self.engine.validate(template.text_body, set(template.required_fields))

        warnings = []
        if missing_fields:
            msg = f"Missing required fields: {', '.join(missing_fields)}"
            warnings.append(msg)
            if self.strict_mode:
                return RenderResult(
                    template_id=template_id,
                    subject="",
                    html_body="",
                    text_body=None,
                    missing_fields=missing_fields,
                    warnings=warnings,
                    success=False,
                )

        try:
            subject = self.engine.render(template.subject, context)
            html_body = self.engine.render(template.html_body, context)
            text_body = self.engine.render(template.text_body, context) if template.text_body else None
        except InterpolationError as e:
            return RenderResult(
                template_id=template_id,
                subject="",
                html_body="",
                text_body=None,
                missing_fields=missing_fields,
                warnings=[str(e)],
                success=False,
            )

        return RenderResult(
            template_id=template_id,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            missing_fields=missing_fields,
            warnings=warnings,
            success=True,
        )

    def render_batch(
        self,
        template_id: str,
        profiles: list[UserProfile],
        extra_context: Optional[dict[str, Any]] = None,
    ) -> list[RenderResult]:
        """Render email for multiple profiles."""
        return [self.render(template_id, profile, extra_context) for profile in profiles]


def create_default_templates(generator: EmailNotificationGenerator) -> None:
    """Create and register common default templates."""

    welcome_html = """<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Welcome</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Welcome to ${app_name}!</h1>
    </div>
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;">
        <p>Hi ${preferred_name},</p>
        <p>Thank you for joining ${app_name}! We're excited to have you on board.</p>
        <p>Your account <strong>${email}</strong> has been created successfully.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${verification_url}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Verify Your Email
            </a>
        </div>
        <p>If you didn't create this account, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="font-size: 12px; color: #888;">
            ${app_name} Team<br>
            ${current_year}
        </p>
    </div>
</body>
</html>"""

    welcome_text = """Welcome to ${app_name}!

Hi ${preferred_name},

Thank you for joining ${app_name}! We're excited to have you on board.

Your account ${email} has been created successfully.

Verify your email: ${verification_url}

If you didn't create this account, please ignore this email.

---
${app_name} Team
${current_year}"""

    password_reset_html = """<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Password Reset</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #dc3545; padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Password Reset Request</h1>
    </div>
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;">
        <p>Hi ${preferred_name},</p>
        <p>We received a request to reset your password for ${app_name}.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${reset_url}" style="background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Password
            </a>
        </div>
        <p>This link expires in ${expiry_hours} hours.</p>
        <p>If you didn't request this, please ignore this email or contact support.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="font-size: 12px; color: #888;">
            ${app_name} Security Team<br>
            ${current_year}
        </p>
    </div>
</body>
</html>"""

    notification_html = """<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${notification_title}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: ${header_color}; padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">${notification_title}</h1>
    </div>
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;">
        <p>Hi ${preferred_name},</p>
        <div style="white-space: pre-wrap;">${notification_message}</div>
        ${action_button}
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="font-size: 12px; color: #888;">
            ${app_name} Team<br>
            ${current_year}
        </p>
    </div>
</body>
</html>"""

    generator.register_template(EmailTemplate(
        template_id="welcome",
        name="Welcome Email",
        subject="Welcome to ${app_name}, ${preferred_name}!",
        html_body=welcome_html,
        text_body=welcome_text,
        required_fields=frozenset({"preferred_name", "email", "app_name", "verification_url"}),
    ))

    generator.register_template(EmailTemplate(
        template_id="password_reset",
        name="Password Reset",
        subject="Reset your ${app_name} password",
        html_body=password_reset_html,
        required_fields=frozenset({"preferred_name", "app_name", "reset_url", "expiry_hours"}),
    ))

    generator.register_template(EmailTemplate(
        template_id="notification",
        name="Generic Notification",
        subject="${notification_title}",
        html_body=notification_html,
        required_fields=frozenset({"preferred_name", "notification_title", "notification_message", "app_name"}),
    ))


# Example usage and demonstration
if __name__ == "__main__":
    from datetime import timezone

    generator = EmailNotificationGenerator(
        escape_html=True,
        strict_mode=False,
        custom_filters={
            "current_year": datetime.now(timezone.utc).year,
            "app_name": "MyApp",
        }
    )

    create_default_templates(generator)

    profile = UserProfile(
        user_id="usr_12345",
        email="john.doe@example.com",
        first_name="John",
        last_name="Doe",
        display_name="Johnny",
        locale="en_US",
        timezone="America/New_York",
        metadata={"plan": "pro", "referral_code": "JOHN2024"},
        created_at=datetime(2024, 1, 15, 10, 30, tzinfo=timezone.utc),
        last_login=datetime(2024, 12, 1, 8, 15, tzinfo=timezone.utc),
    )

    extra_context = {
        "verification_url": "https://myapp.com/verify?token=abc123",
        "header_color": "#28a745",
        "notification_title": "New Feature Released!",
        "notification_message": "Check out our new dashboard with real-time analytics.",
        "action_button": '<div style="text-align: center; margin: 20px 0;"><a href="https://myapp.com/features" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">View Features</a></div>',
        "expiry_hours": 24,
        "reset_url": "https://myapp.com/reset?token=xyz789",
    }

    print("=" * 60)
    print("RENDERING WELCOME EMAIL")
    print("=" * 60)
    result = generator.render("welcome", profile, extra_context)
    print(f"Success: {result.success}")
    print(f"Subject: {result.subject}")
    print(f"Missing fields: {result.missing_fields}")
    print(f"Warnings: {result.warnings}")
    print(f"\nHTML Body (first 500 chars):\n{result.html_body[:500]}...")

    print("\n" + "=" * 60)
    print("RENDERING PASSWORD RESET EMAIL")
    print("=" * 60)
    result = generator.render("password_reset", profile, extra_context)
    print(f"Success: {result.success}")
    print(f"Subject: {result.subject}")
    print(f"Missing fields: {result.missing_fields}")

    print("\n" + "=" * 60)
    print("RENDERING NOTIFICATION EMAIL")
    print("=" * 60)
    result = generator.render("notification", profile, extra_context)
    print(f"Success: {result.success}")
    print(f"Subject: {result.subject}")
    print(f"Missing fields: {result.missing_fields}")

    print("\n" + "=" * 60)
    print("BATCH RENDERING")
    print("=" * 60)
    profiles = [
        UserProfile(user_id="usr_1", email="a@test.com", first_name="Alice", last_name="Smith"),
        UserProfile(user_id="usr_2", email="b@test.com", first_name="Bob", last_name="Jones"),
        UserProfile(user_id="usr_3", email="c@test.com", first_name="Carol", last_name="White"),
    ]
    results = generator.render_batch("welcome", profiles, extra_context)
    for i, r in enumerate(results):
        print(f"  User {i+1}: {r.subject} - Success: {r.success}")