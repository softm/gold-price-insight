package com.softm.goldsignal;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import java.io.IOException;
import java.io.InputStream;
import java.net.URLConnection;

public class MainActivity extends Activity {
    private static final String REMOTE_HOME = "https://softm.github.io/gold-price-insight/";
    private static final String LOCAL_HOME = "https://appassets.androidplatform.net/assets/index.html";
    private static final String TRUSTED_HOST = "softm.github.io";
    private static final String ASSET_HOST = "appassets.androidplatform.net";

    private WebView webView;
    private ProgressBar progress;
    private LinearLayout errorView;
    private boolean usingOfflineCopy;

    @Override
    @SuppressWarnings("deprecation")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(0xff191a16);
        getWindow().setNavigationBarColor(0xfff2f0e9);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(0xfff2f0e9);

        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.getProgressDrawable().setTint(0xffc79a35);
        root.addView(progress, new LinearLayout.LayoutParams(-1, 5));

        errorView = createErrorView();
        root.addView(errorView, new LinearLayout.LayoutParams(-1, -2));
        errorView.setVisibility(View.GONE);

        webView = new WebView(this);
        root.addView(webView, new LinearLayout.LayoutParams(-1, 0, 1));
        setContentView(root);

        configureWebView();
        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            loadHome();
        }

        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                this::handleBack
            );
        }
    }

    private LinearLayout createErrorView() {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(36, 60, 36, 36);

        TextView title = new TextView(this);
        title.setText(R.string.offline_title);
        title.setTextSize(20);
        title.setTextColor(0xff191a16);
        panel.addView(title);

        TextView message = new TextView(this);
        message.setText(R.string.offline_message);
        message.setTextSize(14);
        message.setTextColor(0xff55584e);
        message.setPadding(0, 12, 0, 18);
        panel.addView(message);

        Button retry = new Button(this);
        retry.setText(R.string.retry);
        retry.setOnClickListener(view -> loadHome());
        panel.addView(retry);
        return panel;
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        WebView.setWebContentsDebuggingEnabled(
            (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0
        );

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setUserAgentString(settings.getUserAgentString() + " GoldSignalAndroid/1.0");
        if (Build.VERSION.SDK_INT >= 26) settings.setSafeBrowsingEnabled(true);

        CookieManager.getInstance().setAcceptCookie(false);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return route(request.getUrl());
            }

            @Override
            @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return route(Uri.parse(url));
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse local = localAsset(request.getUrl());
                return local != null ? local : super.shouldInterceptRequest(view, request);
            }

            @Override
            @SuppressWarnings("deprecation")
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                WebResourceResponse local = localAsset(Uri.parse(url));
                return local != null ? local : super.shouldInterceptRequest(view, url);
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                progress.setVisibility(View.VISIBLE);
                errorView.setVisibility(View.GONE);
                webView.setVisibility(View.VISIBLE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                progress.setVisibility(View.GONE);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) recoverOrShowError();
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 400) recoverOrShowError();
            }
        });
    }

    private boolean route(Uri uri) {
        if (uri == null) return true;
        String scheme = uri.getScheme();
        if (("https".equals(scheme) || "http".equals(scheme))
            && (TRUSTED_HOST.equalsIgnoreCase(uri.getHost()) || ASSET_HOST.equalsIgnoreCase(uri.getHost()))) {
            return false;
        }

        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException error) {
            Toast.makeText(this, R.string.no_browser, Toast.LENGTH_LONG).show();
        }
        return true;
    }

    private WebResourceResponse localAsset(Uri uri) {
        if (uri == null || !ASSET_HOST.equalsIgnoreCase(uri.getHost())) return null;
        String path = uri.getPath();
        if (path == null || !path.startsWith("/assets/")) return null;
        String assetPath = path.substring("/assets/".length());
        if (assetPath.isEmpty()) assetPath = "index.html";
        try {
            InputStream stream = getAssets().open(assetPath);
            String mimeType = URLConnection.guessContentTypeFromName(assetPath);
            if (mimeType == null && assetPath.endsWith(".webmanifest")) mimeType = "application/manifest+json";
            if (mimeType == null && assetPath.endsWith(".json")) mimeType = "application/json";
            if (mimeType == null && assetPath.endsWith(".js")) mimeType = "application/javascript";
            if (mimeType == null && assetPath.endsWith(".svg")) mimeType = "image/svg+xml";
            if (mimeType == null) mimeType = "application/octet-stream";
            return new WebResourceResponse(mimeType, "UTF-8", stream);
        } catch (IOException ignored) {
            return null;
        }
    }

    private boolean hasInternet() {
        ConnectivityManager manager = getSystemService(ConnectivityManager.class);
        if (manager == null) return false;
        Network network = manager.getActiveNetwork();
        if (network == null) return false;
        NetworkCapabilities capabilities = manager.getNetworkCapabilities(network);
        return capabilities != null && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
    }

    private void loadHome() {
        errorView.setVisibility(View.GONE);
        webView.setVisibility(View.VISIBLE);
        usingOfflineCopy = !hasInternet();
        webView.loadUrl(usingOfflineCopy ? LOCAL_HOME : REMOTE_HOME);
    }

    private void recoverOrShowError() {
        if (!usingOfflineCopy) {
            usingOfflineCopy = true;
            webView.loadUrl(LOCAL_HOME);
            Toast.makeText(this, R.string.offline_copy, Toast.LENGTH_SHORT).show();
            return;
        }
        progress.setVisibility(View.GONE);
        webView.setVisibility(View.GONE);
        errorView.setVisibility(View.VISIBLE);
    }

    private void handleBack() {
        if (webView.canGoBack()) webView.goBack();
        else finish();
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (Build.VERSION.SDK_INT < 33) handleBack();
        else super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onPause() {
        webView.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }

    @Override
    protected void onDestroy() {
        webView.stopLoading();
        webView.destroy();
        super.onDestroy();
    }
}
