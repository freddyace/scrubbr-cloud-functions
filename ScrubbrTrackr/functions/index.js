/* eslint-disable require-jsdoc */
/* eslint-disable max-len */
/* eslint-disable indent */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const axios = require("axios");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
admin.initializeApp();

// Save a record to DB so that the trigger can execute and send a notification
function saveRecordToDb(fcmToken, notificationTitle, notificationBody, customerId) {
  const db = admin.database();

  // Reference to the 'notifications' node in Realtime Database
  const notificationsRef = db.ref("notifications");

  // Generate a unique key for the new notification
  const newNotificationRef = notificationsRef.push();
  const notificationId = newNotificationRef.key;
  // Get the unique key
  // Data for the new notification
  const notificationData = {
    title: notificationTitle,
    body: notificationBody,
    token: fcmToken, // Replace with the actual FCM token for the device
  };

  // Write the data to the database
  newNotificationRef.set(notificationData)
    .then(() => {
        console.log("Notification data written successfully to Realtime Database");
    })
    .catch((error) => {
        console.error("Error writing notification data:", error);
    });

const userNotificationsDbRef = db.ref("user-notifications");
userNotificationsDbRef.child(customerId).child(notificationId)
      .set({
      title: notificationTitle,
      body: notificationBody,
      token: fcmToken, // Replace with the actual FCM token for the device
      read: false,
      deleted: false,
    });
}

// FCM Notification Helper - uncomment if sending direct to device
// async function sendFcmNotification(token, title, body) {
//     const message = {
//         token: token,
//         notification: {
//             title: title,
//             body: body,
//         },
//     };

//     try {
//         const response = await admin.messaging().send(message);
//         logger.info("Successfully sent FCM notification:", response);
//     } catch (error) {
//         logger.error("Error sending FCM notification:", error.message);
//         logger.error(error);
//         throw error;
//     }
// }

axios.defaults.headers.common["X-Shopify-Access-Token"] = "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";

const SHOPIFY_API_VERSION = "2024-04";
const SHOPIFY_STORE_URL = "https://4eefe2-46.myshopify.com/admin/api";

// Status Map
const statusMap = {
    "Assigned": 0,
    "Started": 1,
    "Successful": 2,
    "Failed": 3,
    "Arrived": 4,
    "Unassigned": 6,
    "Accepted": 7,
    "Decline": 8,
    "Cancel": 9,
    "Deleted": 10,
};

// Helper to make Shopify API requests
async function shopifyApiRequest(method, endpoint) {
    try {
        const url = `${SHOPIFY_STORE_URL}/${SHOPIFY_API_VERSION}${endpoint}`;
        logger.info("Calling url " + "with method "+method +": ", url);
        const response = await axios({method, url});
        return response.data;
    } catch (error) {
        logger.error(`Error making Shopify API request to ${endpoint}:`, error.message);
        throw error;
    }
}

async function shopifyApiRequestPost(method, endpoint, data = {}) {
    try {
        const url = `${SHOPIFY_STORE_URL}/${SHOPIFY_API_VERSION}${endpoint}`;
        logger.info("Calling url " + "with method "+method +": ", url);
        const response = await axios({method, url, data});
        return response.data;
    } catch (error) {
        logger.error(`Error making Shopify API request to ${endpoint}:`, error.message);
        throw error;
    }
}

// Get Fulfillment Order ID
async function getFulfillmentOrderId(orderId) {
    const data = await shopifyApiRequest("get", `/orders/${orderId}/fulfillment_orders.json`);
    const fulfillmentOrders = data.fulfillment_orders;
    if (fulfillmentOrders.length === 0) throw new Error("No fulfillment orders found");
    return fulfillmentOrders[0].id;
}

// Get Fulfillment ID
async function getFulfillmentId(fulfillmentOrderId) {
    const data = await shopifyApiRequest("get", `/fulfillment_orders/${fulfillmentOrderId}/fulfillments.json`);
    const fulfillments = data.fulfillments;
    if (fulfillments.length === 0) throw new Error("No fulfillments found");
    return fulfillments[0].id;
}

// Get Customer ID from Shopify Order
async function getCustomerIdFromOrder(orderId) {
    const data = await shopifyApiRequest("get", `/orders/${orderId}.json`);
    return data.order.customer.id;
}

// Get FCM Token from Firebase Realtime Database
async function getFcmTokenFromDatabase(customerId) {
    try {
        const snapshot = await admin.database().ref(`/tokens/${customerId}`).once("value");
        if (snapshot.exists()) {
            logger.log("Found token: " + snapshot.val().token + ", for user id: " + customerId);
            return snapshot.val().token; // Assuming the token is stored directly under the customer ID node
        } else {
            throw new Error(`No FCM token found for customer ID: ${customerId}`);
        }
    } catch (error) {
        logger.error("Error fetching FCM token from database:", error.message);
        throw error;
    }
}

// Send Shopify Event
async function sendShopifyEvent(orderId, fulfillmentId, eventStatus) {
    await shopifyApiRequestPost("post", `/orders/${orderId}/fulfillments/${fulfillmentId}/events.json`, {
        event: {status: eventStatus},
    });
    logger.info(`Successfully sent ${eventStatus} event for Order ID: ${orderId}`);
}

// Main Cloud Function Handler
exports.scrubbrTrackr = onRequest(async (request, response) => {
    try {
        const {task_status: taskStatus, order_id: orderId} = request.body;
        logger.info("Incoming request for Order ID:", orderId);

        // Step 1: Get customer ID from Shopify order
        const customerId = await getCustomerIdFromOrder(orderId);
        logger.info("Customer ID: ", customerId);

        // Step 2: Get the FCM token using the customer ID
        const fcmToken = await getFcmTokenFromDatabase(customerId);

        const fulfillmentOrderId = await getFulfillmentOrderId(orderId);
        const fulfillmentId = await getFulfillmentId(fulfillmentOrderId);

        let eventStatus = "";
        const notificationTitle = "Order Status Update";
        let notificationBody = "";

        // Determine which Shopify event to send and FCM notification
        if (taskStatus === statusMap.Started) {
            eventStatus = "in_transit";
            notificationBody = "A scrubbr is on their way to your vehicle!";
        } else if (taskStatus === statusMap.Arrived) {
            eventStatus = "out_for_delivery";
            notificationBody = "The scrubbr assigned to your vehicle has just arrived!!";
        } else if (taskStatus === statusMap.Successful) {
            eventStatus = "delivered";
            notificationBody = "Your order has been successfully delivered!";
        }

        // Send Shopify event
        if (eventStatus) {
            await sendShopifyEvent(orderId, fulfillmentId, eventStatus);
        }

        // Send FCM notification
        if (fcmToken) {
            // await sendFcmNotification(fcmToken, notificationTitle, notificationBody);
            saveRecordToDb(fcmToken, notificationTitle, notificationBody, customerId);
        }

        // Return success response
        response.status(200).send({
            orderIdSent: orderId,
            fulfillmentOrderIdSent: fulfillmentOrderId,
            fulfillmentIdSent: fulfillmentId,
            status: "Success",
            notificationSent: !!fcmToken,
        });
    } catch (error) {
        logger.error("Error processing request:", error.message);
        response.status(500).send({error: error.message});
    }
});
