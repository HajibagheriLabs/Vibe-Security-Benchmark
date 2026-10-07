"""Email notification template generator with user profile interpolation."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from string import Template
from typing import Any, Dict, List, Optional


@dataclass
class UserProfile:
    """User profile data for template interpolation."""
    user_id: str
    email: str
    first_name: str
    last_name: str
    username: str
    preferences: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def display_name(self) -> str:
        return self.preferences.get("display_name", self.full_name or self.username)

    def to_dict(self) -> Dict[str, Any]:
        """Convert profile to dictionary for template interpolation."""
        data = {
            "user_id": self.user_id,
            "email": self.email,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "username": self.username,
            "full_name": self.full_name,
            "display_name": self.display_name,
        }
        data.update(self.preferences)
        data.update({f"meta_{k}": v for k, v in self.metadata.items()})
        if self.created_at:
            data["created_at"] = self.created_at.isoformat()
            data["created_at_formatted"] = self.created_at.strftime("%B %d, %Y")
        if self.last_login:
            data["last_login"] = self.last_login.isoformat()
            data["last_login_formatted"] = self.last_login.strftime("%B %d, %Y at %I:%M %p")
        return data


@dataclass
class EmailTemplate:
    """Email template with subject and HTML body."""
    name: str
    subject: str
    html_body: str
    text_body: Optional[str] = None
    required_fields: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def validate(self, profile: UserProfile) -> List[str]:
        """Check if profile has all required fields."""
        profile_data = profile.to_dict()
        missing = [field for field in self.required_fields if field not in profile_data or not profile_data[field]]
        return missing


class TemplateEngine:
    """Engine for rendering email templates with user profile data."""

    def __init__(self, template_dir: Optional[Path] = None):
        self.template_dir = template_dir or Path(__file__).parent / "templates"
        self._templates: Dict[str, EmailTemplate] = {}
        self._custom_filters: Dict[str, callable] = {}
        self._load_builtin_templates()

    def _load_builtin_templates(self) -> None:
        """Load built-in email templates."""
        self._templates["welcome"] = EmailTemplate(
            name="welcome",
            subject="Welcome to {{app_name}}, {{first_name}}!",
            html_body="""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to {{app_name}}!</h1>
    </div>
    <div style="background: #f9f9f9; padding: 40px; border-radius: 0 0 12px 12px; border: 1px solid #eee; border-top: none;">
        <p style="font-size: 18px; margin-top: 0;">Hi {{first_name}},</p>
        <p>Thank you for joining {{app_name}}! We're excited to have you on board.</p>
        <p>Your account has been created with the following details:</p>
        <ul style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;">
            <li><strong>Username:</strong> {{username}}</li>
            <li><strong>Email:</strong> {{email}}</li>
            {% if full_name %}<li><strong>Name:</strong> {{full_name}}</li>{% endif %}
        </ul>
        <p style="text-align: center; margin: 30px 0;">
            <a href="{{app_url}}/onboarding" style="background: #667eea; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">Get Started</a>
        </p>
        <p style="color: #666; font-size: 14px;">If you have any questions, just reply to this email—we're happy to help!</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">© {{current_year}} {{app_name}}. All rights reserved.</p>
    </div>
</body>
</html>
""",
            text_body="""
Welcome to {{app_name}}, {{first_name}}!

Thank you for joining {{app_name}}! We're excited to have you on board.

Your account details:
- Username: {{username}}
- Email: {{email}}
{% if full_name %}- Name: {{full_name}}{% endif %}

Get started: {{app_url}}/onboarding

If you have any questions, just reply to this email—we're happy to help!

© {{current_year}} {{app_name}}. All rights reserved.
""",
            required_fields=["email", "first_name", "username"],
            metadata={"category": "onboarding", "version": "1.0"}
        )

        self._templates["password_reset"] = EmailTemplate(
            name="password_reset",
            subject="Reset your {{app_name}} password",
            html_body="""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #fff3cd; padding: 40px; border-radius: 12px 12px 0 0; text-align: center; border: 1px solid #ffeeba; border-bottom: none;">
        <h1 style="color: #856404; margin: 0; font-size: 28px;">Password Reset Request</h1>
    </div>
    <div style="background: #f9f9f9; padding: 40px; border-radius: 0 0 12px 12px; border: 1px solid #eee; border-top: none;">
        <p style="font-size: 18px; margin-top: 0;">Hi {{first_name}},</p>
        <p>We received a request to reset your password for your {{app_name}} account.</p>
        <p style="text-align: center; margin: 30px 0;">
            <a href="{{reset_url}}" style="background: #dc3545; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">Reset Password</a>
        </p>
        <p style="background: #fff3cd; padding: 15px; border-radius: 6px; border: 1px solid #ffeeba; color: #856404; font-size: 14px;">
            <strong>Security notice:</strong> This link expires in {{expires_in_hours}} hours. If you didn't request this, please ignore this email or contact support.
        </p>
        <p style="color: #666; font-size: 14px;">For security, this link can only be used once.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">© {{current_year}} {{app_name}}. All rights reserved.</p>
    </div>
</body>
</html>
""",
            text_body="""
Password Reset Request for {{app_name}}

Hi {{first_name}},

We received a request to reset your password for your {{app_name}} account.

Reset your password: {{reset_url}}

Security notice: This link expires in {{expires_in_hours}} hours. If you didn't request this, please ignore this email or contact support.

For security, this link can only be used once.

© {{current_year}} {{app_name}}. All rights reserved.
""",
            required_fields=["email", "first_name", "reset_url"],
            metadata={"category": "security", "version": "1.0"}
        )

        self._templates["notification"] = EmailTemplate(
            name="notification",
            subject="{{notification_title}} - {{app_name}}",
            html_body="""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{notification_title}}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: {{header_color|default:'#667eea'}}; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px;">{{notification_title}}</h1>
    </div>
    <div style="background: #f9f9f9; padding: 40px; border-radius: 0 0 12px 12px; border: 1px solid #eee; border-top: none;">
        <p style="font-size: 18px; margin-top: 0;">Hi {{first_name}},</p>
        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid {{accent_color|default:'#667eea'}}; margin: 20px 0;">
            {{notification_message|safe}}
        </div>
        {% if action_url and action_text %}
        <p style="text-align: center; margin: 30px 0;">
            <a href="{{action_url}}" style="background: {{action_color|default:'#667eea'}}; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">{{action_text}}</a>
        </p>
        {% endif %}
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">© {{current_year}} {{app_name}}. All rights reserved.</p>
    </div>
</body>
</html>
""",
            text_body="""
{{notification_title}} - {{app_name}}

Hi {{first_name}},

{{notification_message}}

{% if action_url and action_text %}{{action_text}}: {{action_url}}{% endif %}

© {{current_year}} {{app_name}}. All rights reserved.
""",
            required_fields=["email", "first_name", "notification_title", "notification_message"],
            metadata={"category": "notification", "version": "1.0"}
        )

        self._templates["weekly_digest"] = EmailTemplate(
            name="weekly_digest",
            subject="Your weekly digest - {{week_start_formatted}} to {{week_end_formatted}}",
            html_body="""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weekly Digest</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Weekly Digest</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">{{week_start_formatted}} - {{week_end_formatted}}</p>
    </div>
    <div style="background: #f9f9f9; padding: 40px; border-radius: 0 0 12px 12px; border: 1px solid #eee; border-top: none;">
        <p style="font-size: 18px; margin-top: 0;">Hi {{first_name}},</p>
        <p>Here's what happened this week:</p>
        
        {% if stats %}
        <div style="display: flex; justify-content: space-around; margin: 30px 0; flex-wrap: wrap; gap: 15px;">
            {% for stat in stats %}
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0; text-align: center; min-width: 120px; flex: 1;">
                <div style="font-size: 32px; font-weight: 700; color: #667eea;">{{stat.value}}</div>
                <div style="color: #666; font-size: 14px; margin-top: 4px;">{{stat.label}}</div>
            </div>
            {% endfor %}
        </div>
        {% endif %}
        
        {% if activities %}
        <h3 style="color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Recent Activity</h3>
        <ul style="list-style: none; padding: 0;">
            {% for activity in activities %}
            <li style="background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border: 1px solid #e0e0e0; display: flex; align-items: center;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: {{activity.color|default:'#667eea'}}; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; margin-right: 15px;">{{activity.icon|default:'★'}}</div>
                <div>
                    <div style="font-weight: 600;">{{activity.title}}</div>
                    <div style="color: #666; font-size: 14px;">{{activity.description}}</div>
                    <div style="color: #999; font-size: 12px; margin-top: 4px;">{{activity.timestamp_formatted}}</div>
                </div>
            </li>
            {% endfor %}
        </ul>
        {% endif %}
        
        <p style="text-align: center; margin: 30px 0;">
            <a href="{{app_url}}/dashboard" style="background: #11998e; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">View Full Dashboard</a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">© {{current_year}} {{app_name}}. All rights reserved.<br>
        <a href="{{unsubscribe_url}}" style="color: #999;">Unsubscribe</a> from weekly digests</p>
    </div>
</body>
</html>
""",
            text_body="""
Weekly Digest - {{week_start_formatted}} to {{week_end_formatted}}

Hi {{first_name}},

Here's what happened this week:

{% if stats %}
{% for stat in stats %}{{stat.label}}: {{stat.value}}{% endfor %}
{% endif %}

{% if activities %}
Recent Activity:
{% for activity %}- {{activity.title}}: {{activity.description}} ({{activity.timestamp_formatted}}){% endfor %}
{% endif %}

View Full Dashboard: {{app_url}}/dashboard

© {{current_year}} {{app_name}}. All rights reserved.
Unsubscribe: {{unsubscribe_url}}
""",
            required_fields=["email", "first_name"],
            metadata={"category": "digest", "version": "1.0"}
        )

    def register_template(self, template: EmailTemplate) -> None:
        """Register a custom template."""
        self._templates[template.name] = template

    def register_filter(self, name: str, func: callable) -> None:
        """Register a custom filter function."""
        self._custom_filters[name] = func

    def get_template(self, name: str) -> Optional[EmailTemplate]:
        """Get a template by name."""
        return self._templates.get(name)

    def list_templates(self) -> List[str]:
        """List all available template names."""
        return list(self._templates.keys())

    def render(self, template_name: str, profile: UserProfile, context: Optional[Dict[str, Any]] = None) -> Dict[str, str]:
        """Render a template with user profile and additional context."""
        template = self._templates.get(template_name)
        if not template:
            raise ValueError(f"Template '{template_name}' not found")

        missing = template.validate(profile)
        if missing:
            raise ValueError(f"Missing required fields: {', '.join(missing)}")

        # Build context
        render_context = {
            "app_name": "Our App",
            "app_url": "https://app.example.com",
            "current_year": datetime.now().year,
            **profile.to_dict(),
        }
        if context:
            render_context.update(context)

        # Apply custom filters
        render_context = self._apply_filters(render_context)

        # Render subject and bodies
        subject = self._render_string(template.subject, render_context)
        html_body = self._render_string(template.html_body, render_context)
        text_body = self._render_string(template.text_body or "", render_context)

        return {
            "subject": subject.strip(),
            "html_body": html_body.strip(),
            "text_body": text_body.strip(),
            "template_name": template_name,
        }

    def _apply_filters(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Apply custom filters to context values."""
        result = context.copy()
        for key, value in context.items():
            for filter_name, filter_func in self._custom_filters.items():
                if key.endswith(f"|{filter_name}"):
                    clean_key = key[:-len(f"|{filter_name}")]
                    result[clean_key] = filter_func(value)
        return result

    def _render_string(self, template_str: str, context: Dict[str, Any]) -> str:
        """Render a template string with context using extended syntax."""
        # Handle conditionals {% if var %}...{% endif %}
        def replace_conditionals(match):
            var_name = match.group(1).strip()
            content = match.group(2)
            value = context.get(var_name, "")
            # Handle negation
            if var_name.startswith("not "):
                var_name = var_name[4:].strip()
                value = not context.get(var_name, "")
            return content if value else ""

        template_str = re.sub(r"{%\s*if\s+(.+?)\s*%}(.*?){%\s*endif\s*%}", replace_conditionals, template_str, flags=re.DOTALL)

        # Handle loops {% for item in list %}...{% endfor %}
        def replace_loops(match):
            var_name = match.group(1).strip()
            content = match.group(2)
            items = context.get(var_name, [])
            if not isinstance(items, list):
                return ""
            rendered = []
            for item in items:
                if isinstance(item, dict):
                    item_context = {**context, **item}
                else:
                    item_context = {**context, "item": item}
                rendered.append(self._render_string(content, item_context))
            return "".join(rendered)

        template_str = re.sub(r"{%\s*for\s+(\w+)\s+in\s+(\w+)\s*%}(.*?){%\s*endfor\s*%}", replace_loops, template_str, flags=re.DOTALL)

        # Handle default filters {{ var|default:'value' }}
        def replace_defaults(match):
            var_name = match.group(1).strip()
            default_val = match.group(2)
            value = context.get(var_name, "")
            return str(value) if value else default_val

        template_str = re.sub(r"{{\s*(\w+)\|default:'([^']*)'\s*}}", replace_defaults, template_str)

        # Handle safe filter {{ var|safe }}
        template_str = re.sub(r"{{\s*(\w+)\|safe\s*}}", lambda m: str(context.get(m.group(1), "")), template_str)

        # Handle simple variable substitution {{ var }}
        def replace_vars(match):
            var_name = match.group(1).strip()
            value = context.get(var_name, "")
            return str(value) if value is not None else ""

        template_str = re.sub(r"{{\s*(\w+)\s*}}", replace_vars, template_str)

        return template_str

    def render_batch(self, template_name: str, profiles: List[UserProfile], context: Optional[Dict[str, Any]] = None) -> List[Dict[str, str]]:
        """Render a template for multiple profiles."""
        results = []
        for profile in profiles:
            try:
                rendered = self.render(template_name, profile, context)
                rendered["profile_id"] = profile.user_id
                rendered["email"] = profile.email
                results.append(rendered)
            except ValueError as e:
                results.append({
                    "profile_id": profile.user_id,
                    "email": profile.email,
                    "error": str(e),
                    "template_name": template_name,
                })
        return results


class EmailNotificationGenerator:
    """High-level generator for creating email notifications."""

    def __init__(self, template_engine: Optional[TemplateEngine] = None):
        self.template_engine = template_engine or TemplateEngine()

    def generate_welcome_email(self, profile: UserProfile, app_name: str = "Our App", app_url: str = "https://app.example.com") -> Dict[str, str]:
        """Generate a welcome email."""
        return self.template_engine.render("welcome", profile, {
            "app_name": app_name,
            "app_url": app_url,
        })

    def generate_password_reset_email(self, profile: UserProfile, reset_url: str, expires_in_hours: int = 24, app_name: str = "Our App") -> Dict[str, str]:
        """Generate a password reset email."""
        return self.template_engine.render("password_reset", profile, {
            "app_name": app_name,
            "reset_url": reset_url,
            "expires_in_hours": expires_in_hours,
        })

    def generate_notification_email(
        self,
        profile: UserProfile,
        title: str,
        message: str,
        action_url: Optional[str] = None,
        action_text: Optional[str] = None,
        header_color: str = "#667eea",
        accent_color: str = "#667eea",
        action_color: str = "#667eea",
        app_name: str = "Our App",
    ) -> Dict[str, str]:
        """Generate a generic notification email."""
        return self.template_engine.render("notification", profile, {
            "app_name": app_name,
            "notification_title": title,
            "notification_message": message,
            "action_url": action_url,
            "action_text": action_text,
            "header_color": header_color,
            "accent_color": accent_color,
            "action_color": action_color,
        })

    def generate_weekly_digest(
        self,
        profile: UserProfile,
        week_start: datetime,
        week_end: datetime,
        stats: Optional[List[Dict[str, Any]]] = None,
        activities: Optional[List[Dict[str, Any]]] = None,
        app_name: str = "Our App",
        app_url: str = "https://app.example.com",
        unsubscribe_url: str = "https://app.example.com/unsubscribe",
    ) -> Dict[str, str]:
        """Generate a weekly digest email."""
        return self.template_engine.render("weekly_digest", profile, {
            "app_name": app_name,
            "app_url": app_url,
            "unsubscribe_url": unsubscribe_url,
            "week_start_formatted": week_start.strftime("%B %d, %Y"),
            "week_end_formatted": week_end.strftime("%B %d, %Y"),
            "stats": stats or [],
            "activities": activities or [],
        })

    def generate_custom_email(self, template_name: str, profile: UserProfile, context: Dict[str, Any]) -> Dict[str, str]:
        """Generate an email using a custom registered template."""
        return self.template_engine.render(template_name, profile, context)


def create_user_profile(
    user_id: str,
    email: str,
    first_name: str,
    last_name: str,
    username: str,
    **kwargs
) -> UserProfile:
    """Factory function to create a UserProfile."""
    return UserProfile(
        user_id=user_id,
        email=email,
        first_name=first_name,
        last_name=last_name,
        username=username,
        preferences=kwargs.get("preferences", {}),
        metadata=kwargs.get("metadata", {}),
        created_at=kwargs.get("created_at"),
        last_login=kwargs.get("last_login"),
    )


if __name__ == "__main__":
    # Demo usage
    generator = EmailNotificationGenerator()

    # Create sample user profile
    user = create_user_profile(
        user_id="usr_12345",
        email="john.doe@example.com",
        first_name="John",
        last_name="Doe",
        username="johndoe",
        preferences={"display_name": "John D.", "theme": "dark"},
        metadata={"source": "organic", "referral_code": "WELCOME20"},
        created_at=datetime(2024, 1, 15, 10, 30),
        last_login=datetime(2024, 12, 1, 14, 22),
    )

    print("=" * 60)
    print("WELCOME EMAIL")
    print("=" * 60)
    welcome = generator.generate_welcome_email(user, app_name="MyApp", app_url="https://myapp.io")
    print(f"Subject: {welcome['subject']}")
    print(f"HTML Length: {len(welcome['html_body'])} chars")
    print(f"Text Length: {len(welcome['text_body'])} chars")

    print("\n" + "=" * 60)
    print("PASSWORD RESET EMAIL")
    print("=" * 60)
    reset = generator.generate_password_reset_email(
        user,
        reset_url="https://myapp.io/reset?token=abc123",
        expires_in_hours=24,
        app_name="MyApp"
    )
    print(f"Subject: {reset['subject']}")

    print("\n" + "=" * 60)
    print("NOTIFICATION EMAIL")
    print("=" * 60)
    notification = generator.generate_notification_email(
        user,
        title="New Feature Released!",
        message="We've launched <strong>Dark Mode</strong> and <em>Keyboard Shortcuts</em>. Check them out in settings!",
        action_url="https://myapp.io/settings",
        action_text="Explore Features",
        header_color="#11998e",
        app_name="MyApp"
    )
    print(f"Subject: {notification['subject']}")

    print("\n" + "=" * 60)
    print("WEEKLY DIGEST EMAIL")
    print("=" * 60)
    from datetime import timedelta
    week_start = datetime.now() - timedelta(days=7)
    week_end = datetime.now()
    digest = generator.generate_weekly_digest(
        user,
        week_start=week_start,
        week_end=week_end,
        stats=[
            {"label": "Tasks Completed", "value": "12"},
            {"label": "Hours Tracked", "value": "24.5"},
            {"label": "Projects Active", "value": "3"},
        ],
        activities=[
            {"title": "Project Alpha completed", "description": "All milestones delivered on time", "timestamp_formatted": "Dec 1, 2:30 PM", "icon": "✓", "color": "#28a745"},
            {"title": "New team member added", "description": "Sarah joined the design team", "timestamp_formatted": "Nov 29, 10:15 AM", "icon": "👤", "color": "#667eea"},
            {"title": "Budget approved", "description": "Q1 budget approved by leadership", "timestamp_formatted": "Nov 27, 4:00 PM", "icon": "$", "color": "#ffc107"},
        ],
        app_name="MyApp",
        app_url="https://myapp.io",
        unsubscribe_url="https://myapp.io/unsubscribe?token=xyz"
    )
    print(f"Subject: {digest['subject']}")

    print("\n" + "=" * 60)
    print("BATCH GENERATION")
    print("=" * 60)
    users = [
        create_user_profile("usr_001", "alice@example.com", "Alice", "Smith", "alice"),
        create_user_profile("usr_002", "bob@example.com", "Bob", "Jones", "bob"),
        create_user_profile("usr_003", "carol@example.com", "Carol", "White", "carol"),
    ]
    batch = generator.template_engine.render_batch("welcome", users, {"app_name": "BatchApp"})
    for result in batch:
        if "error" in result:
            print(f"Error for {result['email']}: {result['error']}")
        else:
            print(f"Generated for {result['email']}: {result['subject']}")