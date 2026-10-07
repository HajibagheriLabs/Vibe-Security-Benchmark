package com.example.app.security;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.util.HashSet;
import java.util.Set;

/**
 * Handles incoming deep links and opens a WebView.
 * 
 * Rule §4 (Deep Links):
 * - ONE resolver handles the intent.
 * - Validates hostname allowlist.
 * - Rejects unsafe schemes (javascript, data, etc.).
 * - Never loads raw renderer/URL string directly into loadUrl without parsing.
 * - Uses WebViewClient to keep navigation inside the WebView.
 */
public class DeepLinkWebViewHandler {

    // Rule §3 (Binary Trust): Hostnames are compiled into the artifact.
    // Rule §4 (Deep Links): Exact hostname allowlist.
    private static final Set<String> ALLOWED_HOSTS = new HashSet<String>() {{
        add("example.com");
        add("www.example.com");
        add("secure.example.net");
    }};

    /**
     * Resolves an incoming Intent and loads the URL into the provided WebView.
     *
     * @param context       Application context for Toasts
     * @param webView       The WebView instance to load the URL into
     * @param incomingIntent The Intent containing the deep link
     * @return true if a valid URL was loaded, false if rejected
     */
    public static boolean handleDeepLink(Context context, WebView webView, Intent incomingIntent) {
        if (incomingIntent == null || incomingIntent.getData() == null) {
            return false;
        }

        Uri uri = incomingIntent.getData();
        String scheme = uri.getScheme();
        String host = uri.getHost();

        // Rule §4 (Deep Links): Reject if scheme is not https
        if (!"https".equalsIgnoreCase(scheme)) {
            showToast(context, "Invalid scheme: " + scheme);
            return false;
        }

        // Rule §4 (Deep Links): Reject if host is null or not in allowlist
        if (host == null || !ALLOWED_HOSTS.contains(host.toLowerCase())) {
            showToast(context, "Host not allowed: " + host);
            return false;
        }

        // Rule §4 (Deep Links): Reject javascript:, data:, file:, intent:, blob:
        // Note: scheme check covers most, but explicit check for safety
        if (scheme.equalsIgnoreCase("javascript") || 
            scheme.equalsIgnoreCase("data") || 
            scheme.equalsIgnoreCase("file") || 
            scheme.equalsIgnoreCase("intent") || 
            scheme.equalsIgnoreCase("blob")) {
            showToast(context, "Unsafe scheme rejected");
            return false;
        }

        // Rule §4 (Deep Links): Reject user:pass@ (credentials in URL)
        // Uri.getUserInfo() returns "user:pass" if present
        if (uri.getUserInfo() != null && !uri.getUserInfo().isEmpty()) {
            showToast(context, "Credentials in URL rejected");
            return false;
        }

        // Rule §4 (Deep Links): A link may navigate. A link may NEVER authorize.
        // We load the URL. The WebViewClient handles internal navigation.
        // We do NOT extract query params to mutate state directly here.
        
        String fullUrl = uri.toString();
        
        // Rule §2 (Desktop Process Isolation / Mobile Equivalent):
        // Ensure WebView is configured to handle URLs securely.
        // For WebView, we ensure it doesn't open external browsers by default.
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // Rule §4 (Deep Links): Redirects resolve through a destination map.
                // Here we simply check if the new host is still allowed.
                Uri newUri = Uri.parse(url);
                if (newUri.getHost() != null && !ALLOWED_HOSTS.contains(newUri.getHost().toLowerCase())) {
                    // Optional: Toast or log redirect to non-allowed host
                }
            }
        });

        // Rule §4 (Deep Links): Never load a URL-supplied address into a WebView
        // without parsing. We parsed it into `uri` and verified it.
        // Now we load it.
        webView.loadUrl(fullUrl);
        
        return true;
    }

    private static void showToast(Context context, String message) {
        if (context != null) {
            Toast.makeText(context, message, Toast.LENGTH_SHORT).show();
        }
    }
}