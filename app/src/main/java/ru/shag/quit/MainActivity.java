package ru.shag.quit;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.WindowInsets;
import org.json.JSONObject;

public class MainActivity extends Activity {
    private WebView web;
    // JavaScript runs packaged assets only. Remote navigation is blocked, CSP denies
    // network requests and user text is escaped before insertion into the local UI.
    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(248,249,244));
        getWindow().setNavigationBarColor(Color.rgb(248,249,244));
        getWindow().getDecorView().setSystemUiVisibility(android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(248,249,244));
        try { applyAppearance("dark".equals(new JSONObject(getSharedPreferences("local", MODE_PRIVATE).getString("state", "{}")).optString("theme"))); }
        catch (Exception ignored) { applyAppearance(false); }
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowContentAccess(false);
        web.getSettings().setAllowFileAccess(true);
        web.getSettings().setAllowFileAccessFromFileURLs(false);
        web.getSettings().setAllowUniversalAccessFromFileURLs(false);
        web.addJavascriptInterface(new LocalBridge(), "Android");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equals(uri.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) {}
                }
                return true;
            }
        });
        setContentView(web);
        // Android 15 enforces edge-to-edge. Keep the local UI clear of system bars and keyboard.
        if (Build.VERSION.SDK_INT >= 30) web.setOnApplyWindowInsetsListener((view, insets) -> {
            android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime());
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return WindowInsets.CONSUMED;
        });
        web.loadUrl("file:///android_asset/index.html");
    }
    class LocalBridge {
        @JavascriptInterface public void setDarkMode(boolean dark) {
            runOnUiThread(() -> applyAppearance(dark));
        }
        @JavascriptInterface public String loadState() {
            return getSharedPreferences("local", MODE_PRIVATE).getString("state", "");
        }
        @JavascriptInterface public boolean saveState(String state) {
            return getSharedPreferences("local", MODE_PRIVATE).edit().putString("state", state).commit();
        }
        @JavascriptInterface public boolean reminderEnabled() {
            return getSharedPreferences("local", MODE_PRIVATE).getBoolean("reminder", false)
                && (Build.VERSION.SDK_INT < 33 || checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED);
        }
        @JavascriptInterface public void setReminder(boolean enabled) {
            runOnUiThread(() -> {
                if (enabled && Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 7);
                } else {
                    getSharedPreferences("local", MODE_PRIVATE).edit().putBoolean("reminder", enabled).apply();
                    ReminderReceiver.schedule(MainActivity.this, enabled);
                    web.evaluateJavascript("window.refreshReminder && window.refreshReminder()", null);
                }
            });
        }
    }
    private void applyAppearance(boolean dark) {
        int background = dark ? Color.rgb(21,28,23) : Color.rgb(248,249,244);
        getWindow().setStatusBarColor(background);
        getWindow().setNavigationBarColor(background);
        getWindow().getDecorView().setSystemUiVisibility(dark ? 0 : android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        if(web != null) web.setBackgroundColor(background);
    }
    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(code, permissions, results);
        if (code == 7) {
            boolean enabled = results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED;
            getSharedPreferences("local", MODE_PRIVATE).edit().putBoolean("reminder", enabled).apply();
            ReminderReceiver.schedule(this, enabled);
            web.evaluateJavascript("window.refreshReminder && window.refreshReminder()", null);
        }
    }
    @Override public void onBackPressed() { web.evaluateJavascript("window.handleBack && window.handleBack()", null); }
    @Override protected void onResume() {
        super.onResume();
        if(web != null) web.evaluateJavascript("window.onAppResume && window.onAppResume()", null);
    }
}
