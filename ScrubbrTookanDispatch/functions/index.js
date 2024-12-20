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
const dayjs = require("dayjs");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

function generateAdditionalJobDetails(req) {
  try{
    const properties = req.body.line_items[0]?.properties || [];
    const result = properties
      .filter((prop) => prop.name !== "_SKU")
      .map((prop) => {
        // Format the name and value
        const formattedName = prop.name.replace(/^_/, "").replace(/_/g, " "); // Remove leading underscores
        const formattedValue = prop.value.replace(/\s?\(\+\s?\$\d+(\.\d{2})?\)/g, ""); // Remove (+ $XX.XX)
        return `${formattedName}: ${formattedValue}`;      
      })
      .join(". ");
      return result;
  }
  catch (error){
    return "Please contact Scrubbr for details on this order: info@scrubbrapp.com";
  }
}

exports.scrubbr_tookan_create_order = onRequest((request, response) => {
  logger.info("Request: ", request.body);
  //TODO: Create an order in Tookan
  const additionalDetails = generateAdditionalJobDetails(request);
    // Helper function to build the customer address
  const buildCustomerAddress = (address1, address2, city, province, zip, country) => {
    let fullAddress = address1;
    if (address2 && address2.trim() !== "") {
      fullAddress += ` ${address2}`;
    }
    fullAddress += ` ${city} ${province} ${zip} ${country}`;
    return fullAddress;
  };

  createApptTask = {
    customer_email: request.body.email,
    order_id: request.body.id,
    customer_username: request.body.customer.first_name + request.body.customer.last_name,
    customer_phone: request.body.customer.phone,
    customer_address: buildCustomerAddress(
      request.body.shipping_address.address1,
      request.body.shipping_address.address2,
      request.body.shipping_address.city,
      request.body.shipping_address.province,
      request.body.shipping_address.zip,
      request.body.shipping_address.country
    ),
    latitude: request.body.shipping_address.latitude,
    longitude: request.body.shipping_address.longitude,
    job_description: request.body.line_items[0].vendor + ":" + request.body.line_items[0].title + " " + additionalDetails,
    job_pickup_datetime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    job_delivery_datetime: dayjs().add(1, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    has_pickup: "0",
    has_delivery: "0",
    layout_type: "1",
    tracking_link: 1,
    timezone: "+240",
    custom_field_template: "",
    meta_data: [],
    api_key: "53656087f94509404356726243566c471be5ccfe2ad47f3b5c1b02c4",
    team_id: "",
    auto_assignment: "1",
    fleet_id: "",
    ref_images: [],
    notify: 1,
    tags: "",
    geofence: 1
  }
  createTaskRequest = {
    api_key: "53656087f94509404356726243566c471be5ccfe2ad47f3b5c1b02c4",
    order_id: request.body.id,
    job_description: request.body.line_items[0].vendor + ":" + request.body.line_items[0].title,
    job_pickup_phone: request.body.customer.phone,
    job_pickup_name: request.body.customer.first_name + request.body.customer.last_name,
    job_pickup_email: request.body.email,
    job_pickup_address: request.body.shipping_address.address1 + " " + request.body.shipping_address.address2 + " " + request.body.shipping_address.city + " " + request.body.shipping_address.province + " " + request.body.shipping_address.zip + " " + request.body.shipping_address.country,
    job_pickup_latitude: request.body.shipping_address.latitude,
    job_pickup_longitude: request.body.shipping_address.longitude,
    job_pickup_datetime: request.body.created_at,
    pickup_custom_field_template: "",
    pickup_meta_data: [],
    team_id: "",
    auto_assignment: "0",
    has_pickup: "0",
    has_delivery: "1",
    layout_type: "0",
    tracking_link: 1,
    timezone: "+300",
    fleet_id: "",
    p_ref_images: [],
    notify: 1,
    tags: "",
    barcode: "",
    geofence: 1
  }
  const axios = require("axios");
  axios({
    method: "post",
    url: "https://api.tookanapp.com/v2/create_task",
    data: createApptTask
  })
  .then((res) => {
    if(res.status == 200){
      response.sendStatus(200);
      logger.info("Successfully created task for order id " + request.body.id)
      logger.info("Job details for order id "+request.body.id, res)
    }
    else{
      logger.warn("Request for Task Creation resulted in a status of: " + res.status + "...please take necessary action");
      response.sendStatus(res.status);
    }
  })
  .catch((err) => {
      logger.error("An error occured while trying to create a task for order id: " + request.body.id + ". Please take necessary action. Error is: " + err)
      response.sendStatus(500);
  });
});