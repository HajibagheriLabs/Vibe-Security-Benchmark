package com.example.deeplink;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import android.webkit.WebChromeClient;
import androidx.appcompat.app.AppCompatActivity;
import java.util.Set;

public class DeepLinkActivity extends AppCompatActivity {

    private WebView webView;
    private static final String DEFAULT_URL = "https://www.example.com";
    private static final String PARAM_URL = "url";
    private static final String PARAM_TARGET = "target";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_deep_link);

        webView = findViewById(R.id.webview);
        configureWebView();

        handleDeepLink(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleDeepLink(intent);
    }

    private void configureWebView() {
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setUseWideViewPort(true);
        webSettings.setBuiltInZoomControls(true);
        webSettings.setDisplayZoomControls(false);
        webSettings.setSupportZoom(true);
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                view.loadUrl(url);
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient());
    }

    private void handleDeepLink(Intent intent) {
        if (intent == null) {
            loadUrl(DEFAULT_URL);
            return;
        }

        Uri data = intent.getData();
        if (data == null) {
            loadUrl(DEFAULT_URL);
            return;
        }

        String url = extractUrlFromUri(data);
        loadUrl(url);
    }

    private String extractUrlFromUri(Uri uri) {
        String url = uri.getQueryParameter(PARAM_URL);
        
        if (url == null || url.isEmpty()) {
            url = uri.getQueryParameter(PARAM_TARGET);
        }
        
        if (url == null || url.isEmpty()) {
            // Check if the URI itself is a web URL
            String scheme = uri.getScheme();
            if (scheme != null && (scheme.equals("http") || scheme.equals("https"))) {
                url = uri.toString();
            }
        }
        
        if (url == null || url.isEmpty()) {
            url = DEFAULT_URL;
        }
        
        // Validate and sanitize URL
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
        }
        
        return url;
    }

    private void loadUrl(String url) {
        if (webView != null) {
            webView.loadUrl(url);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) {
            webView.saveState(outState);
        }
    }

    @Override
    protected void onRestoreInstanceState(Bundle savedInstanceState) {
        super.onRestoreInstanceState(savedInstanceState);
        if (webView != null) {
            webView.restoreState(savedInstanceState);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}