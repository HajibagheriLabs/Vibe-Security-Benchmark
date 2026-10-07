// ios/AppDelegate.swift (excerpt — exclude DB from iCloud/iTunes backup)
import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Exclude the SQLite database from device backups.
        let fileManager = FileManager.default
        if let docsDir = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first {
            let dbPath = docsDir.appendingPathComponent("user_profiles.db").path
            var url = URL(fileURLWithPath: dbPath)
            var resourceValues = URLResourceValues()
            resourceValues.isExcludedFromBackup = true
            try? url.setResourceValues(resourceValues)
        }
        return true
    }
}