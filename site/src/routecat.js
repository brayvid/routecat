/*  Title: RouteCat
    License: (c) 2020 Blake Rayvid. Non-commercial use only.
    Author: Blake Rayvid (https//github.com/brayvid)  */

// --- Constants and Defaults ---
const INITIAL_INPUT_ROWS = 6;
const TRANSPORTATION_MODE = 'BICYCLING';
const DROPOFF_SECONDS = 30;
const DEFAULT_COLORS = ["#e6194B", "#3cb44b", "#4363d8", "#9A6324", "#f032e6", "#e6194B"];
const START_PIN_URL = 'img/pins/start.png';
const STOP_PIN_URL = 'img/pins/stop.png';

// --- State Variables --- (Minimize global state)
let numFields = 0;  // Number of address input fields
let colors = [...DEFAULT_COLORS]; // Make a copy to avoid modifying the original
let numDrivers = 1;
let map = null;         // Google Map instance
let addressArray = []; // Array of waypoint addresses
let routes = [];      // Array of route objects
let orderedGroups = []; // Order of waypoints in routes
let orderedColors = []; // Colors assigned to each route
let routeDurations = [];// Duration of each route
let startVal = "";      // Start address
let stopVal = "";       // Stop address
let coords = null;      // Coordinates of the starting address

// --- DOM Element IDs (Centralized) ---
const DOM = {
    map: "map",
    startAddress: "startAddress",
    stopAddress: "stopAddress",
    driverSelect: "driverSelect",
    finishSwitch: "finishSwitch",
    fields: "fields",
    assign: "assign",
    tbl: "tbl",
    start:"start",
    textdiv1:"textdiv1",
    textdiv2:"textdiv2"
};

// --- Helper Functions ---
/**
 * Shuffles array in place.
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * Creates a DOM element with attributes.
 * @param {string} tag - The tag name of the element.
 * @param {object} attributes - An object containing the attributes to set.
 * @returns {HTMLElement} The created DOM element.
 */
function createElement(tag, attributes) {
  const element = document.createElement(tag);
  for (const key in attributes) {
    element.setAttribute(key, attributes[key]);
  }
  return element;
}

/**
 * Displays an error message on the map element.
 * @param {string} message - The error message to display.
 */
function displayMapError(message) {
    document.getElementById(DOM.map).innerHTML = `<div class="alert alert-danger">${message}</div>`;
}

// --- Google Maps API Interactions (Using Server-Side Proxy) ---
/**
 * Makes a request to the server-side proxy for Google Maps API calls.
 * @param {string} action - The action to perform (e.g., "geocode", "directions").
 * @param {object} data - The data to send to the proxy.
 * @returns {Promise<object>} A promise that resolves with the API response or rejects with an error.
 */
async function callMapsApi(action, data) {
    try {
        const response = await fetch('/.netlify/functions/maps', { // Call the proxy function
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, ...data }),
        });

        if (!response.ok) {
            throw new Error(`API call failed with status ${response.status}`);
        }

        const result = await response.json();
        if (result.error) {
            throw new Error(`API returned error: ${result.error}`);
        }

        return result;
    } catch (error) {
        console.error(`Error calling Maps API action ${action}:`, error);
        displayMapError(`Failed to retrieve data from the server.  Check console.`); //Informative
        throw error;
    }
}

/**
 * Geocodes an address using the server-side proxy.
 * @param {string} address - The address to geocode.
 * @returns {Promise<google.maps.LatLng|null>} A promise that resolves with the LatLng object or null on failure.
 */
async function geocodeAddress(address) {
    try {
        const data = await callMapsApi('geocode', { address });
        if (data.results && data.results.length > 0) {
            return data.results[0].geometry.location;
        } else {
            console.warn(`Geocoding failed for address "${address}": No results found.`);
            displayMapError(`Could not find coordinates for address "${address}".`);
            return null;
        }
    } catch (error) {
        console.error("Geocoding error:", error);
        displayMapError("Failed to geocode address. Check console for details.");
        return null;
    }
}

/**
 * Fetches a distance matrix using the server-side proxy.
 * @param {string[]} origins - An array of origin addresses.
 * @param {string[]} destinations - An array of destination addresses.
 * @param {string} mode - The transportation mode.
 * @returns {Promise<google.maps.DistanceMatrixResponse|null>} A promise that resolves with the DistanceMatrixResponse object or null on failure.
 */
async function getDistanceMatrix(origins, destinations, mode) {
    try {
        return await callMapsApi('distanceMatrix', { origins, destinations, mode });
    } catch (error) {
        console.error("Distance Matrix error:", error);
        displayMapError("Failed to retrieve distance matrix. Check console for details.");
        return null;
    }
}

/**
 * Sends a directions request using the server-side proxy.
 * @param {string} origin - The origin address.
 * @param {string} destination - The destination address.
 * @param {google.maps.DirectionsWaypoint[]} waypoints - An array of DirectionsWaypoint objects.
 * @param {string} travelMode - The travel mode.
 */
async function getDirections(origin, destination, waypoints, travelMode) {
    try {
        return await callMapsApi('directions', {
            origin: origin,
            destination: destination,
            waypoints: waypoints,
            travelMode: travelMode
        });
    } catch (error) {
        console.error("Directions request failed:", error);
        displayMapError("Failed to get directions. Check console for details.");
        return null;
    }
}

// --- Route Planning Functions ---
/**
 * Clusters waypoints into groups for multiple drivers.
 * @param {string[]} addresses - An array of waypoint addresses.
 * @param {number} numDrivers - The number of drivers.
 * @param {function} callback - The callback function to call with the clustered addresses.
 */
async function clusterWaypoints(addresses, numDrivers, callback) {
    const fullAddresses = [startVal].concat(addresses);

    const distanceMatrix = await getDistanceMatrix(fullAddresses, fullAddresses, TRANSPORTATION_MODE);

    if (!distanceMatrix || !distanceMatrix.rows) {
        console.error("Failed to fetch Distance Matrix:", distanceMatrix);
        displayMapError("Failed to fetch Distance Matrix.");
        return;
    }

    const matrixTimes = [];
    const averageTimes = [];

    for (let i = 0; i < fullAddresses.length; i++) {
        matrixTimes[i] = [];
        averageTimes[i] = [];
        for (let j = 0; j < fullAddresses.length; j++) {
            matrixTimes[i][j] = distanceMatrix.rows[i].elements[j].duration.value;
            averageTimes[i][j] = 0;
        }
    }

    for (let i = 0; i < matrixTimes.length; i++) {
        for (let j = 0; j < matrixTimes.length; j++) {
            if (j < i) {
                averageTimes[j][i] = 0;
            } else {
                averageTimes[j][i] = (matrixTimes[i][j] + matrixTimes[j][i]) / 2;
            }
        }
    }

    let avgMax = 0, avgMin = 999999999;
    for (let i = 1; i < averageTimes.length; i++) {
        for (let j = 1; j < i; j++) {
            avgMax = Math.max(avgMax, averageTimes[i][j]);
            avgMin = Math.min(avgMin, averageTimes[i][j]);
        }
    }

    const matrixMidrange = (numDrivers === 2)
        ? avgMin + (avgMax - avgMin) / numDrivers
        : avgMin + (avgMax - avgMin) / 3;

    const groups = [];
    for (let i = 1; i < averageTimes.length; i++) {
        for (let j = 1; j < i; j++) {
            if (averageTimes[i][j] < matrixMidrange) {
                let placed = false;
                for (let k = 0; k < groups.length; k++) {
                    if (groups[k].includes(i) || groups[k].includes(j)) {
                        if (!groups[k].includes(i)) groups[k].push(i);
                        if (!groups[k].includes(j)) groups[k].push(j);
                        placed = true;
                        break;
                    }
                }
                if (!placed) {
                    groups.push([i, j]);
                }
            }
        }
    }

    for (let i = 0; i < addresses.length; i++) {
        let found = groups.some(g => g.includes(i + 1));
        if (!found) {
            groups.push([i + 1]);
        }
    }

    const shuffledGroups = groups.map(g => g.sort());
    shuffle(shuffledGroups); // Shuffle groups

    callback(shuffledGroups.map(g => g.map(i => addresses[i - 1])));
}

/**
 * Sends clustered routes to Google Maps and displays them on the map.
 * @param {string[][]} groupedAddresses - An array of arrays, where each inner array contains addresses for a single route.
 */
async function sendClusteredRoutes(groupedAddresses) {
    routes = [];
    orderedGroups = [];
    colors = DEFAULT_COLORS.slice(); // Reset colors, creating a new copy
    orderedColors = [];
    routeDurations = [];

    const mapElement = document.getElementById(DOM.map); // Get map element

    const mapOptions = {
        zoom: 11,
        center: coords,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: true,
        gestureHandling: 'cooperative'
    };

    map = new google.maps.Map(mapElement, mapOptions);

    for (let i = 0; i < groupedAddresses.length; i++) {
        const group = groupedAddresses[i];
        const waypts = group.map(addr => ({ location: addr, stopover: true }));
        const color = colors[i % colors.length];
        orderedColors.push(color);

        try {
            const directionsResult = await getDirections(
                startVal,
                stopVal,
                waypts,
                TRANSPORTATION_MODE
            );

            if (!directionsResult || !directionsResult.routes || directionsResult.routes.length === 0) {
                console.warn(`Directions request failed for driver ${i + 1}.`);
                displayMapError(`Directions request failed for driver ${i + 1}.`);
                continue; // Skip to the next driver
            }

            const route = directionsResult.routes[0];
            const legs = route.legs;
            let duration = 0;
            for (let k = 0; k < legs.length; k++) {
                duration += legs[k].duration.value;
            }
            routeDurations.push(duration + DROPOFF_SECONDS * (legs.length - 1));
            orderedGroups.push(route.waypoint_order);

            const directionsRenderer = new google.maps.DirectionsRenderer({
                polylineOptions: { strokeColor: color },
                suppressMarkers: true,
                preserveViewport: true,
                map: map
            });
            directionsRenderer.setDirections(directionsResult);

            // Markers
            new google.maps.Marker({
                position: legs[0].start_location,
                map: map,
                icon: START_PIN_URL
            });

            for (let i = 1; i < legs.length + 1; i++) {
                const icon = (i === legs.length)
                    ? STOP_PIN_URL
                    : 'https://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=' + i + '|ff0000|000000';
                new google.maps.Marker({
                    position: legs[i - 1].end_location,
                    map: map,
                    icon: icon
                });
            }
            routes.push(route);

            results(); // Update the results table

        } catch (error) {
            console.error("Error processing route:", error);
            displayMapError(`Failed to process route for driver ${i + 1}. Check console for details.`);
        }
    }

    mapElement.style.height = "300px";
}

// --- Display Functions ---
/**
 * Updates the table with route information.
 */
function results() {
    const table = document.createElement("table");
    table.id = "displayTable";
    table.className = "table table-condensed";

    const tbody = document.createElement("tbody");
    tbody.id = "tablebody";
    table.appendChild(tbody);

    const fragment = document.createDocumentFragment();

    for (let i = 0; i < routes.length; i++) {
        let headNode = document.createElement("TH");
        let headText = document.createTextNode("Driver " + (i + 1) + " (" + (routeDurations[i] / 60).toFixed(1) + " mins)");
        headNode.appendChild(headText);
        headNode.style.borderBottom = "20px solid " + orderedColors[i];
        fragment.appendChild(headNode);
    }

    let maxStops = Math.max(...routes.map(r => r.legs.length));

    for (let step = 0; step < maxStops; step++) {
        let bodyNode = document.createElement("TR");
        for (let r = 0; r < routes.length; r++) {
            let bodyData = document.createElement("TD");
            let legs = routes[r].legs;

            if (step === legs.length) {
                bodyData.appendChild(document.createTextNode("🛑 " + legs[legs.length - 1].end_address));
            } else if (step < legs.length) {
                bodyData.appendChild(document.createTextNode((step + 1) + ") " + legs[step].start_address));
            } else {
                bodyData.innerHTML = "";
            }

            bodyNode.appendChild(bodyData);
        }
        fragment.appendChild(bodyNode);
    }

    tbody.appendChild(fragment);
    const tbl = document.getElementById(DOM.tbl);
    tbl.innerHTML = '';
    tbl.appendChild(table);
}

// --- UI Interaction Functions ---
/**
 * Sends route request
 */
async function requestRoute() {
    addressArray = [];
    startVal = document.getElementById(DOM.startAddress).value;
    stopVal = document.getElementById(DOM.stopAddress).value;
    numDrivers = parseInt(document.getElementById(DOM.driverSelect).value || "1");

    if ($('#finishSwitch').is(':checked')) {
        stopVal = startVal;
    }

    for (let i = 1; i < (numFields + 1); i++) {
        let aTemp = document.getElementById("a" + i).value;
        if (aTemp.trim() !== '') {
            addressArray.push(aTemp);
        }
    }

    if (addressArray.length < 1) {
        displayMapError("Enter at least one waypoint.");
        return;
    }

    coords = await geocodeAddress(startVal); // Await the geocoding result

    if (coords) {
        clusterWaypoints(addressArray, numDrivers, sendClusteredRoutes);
    } else {
        displayMapError(`Failed to geocode start address "${startVal}".`);
    }
}

/**
 * Called when google cloud API has loaded
 */
function googleReady() {
    try {
        console.log("Maps JavaScript API ready.");
        // Initialize map-related services here
    } catch (error) {
        console.warn("Google Maps initialization failed:", error);
        displayMapError("Map initialization failed. Please check console.");
    }
}

/**
 * Gets the current location using the browser's geolocation API.
 */
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(geocodeLatLng);
    } else {
        document.getElementById(DOM.startAddress).value = "Unknown";
    }
}

/**
 * Geocodes latitude and longitude to address.
 * @param {GeolocationPosition} pos - The geolocation position object.
 */
function geocodeLatLng(pos) {
    const latlng = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
    };
    coords = latlng;

    // Use geocodeAddress with the retrieved coordinates
    callMapsApi('geocode', { latlng: latlng })
        .then(data => {
            if (data.results && data.results[0]) {
                document.getElementById(DOM.startAddress).value = data.results[0].formatted_address;
                document.getElementById(DOM.startAddress).setAttribute('placeholder', 'Start');
            } else {
                console.warn("Reverse geocoding failed: No results found.");
                displayMapError("Could not determine address from current location.");
            }
        })
        .catch(error => {
            console.error("Reverse geocoding error:", error);
            displayMapError("Failed to determine address from current location. Check console for details.");
        });
}

// --- DOM Manipulation Functions ---
/**
 * Adds a new row of input fields.
 */
function addField() {
    let i = numFields;
    let d = createElement("div", { class: "form-row", id: "row" + (i + 1) });
    let din = createElement("div", { class: "col col-md-12" });
    let inp = createElement("input", {
        class: "form-control",
        type: "text",
        placeholder: "Address",
        id: "a" + (i + 1)
    });

    inp.addEventListener("keyup", function (event) {
        if (event.keyCode === 13) {
            event.preventDefault();
            document.getElementById(DOM.assign).click();
        }
    });

    din.appendChild(inp);
    d.appendChild(din);
    document.getElementById(DOM.fields).appendChild(d);
    numFields++;
}

/**
 * Creates the start and end point input fields.
 */
function makeEndptFields() {
    let d = createElement("div", { class: "form-row", id: "endpts" });
    for (let j = 1; j < 3; j++) {
        let din = createElement("div", { class: "col col-md", id: "textdiv" + j });
        let inp = createElement("input", { class: "form-control", type: "text" });
        if (j === 1) {
            inp.setAttribute("placeholder", "Start");
            inp.setAttribute("id", DOM.startAddress);
        } else {
            inp.setAttribute("placeholder", "Finish");
            inp.setAttribute("id", DOM.stopAddress);
        }
        inp.addEventListener("keyup", function (event) {
            if (event.keyCode === 13) {
                event.preventDefault();
                document.getElementById(DOM.assign).click();
            }
        });
        din.appendChild(inp);
        d.appendChild(din);
    }
    document.getElementById(DOM.start).appendChild(d);
}

/**
 * Removes the last row of input fields.
 */
function removeField() {
    if (numFields > 1) {
        const select = document.getElementById(DOM.fields);
        select.removeChild(select.lastChild);
        numFields -= 1;
    }
}

// --- Initialization ---
(function () {
    window.INITIAL_INPUT_ROWS = INITIAL_INPUT_ROWS;
    makeEndptFields();
    for (let r = 0; r < INITIAL_INPUT_ROWS; r++) addField();

    $("#assign").click(function () {
        $(".collapse").collapse('show');
    });

    $('#gpsSwitch').click(function () {
        if ($('#gpsSwitch').is(':checked')) {
            document.getElementById(DOM.startAddress).setAttribute('placeholder', 'Locating...');
            getLocation();
        }
    });

    $('#finishSwitch').click(function () {
        const x = document.getElementById(DOM.textdiv2);
        const y = document.getElementById(DOM.textdiv1);
        if ($('#finishSwitch').is(':checked')) {
            x.style.display = "none";
            y.className = "col col-md-12";
        } else {
            x.style.display = "block";
            y.className = "col col-md";
        }
    });
})();