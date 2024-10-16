const functions = require("firebase-functions");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

// Initialize the Firebase Admin SDK
admin.initializeApp();

const db = admin.database();

// HTTP function to send notifications via FCM
exports.sendNotificationOnRequest = functions.https.onRequest(
  async (req, res) => {
    logger.info("Received the following request: ", req.body);
    // Validate request method
    if (req.method !== "POST") {
      return res.status(405).send("Only POST requests are allowed");
    }

    // Read data from the request body
    const { token, title, body, data } = req.body;

    if (!token || !title || !body) {
      return res
        .status(400)
        .send("Missing required fields: token, title, or body");
    }

    // Build the FCM message
    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: data || {}, // Any custom data you want to send (optional)
      token: token, // Device FCM token
    };

    const message2 = {
      //   message: {
      token: token,
      notification: {
        title: title,
        body: body,
      },
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        read: "false",
        deleted: "false",
      },
      android: {
        priority: "high",
      },
      apns: {
        headers: {
          "apns-priority": "10",
        },
        payload: {
          aps: {
            "content-available": 1,
            sound: "default",
          },
        },
      },
      //   },
    };

    // Send the notification via FCM
    try {
      const response = await admin.messaging().send(message2);
      console.log("Notification sent successfully:", response);

      // Optionally, save notification details to Firebase Realtime Database
      // await db.ref('notifications').push({
      //     token: token,
      //     title: title,
      //     body: body,
      //     data: data || {},
      //     sentAt: admin.database.ServerValue.TIMESTAMP,
      // });

      return res.status(200).send("Notification sent successfully");
    } catch (error) {
      console.error("Error sending notification:", error);
      return res.status(500).send("Error sending notification");
    }
  }
);
