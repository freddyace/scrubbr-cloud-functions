const functions = require("firebase-functions");
const express = require("express");
const logger = require("firebase-functions/logger");
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Endpoint 1: GET /hello
app.post("/fulfillment_order_notification", (req, res) => {
  logger.info("Recieved the following request: " + JSON.stringify(req.body));
  //ToDo: Handle Fulfillment
  res.sendStatus(200);
});
// exports.api = functions.https.onRequest((request, response) => {
//   logger.info("request recieved: " + JSON.stringify(request.body))
//   logger.info("Method used: " + request.method);
//   response.sendStatus(200);
// });
// Export the Express app as a Firebase Cloud Function
exports.shopify_fulfillment_listener = functions.https.onRequest(app);
