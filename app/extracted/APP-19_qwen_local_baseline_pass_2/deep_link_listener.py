"""
deep_link_listener.py

A mobile deep link listener that parses incoming URI schemes or URL schemes
and opens an in-app WebView with the extracted parameters.
"""

from urllib.parse import urlparse, parse_qs, unquote
import re
from typing import Dict, Any, Optional


class DeepLinkParams:
    """Holds parsed parameters from a deep link."""
    
    def __init__(self, url: str, scheme: str, host: str, path: str, 
                 query_params: Dict[str, str], fragment: str = ""):
        self.url = url
        self.scheme = scheme
        self.host = host
        self.path = path
        self.query_params = query_params
        self.fragment = fragment
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "url": self.url,
            "scheme": self.scheme,
            "host": self.host,
            "path": self.path,
            "query_params": self.query_params,
            "fragment": self.fragment
        }


class DeepLinkListener:
    """
    Listens for deep links and opens an in-app WebView.
    
    Supports both URL scheme (e.g., myapp://feature?param=value)
    and custom URI scheme (e.g., myapp://host/path?param=value).
    """
    
    # Regex for URL scheme format: scheme://host/path?query
    URL_SCHEME_PATTERN = re.compile(r'^([a-zA-Z][a-zA-Z0-9+.-]*)://([^/?#]*)(/[^?#]*)?(\?.*)?(#.*)?$')
    
    # Regex for simple URL scheme without host: scheme://path?query
    SIMPLE_URL_SCHEME_PATTERN = re.compile(r'^([a-zA-Z][a-zA-Z0-9+.-]*)://([^?#]*)(\?.*)?(#.*)?$')
    
    def __init__(self, supported_schemes: Optional[list] = None):
        """
        Initialize the deep link listener.
        
        Args:
            supported_schemes: List of supported URL schemes. If None, all schemes are supported.
        """
        self.supported_schemes = supported_schemes or []
    
    def parse_deep_link(self, deep_link: str) -> Optional[DeepLinkParams]:
        """
        Parse a deep link string into structured parameters.
        
        Args:
            deep_link: The deep link string (e.g., "myapp://feature?id=123&name=test")
            
        Returns:
            DeepLinkParams object if parsing succeeds, None otherwise.
        """
        if not deep_link or not isinstance(deep_link, str):
            return None
        
        # Check if it's a valid URL scheme
        if not self._is_valid_url_scheme(deep_link):
            return None
        
        # Check scheme support
        scheme = urlparse(deep_link).scheme
        if self.supported_schemes and scheme not in self.supported_schemes:
            return None
        
        try:
            parsed_url = urlparse(deep_link)
            query_params = parse_qs(parsed_url.query, keep_blank_values=True)
            # Flatten single-value lists to strings
            flat_params = {k: v[0] if len(v) == 1 else v for k, v in query_params.items()}
            
            return DeepLinkParams(
                url=deep_link,
                scheme=parsed_url.scheme,
                host=parsed_url.hostname or "",
                path=parsed_url.path or "/",
                query_params=flat_params,
                fragment=parsed_url.fragment
            )
        except Exception:
            return None
    
    def _is_valid_url_scheme(self, uri: str) -> bool:
        """Check if the URI uses a valid URL scheme format."""
        try:
            parsed = urlparse(uri)
            return bool(parsed.scheme) and bool(parsed.netloc)
        except Exception:
            return False
    
    def open_webview(self, deep_link: str) -> bool:
        """
        Open an in-app WebView using the deep link parameters.
        
        Args:
            deep_link: The deep link string to process.
            
        Returns:
            True if WebView was opened successfully, False otherwise.
        """
        params = self.parse_deep_link(deep_link)
        if not params:
            print(f"Failed to parse deep link: {deep_link}")
            return False
        
        print(f"Opening WebView with parameters:")
        print(f"  URL: {params.url}")
        print(f"  Scheme: {params.scheme}")
        print(f"  Host: {params.host}")
        print(f"  Path: {params.path}")
        print(f"  Query Params: {params.query_params}")
        print(f"  Fragment: {params.fragment}")
        
        # In a real implementation, this would trigger the WebView
        # For example, in Android:
        # Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(params.url));
        # startActivity(intent);
        #
        # In iOS:
        # if let url = URL(string: params.url) {
        #     UIApplication.shared.open(url, options: [:])
        # }
        
        return True
    
    def handle_deep_link(self, deep_link: str) -> Dict[str, Any]:
        """
        Handle a deep link and return structured data.
        
        Args:
            deep_link: The deep link string to process.
            
        Returns:
            Dictionary containing the result and parameters.
        """
        result = {
            "success": False,
            "deep_link": deep_link,
            "params": None,
            "error": None
        }
        
        try:
            params = self.parse_deep_link(deep_link)
            if params:
                self.open_webview(deep_link)
                result["success"] = True
                result["params"] = params.to_dict()
            else:
                result["error"] = "Invalid or unsupported deep link"
        except Exception as e:
            result["error"] = str(e)
        
        return result


# Example usage
if __name__ == "__main__":
    listener = DeepLinkListener(supported_schemes=["myapp", "example"])
    
    # Test valid deep link
    test_links = [
        "myapp://feature?id=123&name=test",
        "example://products/category/electronics?sort=price",
        "myapp://settings",
        "https://example.com/path",  # Different scheme, should fail if only custom schemes supported
        "invalid-link",  # No scheme
        "",  # Empty
    ]
    
    for link in test_links:
        print(f"\n--- Testing: {link} ---")
        result = listener.handle_deep_link(link)
        print(f"Result: {result}")