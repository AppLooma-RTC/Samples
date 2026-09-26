package com.applooma.samples.java;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.view.View;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;

import com.applooma.samples.java.databinding.ActivityMainBinding;
import com.applooma.samples.java.databinding.CardBinding;
import com.applooma.uikit.AppLoomaUiKit;

import java.util.Map;

/**
 * Home screen. Each card opens one ready-made UIKit screen with a single call —
 * the UIKit handles the room, the media and the whole UI.
 */
public class MainActivity extends AppCompatActivity {
    private ActivityMainBinding b;
    private Runnable pending;

    private final ActivityResultLauncher<String[]> permissions =
            registerForActivityResult(new ActivityResultContracts.RequestMultiplePermissions(), (Map<String, Boolean> granted) -> {
                // BLUETOOTH_CONNECT (Android 12+) is asked for so earbuds
                // work; refusing it does not stop the join.
                boolean all = true;
                for (Map.Entry<String, Boolean> e : granted.entrySet())
                    if (!Manifest.permission.BLUETOOTH_CONNECT.equals(e.getKey())) all &= e.getValue();
                if (all && pending != null) pending.run();
            });

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        b = ActivityMainBinding.inflate(getLayoutInflater());
        setContentView(b.getRoot());
        b.name.setText(App.userName);
        if ("YOUR_APP_ID".equals(BuildConfig.APP_ID)) b.note.setVisibility(View.VISIBLE);

        card(b.cardLive, R.drawable.bg_card_live, R.drawable.ic_sensors, "Live Streaming", "Go live · watch · chat · gifts",
                () -> AppLoomaUiKit.openLiveStream(this, "live-" + room()), true);
        card(b.cardVoice, R.drawable.bg_card_voice, R.drawable.ic_waves, "Voice Room", "8 seats · speaking rings",
                () -> AppLoomaUiKit.openVoiceRoom(this, "voice-" + room(), 8), false);
        card(b.cardAudio, R.drawable.bg_card_audio, R.drawable.ic_phone, "Voice Call", "1-to-1 · HD audio",
                () -> AppLoomaUiKit.openCall(this, "acall-" + room(), false), false);
        card(b.cardVideo, R.drawable.bg_card_video, R.drawable.ic_video, "Video Call", "1-to-1 · 1080p",
                () -> AppLoomaUiKit.openCall(this, "vcall-" + room(), true), true);
    }

    private void card(CardBinding c, int bg, int icon, String title, String sub, Runnable open, boolean camera) {
        c.getRoot().setBackgroundResource(bg);
        c.icon.setImageResource(icon);
        c.title.setText(title);
        c.sub.setText(sub);
        c.getRoot().setOnClickListener(v -> {
            String name = b.name.getText().toString().trim();
            if (!name.isEmpty()) { App.userName = name; App.configure(); }
            // The UIKit screens ask for permission themselves too; asking here
            // first keeps the first join from waiting on a dialog.
            java.util.List<String> wanted = new java.util.ArrayList<>();
            wanted.add(Manifest.permission.RECORD_AUDIO);
            if (camera) wanted.add(Manifest.permission.CAMERA);
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) wanted.add(Manifest.permission.BLUETOOTH_CONNECT);
            boolean have = true;
            for (String p : wanted) have &= ContextCompat.checkSelfPermission(this, p) == PackageManager.PERMISSION_GRANTED;
            if (have) open.run(); else { pending = open; permissions.launch(wanted.toArray(new String[0])); }
        });
    }

    /** Room names must match [a-zA-Z0-9_-]{1,64}. */
    private String room() {
        String r = b.room.getText().toString().trim().replaceAll("[^a-zA-Z0-9_-]", "-");
        if (r.length() > 40) r = r.substring(0, 40);
        return r.isEmpty() ? "lobby" : r;
    }
}
