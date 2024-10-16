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

exports.scrubbrTrackr = onRequest((request, response) => {
  logger.info("REQUEST STATUS: ", request.body.job_status);
  logger.info("REQUEST: ---->", request.body);
  const taskStatus = request.body.task_status;
  const orderId = request.body.order_id;
  logger.info("Order ID: ", orderId);
  let fulfillmentOrderId = "0";
  let fulfillmentId = "0";
  let fulfillmentOrderIdErrorMessage = "N/A";
  const fulfillmentIdErrorMessage = "N/A";
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
    "Deleted": 10};

  //   response.send(request.body);
  const axios = require("axios");
  // eslint-disable-next-line max-len
  axios.defaults.headers.post["X-Shopify-Access-Token"] = "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";
  // eslint-disable-next-line max-len
  axios.defaults.headers.get["X-Shopify-Access-Token"] = "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";

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
          logger.info("Finished getting fulfillment order id");
          logger.info("Getting fulfillment ids");
        }
        // Get fulfillment ID
        axios({
          method: "get",
          url: "https://4eefe2-46.myshopify.com/admin/api/2024-04/fulfillment_orders/"+fulfillmentOrderId+"/fulfillments.json",
        })
            .then((res) => {
              logger.info("Successfully retrieved fulfillments: ", res.data);
              const fulfillments = res.data.fulfillments;
              for (let i = 0; i < fulfillments.length; i++) {
                const fulfillment = fulfillments[i];
                fulfillmentId = fulfillment.id;
                logger.info("Fulfillment ID changed to: ", fulfillmentId);
              }
              if (taskStatus == statusMap.Started) {
                // send in transit to shopify
                axios({
                  method: "post",
                  url: "https://4eefe2-46.myshopify.com/admin/api/2024-04/orders/"+orderId+"/fulfillments/"+fulfillmentId+"/events.json",
                  data: {event: {status: "in_transit"}},
                })
                    .then((res) => {
                      logger.info("final response: ", {
                        orderIdSent: orderId,
                        fulfillmentOrderIdSent: fulfillmentOrderId,
                        fulfillmentOrderIdErrorMessage: fulfillmentOrderIdErrorMessage,
                        fulfillmentIdSent: fulfillmentId,
                        fulfillmentIdErrorMessage: fulfillmentIdErrorMessage,
                        finalResponse: res.data,
                        urlHit: "https://4eefe2-46.myshopify.com/admin/api/2024-04/orders/"+orderId+"/fulfillments/"+fulfillmentId+"/events.json",
                      });
                      response.send({
                        orderIdSent: orderId,
                        fulfillmentOrderIdSent: fulfillmentOrderId,
                        fulfillmentOrderIdErrorMessage: fulfillmentOrderIdErrorMessage,
                        fulfillmentIdSent: fulfillmentId,
                        fulfillmentIdErrorMessage: fulfillmentIdErrorMessage,
                        finalResponse: res.data,
                      });
                    })
                    .catch((err) => {
                      logger.error(err);
                      response.send(err);
                    });
              } else if (taskStatus == statusMap.Arrived) {
                // send out for delivery to shopify
                axios({
                  method: "post",
                  url: "https://4eefe2-46.myshopify.com/admin/api/2024-01/orders/"+orderId+"/fulfillments/"+fulfillmentId+"/events.json",
                  data: {event: {status: "out_for_delivery"}},
                })
                    .then((res) => {
                      logger.info(res.data);
                    })
                    .catch((err) => {
                      logger.error(err);
                      response.send(err);
                    });
              } else if (taskStatus == statusMap.Successful) {
                // send delivered status to shopify
                axios({
                  method: "post",
                  url: "https://4eefe2-46.myshopify.com/admin/api/2024-04/orders/"+orderId+"/fulfillments/"+fulfillmentId+"/events.json",
                  data: {event: {status: "delivered"}},
                })
                    .then((res) => {
                      logger.info("final response: ", {
                        orderIdSent: orderId,
                        fulfillmentOrderIdSent: fulfillmentOrderId,
                        fulfillmentOrderIdErrorMessage: fulfillmentOrderIdErrorMessage,
                        fulfillmentIdSent: fulfillmentId,
                        fulfillmentIdErrorMessage: fulfillmentIdErrorMessage,
                        finalResponse: res.data,
                        urlHit: "https://4eefe2-46.myshopify.com/admin/api/2024-04/orders/"+orderId+"/fulfillments/"+fulfillmentId+"/events.json",
                      });
                      response.send({
                        orderIdSent: orderId,
                        fulfillmentOrderIdSent: fulfillmentOrderId,
                        fulfillmentOrderIdErrorMessage: fulfillmentOrderIdErrorMessage,
                        fulfillmentIdSent: fulfillmentId,
                        fulfillmentIdErrorMessage: fulfillmentIdErrorMessage,
                        finalResponse: res.data,
                      });
                    })
                    .catch((err) => {
                      logger.error(err);
                      response.send(err);
                    });
              }
            })
            .catch((err) => {
              logger.error("UNABLE TO GET FULFILLMENTS, error is: ");
              logger.error(err);
              response.send(err);
            });
      })
      .catch((err) => {
        logger.error("UNABLE TO GET FULFILLMENTS ORDERS, error is: ");
        logger.error(err);
        fulfillmentOrderIdErrorMessage = err;
        response.send(err);
      });
});

