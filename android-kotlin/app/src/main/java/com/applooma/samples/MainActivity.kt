package com.applooma.samples

import android.Manifest
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.applooma.samples.ui.*
import com.applooma.uikit.AppLoomaCall
import com.applooma.uikit.AppLoomaKit
import com.applooma.uikit.AppLoomaLiveStream
import com.applooma.uikit.AppLoomaVoiceRoom
import com.applooma.uikit.KitToken
import com.applooma.uikit.KitUser

sealed interface Route {
    data object Home : Route
    data class Live(val room: String) : Route
    data class Voice(val room: String) : Route
    data class Call(val room: String, val video: Boolean) : Route
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MaterialTheme(colorScheme = darkColorScheme(primary = C.violet, secondary = C.pink, background = C.ink, surface = C.ink)) {
                var route by remember { mutableStateOf<Route>(Route.Home) }
                val home = { route = Route.Home }
                BackHandler(enabled = route != Route.Home, onBack = home)
                // Every screen is one composable from the UIKit; the kit carries
                // App ID, user and a token provider that calls YOUR server.
                val kit = remember { AppLoomaKit(BuildConfig.APP_ID, KitUser(Me.id, Me.name)) { room, role, user ->
                    val t = fetchToken(room, role); KitToken(t.token, t.wsUrl)
                } }
                when (val r = route) {
                    Route.Home -> HomeScreen { route = it }
                    is Route.Live -> AppLoomaLiveStream(kit, r.room, onLeave = home)
                    is Route.Voice -> AppLoomaVoiceRoom(kit, r.room, seats = 8, onLeave = home)
                    is Route.Call -> AppLoomaCall(kit, r.room, video = r.video, onLeave = home)
                }
            }
        }
    }
}

@Composable
fun HomeScreen(open: (Route) -> Unit) {
    var name by remember { mutableStateOf(Me.name) }
    var room by remember { mutableStateOf("demo") }
    var pending by remember { mutableStateOf<Route?>(null) }
    val permissions = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { granted ->
        if (granted.values.all { it }) pending?.let(open)
    }
    fun go(r: Route, camera: Boolean) {
        if (name.isNotBlank()) Me.name = name.trim()
        pending = r
        permissions.launch(if (camera) arrayOf(Manifest.permission.RECORD_AUDIO, Manifest.permission.CAMERA) else arrayOf(Manifest.permission.RECORD_AUDIO))
    }
    val code = cleanRoom(room)

    Box(Modifier.fillMaxSize().background(C.ink).background(Brush.radialGradient(listOf(C.violet.copy(alpha = 0.28f), Color.Transparent), radius = 1100f, center = androidx.compose.ui.geometry.Offset(0f, 0f)))) {
        Column(Modifier.fillMaxSize().systemBarsPadding().verticalScroll(rememberScrollState()).padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(42.dp).shadow(20.dp, RoundedCornerShape(13.dp), spotColor = C.violet).clip(RoundedCornerShape(13.dp)).background(C.brand), contentAlignment = Alignment.Center) {
                    Text("A", color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp)
                }
                Column(Modifier.padding(start = 12.dp)) {
                    Text("AppLooma RTC", color = C.text, fontSize = 19.sp, fontWeight = FontWeight.ExtraBold)
                    Text("Sample app · Kotlin · built on the UIKit", color = C.muted, fontSize = 12.5.sp)
                }
            }
            Text(
                buildAnnotatedString {
                    append("Real-time,\n")
                    withStyle(SpanStyle(brush = C.brand)) { append("beautifully") }
                    append(" simple.")
                },
                color = C.text, fontSize = 30.sp, lineHeight = 34.sp, fontWeight = FontWeight.ExtraBold, modifier = Modifier.padding(top = 22.dp),
            )
            if (BuildConfig.APP_ID == "YOUR_APP_ID") {
                Text("Build with -PappId=… and -PtokenUrl=… — see README.", color = C.text, fontSize = 13.sp,
                    modifier = Modifier.padding(top = 14.dp).fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(C.glass).padding(12.dp))
            }
            Row(Modifier.padding(top = 22.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Field("YOUR NAME", name, { name = it }, Modifier.weight(1f))
                Field("ROOM / CALL CODE", room, { room = it }, Modifier.weight(1f))
            }
            Spacer(Modifier.height(18.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Card("Live Streaming", "Go live · watch · chat · gifts", Icons.Rounded.Sensors, listOf(0xFFFF3B5C, 0xFFFF4FA3, 0xFF7C5CFF), Modifier.weight(1f)) { go(Route.Live("live-$code"), true) }
                Card("Voice Room", "8 seats · speaking rings", Icons.Rounded.GraphicEq, listOf(0xFF7C5CFF, 0xFF4B3CC9, 0xFF1F1A4D), Modifier.weight(1f)) { go(Route.Voice("voice-$code"), false) }
            }
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Card("Voice Call", "1-to-1 · HD audio", Icons.Rounded.Call, listOf(0xFF13B58A, 0xFF0E6F78, 0xFF0C2A3A), Modifier.weight(1f)) { go(Route.Call("acall-$code", false), false) }
                Card("Video Call", "1-to-1 · 1080p", Icons.Rounded.Videocam, listOf(0xFFFF9A3C, 0xFFFF4F7A, 0xFF5A1D52), Modifier.weight(1f)) { go(Route.Call("vcall-$code", true), true) }
            }
            Text("Open the same room on a second device to talk to yourself.", color = C.muted, fontSize = 11.5.sp,
                textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(top = 16.dp))
        }
    }
}

@Composable
private fun Field(label: String, value: String, onChange: (String) -> Unit, modifier: Modifier) {
    Column(modifier) {
        Text(label, color = C.muted, fontSize = 11.5.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 6.dp))
        BasicTextField(
            value, { if (it.length <= 24) onChange(it) }, singleLine = true,
            textStyle = TextStyle(color = C.text, fontSize = 15.sp), cursorBrush = SolidColor(C.violet),
            modifier = Modifier.fillMaxWidth().height(50.dp).clip(RoundedCornerShape(15.dp)).background(C.glass)
                .border(1.dp, C.line, RoundedCornerShape(15.dp)).padding(horizontal = 16.dp, vertical = 15.dp),
        )
    }
}

@Composable
private fun Card(title: String, sub: String, icon: ImageVector, colors: List<Long>, modifier: Modifier, onClick: () -> Unit) {
    Box(
        modifier.aspectRatio(0.98f).clip(RoundedCornerShape(22.dp))
            .background(Brush.linearGradient(colors.map { Color(it) })).border(1.dp, C.line, RoundedCornerShape(22.dp)).clickable(onClick = onClick),
    ) {
        Box(Modifier.offset(x = 90.dp, y = (-30).dp).size(120.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.12f)))
        Column(Modifier.fillMaxSize().padding(16.dp)) {
            Box(Modifier.size(44.dp).clip(RoundedCornerShape(14.dp)).background(Color.White.copy(alpha = 0.18f)), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = Color.White)
            }
            Spacer(Modifier.weight(1f))
            Text(title, color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
            Text(sub, color = Color.White.copy(alpha = 0.8f), fontSize = 12.sp, modifier = Modifier.padding(top = 2.dp))
        }
    }
}
