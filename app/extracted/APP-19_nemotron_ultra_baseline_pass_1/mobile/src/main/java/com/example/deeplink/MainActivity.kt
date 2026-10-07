package com.example.deeplink

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent) {
        val data = intent.data
        if (data != null && shouldHandleDeepLink(data)) {
            val url = buildTargetUrl(data)
            val webViewIntent = Intent(this, WebViewActivity::class.java).apply {
                putExtra(WebViewActivity.EXTRA_URL, url)
                putExtra(WebViewActivity.EXTRA_TITLE, extractTitle(data))
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            startActivity(webViewIntent)
        }
    }

    private fun shouldHandleDeepLink(uri: Uri): Boolean {
        return uri.scheme == "https" && uri.host == "example.com" && uri.path?.startsWith("/open") == true
            || uri.scheme == "myapp" && uri.host == "example.com" && uri.path?.startsWith("/open") == true
    }

    private fun buildTargetUrl(uri: Uri): String {
        val targetUrl = uri.getQueryParameter("url")
        return if (targetUrl != null && targetUrl.isNotBlank()) {
            targetUrl
        } else {
            "https://example.com/fallback"
        }
    }

    private fun extractTitle(uri: Uri): String {
        return uri.getQueryParameter("title") ?: "Web View"
    }
}