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
    const message3 = {
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
            sound: "default",
          },
        },
      },
    };
    

    // Send the notification via FCM
    try {
      // const response = await admin.messaging().send(message3);
      // console.log("Notification sent successfully:", response);
      const dbNotificationsRef = db.ref("notifications");
      const dbNewNotificationsref = dbNotificationsRef.push();
      const notificationId = dbNewNotificationsref.key;

      // Optionally, save notification details to Firebase Realtime Database
      if(req.headers['x-customer-id']){
        const customerId = req.headers['x-customer-id'];
        logger.info("Saving data to db")
        dbNewNotificationsref.set({
           title: message3.notification.title,
           body: message3.notification.body,
           token: message3.token,
           sentAt: admin.database.ServerValue.TIMESTAMP.toString(),
       }).then(()=>{
         logger.info("Saved notification to DB");
       }).catch(()=>{
         logger.error("Failed to save notification to DB");
       });
       const userNotificationDbRef = db.ref("user-notifications");
       logger.info("Writing User Notification...")
       userNotificationDbRef.child(customerId).child(notificationId)
       .set({
         title: message3.notification.title,
         body: message3.notification.body,
         token: message3.token,
         read: false,
         deleted: false,
         sentAt: admin.database.ServerValue.TIMESTAMP
       }).then(()=>{
         logger.log("Successfully wrote to User Notification DB");
       }).catch(()=>{
         logger.log("Failed to write to User Notification DB")
       });
       return res.status(200).send("Notification sent successfully");
      }
      else{
        return res.status(200).send("Notification Sent successfully. No customerId was provided in this request.")
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      return res.status(500).send("Error sending notification");
    }
  }
);
