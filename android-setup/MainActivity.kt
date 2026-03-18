// android/app/src/main/java/com/jarvis/personalai/MainActivity.kt
// Is file ko Android project mein copy karo

package com.jarvis.personalai

import android.os.Bundle
import android.media.AudioManager
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import com.getcapacitor.BridgeActivity
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.JSObject
import com.getcapacitor.JSArray

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(SystemControlPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}

// Custom Plugin — System Control
@CapacitorPlugin(name = "SystemControl")
class SystemControlPlugin : Plugin() {

    // Volume set karo (0-100)
    @PluginMethod
    fun setVolume(call: PluginCall) {
        val level = call.getInt("level", 50)!!
        val streamType = when(call.getString("type", "music")) {
            "ring"         -> AudioManager.STREAM_RING
            "notification" -> AudioManager.STREAM_NOTIFICATION
            "alarm"        -> AudioManager.STREAM_ALARM
            else           -> AudioManager.STREAM_MUSIC
        }
        val audioManager = context.getSystemService(android.content.Context.AUDIO_SERVICE) as AudioManager
        val maxVol = audioManager.getStreamMaxVolume(streamType)
        audioManager.setStreamVolume(streamType, (level * maxVol / 100), 0)
        call.resolve()
    }

    // Mute karo
    @PluginMethod
    fun setRingerMode(call: PluginCall) {
        val audioManager = context.getSystemService(android.content.Context.AUDIO_SERVICE) as AudioManager
        audioManager.ringerMode = when(call.getString("mode", "normal")) {
            "silent"  -> AudioManager.RINGER_MODE_SILENT
            "vibrate" -> AudioManager.RINGER_MODE_VIBRATE
            else      -> AudioManager.RINGER_MODE_NORMAL
        }
        call.resolve()
    }

    // WiFi Settings kholne
    @PluginMethod
    fun openWifiSettings(call: PluginCall) {
        val intent = Intent(Settings.ACTION_WIFI_SETTINGS).also { it.flags = Intent.FLAG_ACTIVITY_NEW_TASK }
        context.startActivity(intent)
        call.resolve()
    }

    // Bluetooth Settings
    @PluginMethod
    fun openBluetoothSettings(call: PluginCall) {
        val intent = Intent(Settings.ACTION_BLUETOOTH_SETTINGS).also { it.flags = Intent.FLAG_ACTIVITY_NEW_TASK }
        context.startActivity(intent)
        call.resolve()
    }

    // Number dial karo
    @PluginMethod
    fun dialNumber(call: PluginCall) {
        val number = call.getString("number") ?: return call.reject("number required")
        val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$number")).also { it.flags = Intent.FLAG_ACTIVITY_NEW_TASK }
        context.startActivity(intent)
        call.resolve()
    }

    // App open karo package name se
    @PluginMethod
    fun openApp(call: PluginCall) {
        val pkg = call.getString("package") ?: return call.reject("package required")
        val intent = context.packageManager.getLaunchIntentForPackage(pkg)
        if (intent != null) {
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            context.startActivity(intent)
            call.resolve()
        } else {
            call.reject("App not installed: $pkg")
        }
    }

    // Installed apps list
    @PluginMethod
    fun getInstalledApps(call: PluginCall) {
        val pm = context.packageManager
        val apps = pm.getInstalledApplications(0)
            .filter { pm.getLaunchIntentForPackage(it.packageName) != null }
            .map { mapOf("package" to it.packageName, "name" to pm.getApplicationLabel(it).toString()) }
        val arr = JSArray()
        apps.forEach {
            val obj = JSObject()
            obj.put("package", it["package"])
            obj.put("name", it["name"])
            arr.put(obj)
        }
        val ret = JSObject()
        ret.put("apps", arr)
        call.resolve(ret)
    }

    // Deep Link / Intent URL open karo
    @PluginMethod
    fun openDeepLink(call: PluginCall) {
        val url = call.getString("url") ?: return call.reject("url required")
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).also { it.flags = Intent.FLAG_ACTIVITY_NEW_TASK }
            context.startActivity(intent)
            call.resolve()
        } catch (e: Exception) {
            call.reject("Cannot open: $url — ${e.message}")
        }
    }

    // Display Settings
    @PluginMethod
    fun openDisplaySettings(call: PluginCall) {
        val intent = Intent(Settings.ACTION_DISPLAY_SETTINGS).also { it.flags = Intent.FLAG_ACTIVITY_NEW_TASK }
        context.startActivity(intent)
        call.resolve()
    }
}
