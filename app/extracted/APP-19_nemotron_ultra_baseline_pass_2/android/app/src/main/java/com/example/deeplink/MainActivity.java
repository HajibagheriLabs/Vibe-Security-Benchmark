package com.example.deeplink;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        Uri data = intent.getData();
        if (data == null) return;

        String url = extractTargetUrl(data);
        if (url != null && !url.isEmpty()) {
            Intent webViewIntent = new Intent(this, WebViewActivity.class);
            webViewIntent.putExtra(WebViewActivity.EXTRA_URL, url);
            webViewIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(webViewIntent);
        }
    }

    private String extractTargetUrl(Uri deepLink) {
        String targetUrl = deepLink.getQueryParameter("url");
        if (targetUrl != null && !targetUrl.isEmpty()) {
            return targetUrl;
        }

        String path = deepLink.getPath();
        if (path != null && path.startsWith("/open/")) {
            return path.substring("/open/".length());
        }

        return deepLink.toString();
    }
}