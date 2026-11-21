import {cert, initializeApp} from 'firebase-admin/app';
import {getMessaging, Messaging} from 'firebase-admin/messaging';

export interface PushNotification {
    title: string;
    body: string;
    data: Record<string, string>; // FCM data values must be strings
}

class FirebaseService {
    private static messaging: Messaging | null = null;

    /**
     * Returns the FCM client, or null if ALERT_DRY_RUN is enabled
     */
    public static getMessaging(): Messaging | null {
        if (!FirebaseService.messaging) {
            const serviceAccountPath = './firebase-service-account.json';
            if (process.env.ALERT_DRY_RUN == "true") {
                return null;
            }
            const app = initializeApp({credential: cert(serviceAccountPath)});
            FirebaseService.messaging = getMessaging(app);
        }
        return FirebaseService.messaging;
    }
}

export default FirebaseService;

/**
 * Sends the notification to every FID and returns the FIDs that FCM reported as invalid.
 */
export async function sendPushNotification(messaging: Messaging, fids: string[], notification: PushNotification) {
    const response = await messaging.sendEachForMulticast({
        fids,
        notification: {
            title: notification.title,
            body: notification.body,
        },
        data: notification.data,
        android: {priority: 'high'},
        apns: {payload: {aps: {sound: 'default'}}},
    });

    const invalidFids: string[] = [];
    const errors: string[] = [];
    response.responses.forEach((r, i) => {
        if (r.success || !r.error) {
            return;
        }
        if (r.error.code == 'messaging/installation-id-not-registered') {
            invalidFids.push(fids[i]);
        } else {
            errors.push(`${r.error.code}: ${r.error.message}`);
        }
    });

    return {successCount: response.successCount, invalidFids, errors};
}
