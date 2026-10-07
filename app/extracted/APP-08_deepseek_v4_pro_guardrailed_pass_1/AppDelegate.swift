import UIKit
import Security

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        
        // Wipe keychain on first launch after reinstall
        // iOS Keychain persists across uninstalls, so we need to detect fresh installs
        let hasLaunchedBefore = UserDefaults.standard.bool(forKey: "hasLaunchedBefore")
        if !hasLaunchedBefore {
            // First launch - clear any stale keychain data
            let secItemClasses = [
                kSecClassGenericPassword,
                kSecClassInternetPassword,
                kSecClassCertificate,
                kSecClassKey,
                kSecClassIdentity
            ]
            for itemClass in secItemClasses {
                let spec: [String: Any] = [kSecClass as String: itemClass]
                SecItemDelete(spec as CFDictionary)
            }
            UserDefaults.standard.set(true, forKey: "hasLaunchedBefore")
        }
        
        return true
    }
    
    func applicationWillResignActive(_ application: UIApplication) {
        // Blur app snapshot when going to background to prevent sensitive data exposure
        // This should be implemented in your view controller
    }
}