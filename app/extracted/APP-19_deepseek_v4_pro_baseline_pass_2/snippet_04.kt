// Alternative Kotlin implementation
package com.example.deeplink

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class DeepLinkActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private val defaultUrl = "https://www.example.com"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_deep_link)

        webView = findViewById(R.id.webview)
        configureWebView()
        handleDeepLink(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleDeepLink(intent)
    }

    private fun configureWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            loadWithOverviewMode = true
            useWideViewPort = true
            builtInZoomControls = true
            displayZoomControls = false
            setSupportZoom(true)
            cacheMode = WebSettings.LOAD_DEFAULT
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                url?.let { view?.loadUrl(it) }
                return true
            }
        }

        webView.webChromeClient = WebChromeClient()
    }

    private fun handleDeepLink(intent: Intent?) {
        val data: Uri? = intent?.data
        val url = data?.let { extractUrlFromUri(it) } ?: defaultUrl
        webView.loadUrl(url)
    }

    private fun extractUrlFromUri(uri: Uri): String {
        var url = uri.getQueryParameter("url") 
            ?: uri.getQueryParameter("target")
            ?: if (uri.scheme == "http" || uri.scheme == "https") uri.toString() else null
        
        url = url ?: defaultUrl
        
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://$url"
        }
        
        return url
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onRestoreInstanceState(savedInstanceState: Bundle) {
        super.onRestoreInstanceState(savedInstanceState)
        webView.restoreState(savedInstanceState)
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}