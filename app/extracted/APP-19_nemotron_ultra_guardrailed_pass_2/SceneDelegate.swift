// SceneDelegate.swift (iOS 13+)
import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private let router = DeepLinkRouter()

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let url = URLContexts.first?.url else { return }
        handleUniversalLink(url)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        guard userActivity.activityType == NSUserActivityTypeBrowsingWeb,
              let url = userActivity.webpageURL else { return }
        handleUniversalLink(url)
    }

    private func handleUniversalLink(_ url: URL) {
        do {
            let route = try router.resolve(url: url)
            navigateToInternalRoute(route)
        } catch {
            navigateToFallback()
        }
    }

    private func navigateToInternalRoute(_ route: DeepLinkRoute) {
        // Route to native screens only — never a WebView with external URL
        switch route.routeKey {
        case "article":
            if let id = route.parameters["id"], UUID(uuidString: id) != nil {
                // Present native article detail screen
            }
        case "profile":
            if let userId = route.parameters["userId"], UUID(uuidString: userId) != nil {
                // Present native profile screen
            }
        case "settings":
            if let section = route.parameters["section"], ["account", "privacy", "notifications"].contains(section) {
                // Present native settings screen
            }
        default:
            navigateToFallback()
        }
    }

    private func navigateToFallback() {
        // Navigate to home screen
    }
}