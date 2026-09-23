package com.applooma.samples.ui

import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import com.applooma.rtc.AppEngine
import com.applooma.rtc.AppEngineOptions
import com.applooma.rtc.AppEventHandler
import com.applooma.rtc.AppRemoteUser
import com.applooma.rtc.AppVideoView
import com.applooma.samples.BuildConfig

/**
 * One engine for the lifetime of a screen, released when the screen leaves.
 * Handler callbacks arrive on the main thread, so they can write Compose state.
 */
@Composable
fun rememberEngine(options: AppEngineOptions, handler: AppEventHandler): AppEngine {
    val context = LocalContext.current
    val engine = remember { AppEngine.create(context.applicationContext, BuildConfig.APP_ID, handler, options) }
    DisposableEffect(engine) { onDispose { engine.destroy() } }
    return engine
}

/** A remote user's camera. The view attaches itself once the track arrives. */
@Composable
fun RemoteVideo(engine: AppEngine, user: AppRemoteUser, modifier: Modifier = Modifier) {
    key(user.uid) {
        AndroidView(factory = { AppVideoView(it).apply { attach(engine, user) } }, modifier = modifier, onRelease = { it.detach() })
    }
}

/** Your own camera. Follows off→on and camera switches by itself. */
@Composable
fun LocalVideo(engine: AppEngine, modifier: Modifier = Modifier) {
    AndroidView(factory = { AppVideoView(it).apply { attachLocal(engine) } }, modifier = modifier, onRelease = { it.detach() })
}

val AppRemoteUser.name: String get() = (attributes["name"] as? String) ?: uid
