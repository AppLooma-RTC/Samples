package com.applooma.samples.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.applooma.samples.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

// ------------------------------------------------------------------ config & tokens

/** The person using this device. A real app takes this from its own sign-in. */
object Me {
    val id = "u" + java.lang.Long.toString((Math.random() * Int.MAX_VALUE).toLong(), 36)
    var name = "Guest " + id.substring(1, 4).uppercase()
}

data class Token(val token: String, val wsUrl: String)

/** Ask YOUR token server for a token. The API secret never reaches the app. */
suspend fun fetchToken(room: String, role: String): Token = withContext(Dispatchers.IO) {
    val conn = URL(BuildConfig.TOKEN_URL).openConnection() as HttpURLConnection
    conn.requestMethod = "POST"
    conn.doOutput = true
    conn.connectTimeout = 10_000
    conn.setRequestProperty("Content-Type", "application/json")
    conn.outputStream.use {
        it.write(JSONObject().put("room", room).put("identity", Me.id).put("name", Me.name).put("role", role).toString().toByteArray())
    }
    val ok = conn.responseCode == 200
    val body = JSONObject((if (ok) conn.inputStream else conn.errorStream).bufferedReader().readText())
    if (!ok) error(body.optString("error", "Token server answered ${conn.responseCode}"))
    Token(body.getString("token"), body.getString("wsUrl"))
}

fun cleanRoom(s: String) = s.trim().replace(Regex("[^a-zA-Z0-9_-]"), "-").take(40).ifEmpty { "lobby" }

// ------------------------------------------------------------------ design system

object C {
    val ink = Color(0xFF07070D)
    val glass = Color(0x12FFFFFF)
    val glass2 = Color(0x1FFFFFFF)
    val line = Color(0x17FFFFFF)
    val text = Color(0xFFF5F5FA)
    val muted = Color(0xFF9A9AB0)
    val violet = Color(0xFF7C5CFF)
    val pink = Color(0xFFFF4FA3)
    val live = Color(0xFFFF3B5C)
    val gold = Color(0xFFFFC24B)
    val green = Color(0xFF2EE59D)
    val brand = Brush.linearGradient(listOf(violet, pink))
}

private val gradients = listOf(
    0xFF7C5CFF to 0xFFFF4FA3, 0xFF13B58A to 0xFF0E6F78, 0xFFFF9A3C to 0xFFFF4F7A, 0xFF3C8DFF to 0xFF7C5CFF,
    0xFFFF4F7A to 0xFFFFC24B, 0xFF00C2D1 to 0xFF2EE59D, 0xFFB04BFF to 0xFF5A3CFF, 0xFFFF6B3C to 0xFFFF3B5C,
)

fun gradientFor(key: String): Brush {
    var h = 0
    for (c in key) h = (h * 31 + c.code) and 0x7fffffff
    val (a, b) = gradients[h % gradients.size]
    return Brush.linearGradient(listOf(Color(a), Color(b)))
}
