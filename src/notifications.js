import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { isCapacitor } from './utils';

const TRAVEL_NOTIF_ID = 1001;

/**
 * Checks if the Capacitor local notifications plugin is supported on this platform.
 * 
 * @returns {boolean} True if local notifications are supported.
 */
export const isNotificationsSupported = () => {
  return isCapacitor;
};

/**
 * Checks the current display permission status for local notifications.
 * 
 * @returns {Promise<string>} 'granted', 'denied', 'prompt', or 'unsupported'.
 */
export const checkNotificationPermission = async () => {
  if (!isNotificationsSupported()) return 'unsupported';
  try {
    const status = await LocalNotifications.checkPermissions();
    return status.display; // 'granted', 'denied', 'prompt'
  } catch (err) {
    console.error('[Notification] Error checking permission:', err);
    return 'prompt';
  }
};

/**
 * Requests the display permission for local notifications from the user.
 * 
 * @returns {Promise<string>} The updated status: 'granted', 'denied', or 'unsupported'.
 */
export const requestNotificationPermission = async () => {
  if (!isNotificationsSupported()) return 'unsupported';
  try {
    const status = await LocalNotifications.requestPermissions();
    return status.display;
  } catch (err) {
    console.error('[Notification] Error requesting permission:', err);
    return 'denied';
  }
};

/**
 * Schedules or cancels a travel landing notification based on the user's status and preferences.
 * 
 * @param {Object} userData - The current user's profile and travel status.
 * @param {boolean} enabled - Whether travel notifications are enabled by the user in settings.
 */
export const manageTravelNotification = async (userData, enabled = true) => {
  if (!isNotificationsSupported()) return;

  const state = userData?.status?.state;
  const isTraveling = state === 'Traveling';
  const landingUntil = isTraveling 
    ? (userData?.travel?.timestamp || userData?.travel?.arrival_at || userData?.status?.until || 0)
    : 0;

  const lastScheduled = parseInt(localStorage.getItem('last_scheduled_landing_until') || '0', 10);

  // If notifications are disabled in settings, make sure to clean up any scheduled travel notification
  if (!enabled) {
    if (lastScheduled > 0) {
      try {
        await LocalNotifications.cancel({ notifications: [{ id: TRAVEL_NOTIF_ID }] });
        localStorage.removeItem('last_scheduled_landing_until');
        console.log('[Notification] Travel notifications disabled. Cancelled scheduled landing notification.');
      } catch (err) {
        console.error('[Notification] Error cancelling notification:', err);
      }
    }
    return;
  }

  if (isTraveling && landingUntil > 0) {
    const landingTimeMs = landingUntil * 1000;
    
    // Only schedule if it's in the future and has not been scheduled for this exact timestamp yet
    if (landingTimeMs > Date.now() && landingUntil !== lastScheduled) {
      try {
        // Request/check permissions. We check first, if prompt, we will request.
        let permission = await checkNotificationPermission();
        if (permission === 'prompt') {
          permission = await requestNotificationPermission();
        }

        if (permission === 'granted') {
          // Cancel any existing travel landing notification before scheduling a new one
          await LocalNotifications.cancel({ notifications: [{ id: TRAVEL_NOTIF_ID }] });

          const destination = userData?.travel?.destination || 'your destination';
          
          await LocalNotifications.schedule({
            notifications: [
              {
                id: TRAVEL_NOTIF_ID,
                title: "TORNagator - Landed!",
                body: `You have arrived at ${destination}.`,
                schedule: { at: new Date(landingTimeMs) },
                sound: null,
                attachments: null,
                actionTypeId: "",
                extra: null
              }
            ]
          });
          
          localStorage.setItem('last_scheduled_landing_until', landingUntil.toString());
          console.log(`[Notification] Scheduled landing notification for ${new Date(landingTimeMs).toLocaleString()} at ${destination}`);
        } else {
          console.warn('[Notification] Permission not granted, cannot schedule notification.');
        }
      } catch (err) {
        console.error('[Notification] Error scheduling notification:', err);
      }
    }
  } else {
    // User is not traveling, so if we have a scheduled landing notification, clean it up
    if (lastScheduled > 0) {
      try {
        await LocalNotifications.cancel({ notifications: [{ id: TRAVEL_NOTIF_ID }] });
        localStorage.removeItem('last_scheduled_landing_until');
        console.log('[Notification] User is no longer traveling. Cancelled scheduled landing notification.');
      } catch (err) {
        console.error('[Notification] Error cancelling notification:', err);
      }
    }
  }
};
