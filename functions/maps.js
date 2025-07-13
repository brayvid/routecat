// netlify/functions/maps.js
const fetch = require('node-fetch'); // Or use 'axios'

exports.handler = async (event, context) => {
  const { action, ...data } = JSON.parse(event.body); // Get data from client request
  const apiKey = process.env.API_KEY; // Get from environment variable (Corrected!)

  if (!apiKey) {
    console.error("Google Maps API key not set in environment variables!");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server configuration error" }),
    };
  }

  let googleMapsApiUrl;
  let requestBody = null;
  let method = 'GET';

  try {
    if (action === 'geocode') {
      googleMapsApiUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(data.address)}&key=${apiKey}`;  //API Key is only on server
    } else if (action === 'directions') {
      // Example:  Adapt to *your* specific directions API call.  This is just a placeholder!
      googleMapsApiUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(data.origin)}&destination=${encodeURIComponent(data.destination)}&mode=${encodeURIComponent(data.mode)}&key=${apiKey}`; //API Key is only on server
    }  else if (action === 'distanceMatrix') {
        const origins = encodeURIComponent(data.origins.join('|'));
        const destinations = encodeURIComponent(data.destinations.join('|'));
        googleMapsApiUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&mode=${encodeURIComponent(data.mode)}&key=${apiKey}`;
    }
    else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid action' }),
      };
    }

    const response = await fetch(googleMapsApiUrl, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: requestBody ? JSON.stringify(requestBody) : null, // Only send if requestBody is not null
    });

    if (!response.ok) {
      console.error(`Google Maps API error: ${response.status} ${response.statusText}`);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `Google Maps API error: ${response.statusText}` }),
      };
    }

    const googleMapsData = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(googleMapsData),
    };

  } catch (error) {
    console.error('Error calling Google Maps API:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to call Google Maps API' }),
    };
  }
};