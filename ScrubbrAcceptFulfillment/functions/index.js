/* eslint-disable max-len */
/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

exports.scrubbrAcceptFulfillment = onRequest((request, response) => {
  logger.info("Attempting to accept fulfillment for order id: " + request.body.order_id)
  logger.info("REQUEST: ---->", request.body);
  const orderId = request.body.order_id;
  logger.info("Order ID: ", orderId);
  let fulfillmentOrderId = "0";
  const axios = require("axios");
  const shopifyAccessToken = "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";
  // eslint-disable-next-line max-len
  axios.defaults.headers.post["X-Shopify-Access-Token"] = shopifyAccessToken;
  // eslint-disable-next-line max-len
  axios.defaults.headers.get["X-Shopify-Access-Token"] = shopifyAccessToken;

  // Get fulfillment Order ID
  logger.info("Getting fulfillment order id");
  axios({
    method: "get",
    url: "https://4eefe2-46.myshopify.com/admin/api/2024-04/orders/"+orderId+"/fulfillment_orders.json",
  })
      .then((res) => {
        logger.info("Successfully retrieved fulfillment orders: ", res.data);
        const fulfillmentOrders = res.data.fulfillment_orders;
        for (let i = 0; i < fulfillmentOrders.length; i++) {
          const fulfillmentOrder = fulfillmentOrders[i];
          fulfillmentOrderId = fulfillmentOrder.id;
          logger.info("Finished getting fulfillment order id: " + fulfillmentOrderId);
          logger.info("Getting fulfillment ids");
        }
        // Accept Fulfillment
        requestJson = {
            method: "post",
            url: "https://4eefe2-46.myshopify.com/admin/api/2024-07/fulfillment_orders/"+fulfillmentOrderId+"/fulfillment_request/accept.json",
            data: {"fulfillment_request": {"message": request.body.fleet_name + " has accepted your order and is on the way."}}
          }
          logger.info("Sending request to accept fulfillment: ", requestJson)
        axios(requestJson)
            .then((res) => {
                logger.info(request.body.fleet_name + " has accepted fulfillment for order id: " + orderId);
                logger.info("Creating Fulfillment for order id: " + orderId);
                //create fulfillment
                axios({
                    method: "post",
                    url: "https://4eefe2-46.myshopify.com/admin/api/2024-07/fulfillments.json",
                    data: {"fulfillment":{"line_items_by_fulfillment_order":[{"fulfillment_order_id":fulfillmentOrderId}]}}
                })
                .then()
                .catch()
            })
            .catch((err) => {
              logger.error("An error occured while trying to accept fulfillment....error is: " + err);
              response.send(err);
            });
      })
      .catch((err) => {
        logger.error("UNABLE TO GET FULFILLMENTS ORDERS for fulfillment order id: " + fulfillmentOrderId +", error is: " + err);
        response.send(err);
      });
});

