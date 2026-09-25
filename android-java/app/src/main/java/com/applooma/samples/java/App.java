package com.applooma.samples.java;

import android.app.Application;

import com.applooma.uikit.AppLoomaKit;
import com.applooma.uikit.AppLoomaUiKit;
import com.applooma.uikit.KitToken;
import com.applooma.uikit.KitUser;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Scanner;

/**
 * One-time setup: tell the UIKit who the user is and how to get a token.
 *
 * The token provider runs on a background thread, so it can block on an HTTP
 * call to YOUR server. The API secret never ships inside the app.
 */
public class App extends Application {
    /** The person using this device. A real app takes this from its own sign-in. */
    public static final String USER_ID = "u" + Long.toString((long) (Math.random() * Integer.MAX_VALUE), 36);
    public static String userName = "Guest " + USER_ID.substring(1, 4).toUpperCase();

    @Override public void onCreate() {
        super.onCreate();
        configure();
    }

    /** Called again after the user edits their name on the home screen. */
    public static void configure() {
        AppLoomaUiKit.setup(new AppLoomaKit(BuildConfig.APP_ID, new KitUser(USER_ID, userName, null), (room, role, user) -> {
            HttpURLConnection conn = (HttpURLConnection) new URL(BuildConfig.TOKEN_URL).openConnection();
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setConnectTimeout(10_000);
            conn.setRequestProperty("Content-Type", "application/json");
            if (!BuildConfig.TOKEN_KEY.isEmpty()) conn.setRequestProperty("x-sample-key", BuildConfig.TOKEN_KEY);
            String body = new JSONObject()
                    .put("room", room).put("identity", user.getId()).put("name", user.getName()).put("role", role)
                    .toString();
            try (OutputStream out = conn.getOutputStream()) { out.write(body.getBytes("UTF-8")); }
            boolean ok = conn.getResponseCode() == 200;
            String text;
            try (Scanner s = new Scanner(ok ? conn.getInputStream() : conn.getErrorStream(), "UTF-8").useDelimiter("\\A")) { text = s.hasNext() ? s.next() : "{}"; }
            JSONObject json = new JSONObject(text);
            if (!ok) throw new Exception(json.optString("error", "Token server answered " + conn.getResponseCode()));
            return new KitToken(json.getString("token"), json.getString("wsUrl"));
        }));
    }
}
