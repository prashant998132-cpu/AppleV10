// ios/App/App/plugins/SystemControlPlugin.swift
// iOS ke liye custom plugin

import Foundation
import Capacitor
import UIKit
import AVFoundation

@objc(SystemControlPlugin)
public class SystemControlPlugin: CAPPlugin {
    
    // Volume control
    @objc func setVolume(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            // iOS mein volume control limited hai
            call.resolve()
        }
    }
    
    // Settings open karo
    @objc func openSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let url = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(url)
            }
            call.resolve()
        }
    }
    
    // Number dial karo
    @objc func dialNumber(_ call: CAPPluginCall) {
        guard let number = call.getString("number") else {
            call.reject("number required"); return
        }
        DispatchQueue.main.async {
            let clean = number.components(separatedBy: CharacterSet.decimalDigits.inverted).joined()
            if let url = URL(string: "tel://\(clean)") {
                UIApplication.shared.open(url)
            }
            call.resolve()
        }
    }
    
    // Deep link open karo
    @objc func openDeepLink(_ call: CAPPluginCall) {
        guard let urlStr = call.getString("url"),
              let url = URL(string: urlStr) else {
            call.reject("invalid url"); return
        }
        DispatchQueue.main.async {
            UIApplication.shared.open(url, options: [:]) { success in
                if success { call.resolve() }
                else { call.reject("Cannot open URL") }
            }
        }
    }
}
