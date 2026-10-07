import re
import string
from typing import Dict, Any, Optional


class EmailTemplateGenerator:
    """
    Generates HTML emails by interpolating user profile attributes into a template.
    
    Supports Jinja-like syntax: {{ variable_name }}.
    Supports nested attributes via dot notation: {{ user.name }}.
    Supports conditional blocks: {% if variable %}...{% endif %}.
    Supports iteration blocks: {% for item in list %}...{% endfor %}.
    """

    def __init__(self, template: str):
        """
        Initialize the generator with an HTML template string.
        
        Args:
            template: The HTML template string containing placeholders.
        """
        if not isinstance(template, str):
            raise TypeError("Template must be a string.")
        self.template = template

    def render(self, context: Dict[str, Any]) -> str:
        """
        Render the template with the provided context.
        
        Args:
            context: A dictionary of variables to interpolate into the template.
            
        Returns:
            The rendered HTML string.
        """
        try:
            result = self._process_conditions(self.template, context)
            result = self._process_loops(result, context)
            result = self._interpolate_variables(result, context)
            return result
        except Exception as e:
            return f"<!-- Error rendering template: {str(e)} -->"

    def _resolve_variable(self, var_name: str, context: Dict[str, Any]) -> Any:
        """
        Resolve a variable name (potentially dot-notation) against the context.
        
        Args:
            var_name: The variable name, e.g., "user.name".
            context: The context dictionary.
            
        Returns:
            The resolved value.
            
        Raises:
            KeyError: If the variable is not found.
        """
        parts = var_name.strip().split('.')
        current = context
        
        for part in parts:
            if isinstance(current, dict):
                if part in current:
                    current = current[part]
                else:
                    raise KeyError(f"Key '{part}' not found in context.")
            elif isinstance(current, list):
                try:
                    index = int(part)
                    current = current[index]
                except (ValueError, IndexError):
                    raise KeyError(f"Invalid list index '{part}'.")
            else:
                if hasattr(current, part):
                    current = getattr(current, part)
                else:
                    raise KeyError(f"Attribute '{part}' not found on object.")
                    
        return current

    def _interpolate_variables(self, text: str, context: Dict[str, Any]) -> str:
        """
        Replace all {{ variable }} placeholders with their resolved values.
        
        Args:
            text: The text containing placeholders.
            context: The context dictionary.
            
        Returns:
            The text with placeholders replaced.
        """
        def replace_match(match):
            var_name = match.group(1)
            try:
                value = self._resolve_variable(var_name, context)
                if value is None:
                    return ""
                return str(value)
            except KeyError:
                return ""
            except Exception:
                return "<!-- Invalid variable: " + var_name + " -->"

        # Pattern matches {{ variable_name }}
        pattern = r'\{\{(.*?)\}\}'
        return re.sub(pattern, replace_match, text)

    def _process_conditions(self, text: str, context: Dict[str, Any]) -> str:
        """
        Process {% if %} ... {% endif %} blocks.
        
        Args:
            text: The text containing conditional blocks.
            context: The context dictionary.
            
        Returns:
            The text with conditionals resolved.
        """
        # Simple iterative approach for nested ifs might be tricky, 
        # so we use a regex-based approach for simple nesting or assume non-nested for basic usage.
        # Here we implement a basic recursive descent or iterative replacement.
        
        while '{% if ' in text and '{% endif %}' in text:
            # Find the first if block
            if_match = re.search(r'\{% if (.*?) %\}(.*?)\{% endif %\}', text, re.DOTALL)
            if not if_match:
                break
                
            condition_str = if_match.group(1)
            block_content = if_match.group(2)
            
            # Evaluate condition
            try:
                # Handle simple truthiness checks
                # If it's just a variable name, check if it exists and is truthy
                var_name = condition_str.strip()
                value = self._resolve_variable(var_name, context)
                is_true = bool(value)
            except KeyError:
                is_true = False
            except Exception:
                is_true = False
                
            # Replace the block
            if is_true:
                replacement = block_content
            else:
                replacement = ""
                
            text = text[:if_match.start()] + replacement + text[if_match.end():]
            
        return text

    def _process_loops(self, text: str, context: Dict[str, Any]) -> str:
        """
        Process {% for item in list %} ... {% endfor %} blocks.
        
        Args:
            text: The text containing loop blocks.
            context: The context dictionary.
            
        Returns:
            The text with loops resolved.
        """
        while '{% for ' in text and '{% endfor %}' in text:
            # Find the first for block
            for_match = re.search(r'\{% for (\w+) in (.*?) %\}(.*?)\{% endfor %\}', text, re.DOTALL)
            if not for_match:
                break
                
            item_name = for_match.group(1)
            list_name = for_match.group(2).strip()
            block_content = for_match.group(3)
            
            try:
                list_value = self._resolve_variable(list_name, context)
                if not isinstance(list_value, (list, tuple)):
                    raise ValueError(f"Variable '{list_name}' is not iterable.")
                    
                iterations = []
                for item in list_value:
                    # Create a temporary context for this iteration
                    iter_context = context.copy()
                    iter_context[item_name] = item
                    # Also add the item itself as a variable if needed, but usually item_name is enough
                    # If the loop is {% for user in users %}, user is the item.
                    
                    # Render the block content for this iteration
                    # We need to interpolate variables within the block using the iter_context
                    # But we also need to handle nested loops or ifs inside, so we call render recursively?
                    # For simplicity in this flat structure, we'll just interpolate variables in the block
                    # assuming no complex nested logic for now, or we can call _interpolate_variables
                    
                    rendered_block = self._interpolate_variables(block_content, iter_context)
                    iterations.append(rendered_block)
                    
                replacement = "".join(iterations)
            except Exception as e:
                replacement = f"<!-- Error in loop: {str(e)} -->"
                
            text = text[:for_match.start()] + replacement + text[for_match.end():]
            
        return text

    @classmethod
    def from_file(cls, filepath: str) -> 'EmailTemplateGenerator':
        """
        Load a template from a file.
        
        Args:
            filepath: Path to the template file.
            
        Returns:
            An EmailTemplateGenerator instance.
        """
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                template = f.read()
            return cls(template)
        except FileNotFoundError:
            raise FileNotFoundError(f"Template file not found: {filepath}")
        except Exception as e:
            raise RuntimeError(f"Error loading template file: {str(e)}")


# Example Usage
if __name__ == "__main__":
    template_str = """
    <html>
    <body>
        <h1>Hello {{ user.name }},</h1>
        <p>Welcome to our service, {{ user.email }}.</p>
        
        {% if user.is_vip %}
            <p>You are a VIP member! Enjoy special discounts.</p>
        {% else %}
            <p>Upgrade to VIP to get more benefits.</p>
        {% endif %}
        
        <h2>Your Orders:</h2>
        <ul>
        {% for order in user.orders %}
            <li>Order #{{ order.id }}: {{ order.status }}</li>
        {% endfor %}
        </ul>
    </body>
    </html>
    """
    
    context = {
        "user": {
            "name": "John Doe",
            "email": "john.doe@example.com",
            "is_vip": True,
            "orders": [
                {"id": 101, "status": "Shipped"},
                {"id": 102, "status": "Pending"},
                {"id": 103, "status": "Delivered"}
            ]
        }
    }
    
    generator = EmailTemplateGenerator(template_str)
    html_output = generator.render(context)
    print(html_output)