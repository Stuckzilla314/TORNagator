package com.stuckyco.tornagator;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;
import android.widget.RemoteViews;
import android.widget.Toast;

import org.json.JSONObject;

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
                HttpURLConnection urlConnection = null;
                try {
                    URL url = new URL("https://api.torn.com/user/?selections=basic,bars,profile,travel&key=" + apiKey);
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
                        
                        String response = sb.toString();
                        JSONObject json = new JSONObject(response);
                        if (json.has("error")) {
                            JSONObject errObj = json.getJSONObject("error");
                            String errMsg = errObj.optString("error", "API Error");
                            updateWidgetWithError(context, "Torn API Error: " + errMsg);
                        } else {
                            long now = System.currentTimeMillis();
                            SharedPreferences.Editor editor = context.getSharedPreferences("TornWidgetPrefs", Context.MODE_PRIVATE).edit();
                            editor.putString("cached_user_data", response);
                            editor.putLong("last_updated_time", now);
                            editor.apply();

                            updateWidgetUI(context, response, now);
                        }
                    } else {
                        updateWidgetWithError(context, "Network Error (HTTP " + responseCode + ")");
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error fetching Torn data", e);
                    updateWidgetWithError(context, "Network Connection Failed");
                } finally {
                    if (urlConnection != null) {
                        urlConnection.disconnect();
                    }
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
                views.setTextViewText(R.id.widget_player_info, name + " [" + level + "]");

                // Status Description
                JSONObject statusObj = json.optJSONObject("status");
                String statusDesc = "Okay";
                if (statusObj != null) {
                    statusDesc = statusObj.optString("description", "Okay");
                }
                views.setTextViewText(R.id.widget_status, statusDesc);

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
}
