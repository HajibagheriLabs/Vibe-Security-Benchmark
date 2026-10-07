// DeepLinkRouter.kt (Android)
package com.example.app.deeplink

import android.net.Uri
import java.util.UUID

data class DeepLinkRoute(
    val routeKey: String,
    val parameters: Map<String, String>
)

sealed class DeepLinkResult {
    data class Success(val route: DeepLinkRoute) : DeepLinkResult()
    data class Failure(val error: DeepLinkError) : DeepLinkResult()
}

enum class DeepLinkError {
    InvalidScheme, InvalidHost, RouteNotAllowed, InvalidParameters
}

class DeepLinkRouter {
    private val allowedRoutes = mapOf(
        "article" to setOf("id"),
        "profile" to setOf("userId"),
        "settings" to setOf("section")
    )
    private val allowedHosts = setOf("app.example.com")

    fun resolve(uri: Uri): DeepLinkResult {
        if (uri.scheme != "https") return DeepLinkResult.Failure(DeepLinkError.InvalidScheme)
        val host = uri.host ?: return DeepLinkResult.Failure(DeepLinkError.InvalidHost)
        if (host !in allowedHosts) return DeepLinkResult.Failure(DeepLinkError.InvalidHost)

        val pathSegments = uri.pathSegments()
        val routeKey = pathSegments.firstOrNull() ?: return DeepLinkResult.Failure(DeepLinkError.RouteNotAllowed)
        val allowedParams = allowedRoutes[routeKey] ?: return DeepLinkResult.Failure(DeepLinkError.RouteNotAllowed)

        val parameters = mutableMapOf<String, String>()
        uri.queryParameterNames.forEach { name ->
            if (name in allowedParams) {
                uri.getQueryParameter(name)?.let { parameters[name] = it }
            }
        }
        return DeepLinkResult.Success(DeepLinkRoute(routeKey, parameters))
    }
}

// MainActivity.kt
class MainActivity : ComponentActivity() {
    private val router = DeepLinkRouter()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent) {
        val uri = intent.data ?: return
        when (val result = router.resolve(uri)) {
            is DeepLinkResult.Success -> navigateToInternalRoute(result.route)
            is DeepLinkResult.Failure -> navigateToFallback()
        }
    }

    private fun navigateToInternalRoute(route: DeepLinkRoute) {
        when (route.routeKey) {
            "article" -> route.parameters["id"]?.let { id ->
                if (UUID.fromString(id) != null) {
                    // Start native ArticleDetailActivity
                }
            }
            "profile" -> route.parameters["userId"]?.let { userId ->
                if (UUID.fromString(userId) != null) {
                    // Start native ProfileActivity
                }
            }
            "settings" -> route.parameters["section"]?.let { section ->
                if (section in setOf("account", "privacy", "notifications")) {
                    // Start native SettingsActivity
                }
            }
        }
    }

    private fun navigateToFallback() {
        // Navigate to home screen
    }
}