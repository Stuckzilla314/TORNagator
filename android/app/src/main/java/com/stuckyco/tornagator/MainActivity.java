package com.stuckyco.tornagator;

import android.graphics.Bitmap;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.ConsoleMessage;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.coordinatorlayout.widget.CoordinatorLayout;
import com.getcapacitor.BridgeActivity;
import java.util.Map;
import java.util.HashMap;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "TornOverlay";
    private final Map<String, WebView> tornWebViews = new HashMap<>();
    private String activeTabId = null;
    private final String customUA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36";
    private final Map<String, String> lastDispatchedUrls = new HashMap<>();

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

    private void dispatchUrlChange(final String tabId, final String url, final boolean canGoBack, final boolean canGoForward) {
        lastDispatchedUrls.put(tabId, url);
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (getBridge() == null || getBridge().getWebView() == null) return;
                String safeUrl = url.replace("\\", "\\\\").replace("'", "\\'");
                String js = "window.dispatchEvent(new CustomEvent('tornUrlChange', { " +
                            "detail: { tabId: '" + tabId + "', url: '" + safeUrl + "', canGoBack: " + canGoBack + ", canGoForward: " + canGoForward + " } " +
                            "}));";
                getBridge().getWebView().evaluateJavascript(js, null);
            }
        });
    }

    private void dispatchTitleChange(final String tabId, final String title) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (getBridge() == null || getBridge().getWebView() == null) return;
                String safeTitle = title.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ").replace("\r", " ");
                String js = "window.dispatchEvent(new CustomEvent('tornTitleChange', { " +
                            "detail: { tabId: '" + tabId + "', title: '" + safeTitle + "' } " +
                            "}));";
                getBridge().getWebView().evaluateJavascript(js, null);
            }
        });
    }

    public class AndroidTornBridge {
        @JavascriptInterface
        public void showTorn(final String tabId, final int x, final int y, final int width, final int height, final String url) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Log.v(TAG, "showTorn called: tabId=" + tabId + ", x=" + x + ", y=" + y + ", w=" + width + ", h=" + height + ", url=" + url);
                    
                    // Hide previously active WebView if different
                    if (activeTabId != null && !activeTabId.equals(tabId)) {
                        WebView prevWebView = tornWebViews.get(activeTabId);
                        if (prevWebView != null && prevWebView.getVisibility() == View.VISIBLE) {
                            Log.d(TAG, "Hiding previously active WebView for tabId=" + activeTabId);
                            prevWebView.setVisibility(View.GONE);
                        }
                    }
                    
                    activeTabId = tabId;
                    
                    WebView targetWebView = tornWebViews.get(tabId);
                    if (targetWebView == null) {
                        Log.d(TAG, "Creating new overlay WebView instance for tabId=" + tabId);
                        targetWebView = new WebView(MainActivity.this);
                        targetWebView.setTag(tabId);
                        
                        // Enable settings required for modern webapps and Cloudflare
                        targetWebView.getSettings().setJavaScriptEnabled(true);
                        targetWebView.getSettings().setDomStorageEnabled(true);
                        targetWebView.getSettings().setDatabaseEnabled(true);
                        targetWebView.getSettings().setUserAgentString(customUA);
                        
                        // Support Zoom and viewport settings
                        targetWebView.getSettings().setSupportZoom(true);
                        targetWebView.getSettings().setBuiltInZoomControls(true);
                        targetWebView.getSettings().setDisplayZoomControls(false);
                        targetWebView.getSettings().setUseWideViewPort(true);
                        targetWebView.getSettings().setLoadWithOverviewMode(true);
                        
                        // Set up cookies
                        CookieManager.getInstance().setAcceptThirdPartyCookies(targetWebView, true);
                        
                        // Set up console log forwarding
                        targetWebView.setWebChromeClient(new WebChromeClient() {
                            @Override
                            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                                Log.d("OverlayConsole", "[" + tabId + "] " + consoleMessage.message() + " -- From line "
                                                     + consoleMessage.lineNumber() + " of "
                                                     + consoleMessage.sourceId());
                                return true;
                            }

                            @Override
                            public void onReceivedTitle(WebView view, String title) {
                                super.onReceivedTitle(view, title);
                                String tId = (String) view.getTag();
                                Log.d(TAG, "Overlay tabId=" + tId + " received title: " + title);
                                if (tId != null) {
                                    dispatchTitleChange(tId, title);
                                }
                            }
                        });
                        
                        // Add WebViewClient to track loads and sync events
                        targetWebView.setWebViewClient(new WebViewClient() {
                            @Override
                            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                                String tId = (String) view.getTag();
                                Log.d(TAG, "Overlay tabId=" + tId + " onPageStarted: " + url);
                                if (tId != null) {
                                    dispatchUrlChange(tId, url, view.canGoBack(), view.canGoForward());
                                }
                            }

                            @Override
                            public void onPageFinished(WebView view, String url) {
                                String tId = (String) view.getTag();
                                Log.d(TAG, "Overlay tabId=" + tId + " onPageFinished: " + url);
                                if (tId != null) {
                                    dispatchUrlChange(tId, url, view.canGoBack(), view.canGoForward());
                                }
                            }

                            @Override
                            public void doUpdateVisitedHistory(WebView view, String url, boolean isReload) {
                                String tId = (String) view.getTag();
                                Log.v(TAG, "Overlay tabId=" + tId + " history update: " + url);
                                if (tId != null) {
                                    dispatchUrlChange(tId, url, view.canGoBack(), view.canGoForward());
                                }
                            }
                        });
                        
                        // Add to main bridge webview parent view group
                        ViewGroup parent = (ViewGroup) getBridge().getWebView().getParent();
                        if (parent != null) {
                            parent.addView(targetWebView);
                            Log.d(TAG, "Overlay WebView for tabId=" + tabId + " added to parent layout");
                        } else {
                            Log.e(TAG, "Failed to get parent of main WebView");
                        }
                        
                        tornWebViews.put(tabId, targetWebView);
                    }
                    
                    // Position the WebView overlay using CoordinatorLayout.LayoutParams
                    CoordinatorLayout.LayoutParams params = new CoordinatorLayout.LayoutParams(width, height);
                    params.leftMargin = x;
                    params.topMargin = y;
                    targetWebView.setLayoutParams(params);
                    
                    // Make it visible and bring to front
                    if (targetWebView.getVisibility() != View.VISIBLE) {
                        targetWebView.setVisibility(View.VISIBLE);
                    }
                    targetWebView.bringToFront();
                    
                    // Load the URL if it is different from the last url we loaded/dispatched
                    String lastDispatchedUrl = lastDispatchedUrls.get(tabId);
                    if (lastDispatchedUrl == null || !lastDispatchedUrl.equals(url)) {
                        Log.d(TAG, "Loading URL in overlay tabId=" + tabId + ": " + url);
                        targetWebView.loadUrl(url);
                    } else {
                        Log.d(TAG, "Skipping loadUrl because url matches lastDispatchedUrl for tabId=" + tabId + ": " + url);
                    }
                    // Sync lastDispatchedUrls
                    lastDispatchedUrls.put(tabId, url);
                }
            });
        }

        @JavascriptInterface
        public void hideTorn(final String tabId) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    WebView targetWebView = tornWebViews.get(tabId);
                    if (targetWebView != null && targetWebView.getVisibility() == View.VISIBLE) {
                        Log.d(TAG, "Hiding overlay WebView for tabId=" + tabId);
                        targetWebView.setVisibility(View.GONE);
                    }
                    if (tabId.equals(activeTabId)) {
                        activeTabId = null;
                    }
                }
            });
        }

        @JavascriptInterface
        public void destroyTorn(final String tabId) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    WebView targetWebView = tornWebViews.get(tabId);
                    if (targetWebView != null) {
                        Log.d(TAG, "Destroying WebView overlay for tabId=" + tabId);
                        ViewGroup parent = (ViewGroup) targetWebView.getParent();
                        if (parent != null) {
                            parent.removeView(targetWebView);
                        }
                        targetWebView.destroy();
                        tornWebViews.remove(tabId);
                        lastDispatchedUrls.remove(tabId);
                    }
                    if (tabId.equals(activeTabId)) {
                        activeTabId = null;
                    }
                }
            });
        }

        @JavascriptInterface
        public void goBack(final String tabId) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    WebView targetWebView = tornWebViews.get(tabId);
                    if (targetWebView != null && targetWebView.canGoBack()) {
                        Log.d(TAG, "Overlay tabId=" + tabId + " navigating Back");
                        targetWebView.goBack();
                    }
                }
            });
        }

        @JavascriptInterface
        public void goForward(final String tabId) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    WebView targetWebView = tornWebViews.get(tabId);
                    if (targetWebView != null && targetWebView.canGoForward()) {
                        Log.d(TAG, "Overlay tabId=" + tabId + " navigating Forward");
                        targetWebView.goForward();
                    }
                }
            });
        }

        @JavascriptInterface
        public void reload(final String tabId) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    WebView targetWebView = tornWebViews.get(tabId);
                    if (targetWebView != null) {
                        Log.d(TAG, "Overlay tabId=" + tabId + " reloading");
                        targetWebView.reload();
                    }
                }
            });
        }

        @JavascriptInterface
        public void executeInOverlay(final String tabId, final String js) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    WebView targetWebView = tornWebViews.get(tabId);
                    if (targetWebView != null) {
                        Log.v(TAG, "Evaluating Javascript in overlay WebView for tabId=" + tabId);
                        targetWebView.evaluateJavascript(js, null);
                    } else {
                        Log.w(TAG, "executeInOverlay called but WebView for tabId=" + tabId + " is null");
                    }
                }
            });
        }
    }
}
