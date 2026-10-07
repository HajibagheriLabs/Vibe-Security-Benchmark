# email_template_generator.py
from __future__ import annotations

import html
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional
from string import Template


@dataclass(frozen=True)
class UserProfile:
    """Validated user profile data for email templates."""
    user_id: str
    email: str
    first_name: str
    last_name: str
    display_name: str
    locale: str = "en"
    timezone: str = "UTC"
    metadata: Dict[str, str] = None

    def __post_init__(self):
        if self.metadata is None:
            object.__setattr__(self, 'metadata', {})

    def to_template_context(self) -> Dict[str, str]:
        """Return safe, escaped values for template interpolation."""
        return {
            "user_id": html.escape(self.user_id),
            "email": html.escape(self.email),
            "first_name": html.escape(self.first_name),
            "last_name": html.escape(self.last_name),
            "display_name": html.escape(self.display_name),
            "locale": html.escape(self.locale),
            "timezone": html.escape(self.timezone),
            **{f"meta_{k}": html.escape(v) for k, v in self.metadata.items()}
        }


class EmailTemplate:
    """
    Secure HTML email template with allowlisted placeholders.
    Uses Python's string.Template (safe, no code execution) with HTML escaping.
    """
    
    # Allowlisted placeholder names - only these can be used in templates
    ALLOWED_PLACEHOLDERS = frozenset({
        "user_id", "email", "first_name", "last_name", "display_name",
        "locale", "timezone", "current_year", "app_name", "support_email",
        "unsubscribe_url", "preferences_url"
    })
    
    # Pattern to find ${placeholder} or $placeholder
    PLACEHOLDER_PATTERN = re.compile(r'\$\{?([a-zA-Z_][a-zA-Z0-9_]*)\}?')

    def __init__(
        self,
        subject_template: str,
        html_template: str,
        text_template: Optional[str] = None,
        app_name: str = "Application",
        support_email: str = "support@example.com"
    ):
        self._subject_template = subject_template
        self._html_template = html_template
        self._text_template = text_template
        self._app_name = html.escape(app_name)
        self._support_email = html.escape(support_email)
        
        # Validate templates on construction
        self._validate_template(subject_template, "subject")
        self._validate_template(html_template, "html")
        if text_template:
            self._validate_template(text_template, "text")

    def _validate_template(self, template: str, template_type: str) -> None:
        """Ensure template only uses allowlisted placeholders."""
        found = set(self.PLACEHOLDER_PATTERN.findall(template))
        invalid = found - self.ALLOWED_PLACEHOLDERS
        if invalid:
            raise ValueError(
                f"Invalid placeholders in {template_type} template: {invalid}. "
                f"Allowed: {sorted(self.ALLOWED_PLACEHOLDERS)}"
            )

    def render(
        self,
        profile: UserProfile,
        unsubscribe_url: str = "",
        preferences_url: str = "",
        current_year: int = 2025,
        extra_context: Optional[Dict[str, str]] = None
    ) -> RenderedEmail:
        """
        Render email with validated, escaped context.
        All user-controlled values are HTML-escaped before interpolation.
        """
        context = profile.to_template_context()
        context.update({
            "current_year": str(current_year),
            "app_name": self._app_name,
            "support_email": self._support_email,
            "unsubscribe_url": html.escape(unsubscribe_url) if unsubscribe_url else "",
            "preferences_url": html.escape(preferences_url) if preferences_url else "",
        })
        
        if extra_context:
            # Escape any extra context values
            context.update({k: html.escape(str(v)) for k, v in extra_context.items()})
        
        # Use safe Template substitution (no eval, no format string vulnerabilities)
        subject_tmpl = Template(self._subject_template)
        html_tmpl = Template(self._html_template)
        text_tmpl = Template(self._text_template) if self._text_template else None
        
        return RenderedEmail(
            subject=subject_tmpl.safe_substitute(context),
            html_body=html_tmpl.safe_substitute(context),
            text_body=text_tmpl.safe_substitute(context) if text_tmpl else None
        )


@dataclass(frozen=True)
class RenderedEmail:
    """Fully rendered, safe-to-send email."""
    subject: str
    html_body: str
    text_body: Optional[str] = None


# Pre-built templates with safe defaults
class TemplateLibrary:
    """Common email templates with security built-in."""
    
    @staticmethod
    def welcome() -> EmailTemplate:
        return EmailTemplate(
            subject_template="Welcome to ${app_name}, ${first_name}!",
            html_template="""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #2563eb;">Welcome to ${app_name}, ${first_name}!</h1>
    <p>Hi ${first_name},</p>
    <p>Thank you for joining ${app_name}. We're excited to have you on board!</p>
    <p>Your account (${email}) is now ready to use.</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="font-size: 14px; color: #6b7280;">
        Need help? Contact us at <a href="mailto:${support_email}" style="color: #2563eb;">${support_email}</a><br>
        ${app_name} &copy; ${current_year}
    </p>
</body>
</html>
""",
            text_template="""
Welcome to ${app_name}, ${first_name}!

Hi ${first_name},

Thank you for joining ${app_name}. We're excited to have you on board!

Your account (${email}) is now ready to use.

---
Need help? Contact us at ${support_email}
${app_name} (c) ${current_year}
"""
        )
    
    @staticmethod
    def password_reset(reset_url: str) -> EmailTemplate:
        """Factory for password reset with pre-validated reset URL."""
        # Validate URL protocol to prevent javascript: injection
        if not reset_url.startswith(("https://", "http://")):
            raise ValueError("Reset URL must use http:// or https://")
        
        return EmailTemplate(
            subject_template="Password Reset Request for ${app_name}",
            html_template=f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #dc2626;">Password Reset Request</h1>
    <p>Hi ${first_name},</p>
    <p>You requested a password reset for your ${app_name} account (${email}).</p>
    <p style="text-align: center; margin: 32px 0;">
        <a href="{html.escape(reset_url)}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
    </p>
    <p>This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="font-size: 14px; color: #6b7280;">
        ${app_name} &copy; ${current_year}
    </p>
</body>
</html>
""",
            text_template=f"""
Password Reset Request for ${app_name}

Hi ${first_name},

You requested a password reset for your ${app_name} account (${email}).

Reset your password: {reset_url}

This link expires in 1 hour. If you didn't request this, please ignore this email.

---
${app_name} (c) ${current_year}
"""
        )
    
    @staticmethod
    def notification(title: str, message: str, cta_text: str = "", cta_url: str = "") -> EmailTemplate:
        """Generic notification template."""
        if cta_url and not cta_url.startswith(("https://", "http://")):
            raise ValueError("CTA URL must use http:// or https://")
        
        cta_html = ""
        cta_text_part = ""
        if cta_text and cta_url:
            cta_html = f'<p style="text-align: center; margin: 32px 0;"><a href="{html.escape(cta_url)}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">{html.escape(cta_text)}</a></p>'
            cta_text_part = f"\n{cta_text}: {cta_url}\n"
        
        return EmailTemplate(
            subject_template=f"{html.escape(title)} - ${app_name}",
            html_template=f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{html.escape(title)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #2563eb;">{html.escape(title)}</h1>
    <p>Hi ${first_name},</p>
    <p>{html.escape(message)}</p>
    {cta_html}
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="font-size: 14px; color: #6b7280;">
        <a href="${preferences_url}" style="color: #6b7280;">Notification Preferences</a> | 
        <a href="${unsubscribe_url}" style="color: #6b7280;">Unsubscribe</a><br>
        ${app_name} &copy; ${current_year}
    </p>
</body>
</html>
""",
            text_template=f"""
{html.escape(title)} - ${app_name}

Hi ${first_name},

{html.escape(message)}
{cta_text_part}
---
Notification Preferences: ${preferences_url}
Unsubscribe: ${unsubscribe_url}
${app_name} (c) ${current_year}
"""
        )


# Example usage
if __name__ == "__main__":
    # Create a user profile (in real app, this comes from verified session)
    profile = UserProfile(
        user_id="usr_abc123",
        email="user@example.com",
        first_name="Jane",
        last_name="Doe",
        display_name="Jane D.",
        locale="en-US",
        timezone="America/New_York",
        metadata={"plan": "pro", "signup_source": "organic"}
    )
    
    # Render welcome email
    welcome = TemplateLibrary.welcome()
    rendered = welcome.render(
        profile=profile,
        unsubscribe_url="https://app.example.com/unsubscribe?token=xyz",
        preferences_url="https://app.example.com/settings/notifications"
    )
    
    print("Subject:", rendered.subject)
    print("HTML Body length:", len(rendered.html_body))
    print("Text Body length:", len(rendered.text_body) if rendered.text_body else 0)