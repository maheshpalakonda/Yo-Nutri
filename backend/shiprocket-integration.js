const axios = require('axios');
require('dotenv').config();

// ShipRocket Integration Module
// ShipRocket credentials
const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL;
const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD;

// Pickup Address Details
// This is exported for use in server.js, but not used within this module directly for pickups.
const PICKUP_DETAILS = {
  location: 'Home', // IMPORTANT: This 'location' value MUST EXACTLY match the "Pickup Nickname" in your ShipRocket dashboard under Settings > Pickup Addresses.
  person_name: 'Imroze',
  phone: '7386691910',
  address: 'Flat no 510, Aditya Empress Height, Vivekananda Nagar, Shaikpet, Opposite Aditya Villas 7 tombs road',
  address_2: '',
  city: 'Hyderabad',
  state: 'Telangana',
  pincode: '500008',
  country: 'India'
};

const shiprocketApi = axios.create({
  baseURL: 'https://apiv2.shiprocket.in/v1/external',
});

// In-memory token storage (in production, use Redis or database)
let shiprocketToken = null;
let tokenExpiry = null;

// Authenticate with ShipRocket
async function authenticateShipRocket() {
  // Check if token is still valid
  if (shiprocketToken && tokenExpiry && Date.now() < tokenExpiry) {
    return shiprocketToken;
  }

  try {
    const response = await shiprocketApi.post('/auth/login', {
      email: SHIPROCKET_EMAIL,
      password: SHIPROCKET_PASSWORD,
    });
    shiprocketToken = response.data.token;
    // Token typically expires in 24 hours
    tokenExpiry = Date.now() + (24 * 60 * 60 * 1000);
    return shiprocketToken;
  } catch (error) {
    const apiError = error.response?.data?.message || error.message;
    const statusCode = error.response?.status;
    console.error('ShipRocket API Error Response:', JSON.stringify(error.response?.data));
    throw new Error(`ShipRocket authentication failed: ShipRocket API Error: ${statusCode} - ${apiError}`);
  }
}

// Create ShipRocket Order
async function createShipRocketOrder(orderData) {
  try {
    const token = await authenticateShipRocket();

    const shipRocketOrderData = {
      order_id: orderData.order_id.toString(),
      order_date: new Date().toISOString().split('T')[0],
      pickup_location: PICKUP_DETAILS.location,
      channel_id: orderData.channel_id || "", // Your ShipRocket channel ID
      comment: orderData.comment || "Order from Yo! Nutri",
      billing_customer_name: orderData.billing_customer_name,
      billing_last_name: orderData.billing_last_name || "",
      billing_address: orderData.billing_address,
      billing_address_2: orderData.billing_address_2 || "",
      billing_city: orderData.billing_city,
      billing_pincode: orderData.billing_pincode,
      billing_state: orderData.billing_state,
      billing_country: orderData.billing_country || "India",
      billing_email: orderData.billing_email,
      billing_phone: orderData.billing_phone,
      shipping_is_billing: orderData.shipping_is_billing,
      shipping_customer_name: orderData.shipping_customer_name,
      shipping_last_name: orderData.shipping_last_name || "",
      shipping_address: orderData.shipping_address || orderData.billing_address,
      shipping_address_2: orderData.shipping_address_2 || "",
      shipping_city: orderData.shipping_city || orderData.billing_city,
      shipping_pincode: orderData.shipping_pincode || orderData.billing_pincode,
      shipping_country: orderData.shipping_country || "India",
      shipping_state: orderData.shipping_state || orderData.billing_state,
      shipping_email: orderData.shipping_email || orderData.billing_email,
      shipping_phone: orderData.shipping_phone || orderData.billing_phone,
      order_items: orderData.order_items.map(item => ({
        name: item.name,
        sku: item.sku || item.name.replace(/\s+/g, '-').toLowerCase(),
        units: item.quantity,
        selling_price: item.price,
        discount: item.discount || 0,
        tax: item.tax || 0,
        hsn: item.hsn || 0
      })),
      payment_method: orderData.payment_method || "Prepaid",
      shipping_charges: orderData.shipping_charges || 0,
      giftwrap_charges: orderData.giftwrap_charges || 0,
      transaction_charges: orderData.transaction_charges || 0,
      total_discount: orderData.total_discount || 0,
      sub_total: orderData.sub_total,
      length: orderData.length || 10,
      breadth: orderData.breadth || 10,
      height: orderData.height || 10,
      weight: orderData.weight || 0.5
    };

    // Log the data being sent to ShipRocket for debugging
    console.log('Data being sent to ShipRocket:', JSON.stringify(shipRocketOrderData, null, 2));

    const response = await shiprocketApi.post('/orders/create/adhoc', shipRocketOrderData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('ShipRocket API response:', response.data);
    return response.data;

  } catch (error) {
    const apiError = error.response?.data?.message || error.message;
    const statusCode = error.response?.status;
    console.error('Error creating ShipRocket order:', apiError);
    console.error('Full ShipRocket Error:', error.response?.data || error);
    throw new Error(`Failed to create ShipRocket order: ${statusCode || 'N/A'} - ${apiError}`);
  }
}

// Track ShipRocket Order
async function trackShipRocketOrder(shiprocketOrderId) {
  try {
    const token = await authenticateShipRocket();
    const response = await shiprocketApi.get(`/courier/track?order_id=${shiprocketOrderId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;

  } catch (error) {
    const apiError = error.response?.data?.message || error.message;
    const statusCode = error.response?.status;
    throw new Error(`Failed to track ShipRocket order: ${statusCode || 'N/A'} - ${apiError}`);
  }
}

// Generate Shipping Label
async function generateShippingLabel(shipmentId) {
  try {
    const token = await authenticateShipRocket();
    const response = await shiprocketApi.post('/courier/generate/label', { shipment_id: [shipmentId] }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;

  } catch (error) {
    const apiError = error.response?.data?.message || error.message;
    const statusCode = error.response?.status;
    throw new Error(`Failed to generate shipping label: ${statusCode || 'N/A'} - ${apiError}`);
  }
}

// Schedule Pickup
async function schedulePickup(pickupData) {
  try {
    const token = await authenticateShipRocket();

    const pickupRequestData = {
      pickup_location: PICKUP_DETAILS.location,
      pickup_date: pickupData.pickup_date || new Date().toISOString().split('T')[0],
      pickup_time: pickupData.pickup_time || "10:00",
      pickup_person_name: PICKUP_DETAILS.person_name,
      pickup_person_phone: PICKUP_DETAILS.phone || pickupData.pickup_person_phone,
      pickup_person_address: PICKUP_DETAILS.address + (PICKUP_DETAILS.address_2 ? ', ' + PICKUP_DETAILS.address_2 : ''),
      pickup_person_pincode: PICKUP_DETAILS.pincode,
      pickup_person_city: PICKUP_DETAILS.city,
      pickup_person_state: PICKUP_DETAILS.state,
      pickup_person_country: PICKUP_DETAILS.country,
      weight: pickupData.weight || 1.0,
      length: pickupData.length || 10,
      breadth: pickupData.breadth || 10,
      height: pickupData.height || 10,
      shipment_ids: pickupData.shipment_ids || []
    };

    const response = await shiprocketApi.post('/courier/generate/pickup', pickupRequestData, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;

  } catch (error) {
    const apiError = error.response?.data?.message || error.message;
    const statusCode = error.response?.status;
    throw new Error(`Failed to schedule pickup: ${statusCode || 'N/A'} - ${apiError}`);
  }
}

// Get Available Couriers
async function getAvailableCouriers(pickupPincode, deliveryPincode, weight, cod = 0) {
  try {
    const token = await authenticateShipRocket();
    const response = await shiprocketApi.get(`/courier/serviceability?pickup_postcode=${pickupPincode}&delivery_postcode=${deliveryPincode}&weight=${weight}&cod=${cod}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;

  } catch (error) {
    const apiError = error.response?.data?.message || error.message;
    const statusCode = error.response?.status;
    throw new Error(`Failed to get available couriers: ${statusCode || 'N/A'} - ${apiError}`);
  }
}

// Cancel ShipRocket Order
async function cancelShipRocketOrder(orderIds) {
  try {
    const token = await authenticateShipRocket();

    const cancelData = {
      ids: Array.isArray(orderIds) ? orderIds : [orderIds]
    };

    const response = await shiprocketApi.post('/orders/cancel', cancelData, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;

  } catch (error) {
    const apiError = error.response?.data?.message || error.message;
    const statusCode = error.response?.status;
    throw new Error(`Failed to cancel ShipRocket order: ${statusCode || 'N/A'} - ${apiError}`);
  }
}

// Get Order Details
async function getShipRocketOrderDetails(orderId) {
  try {
    const token = await authenticateShipRocket();
    const response = await shiprocketApi.get(`/orders/show/${orderId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;

  } catch (error) {
    const apiError = error.response?.data?.message || error.message;
    const statusCode = error.response?.status;
    throw new Error(`Failed to get ShipRocket order details: ${statusCode || 'N/A'} - ${apiError}`);
  }
}

module.exports = {
  PICKUP_DETAILS, // Exporting for server.js
  createShipRocketOrder,
  trackShipRocketOrder,
  generateShippingLabel,
  schedulePickup,
  getAvailableCouriers,
  cancelShipRocketOrder,
  getShipRocketOrderDetails,
  authenticateShipRocket
};
