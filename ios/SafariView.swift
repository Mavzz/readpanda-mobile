//
//  SafariView.swift
//  ReadPanda
//
//  Shows a web page (the Terms and Privacy Policy, src/utils/legalLinks.js)
//  in SFSafariViewController, so the reader reads it without leaving the app
//  and lands back where they were on Done.
//

import Foundation
import React
import SafariServices

@objc(SafariView)
class SafariView: NSObject {

    @objc static func requiresMainQueueSetup() -> Bool {
        return false
    }

    @objc(open:resolver:rejecter:)
    func open(
        _ urlString: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        // SFSafariViewController throws on anything but http(s).
        guard let url = URL(string: urlString), ["http", "https"].contains(url.scheme?.lowercased() ?? "") else {
            reject("bad_url", "Not a web address: \(urlString)", nil)
            return
        }
        DispatchQueue.main.async {
            // The topmost controller, so it also works over form sheets like
            // the paywall.
            guard let presenter = RCTPresentedViewController() else {
                reject("no_presenter", "Nothing on screen to present from", nil)
                return
            }
            // A second tap while the first page is still sliding in.
            if presenter is SFSafariViewController {
                resolve(nil)
                return
            }
            let safari = SFSafariViewController(url: url)
            safari.dismissButtonStyle = .done
            safari.preferredControlTintColor = DS.Colors.primary
            safari.preferredBarTintColor = DS.Colors.background
            presenter.present(safari, animated: true)
            resolve(nil)
        }
    }
}
