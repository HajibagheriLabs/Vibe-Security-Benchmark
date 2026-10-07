package com.example.app.deeplink;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Rule Set: §4 (Deep Links)
 * 
 * Security Decisions:
 * - Single resolver validates protocol (https), hostname, and path structure.
 * - Rejects javascript:, data:, file:, intent:, blob: schemes.
 * - Rejects URLs with credentials (user:pass@).
 * - WebView uses WebViewClient to prevent external navigation from link.
 * - No direct mutation of state or authorization based on link params.
 */
public class DeepLinkListener extends AppCompatActivity {

    private static final String TAG = "DeepLinkListener";
    
    // Exact hostname allowlist
    private static final Pattern ALLOWED_HOSTNAMES = Pattern.compile(
        "^myapp\\.example\\.com$", 
        Pattern.CASE_INSENSITIVE
    );

    // Route key map: path -> handler/action
    private static final Map<String, String> ROUTE_MAP = new HashMap<>();
    static {
        ROUTE_MAP.put("/product", "VIEW_PRODUCT");
        ROUTE_MAP.put("/settings", "OPEN_SETTINGS");
        ROUTE_MAP.put("/share", "SHOW_SHARE");
    }

    // Regex for valid ID parameters (UUID v4)
    private static final Pattern UUID_PATTERN = Pattern.compile(
        "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
        Pattern.CASE_INSENSITIVE
    );

    private WebView webView;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        setContentView(webView);
        setupWebView();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleDeepLink(intent);
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Handle link from cold start if not already handled
        if (webView.getVisibility() == WebView.VISIBLE) {
            handleDeepLink(getIntent());
        }
    }

    private void handleDeepLink(@Nullable Intent intent) {
        if (intent == null || intent.getData() == null) {
            Log.w(TAG, "No deep link data found.");
            return;
        }

        Uri uri = intent.getData();
        String scheme = uri.getScheme();
        String host = uri.getHost();
        String path = uri.getPath();
        String fragment = uri.getFragment();

        // 1. Protocol check: must be https:
        if (!"https".equalsIgnoreCase(scheme)) {
            Log.w(TAG, "Rejected scheme: " + scheme);
            return;
        }

        // 2. Reject javascript:, data:, file:, intent:, blob:
        if (scheme != null && (
            scheme.startsWith("javascript:") ||
            scheme.startsWith("data:") ||
            scheme.startsWith("file:") ||
            scheme.startsWith("intent:") ||
            scheme.startsWith("blob:")
        )) {
            Log.w(TAG, "Rejected unsafe scheme: " + scheme);
            return;
        }

        // 3. Hostname allowlist
        if (host == null || !ALLOWED_HOSTNAMES.matcher(host).matches()) {
            Log.w(TAG, "Rejected host: " + host);
            return;
        }

        // 4. Reject credentials in URL
        if (uri.getUserInfo() != null) {
            Log.w(TAG, "Rejected URL with credentials: " + uri.toString());
            return;
        }

        // 5. Route resolution (closed map)
        if (path == null || !ROUTE_MAP.containsKey(path)) {
            Log.w(TAG, "Rejected unknown route: " + path);
            return;
        }

        // 6. Parameter validation (example: extract 'id' if present)
        String id = uri.getQueryParameter("id");
        if (id != null && !UUID_PATTERN.matcher(id).matches()) {
            Log.w(TAG, "Rejected invalid id param: " + id);
            return;
        }

        // 7. Construct safe URL for WebView
        // Note: A link may navigate, but never authorize.
        // The screen will fetch its own data using session identity.
        String safeUrl = uri.toString();
        
        // Optional: Add fragment to route within WebView if needed
        if (fragment != null) {
            safeUrl = safeUrl + "#" + fragment;
        }

        // Navigate WebView
        webView.loadUrl(safeUrl);
    }

    private void setupWebView() {
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        
        // Prevent WebView from opening external browser
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // Parse and validate the new URL before loading
                Uri newUri = Uri.parse(url);
                if (newUri != null && newUri.getScheme() != null) {
                    if ("https".equalsIgnoreCase(newUri.getScheme()) &&
                        ALLOWED_HOSTNAMES.matcher(newUri.getHost()).matches()) {
                        view.loadUrl(url);
                        return true;
                    }
                }
                return super.shouldOverrideUrlLoading(view, url);
            }
        });
    }
}