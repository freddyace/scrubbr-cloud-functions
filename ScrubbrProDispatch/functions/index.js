/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
admin.initializeApp();
const logger = require("firebase-functions/logger");

const db = admin.firestore();
const messaging = admin.messaging();

exports.assignJobToNearbyCleaners = onDocumentCreated("orders/{orderId}", async (event) => {
    logger.info('Order received')
    const snap = event.data;
    const context = event;
    const jobData = snap.data();
    const orderId = context.params.orderId;

    // Ensure job location exists
    const jobLocation = jobData.shipping_address;
    if (!jobLocation || !jobLocation.coordinates.latitude || !jobLocation.coordinates.longitude) {
        logger.error("Missing location for job:", orderId);
        return;
    }

    const radiusInKm = 10;

    // Avoid duplicate job offer processing
    const offerDoc = await db.collection("jobOffers").doc(orderId).get();
    if (offerDoc.exists) {
        console.info(`Job offer for order ${orderId} already exists.`);
        return;
    }

    // Fetch available cleaners
    const cleanerSnap = await db.collection("scrubbrs")
        .where("isOnline", "==", true)
        .get();

    const cleaners = cleanerSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    logger.info("Online cleaners:", cleaners);
    const targetedCleaners = [];

    cleanerSnap.forEach(doc => {
        const cleaner = doc.data();
        if (!cleaner.position?.geopoint){
            logger.info("No position found for cleaner: ", cleaner);
            return;
        }

        const lat1 = jobLocation.coordinates.latitude;
        const lon1 = jobLocation.coordinates.longitude;
        const lat2 = cleaner.position.geopoint.latitude;
        const lon2 = cleaner.position.geopoint.longitude;
        logger.info("Performing haversine function for job location: ", lat1, ", ", lon1, " - cleaner position: ", lat2, ", ", lon2);
        const distance = haversine(lat1, lon1, lat2, lon2);
        if (distance <= radiusInKm) {
            logger.info("distance within radius")
            targetedCleaners.push({
                uid: doc.id,
                fcmToken: cleaner.fcmToken
            });
        }
        else{
            logger.info("distance not within radius");
        }
    });

    // Notify top 5
    const subset = targetedCleaners.slice(0, 5);
    logger.info("top 5 cleaners: ", subset);
    for (const cleaner of subset) {
        if (cleaner.fcmToken) {
            const message = {
                token: cleaner.fcmToken,
                notification: {
                    title: "New Order",
                    body: "A customer near you has requested a cleaning service. Tap to respond.",
                },
                data: {
                    orderId: orderId,
                },
            };
            logger.info("Sending message: ", message);
            await messaging.send(message);
        }
    }

    // Log sent job offer
    await db.collection("jobOffers").doc(orderId).set({
        orderId,
        sentTo: subset.map(c => c.uid),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        acceptedBy: null
    });

    return;
});

function haversine(lat1, lon1, lat2, lon2) {
    const toRad = (x) => x * Math.PI / 180;
    const R = 6371; // Radius of the Earth in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
