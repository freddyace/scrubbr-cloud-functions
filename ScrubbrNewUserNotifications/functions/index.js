const { onValueCreated } = require('firebase-functions/v2/database');
const logger = require("firebase-functions/logger");
const admin = require('firebase-admin');
const axios = require('axios');

// Initialize Firebase Admin SDK
admin.initializeApp();

// Get your FCM project URL from the Firebase Console
const FCM_URL = 'https://fcm.googleapis.com/v1/projects/scrubbr-portal/messages:send';

exports.sendNewUserNotification = onValueCreated('/tokens/{userId}', async (event) => {
    const snapshot = event.data;  // Access the newly created data
    const tokenData = snapshot.val();  // Get the new data
    const userId = event.params.userId;

    // Get the FCM token from the token data
    const fcmToken = tokenData.token;

    // Prepare the notification message
    const payload = {
        message: {
            token: fcmToken,
            notification: {
                title: 'Welcome to Scrubbr!',
                body: 'You\'re all set up! Don\'t wait too long to book your first service and make your life easier. 🚗🧼',
            },
            data: {
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
                notificationType: '1',
            },
        },
    };

    // Get Firebase Admin SDK credentials for authentication
    const accessToken = await getAccessToken();

    // Send the notification via HTTP v1 API
    try {
        const response = await axios.post(FCM_URL, payload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });
        logger.info('Notification sent successfully:', response.data);
    } catch (error) {
        logger.error('Error sending notification:', error);
    }
});

// Helper function to get the access token for FCM HTTP v1 API
async function getAccessToken() {
    const token = await admin.credential.applicationDefault().getAccessToken();
    return token.access_token;
}
