package com.stuckyco.tornagator;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.SystemClock;
import android.util.Log;
import android.view.View;
import android.widget.RemoteViews;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;
import java.util.Iterator;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class TornWidgetProvider extends AppWidgetProvider {
    private static final String TAG = "TornWidget";
    public static final String ACTION_REFRESH_WIDGET = "com.stuckyco.tornagator.ACTION_REFRESH_WIDGET";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        Log.d(TAG, "onUpdate called");
        SharedPreferences prefs = context.getSharedPreferences("TornWidgetPrefs", Context.MODE_PRIVATE);
        String cachedJson = prefs.getString("cached_user_data", null);
        long lastUpdated = prefs.getLong("last_updated_time", 0);

        if (cachedJson != null) {
            updateWidgetUI(context, cachedJson, lastUpdated);
        } else {
            // If no cache exists, try fetching data directly
            fetchTornData(context);
        }
    }

    @Override
    public void onReceive(final Context context, Intent intent) {
        super.onReceive(context, intent);
        Log.d(TAG, "onReceive action: " + intent.getAction());
        if (ACTION_REFRESH_WIDGET.equals(intent.getAction())) {
            fetchTornData(context);
        }
    }

    private String performHttpGet(String urlString) throws Exception {
        HttpURLConnection urlConnection = null;
        try {
            URL url = new URL(urlString);
            urlConnection = (HttpURLConnection) url.openConnection();
            urlConnection.setConnectTimeout(10000);
            urlConnection.setReadTimeout(10000);
            int responseCode = urlConnection.getResponseCode();
            if (responseCode == HttpURLConnection.HTTP_OK) {
                BufferedReader in = new BufferedReader(new InputStreamReader(urlConnection.getInputStream()));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = in.readLine()) != null) {
                    sb.append(line);
                }
                in.close();
                return sb.toString();
            } else {
                throw new Exception("HTTP Error: " + responseCode);
            }
        } finally {
            if (urlConnection != null) {
                urlConnection.disconnect();
            }
        }
    }

    private void fetchTornData(final Context context) {
        SharedPreferences prefs = context.getSharedPreferences("TornWidgetPrefs", Context.MODE_PRIVATE);
        final String apiKey = prefs.getString("api_key", null);
        if (apiKey == null || apiKey.trim().isEmpty()) {
            Log.w(TAG, "fetchTornData: API Key is empty/missing");
            SharedPreferences.Editor editor = prefs.edit();
            editor.remove("cached_user_data");
            editor.remove("last_updated_time");
            editor.apply();
            updateWidgetWithError(context, "No API key. Please open TORNagator & login.");
            return;
        }

        updateWidgetWithLoading(context);

        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    // 1. Fetch user data (v1)
                    String v1Url = "https://api.torn.com/user/?selections=basic,bars,profile,travel&key=" + apiKey;
                    String v1Response = performHttpGet(v1Url);
                    JSONObject json = new JSONObject(v1Response);
                    
                    if (json.has("error")) {
                        JSONObject errObj = json.getJSONObject("error");
                        String errMsg = errObj.optString("error", "API Error");
                        updateWidgetWithError(context, "Torn API Error: " + errMsg);
                        return;
                    }

                    // 2. Fetch user icons (v2)
                    try {
                        String iconsUrl = "https://api.torn.com/v2/user/icons?key=" + apiKey;
                        String iconsResponse = performHttpGet(iconsUrl);
                        JSONObject iconsJson = new JSONObject(iconsResponse);
                        if (iconsJson.has("icons")) {
                            json.put("icons", iconsJson.getJSONArray("icons"));
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "Error fetching user icons", e);
                    }

                    String mergedResponse = json.toString();
                    long now = System.currentTimeMillis();
                    SharedPreferences.Editor editor = context.getSharedPreferences("TornWidgetPrefs", Context.MODE_PRIVATE).edit();
                    editor.putString("cached_user_data", mergedResponse);
                    editor.putLong("last_updated_time", now);
                    editor.apply();

                    updateWidgetUI(context, mergedResponse, now);

                } catch (Exception e) {
                    Log.e(TAG, "Error fetching Torn data", e);
                    updateWidgetWithError(context, "Network Connection Failed");
                }
            }
        }).start();
    }

    private void updateWidgetUI(Context context, String userDataJson, long lastUpdatedTime) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName thisWidget = new ComponentName(context, TornWidgetProvider.class);
        int[] allWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);

        for (int widgetId : allWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.torn_widget_layout);

            try {
                JSONObject json = new JSONObject(userDataJson);
                
                // Name & Level
                String name = json.optString("name", "Player");
                int level = json.optInt("level", 0);
                String playerHtml = name + " <font color='#64748B'>[" + level + "]</font>";
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    views.setTextViewText(R.id.widget_player_info, android.text.Html.fromHtml(playerHtml, android.text.Html.FROM_HTML_MODE_LEGACY));
                } else {
                    views.setTextViewText(R.id.widget_player_info, android.text.Html.fromHtml(playerHtml));
                }

                // Status Description
                JSONObject statusObj = json.optJSONObject("status");
                String statusDesc = "Okay";
                String state = "Okay";
                long until = 0;
                if (statusObj != null) {
                    statusDesc = statusObj.optString("description", "Okay");
                    state = statusObj.optString("state", "Okay");
                    until = statusObj.optLong("until", 0);
                }

                // Find racing icon (id 17 or 18)
                JSONArray iconsArray = json.optJSONArray("icons");
                JSONObject racingIcon = null;
                if (iconsArray != null) {
                    for (int i = 0; i < iconsArray.length(); i++) {
                        JSONObject icon = iconsArray.optJSONObject(i);
                        if (icon != null) {
                            int iconId = icon.optInt("id", 0);
                            if (iconId == 17 || iconId == 18) {
                                racingIcon = icon;
                                break;
                            }
                        }
                    }
                }

                // Traveling Timer
                JSONObject travelObj = json.optJSONObject("travel");
                long travelTimestamp = 0;
                if (travelObj != null) {
                    travelTimestamp = travelObj.optLong("timestamp", 0);
                    if (travelTimestamp == 0) {
                        travelTimestamp = travelObj.optLong("arrival_at", 0);
                    }
                }
                long endTimestamp = (travelTimestamp > 0) ? travelTimestamp : until;

                // Adjust status description if racing
                if (racingIcon != null) {
                    if (!"Traveling".equalsIgnoreCase(state) && !"Hospital".equalsIgnoreCase(state) && !"Jail".equalsIgnoreCase(state)) {
                        String raceTitle = racingIcon.optString("title", "Racing");
                        String raceDesc = racingIcon.optString("description", "");
                        statusDesc = raceDesc.isEmpty() ? raceTitle : stripHtml(raceDesc);
                    }
                }

                boolean showTimer = false;
                long timerEndTimestamp = 0;
                int timerColor = 0xFF38BDF8; // default cyber blue

                if ("Traveling".equalsIgnoreCase(state) && endTimestamp > (System.currentTimeMillis() / 1000)) {
                    showTimer = true;
                    timerEndTimestamp = endTimestamp;
                    timerColor = 0xFF38BDF8; // cyber blue
                } else if (racingIcon != null && racingIcon.optInt("id", 0) == 17) {
                    long raceUntil = racingIcon.optLong("until", 0);
                    if (raceUntil > (System.currentTimeMillis() / 1000)) {
                        showTimer = true;
                        timerEndTimestamp = raceUntil;
                        timerColor = 0xFFC084FC; // purple
                    }
                }

                // Determine dynamic status color
                int statusColor = 0xFF4ADE80; // Default to active green
                if ("Traveling".equalsIgnoreCase(state)) {
                    statusColor = 0xFF38BDF8; // Cyber blue/cyan
                } else if ("Hospital".equalsIgnoreCase(state)) {
                    statusColor = 0xFFF87171; // Red
                } else if ("Jail".equalsIgnoreCase(state)) {
                    statusColor = 0xFFFB923C; // Orange
                } else if (racingIcon != null) {
                    if (racingIcon.optInt("id", 0) == 17) {
                        statusColor = 0xFFC084FC; // Purple (Racing)
                    } else if (racingIcon.optInt("id", 0) == 18) {
                        statusColor = 0xFF4ADE80; // Green (Race completed)
                    }
                }

                views.setTextViewText(R.id.widget_status, statusDesc);
                views.setTextColor(R.id.widget_status, statusColor);
                views.setInt(R.id.widget_status_dot, "setColorFilter", statusColor);

                if (showTimer) {
                    long durationMs = (timerEndTimestamp * 1000) - System.currentTimeMillis();
                    long baseTime = SystemClock.elapsedRealtime() + durationMs;
                    
                    views.setViewVisibility(R.id.widget_timer, View.VISIBLE);
                    views.setTextColor(R.id.widget_timer, timerColor);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                        views.setChronometerCountDown(R.id.widget_timer, true);
                    }
                    views.setChronometer(R.id.widget_timer, baseTime, "%s", true);

                    // Landing ETA in 24h format (HH:mm) next to the timer
                    views.setViewVisibility(R.id.widget_timer_eta, View.VISIBLE);
                    views.setTextColor(R.id.widget_timer_eta, timerColor);
                    SimpleDateFormat etaSdf = new SimpleDateFormat(" '(ETA: 'HH:mm')'", Locale.getDefault());
                    views.setTextViewText(R.id.widget_timer_eta, etaSdf.format(new Date(timerEndTimestamp * 1000)));
                } else {
                    views.setViewVisibility(R.id.widget_timer, View.GONE);
                    views.setViewVisibility(R.id.widget_timer_eta, View.GONE);
                    views.setChronometer(R.id.widget_timer, 0, null, false);
                }

                // Life bar
                JSONObject lifeObj = json.optJSONObject("life");
                if (lifeObj != null) {
                    int current = lifeObj.optInt("current", 0);
                    int max = lifeObj.optInt("maximum", 100);
                    views.setProgressBar(R.id.widget_life_bar, max, current, false);
                    views.setTextViewText(R.id.widget_life_val, current + "/" + max);
                }

                // Energy bar
                JSONObject energyObj = json.optJSONObject("energy");
                if (energyObj != null) {
                    int current = energyObj.optInt("current", 0);
                    int max = energyObj.optInt("maximum", 100);
                    views.setProgressBar(R.id.widget_energy_bar, max, current, false);
                    views.setTextViewText(R.id.widget_energy_val, current + "/" + max);
                }

                // Nerve bar
                JSONObject nerveObj = json.optJSONObject("nerve");
                if (nerveObj != null) {
                    int current = nerveObj.optInt("current", 0);
                    int max = nerveObj.optInt("maximum", 100);
                    views.setProgressBar(R.id.widget_nerve_bar, max, current, false);
                    views.setTextViewText(R.id.widget_nerve_val, current + "/" + max);
                }

            } catch (Exception e) {
                Log.e(TAG, "Error parsing cached JSON", e);
            }

            // Updated time label
            if (lastUpdatedTime > 0) {
                SimpleDateFormat sdf = new SimpleDateFormat("HH:mm:ss", Locale.getDefault());
                views.setTextViewText(R.id.widget_updated, "Updated: " + sdf.format(new Date(lastUpdatedTime)));
            } else {
                views.setTextViewText(R.id.widget_updated, "Updated: Just now");
            }

            // Setup refresh button PendingIntent
            Intent intent = new Intent(context, TornWidgetProvider.class);
            intent.setAction(ACTION_REFRESH_WIDGET);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pendingIntent = PendingIntent.getBroadcast(context, 0, intent, flags);
            views.setOnClickPendingIntent(R.id.widget_btn_refresh, pendingIntent);

            appWidgetManager.updateAppWidget(widgetId, views);
        }
    }

    private void updateWidgetWithLoading(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName thisWidget = new ComponentName(context, TornWidgetProvider.class);
        int[] allWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);

        for (int widgetId : allWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.torn_widget_layout);
            views.setTextViewText(R.id.widget_status, "Updating...");
            views.setTextColor(R.id.widget_status, 0xFFFBBF24); // dynamic amber
            views.setInt(R.id.widget_status_dot, "setColorFilter", 0xFFFBBF24);
            views.setViewVisibility(R.id.widget_timer, View.GONE);
            views.setViewVisibility(R.id.widget_timer_eta, View.GONE);

            Intent intent = new Intent(context, TornWidgetProvider.class);
            intent.setAction(ACTION_REFRESH_WIDGET);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pendingIntent = PendingIntent.getBroadcast(context, 0, intent, flags);
            views.setOnClickPendingIntent(R.id.widget_btn_refresh, pendingIntent);

            appWidgetManager.updateAppWidget(widgetId, views);
        }
    }

    private void updateWidgetWithError(Context context, String errorMessage) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName thisWidget = new ComponentName(context, TornWidgetProvider.class);
        int[] allWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);

        for (int widgetId : allWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.torn_widget_layout);
            views.setTextViewText(R.id.widget_status, errorMessage);
            views.setTextColor(R.id.widget_status, 0xFFF87171); // dynamic red
            views.setInt(R.id.widget_status_dot, "setColorFilter", 0xFFF87171);
            views.setViewVisibility(R.id.widget_timer, View.GONE);
            views.setViewVisibility(R.id.widget_timer_eta, View.GONE);

            Intent intent = new Intent(context, TornWidgetProvider.class);
            intent.setAction(ACTION_REFRESH_WIDGET);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pendingIntent = PendingIntent.getBroadcast(context, 0, intent, flags);
            views.setOnClickPendingIntent(R.id.widget_btn_refresh, pendingIntent);

            appWidgetManager.updateAppWidget(widgetId, views);
        }
    }

    private String stripHtml(String html) {
        if (html == null) return "";
        String clean = html.replaceAll("<[^>]*>", "");
        clean = clean.replace("&amp;", "&")
                     .replace("&nbsp;", " ")
                     .replace("&#039;", "'")
                     .replace("&quot;", "\"")
                     .replace("&lt;", "<")
                     .replace("&gt;", ">");
        return clean;
    }
}
