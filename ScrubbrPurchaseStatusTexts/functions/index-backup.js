const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

// Function triggered when data is written to the Realtime Database
exports.sendPurchaseStatusTexts = functions.database.ref('/user-notifications/{userId}/{notificationId}')
    .onCreate((snapshot, context) => {
        const notificationData = snapshot.val();  // Get the new data
        const notificationId = context.params.notificationId;
        const userId = context.params.userId;
        // Get the FCM token from the notification data (or other device info)
        const fcmToken = notificationData.token;

        // Prepare the notification message
        const payload = {
            notification: {
                title: notificationData.title,
                body: notificationData.body,
            },
            data: {
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
                notificationId: notificationId, // Any additional data you want to send
                read: notificationData.read.toString(),
                deleted: notificationData.deleted.toString(),
            },
        };

        // Send the notification via FCM
        return admin.messaging().sendToDevice(fcmToken, payload)
            .then(response => {
                console.log('Notification sent successfully:', response);
                return null; // Always return a promise in cloud functions
            })
            .catch(error => {
                console.error('Error sending notification:', error);
            });
    });
