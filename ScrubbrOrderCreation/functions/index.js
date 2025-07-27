const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const logger = require("firebase-functions/logger");
const axios = require("axios");

// Initialize Firebase Admin SDK
initializeApp();
const db = getFirestore();

// Reference the secret
const GOOGLE_MAPS_API_KEY = defineSecret("GOOGLE_MAPS_API_KEY");

exports.createOrder = onRequest(
  { secrets: [GOOGLE_MAPS_API_KEY] },
  async (request, response) => {
    logger.info("Received the following request: ", request.body);

    try {
      const body = request.body;

      if (!body.customer || !body.shipping_address || !body.line_items) {
        logger.error("Missing required fields in request");
        return response.status(400).send({ error: "Missing required fields." });
      }

      const fullAddress = `${body.shipping_address.address1}, ${body.shipping_address.city}, ${body.shipping_address.province}, ${body.shipping_address.zip}`;

      // Call Google Geocoding API
      const geoResponse = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json`,
        {
          params: {
            address: fullAddress,
            key: GOOGLE_MAPS_API_KEY.value(), // Retrieve the secret securely
          },
        }
      );

      let coordinates = null;
      if (
        geoResponse.data.status === "OK" &&
        geoResponse.data.results.length > 0
      ) {
        const location = geoResponse.data.results[0].geometry.location;
        coordinates = {
          latitude: location.lat,
          longitude: location.lng,
        };
      } else {
        logger.warn("Could not fetch coordinates:", geoResponse.data.status);
      }

      const orderData = {
        customer: {
          id: body.customer.id,
          first_name: body.customer.first_name,
          last_name: body.customer.last_name,
          email: body.customer.email,
        },
        shipping_address: {
          line1: body.shipping_address.address1,
          line2: body.shipping_address.address2,
          city: body.shipping_address.city,
          state: body.shipping_address.province,
          postal_code: body.shipping_address.zip,
          coordinates: coordinates || null,
        },
        line_items: body.line_items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        createdAt: new Date().toISOString(),
      };

      await db.collection("orders").add(orderData);

      response.status(200).send({ message: "Order saved successfully." });
    } catch (error) {
      logger.error("Failed to create order", error);
      response.status(500).send({ error: "Internal server error." });
    }
  }
);
