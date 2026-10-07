// DeepLinkListener.kt
package com.example.deeplink

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.browser.customtabs.CustomTabsIntent

class DeepLinkListener : AppCompatActivity() {

    companion object {
        private const val EXTRA_URL = "extra_url"
        private const val EXTRA_HEADERS = "extra_headers"
        private const val EXTRA_ENABLE_JAVASCRIPT = "extra_enable_javascript"
        private const val EXTRA_ENABLE_DOM_STORAGE = "extra_enable_dom_storage"
        private const val EXTRA_USER_AGENT = "extra_user_agent"
        private const val EXTRA_ALLOW_FILE_ACCESS = "extra_allow_file_access"
        private const val EXTRA_USE_WIDE_VIEWPORT = "extra_use_wide_viewport"
        private const val EXTRA_LOAD_WITH_OVERVIEW = "extra_load_with_overview"
        private const val EXTRA_SUPPORT_ZOOM = "extra_support_zoom"
        private const val EXTRA_DISPLAY_ZOOM_CONTROLS = "extra_display_zoom_controls"
        private const val EXTRA_USE_BUILT_IN_ZOOM = "extra_use_built_in_zoom"
        private const val EXTRA_ALLOW_CONTENT_ACCESS = "extra_allow_content_access"
        private const val EXTRA_SAVE_FORM_DATA = "extra_save_form_data"
        private const val EXTRA_GEOLOCATION_ENABLED = "extra_geolocation_enabled"
        private const val EXTRA_JAVASCRIPT_CAN_OPEN_WINDOWS = "extra_javascript_can_open_windows"
        private const val EXTRA_MEDIA_PLAYBACK_REQUIRES_USER_GESTURE = "extra_media_playback_requires_user_gesture"
        private const val EXTRA_ALLOW_UNIVERSAL_ACCESS_FROM_FILE_URLS = "extra_allow_universal_access_from_file_urls"
        private const val EXTRA_ALLOW_FILE_ACCESS_FROM_FILE_URLS = "extra_allow_file_access_from_file_urls"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        val data: Uri? = intent?.data
        if (data != null) {
            val url = extractUrl(data)
            if (url.isNotEmpty()) {
                openWebView(url, extractParameters(data))
            }
        }
        finish()
    }

    private fun extractUrl(uri: Uri): String {
        // Check for "url" query parameter first
        val urlParam = uri.getQueryParameter("url")
        if (!urlParam.isNullOrEmpty()) {
            return urlParam
        }

        // Check for "link" query parameter
        val linkParam = uri.getQueryParameter("link")
        if (!linkParam.isNullOrEmpty()) {
            return linkParam
        }

        // Check for "target" query parameter
        val targetParam = uri.getQueryParameter("target")
        if (!targetParam.isNullOrEmpty()) {
            return targetParam
        }

        // If no query parameter, try to reconstruct URL from path
        val scheme = uri.scheme
        val host = uri.host
        val path = uri.path

        return when {
            scheme != null && host != null -> {
                val builder = StringBuilder()
                builder.append(scheme).append("://").append(host)
                if (path != null) builder.append(path)
                val query = uri.query
                if (query != null) builder.append("?").append(query)
                builder.toString()
            }
            else -> ""
        }
    }

    private fun extractParameters(uri: Uri): WebViewParameters {
        return WebViewParameters(
            headers = parseHeaders(uri.getQueryParameter("headers")),
            enableJavaScript = uri.getBooleanQueryParameter("enable_javascript", true),
            enableDomStorage = uri.getBooleanQueryParameter("enable_dom_storage", true),
            userAgent = uri.getQueryParameter("user_agent"),
            allowFileAccess = uri.getBooleanQueryParameter("allow_file_access", false),
            useWideViewport = uri.getBooleanQueryParameter("use_wide_viewport", true),
            loadWithOverview = uri.getBooleanQueryParameter("load_with_overview", true),
            supportZoom = uri.getBooleanQueryParameter("support_zoom", true),
            displayZoomControls = uri.getBooleanQueryParameter("display_zoom_controls", true),
            useBuiltInZoom = uri.getBooleanQueryParameter("use_built_in_zoom", true),
            allowContentAccess = uri.getBooleanQueryParameter("allow_content_access", true),
            saveFormData = uri.getBooleanQueryParameter("save_form_data", true),
            geolocationEnabled = uri.getBooleanQueryParameter("geolocation_enabled", false),
            javaScriptCanOpenWindows = uri.getBooleanQueryParameter("javascript_can_open_windows", false),
            mediaPlaybackRequiresUserGesture = uri.getBooleanQueryParameter("media_playback_requires_user_gesture", true),
            allowUniversalAccessFromFileUrls = uri.getBooleanQueryParameter("allow_universal_access_from_file_urls", false),
            allowFileAccessFromFileUrls = uri.getBooleanQueryParameter("allow_file_access_from_file_urls", false)
        )
    }

    private fun parseHeaders(headersParam: String?): Map<String, String> {
        val headers = mutableMapOf<String, String>()
        if (headersParam.isNullOrEmpty()) return headers

        try {
            // Support JSON format: {"key1":"value1","key2":"value2"}
            if (headersParam.trimStart().startsWith("{")) {
                val jsonObject = org.json.JSONObject(headersParam)
                val keys = jsonObject.keys()
                while (keys.hasNext()) {
                    val key = keys.next()
                    headers[key] = jsonObject.getString(key)
                }
            } else {
                // Support key:value;key2:value2 format
                headersParam.split(";").forEach { pair ->
                    val parts = pair.split(":", limit = 2)
                    if (parts.size == 2) {
                        headers[parts[0].trim()] = parts[1].trim()
                    }
                }
            }
        } catch (e: Exception) {
            // Ignore parsing errors
        }

        return headers
    }

    private fun openWebView(url: String, params: WebViewParameters) {
        val intent = Intent(this, WebViewActivity::class.java).apply {
            putExtra(EXTRA_URL, url)
            putExtra(EXTRA_HEADERS, HashMap(params.headers))
            putExtra(EXTRA_ENABLE_JAVASCRIPT, params.enableJavaScript)
            putExtra(EXTRA_ENABLE_DOM_STORAGE, params.enableDomStorage)
            putExtra(EXTRA_USER_AGENT, params.userAgent)
            putExtra(EXTRA_ALLOW_FILE_ACCESS, params.allowFileAccess)
            putExtra(EXTRA_USE_WIDE_VIEWPORT, params.useWideViewport)
            putExtra(EXTRA_LOAD_WITH_OVERVIEW, params.loadWithOverview)
            putExtra(EXTRA_SUPPORT_ZOOM, params.supportZoom)
            putExtra(EXTRA_DISPLAY_ZOOM_CONTROLS, params.displayZoomControls)
            putExtra(EXTRA_USE_BUILT_IN_ZOOM, params.useBuiltInZoom)
            putExtra(EXTRA_ALLOW_CONTENT_ACCESS, params.allowContentAccess)
            putExtra(EXTRA_SAVE_FORM_DATA, params.saveFormData)
            putExtra(EXTRA_GEOLOCATION_ENABLED, params.geolocationEnabled)
            putExtra(EXTRA_JAVASCRIPT_CAN_OPEN_WINDOWS, params.javaScriptCanOpenWindows)
            putExtra(EXTRA_MEDIA_PLAYBACK_REQUIRES_USER_GESTURE, params.mediaPlaybackRequiresUserGesture)
            putExtra(EXTRA_ALLOW_UNIVERSAL_ACCESS_FROM_FILE_URLS, params.allowUniversalAccessFromFileUrls)
            putExtra(EXTRA_ALLOW_FILE_ACCESS_FROM_FILE_URLS, params.allowFileAccessFromFileUrls)
        }
        startActivity(intent)
    }

    data class WebViewParameters(
        val headers: Map<String, String> = emptyMap(),
        val enableJavaScript: Boolean = true,
        val enableDomStorage: Boolean = true,
        val userAgent: String? = null,
        val allowFileAccess: Boolean = false,
        val useWideViewport: Boolean = true,
        val loadWithOverview: Boolean = true,
        val supportZoom: Boolean = true,
        val displayZoomControls: Boolean = true,
        val useBuiltInZoom: Boolean = true,
        val allowContentAccess: Boolean = true,
        val saveFormData: Boolean = true,
        val geolocationEnabled: Boolean = false,
        val javaScriptCanOpenWindows: Boolean = false,
        val mediaPlaybackRequiresUserGesture: Boolean = true,
        val allowUniversalAccessFromFileUrls: Boolean = false,
        val allowFileAccessFromFileUrls: Boolean = false
    )
}