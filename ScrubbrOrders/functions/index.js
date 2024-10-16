/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
const functions = require("firebase-functions");
const {onRequest} = require("firebase-functions/v2/https");
const express = require("express");
var cors = require('cors')
const logger = require("firebase-functions/logger");
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cors())
// Endpoint 1: GET /hello
app.post("/getOrderDeliveryStatusById", (req, res) => {
  logger.info('Recieved the following request: ', req.body)
  const axios = require("axios");
  const apiAccessToken = "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"
  // eslint-disable-next-line max-len
  axios.defaults.headers.post["X-Shopify-Access-Token"] = apiAccessToken;
  // eslint-disable-next-line max-len
  axios.defaults.headers.get["X-Shopify-Access-Token"] = apiAccessToken;
  var requestUrl = "https://4eefe2-46.myshopify.com/admin/api/2024-07/orders/"+req.body.order_id+".json";
  axios({
    method: "get",
    url: requestUrl
  }).then((response) => {
    logger.info(response)
    logger.info("Recieved the following response: ",  response.body);
    var deliveryStatus = response.data.order.fulfillments[0].shipment_status;
    res.set('Access-Control-Allow-Origin', 'https://scrubbrmobilewash.com')
    res.send({"delivery_status": deliveryStatus});
  })
    .catch((err) => {
      logger.error("An error occured while retrieving order fulfillment info....", err)
      res.sendStatus(500);
    })
});

exports.scrubbrOrders = functions.https.onRequest(app);
