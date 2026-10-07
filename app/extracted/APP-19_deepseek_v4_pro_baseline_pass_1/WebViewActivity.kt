// WebViewActivity.kt
package com.example.deeplink

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class WebViewActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val url = intent.getStringExtra("extra_url") ?: run {
            finish()
            return
        }

        val headers = intent.getSerializableExtra("extra_headers") as? Map<String, String> ?: emptyMap()
        val enableJavaScript = intent.getBooleanExtra("extra_enable_javascript", true)
        val enableDomStorage = intent.getBooleanExtra("extra_enable_dom_storage", true)
        val userAgent = intent.getStringExtra("extra_user_agent")
        val allowFileAccess = intent.getBooleanExtra("extra_allow_file_access", false)
        val useWideViewport = intent.getBooleanExtra("extra_use_wide_viewport", true)
        val loadWithOverview = intent.getBooleanExtra("extra_load_with_overview", true)
        val supportZoom = intent.getBooleanExtra("extra_support_zoom", true)
        val displayZoomControls = intent.getBooleanExtra("extra_display_zoom_controls", true)
        val useBuiltInZoom = intent.getBooleanExtra("extra_use_built_in_zoom", true)
        val allowContentAccess = intent.getBooleanExtra("extra_allow_content_access", true)
        val saveFormData = intent.getBooleanExtra("extra_save_form_data", true)
        val geolocationEnabled = intent.getBooleanExtra("extra_geolocation_enabled", false)
        val javaScriptCanOpenWindows = intent.getBooleanExtra("extra_javascript_can_open_windows", false)
        val mediaPlaybackRequiresUserGesture = intent.getBooleanExtra("extra_media_playback_requires_user_gesture", true)
        val allowUniversalAccessFromFileUrls = intent.getBooleanExtra("extra_allow_universal_access_from_file_urls", false)
        val allowFileAccessFromFileUrls = intent.getBooleanExtra("extra_allow_file_access_from_file_urls", false)

        webView = WebView(this)
        setContentView(webView)

        webView.settings.apply {
            javaScriptEnabled = enableJavaScript
            domStorageEnabled = enableDomStorage
            this.allowFileAccess = allowFileAccess
            this.useWideViewPort = useWideViewport
            this.loadWithOverviewMode = loadWithOverview
            this.setSupportZoom(supportZoom)
            this.displayZoomControls = displayZoomControls
            this.builtInZoomControls = useBuiltInZoom
            this.allowContentAccess = allowContentAccess
            this.saveFormData = saveFormData
            this.setGeolocationEnabled(geolocationEnabled)
            this.javaScriptCanOpenWindowsAutomatically = javaScriptCanOpenWindows
            this.mediaPlaybackRequiresUserGesture = mediaPlaybackRequiresUserGesture
            this.allowUniversalAccessFromFileURLs = allowUniversalAccessFromFileUrls
            this.allowFileAccessFromFileURLs = allowFileAccessFromFileUrls
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE

            userAgent?.let { this.userAgentString = it }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                return false
            }
        }

        webView.webChromeClient = WebChromeClient()

        webView.loadUrl(url, headers)
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