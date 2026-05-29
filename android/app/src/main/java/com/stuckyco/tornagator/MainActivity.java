package com.stuckyco.tornagator;

import android.graphics.Bitmap;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.coordinatorlayout.widget.CoordinatorLayout;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "TornOverlay";
    private WebView tornWebView;
    private final String customUA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Log.d(TAG, "MainActivity onCreate: Initializing");
        
        WebView mainWebView = this.getBridge().getWebView();
        
        // Clean cache on launch
        mainWebView.clearCache(true);
        mainWebView.getSettings().setUserAgentString(customUA);
        
        // Register the JS bridge interface
        mainWebView.addJavascriptInterface(new AndroidTornBridge(), "AndroidTornBridge");
        Log.d(TAG, "AndroidTornBridge registered on main WebView");
    }

    private void dispatchUrlChange(final String url, final boolean canGoBack, final boolean canGoForward) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (getBridge() == null || getBridge().getWebView() == null) return;
                String safeUrl = url.replace("'", "\\'");
                String js = "window.dispatchEvent(new CustomEvent('tornUrlChange', { " +
                            "detail: { url: '" + safeUrl + "', canGoBack: " + canGoBack + ", canGoForward: " + canGoForward + " } " +
                            "}));";
                getBridge().getWebView().evaluateJavascript(js, null);
            }
        });
    }

    public class AndroidTornBridge {
        @JavascriptInterface
        public void showTorn(final int x, final int y, final int width, final int height, final String url) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Log.v(TAG, "showTorn called: x=" + x + ", y=" + y + ", w=" + width + ", h=" + height + ", url=" + url);
                    
                    if (tornWebView == null) {
                        Log.d(TAG, "Creating new overlay WebView instance");
                        tornWebView = new WebView(MainActivity.this);
                        
                        // Enable settings required for modern webapps and Cloudflare
                        tornWebView.getSettings().setJavaScriptEnabled(true);
                        tornWebView.getSettings().setDomStorageEnabled(true);
                        tornWebView.getSettings().setDatabaseEnabled(true);
                        tornWebView.getSettings().setUserAgentString(customUA);
                        
                        // Support Zoom and viewport settings
                        tornWebView.getSettings().setSupportZoom(true);
                        tornWebView.getSettings().setBuiltInZoomControls(true);
                        tornWebView.getSettings().setDisplayZoomControls(false);
                        tornWebView.getSettings().setUseWideViewPort(true);
                        tornWebView.getSettings().setLoadWithOverviewMode(true);
                        
                        // Set up cookies
                        CookieManager.getInstance().setAcceptThirdPartyCookies(tornWebView, true);
                        
                        // Add WebViewClient to track loads and sync events
                        tornWebView.setWebViewClient(new WebViewClient() {
                            @Override
                            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                                Log.d(TAG, "Overlay onPageStarted: " + url);
                                dispatchUrlChange(url, view.canGoBack(), view.canGoForward());
                            }

                            @Override
                            public void onPageFinished(WebView view, String url) {
                                Log.d(TAG, "Overlay onPageFinished: " + url);
                                dispatchUrlChange(url, view.canGoBack(), view.canGoForward());
                            }

                            @Override
                            public void doUpdateVisitedHistory(WebView view, String url, boolean isReload) {
                                Log.v(TAG, "Overlay history update: " + url);
                                dispatchUrlChange(url, view.canGoBack(), view.canGoForward());
                            }
                        });
                        
                        // Add to main bridge webview parent view group
                        ViewGroup parent = (ViewGroup) getBridge().getWebView().getParent();
                        if (parent != null) {
                            parent.addView(tornWebView);
                            Log.d(TAG, "Overlay WebView added to parent layout");
                        } else {
                            Log.e(TAG, "Failed to get parent of main WebView");
                        }
                    }
                    
                    // Position the WebView overlay using CoordinatorLayout.LayoutParams
                    CoordinatorLayout.LayoutParams params = new CoordinatorLayout.LayoutParams(width, height);
                    params.leftMargin = x;
                    params.topMargin = y;
                    tornWebView.setLayoutParams(params);
                    
                    // Make it visible and bring to front
                    if (tornWebView.getVisibility() != View.VISIBLE) {
                        tornWebView.setVisibility(View.VISIBLE);
                    }
                    tornWebView.bringToFront();
                    
                    // Load the URL if it is different
                    String currentUrl = tornWebView.getUrl();
                    if (currentUrl == null || !currentUrl.equals(url)) {
                        Log.d(TAG, "Loading URL in overlay: " + url);
                        tornWebView.loadUrl(url);
                    }
                }
            });
        }

        @JavascriptInterface
        public void hideTorn() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (tornWebView != null && tornWebView.getVisibility() == View.VISIBLE) {
                        Log.d(TAG, "Hiding overlay WebView");
                        tornWebView.setVisibility(View.GONE);
                    }
                }
            });
        }

        @JavascriptInterface
        public void goBack() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (tornWebView != null && tornWebView.canGoBack()) {
                        Log.d(TAG, "Overlay navigating Back");
                        tornWebView.goBack();
                    }
                }
            });
        }

        @JavascriptInterface
        public void goForward() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (tornWebView != null && tornWebView.canGoForward()) {
                        Log.d(TAG, "Overlay navigating Forward");
                        tornWebView.goForward();
                    }
                }
            });
        }

        @JavascriptInterface
        public void reload() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (tornWebView != null) {
                        Log.d(TAG, "Overlay reloading");
                        tornWebView.reload();
                    }
                }
            });
        }
    }
}
