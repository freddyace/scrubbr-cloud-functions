const { onValueCreated } = require('firebase-functions/v2/database');
const logger = require("firebase-functions/logger");
const admin = require('firebase-admin');
const axios = require('axios');

// Initialize Firebase Admin SDK
admin.initializeApp();

exports.sendNewUserNotification = onValueCreated('/tokens/{userId}', async (event) => {
    const snapshot = event.data;
    const tokenData = snapshot.val();
    const userId = event.params.userId;

    // Get the FCM token from the token data
    const fcmToken = tokenData.token;

    // Prepare the notification message content
    const title = 'Welcome to Scrubbr!';
    const body = 'You\'re all set up! Don\'t wait too long to book your first service and make your life easier. 🚗🧼';
    const sentAt = admin.database.ServerValue.TIMESTAMP;

    // Write to the 'notifications' path and get the unique key
    try {
        const notificationsRef = admin.database().ref('notifications');
        const newNotificationRef = notificationsRef.push();
        const newNotificationKey = newNotificationRef.key;

        // Save the notification data under the 'notifications' path
        await newNotificationRef.set({
            title,
            body,
            sentAt,
            token: fcmToken,
            read: false,
            deleted: false,
        });

        // Now write to the 'user-notifications' path
        const userNotificationsRef = admin.database().ref(`user-notifications/${userId}/${newNotificationKey}`);
        await userNotificationsRef.set({
            title,
            body,
            sentAt,
            token: fcmToken,
            read: false,
            deleted: false,
        });

        logger.info(`Notification written to notifications and user-notifications for userId: ${userId}`);
    } catch (error) {
        logger.error('Error writing notification:', error);
    }
});

// Helper function to get the access token for FCM HTTP v1 API
async function getAccessToken() {
    const token = await admin.credential.applicationDefault().getAccessToken();
    return token.access_token;
}
