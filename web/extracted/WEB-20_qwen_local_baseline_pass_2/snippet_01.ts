```python
import re
import string
from typing import Dict, Any, Optional


class EmailNotificationTemplateGenerator:
    """
    Generates HTML email notifications by interpolating user profile attributes
    into a provided HTML template string.

    Supported placeholders:
    - {{variable_name}}: Interpolates the value of 'variable_name' from the profile.
    - {{variable_name|upper}}: Applies the 'upper' filter (string conversion to uppercase).
    - {{variable_name|lower}}: Applies the 'lower' filter.
    - {{variable_name|capitalize}}: Applies the 'capitalize' filter.
    - {{variable_name|default:default_value}}: Uses 'default_value' if variable is None or missing.
    """

    # Regex to match placeholders like {{ var_name | filter }}
    PLACEHOLDER_PATTERN = re.compile(r'\{\{(.*?)\}\}')

    def __init__(self, template: str):
        """
        Initialize the generator with an HTML template.

        Args:
            template: The HTML string containing placeholders.
        """
        self.template = template

    def generate(self, profile: Dict[str, Any]) -> str:
        """
        Generate the final HTML string by interpolating the profile data.

        Args:
            profile: A dictionary containing user profile attributes.

        Returns:
            The interpolated HTML string.
        """
        if not isinstance(profile, dict):
            raise ValueError("Profile must be a dictionary.")

        def replace_placeholder(match: re.Match) -> str:
            expression = match.group(1).strip()
            return self._evaluate_expression(expression, profile)

        return self.PLACEHOLDER_PATTERN.sub(replace_placeholder, self.template)

    def _evaluate_expression(self, expression: str, profile: Dict[str, Any]) -> str:
        """
        Evaluate a single placeholder expression against the profile.

        Args:
            expression: The content inside {{ }}, e.g., "name" or "name|upper".
            profile: The user profile dictionary.

        Returns:
            The string representation of the evaluated expression.
        """
        parts = expression.split('|')
        var_name = parts[0].strip()
        filters = [f.strip() for f in parts[1:]]

        # Retrieve value
        value = profile.get(var_name)

        # Apply filters
        for filter_name in filters:
            value = self._apply_filter(value, filter_name)

        # Convert to string
        if value is None:
            return ""
        return str(value)

    def _apply_filter(self, value: Any, filter_name: str) -> Any:
        """
        Apply a specific filter to the value.

        Args:
            value: The value to filter.
            filter_name: The name of the filter (e.g., 'upper', 'default:val').

        Returns:
            The filtered value.
        """
        if filter_name == 'upper':
            return str(value).upper()
        elif filter_name == 'lower':
            return str(value).lower()
        elif filter_name == 'capitalize':
            return str(value).capitalize()
        elif filter_name.startswith('default:'):
            default_val = filter_name[len('default:'):]
            if value is None or value == "":
                return default_val
            return value
        else:
            # Unknown filter, just return string representation
            return str(value)