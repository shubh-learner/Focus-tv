package com.focus.tv;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;

public class MainActivity extends Activity {
    private static final String PREFS = "focus";
    private static final String KEY_URL = "server_url";
    private static final String DEFAULT_URL = "http://192.168.1.28:3000/tv";

    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);

        webView = new WebView(this);
        webView.setBackgroundColor(0xFF0B0A0F);
        webView.setKeepScreenOn(true);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        WebView.setWebContentsDebuggingEnabled(true);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        setContentView(webView);

        String url = preferences().getString(KEY_URL, "");
        if (url.isEmpty()) {
            showUrlDialog(DEFAULT_URL);
        } else {
            webView.loadUrl(url);
        }
    }

    private SharedPreferences preferences() {
        return getSharedPreferences(PREFS, MODE_PRIVATE);
    }

    private void showUrlDialog(String current) {
        EditText input = new EditText(this);
        input.setText(current);
        input.setSingleLine(true);

        new AlertDialog.Builder(this)
                .setTitle(R.string.server_url_title)
                .setView(input)
                .setPositiveButton(R.string.save, (dialog, which) -> {
                    String url = input.getText().toString().trim();
                    if (url.isEmpty()) {
                        url = DEFAULT_URL;
                    } else if (!url.startsWith("http://") && !url.startsWith("https://")) {
                        url = "http://" + url;
                    }
                    saveAndLoad(url);
                })
                .setNegativeButton(R.string.cancel, (dialog, which) -> loadSavedOrDefault())
                .setOnCancelListener(dialog -> loadSavedOrDefault())
                .show();
    }

    private void loadSavedOrDefault() {
        saveAndLoad(preferences().getString(KEY_URL, DEFAULT_URL));
    }

    private void saveAndLoad(String url) {
        preferences().edit().putString(KEY_URL, url).apply();
        webView.loadUrl(url);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_MENU) {
            showUrlDialog(preferences().getString(KEY_URL, DEFAULT_URL));
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    public boolean onKeyLongPress(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            showUrlDialog(preferences().getString(KEY_URL, DEFAULT_URL));
            return true;
        }
        return super.onKeyLongPress(keyCode, event);
    }

    @Override
    public void onBackPressed() {
        webView.evaluateJavascript(
                "window.__focusBack ? window.__focusBack() : false",
                value -> {
                    if ("true".equals(value)) {
                        return;
                    }
                    if (webView.canGoBack()) {
                        webView.goBack();
                    } else {
                        finish();
                    }
                });
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
