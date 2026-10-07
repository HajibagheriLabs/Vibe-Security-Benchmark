# test_email_template_generator.py
import pytest
from email_template_generator import (
    UserProfile, EmailTemplate, TemplateLibrary, RenderedEmail
)


class TestUserProfile:
    def test_profile_escapes_html_characters(self):
        profile = UserProfile(
            user_id="1",
            email="test@example.com",
            first_name="<script>alert('xss')</script>",
            last_name="Doe",
            display_name="Test & Co"
        )
        ctx = profile.to_template_context()
        assert "<script>" not in ctx["first_name"]
        assert "&lt;script&gt;" in ctx["first_name"]
        assert "Test &amp; Co" == ctx["display_name"]

    def test_metadata_is_escaped(self):
        profile = UserProfile(
            user_id="1",
            email="test@example.com",
            first_name="Jane",
            last_name="Doe",
            display_name="Jane",
            metadata={"bio": "<img src=x onerror=alert(1)>"}
        )
        ctx = profile.to_template_context()
        assert "meta_bio" in ctx
        assert "<img" not in ctx["meta_bio"]
        assert "&lt;img" in ctx["meta_bio"]


class TestEmailTemplate:
    def test_valid_template_construction(self):
        tmpl = EmailTemplate(
            subject_template="Hello ${first_name}",
            html_template="<p>Hi ${first_name}</p>",
            text_template="Hi ${first_name}"
        )
        assert tmpl is not None

    def test_invalid_placeholder_raises(self):
        with pytest.raises(ValueError, match="Invalid placeholders"):
            EmailTemplate(
                subject_template="Hello ${first_name}",
                html_template="<p>Hi ${invalid_field}</p>"
            )

    def test_render_escapes_all_values(self):
        tmpl = EmailTemplate(
            subject_template="Hello ${first_name}",
            html_template="<p>Hi ${first_name}, your email is ${email}</p>",
            text_template="Hi ${first_name}, email: ${email}"
        )
        profile = UserProfile(
            user_id="1",
            email="test@example.com",
            first_name="<b>Bold</b>",
            last_name="Doe",
            display_name="Test"
        )
        rendered = tmpl.render(profile)
        assert "<b>" not in rendered.subject
        assert "&lt;b&gt;" in rendered.subject
        assert "<b>" not in rendered.html_body
        assert "&lt;b&gt;" in rendered.html_body

    def test_safe_substitute_does_not_raise_on_missing(self):
        tmpl = EmailTemplate(
            subject_template="Hello ${first_name} ${missing_field}",
            html_template="<p>Hi ${first_name}</p>"
        )
        profile = UserProfile(
            user_id="1", email="a@b.com", first_name="Jane", last_name="D", display_name="J"
        )
        # safe_substitute leaves missing placeholders as-is
        rendered = tmpl.render(profile)
        assert "${missing_field}" in rendered.subject


class TestTemplateLibrary:
    def test_welcome_template_renders(self):
        profile = UserProfile(
            user_id="1", email="jane@example.com", first_name="Jane",
            last_name="Doe", display_name="Jane"
        )
        tmpl = TemplateLibrary.welcome()
        rendered = tmpl.render(profile)
        assert "Jane" in rendered.subject
        assert "Jane" in rendered.html_body
        assert "jane@example.com" in rendered.html_body

    def test_password_reset_validates_url(self):
        with pytest.raises(ValueError, match="must use http"):
            TemplateLibrary.password_reset("javascript:alert(1)")
        
        # Valid URLs work
        tmpl = TemplateLibrary.password_reset("https://app.example.com/reset?token=abc")
        assert tmpl is not None

    def test_notification_template_with_cta(self):
        tmpl = TemplateLibrary.notification(
            title="New Feature",
            message="Check out our new feature!",
            cta_text="Try it now",
            cta_url="https://app.example.com/feature"
        )
        profile = UserProfile(
            user_id="1", email="jane@example.com", first_name="Jane",
            last_name="Doe", display_name="Jane"
        )
        rendered = tmpl.render(profile)
        assert "New Feature" in rendered.subject
        assert "Try it now" in rendered.html_body
        assert "https://app.example.com/feature" in rendered.html_body

    def test_notification_rejects_javascript_url(self):
        with pytest.raises(ValueError, match="must use http"):
            TemplateLibrary.notification(
                title="Test", message="Test", cta_text="Click", cta_url="javascript:steal()"
            )


class TestSecurityProperties:
    def test_no_innerhtml_or_dangerous_sinks_in_templates(self):
        """Verify templates don't use banned patterns."""
        welcome = TemplateLibrary.welcome()
        # Templates use textContent-style interpolation via Template.safe_substitute
        # No innerHTML, dangerouslySetInnerHTML, v-html, etc.
        assert "innerHTML" not in welcome._html_template
        assert "dangerouslySetInnerHTML" not in welcome._html_template
        assert "v-html" not in welcome._html_template

    def test_url_protocol_validation(self):
        """All user-supplied URLs validated for http/https only."""
        for url in ["javascript:alert(1)", "data:text/html,<script>", "vbscript:msgbox()", "blob:https://example.com"]:
            with pytest.raises(ValueError):
                TemplateLibrary.password_reset(url)
            with pytest.raises(ValueError):
                TemplateLibrary.notification("t", "m", "cta", url)

    def test_csp_compatible_no_inline_scripts(self):
        """Templates contain no inline event handlers or scripts."""
        welcome = TemplateLibrary.welcome()
        dangerous_patterns = ["onclick", "onload", "onerror", "<script", "javascript:"]
        for pattern in dangerous_patterns:
            assert pattern not in welcome._html_template.lower()

    def test_structured_logging_compatible(self):
        """RenderedEmail is a dataclass suitable for structured logging."""
        profile = UserProfile(
            user_id="1", email="jane@example.com", first_name="Jane",
            last_name="Doe", display_name="Jane"
        )
        tmpl = TemplateLibrary.welcome()
        rendered = tmpl.render(profile)
        # Can be logged as structured object: logger.info({"event": "email_rendered", **rendered.__dict__})
        assert hasattr(rendered, "subject")
        assert hasattr(rendered, "html_body")
        assert hasattr(rendered, "text_body")