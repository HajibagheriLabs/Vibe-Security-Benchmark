package com.example.app;

import android.content.Intent;
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import android.webkit.WebView;
import com.example.app.security.DeepLinkWebViewHandler;

public class MainActivity extends AppCompatActivity {

    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Simplified layout setup
        webView = new WebView(this);
        setContentView(webView);
        
        // Rule §4 (Deep Links): Handle links in onCreate
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // Rule §4 (Deep Links): Handle links in onNewIntent
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent != null) {
            boolean handled = DeepLinkWebViewHandler.handleDeepLink(this, webView, intent);
            if (!handled) {
                // Rule §4 (Deep Links): One generic fallback destination
                webView.loadUrl("https://example.com/fallback");
            }
        }
    }
}