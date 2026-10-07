// DeepLinkRouter.swift
import Foundation

struct DeepLinkRoute: Equatable {
    let routeKey: String
    let parameters: [String: String]
}

enum DeepLinkError: Error {
    case invalidScheme, invalidHost, routeNotAllowed, invalidParameters
}

final class DeepLinkRouter {
    private let allowedRoutes: [String: Set<String>] = [
        "article": ["id"],
        "profile": ["userId"],
        "settings": ["section"]
    ]
    private let allowedHosts = Set(["app.example.com"])

    func resolve(url: URL) throws -> DeepLinkRoute {
        guard url.scheme == "https" else { throw DeepLinkError.invalidScheme }
        guard let host = url.host, allowedHosts.contains(host) else { throw DeepLinkError.invalidHost }
        let pathComponents = url.pathComponents.filter { $0 != "/" }
        guard let routeKey = pathComponents.first, allowedRoutes.keys.contains(routeKey) else {
            throw DeepLinkError.routeNotAllowed
        }
        let allowedParams = allowedRoutes[routeKey]!
        var parameters: [String: String] = [:]
        if let query = url.query {
            for item in URLQueryItem.parse(query) {
                guard allowedParams.contains(item.name) else { continue }
                parameters[item.name] = item.value ?? ""
            }
        }
        return DeepLinkRoute(routeKey: routeKey, parameters: parameters)
    }
}

extension URLQueryItem {
    static func parse(_ query: String) -> [URLQueryItem] {
        return query.split(separator: "&").compactMap { pair in
            let kv = pair.split(separator: "=", maxSplits: 1).map(String.init)
            guard kv.count == 2 else { return nil }
            return URLQueryItem(name: kv[0].removingPercentEncoding ?? kv[0],
                                value: kv[1].removingPercentEncoding ?? kv[1])
        }
    }
}