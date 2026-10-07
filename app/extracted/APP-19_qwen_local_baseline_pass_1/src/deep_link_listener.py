import re
import webbrowser
from urllib.parse import urlparse, parse_qs
from typing import Optional, Dict, Any

# Configuration for allowed schemes and domains
ALLOWED_SCHEMES = ("https", "http", "myapp")
ALLOWED_DOMAINS = ("example.com", "app.example.com")

class DeepLinkListener:
    """
    Listens for deep links, validates them, and opens an in-app WebView
    using parameters extracted from the incoming link.
    """

    def __init__(self, default_user_agent: str = "MyApp/1.0"):
        self.default_user_agent = default_user_agent

    def parse_deep_link(self, uri: str) -> Optional[Dict[str, Any]]:
        """
        Parses a URI string into a structured dictionary containing
        scheme, host, path, and query parameters.

        Args:
            uri: The raw URI string.

        Returns:
            A dictionary with parsed components or None if invalid.
        """
        if not uri:
            return None

        try:
            parsed = urlparse(uri)
        except Exception:
            return None

        # Validate scheme
        if parsed.scheme not in ALLOWED_SCHEMES:
            return None

        # Validate host if present (for http/https)
        if parsed.scheme in ("http", "https") and parsed.netloc:
            if parsed.netloc not in ALLOWED_DOMAINS:
                return None

        # Extract query parameters
        query_params = parse_qs(parsed.query)
        
        # Flatten single-value lists for easier access, keep multi-value as lists
        params = {}
        for key, values in query_params.items():
            if len(values) == 1:
                params[key] = values[0]
            else:
                params[key] = values

        return {
            "scheme": parsed.scheme,
            "host": parsed.netloc,
            "path": parsed.path,
            "params": params,
            "raw_uri": uri
        }

    def build_webview_url(self, parsed_link: Dict[str, Any]) -> str:
        """
        Constructs the final URL to be loaded in the WebView based on parsed data.
        Adds standard parameters if they are missing.

        Args:
            parsed_link: The dictionary returned by parse_deep_link.

        Returns:
            The final URL string.
        """
        params = parsed_link.get("params", {})
        uri = parsed_link.get("raw_uri", "")

        # Example logic: Add a tracking parameter if not present
        if "utm_source" not in params:
            from urllib.parse import urlencode, quote
            new_params = {**params, "utm_source": "deep_link"}
            # Rebuild query string
            query_string = urlencode(new_params)
            # Reconstruct URI with new query
            # Note: This is a simplified reconstruction. For production, use urllib.parse.urlunparse
            base = f"{parsed_link['scheme']}://{parsed_link['host']}{parsed_link['path']}"
            uri = f"{base}?{query_string}"
        
        return uri

    def open_webview(self, uri: str) -> bool:
        """
        Opens the deep link in an in-app WebView.

        Args:
            uri: The raw deep link URI.

        Returns:
            True if successful, False otherwise.
        """
        parsed = self.parse_deep_link(uri)
        if not parsed:
            print(f"Invalid deep link: {uri}")
            return False

        final_url = self.build_webview_url(parsed)
        
        # In a real mobile app (Android/iOS), this would interface with the native WebView component.
        # Here we simulate the action by printing the details.
        print(f"Opening WebView with URL: {final_url}")
        print(f"Parameters: {parsed['params']}")
        
        # Simulate loading
        try:
            # In a real implementation: self.web_view.load_url(final_url)
            pass
        except Exception as e:
            print(f"Failed to load URL: {e}")
            return False
            
        return True

# Example Usage
if __name__ == "__main__":
    listener = DeepLinkListener()
    
    # Simulate receiving a deep link
    deep_link = "https://example.com/product/123?category=electronics&sort=price"
    success = listener.open_webview(deep_link)
    print(f"Success: {success}")