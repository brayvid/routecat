/*  Title: ACRoute v1.1   
    Usage: (c) 2020 Blake Rayvid. Non-commercial use only.
    Author: Blake Rayvid (https//github.com/brayvid)  */

var numFields = 0,
    colors,
    numDrivers,
    matrixService,
    directionService,
    placesService,
    map,
    mapOptions,
    orders,
    addressArray,
    groups,
    orderedGroups,
    orderedColors,
    addressGroups,
    routeDurations,
    directionsCounter,
    startVal,
    stopVal,
    locality,
    ocrText,
    splitted,
    coords,
    geocoder;

/* Sends distance matrix request */
function requestMatrix(orderCount) {
    // get order IDs and addresses from fields
    orders = [];
    addressArray = [];

    // splitted = ocrText

    locality = document.getElementById("city").value;
    if (locality == "") {
        locality = "New York, NY";
    }
    startVal = document.getElementById("startAddress").value;
    stopVal = document.getElementById("stopAddress").value;

    if (startVal == '') {
        document.getElementById("map").style.height = "30px";
        document.getElementById("map").innerHTML = "Enter a starting address.";
        return;
    } else {
        if (stopVal == '') {
            stopVal = startVal;
        }
    }

    for (let i = 1; i < (numFields + 1); i++) {
        let nTemp = i.toString();
        let aTemp = document.getElementById("a" + i).value;
        if (nTemp.match(/\S/) && aTemp.match(/\S/)) {
            orders.push(new Order(nTemp, aTemp + ", " + locality));
            addressArray.push(aTemp + ", " + locality);
        }
    }

    // Don't process when all fields are empty or only one order present
    if (orders.length < 2) {
        document.getElementById("map").style.height = "30px";
        document.getElementById("map").innerHTML = "Enter at least two waypoints.";
        return;
    }
    // Initialize variables
    numDrivers = 1;
    directionsCounter = 0;
    orderedGroups = [];
    colors = defaultColors;
    orderedColors = [];
    routeDurations = [];
    mapOptions = {
        zoom: 12,
        center: {
            lat: coords[0],
            lng: coords[1]
        },
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: true,
        gestureHandling: 'cooperative'
    };
    map = new google.maps.Map(document.getElementById("map"), mapOptions);

    console.log("Addresses:");
    for (let i = 0; i < addressArray.length; i++) {
        console.log(addressArray[i]);
    }

    // Get distance matrix for this set of orders
    let matrixRequest = {
        // origins same as destinations
        origins: [startVal + ", " + locality].concat(addressArray),
        destinations: [stopVal + ", " + locality].concat(addressArray),
        travelMode: transportation,
    };

    matrixService.getDistanceMatrix(matrixRequest, matrixCallback);

    $(".collapse").collapse('show');
}

/* Runs when distance matrix is received */
function matrixCallback(response, status) {
    if (status == 'OK') {
        // console.log("Distance matrix received.");
        cluster(response.rows); // determine groups
        addressGroups = new Array(groups.length);
        numGroups = groups.length;
        for (let i = 0; i < groups.length; i++) {
            addressGroups[i] = [];
            console.log("Group " + (i + 1) + ":");
            for (let j = 0; j < groups[i].length; j++) {
                let currentAddress = addressArray[groups[i][j] - 1];
                console.log(currentAddress);
                addressGroups[i].push(currentAddress);
            }
            requestRoutes(addressGroups[i]);
        }
    } else {
        document.getElementById("map").style.height = "30px";
        document.getElementById("map").innerHTML = "Distance matrix request unsuccessful: " + status;
    }
}

/* Clustering process */
function cluster(rows) {
    // Consolidate travel times (by bike) into a 2D array, rows = origins, cols = dests.
    let matrixTimes = [];
    let averageTimes = [];
    for (let i = 0; i < rows.length; i++) {
        matrixTimes.push([]);
        averageTimes.push([]);
        for (let j = 0; j < rows.length; j++) {
            matrixTimes[i].push(rows[i].elements[j].duration.value);
            averageTimes[i].push(0);
        }
    }

    // Average the forward and reverse times for each pair of addresses
    for (let i = 0; i < matrixTimes.length; i++) {
        for (let j = 0; j < matrixTimes.length; j++) {
            if (j < i) {
                averageTimes[j][i] = 0;
            } else {
                averageTimes[j][i] = (matrixTimes[i][j] + matrixTimes[j][i]) / 2;
            }
        }
    }

    // Hierarchical agglomerative clustering
    let activeSet = [];
    for (let i = 0; i < rows.length - 1; i++) {
        activeSet.push([i + 1]);
    }

    while (activeSet.length > numDrivers) {
        let minDist = 999999999,
            closestGroup1, closestGroup2,
            group1Index, group2Index; // for argmin

        // compare distance between each group in activeSet
        for (let i = 0; i < activeSet.length - 1; i++) {
            for (let j = i + 1; j < activeSet.length; j++) {
                let d = averageClusterDistance(activeSet[i], activeSet[j], averageTimes);
                if (d < minDist) {
                    closestGroup1 = activeSet[i];
                    group1Index = i;
                    closestGroup2 = activeSet[j];
                    group2Index = j;
                    minDist = d;
                }
            }
        }

        // Remove individual members (from end of array first)
        if (group1Index > group2Index) {
            activeSet.splice(group1Index, 1);
            activeSet.splice(group2Index, 1);
        } else {
            activeSet.splice(group2Index, 1);
            activeSet.splice(group1Index, 1);
        }

        // Add newly formed composite group containing members just removed
        let setToAdd = closestGroup1.concat(closestGroup2);

        activeSet.push(setToAdd);
    }
    // End clustering

    groups = activeSet;
    // let groups = activeSet;
    // Sort each group so the lowest-numbered order is first
    for (let i = 0; i < groups.length; i++) {
        groups[i].sort();
    }
}

/* Distance function for clustering */
function averageClusterDistance(X, Y, M) {
    // X, Y are 1D arrays representing groups; they contain the indices (w/r averageTimes matrix) of the orders in their group
    let n = X.length;
    let m = Y.length;
    let den = n * m;
    let outerSum = 0;
    for (let i = 0; i < n; i++) {
        let innerSum = 0;
        for (let j = 0; j < m; j++) {
            let dist = M[Math.max(X[i], Y[j])][Math.min(X[i], Y[j])];
            innerSum += dist;
        }
        outerSum += innerSum;
    }
    return outerSum / den;
}

/* Sends directions request */
function requestRoutes(addresses) {
    let waypts = [];
    for (let j = 0; j < addresses.length; j++) {
        waypts.push({
            location: addresses[j],
            stopover: true
        });
    }

    let directionsRequest = {
        origin: startVal + ', ' + locality,
        destination: stopVal + ', ' + locality,
        travelMode: transportation,
        waypoints: waypts,
        optimizeWaypoints: true,
        provideRouteAlternatives: false,
    };

    directionService.route(directionsRequest, directionsCallback);
}

/* Runs whenever directions are received */
function directionsCallback(response, status) {
    if (status === 'OK') {
        directionsCounter++;
        // console.log("Route received.");
        let randInt = uniformRandomInt(0, colors.length - 1);
        let color = colors[randInt];
        colors.splice(randInt, 1);
        orderedColors.push(color);
        // Get route duration
        let route = response.routes[0];
        let legs = route.legs;
        let duration = 0;
        for (let k = 0; k < legs.length; k++) {
            duration += legs[k].duration.value;
        }
        routeDurations.push(duration + dropoffSeconds * (legs.length - 1));

        // Get updated waypoint order
        orderedGroups.push(route.waypoint_order);

        // Add route to map
        let directionsRenderer = new google.maps.DirectionsRenderer({
            polylineOptions: {
                strokeColor: color
            }
        });
        directionsRenderer.setMap(map);
        directionsRenderer.setOptions({
            suppressMarkers: true,
            draggable: false,
            preserveViewport: true,
            suppressBicyclingLayer: true
        });
        directionsRenderer.setDirections(response);

        // Final callback was executed
        if (directionsCounter == groups.length) {
            // Update table
            results();
            document.getElementById("map").style.height = "300px";
        }
    } else {
        document.getElementById("map").style.height = "30px";
        document.getElementById("map").innerHTML = "Directions request unsuccessful: " + status;
    }
}

/* Updates table and console */
function results() {
    // Print average route duration to console
    let avg = 0;
    console.log("Results:");
    for (let i = 0; i < routeDurations.length; i++) {
        let minutes = routeDurations[i] / 60;
        avg += minutes;
        console.log("Route duration: " + minutes.toFixed(2) + " min");
    }
    avg = avg / routeDurations.length;
    console.log("Average time: " + avg.toFixed(2) + " min");

    // Find max orders per driver over all drivers, aka number of rows of table to generate
    let maxToOneDriver = 0;
    let ordersPerDriver = [];
    for (let i = 0; i < groups.length; i++) {
        ordersPerDriver.push(groups[i].length);
        if (groups[i].length > maxToOneDriver) {
            maxToOneDriver = groups[i].length;
        }
    }

    // If there are fewer groups than drivers, set order counts for extra drivers to 0
    for (let i = 0; i < numDrivers - ordersPerDriver.length; i++) {
        ordersPerDriver.push(0);
    }

    // Determine if an order will be placed at each table entry
    let assignMap = [];
    for (let i = 0; i < maxToOneDriver; i++) { // for each row
        assignMap.push([]);
        for (j = 0; j < numDrivers; j++) { // for each column
            assignMap[i][j] = 0; // set to 0 to start
            if (ordersPerDriver[j] > 0) {
                // The current driver has orders still to list
                assignMap[i][j] = 1;
                ordersPerDriver[j] -= 1;
            }
        }
    }

    // Table header
    document.getElementById("tbl").innerHTML = '<table id="displayTable" class="table table-condensed"><tbody id="tablebody"></tbody></table>';
    for (let i = 0; i < numDrivers; i++) {
        let headNode = document.createElement("TH");
        let headText = document.createTextNode("Best route");
        // let headColor = document.createElement("SPAN");
        // headColor.innerHTML = " ";
        headNode.appendChild(headText);
        headNode.style.borderBottom = "20px solid " + orderedColors[i];
        // headNode.appendChild(headColor);
        document.getElementById("tablebody").appendChild(headNode);
    }

    // Table body
    for (let i = 0; i < maxToOneDriver; i++) { //  each row
        let bodyNode = document.createElement("TR");
        for (let j = 0; j < numDrivers; j++) {
            let bodyData = document.createElement("TD");
            if (assignMap[i][j] == 1) {
                let bodyText = document.createTextNode(orders[groups[j][orderedGroups[j][i]] - 1].address);
                // counter[j]++;
                bodyData.appendChild(bodyText);
            }
            bodyNode.appendChild(bodyData);
        }
        document.getElementById("tablebody").appendChild(bodyNode);
    }
    // Results have been printed to screen, process is complete.
}

/* Holds info for each inputted order */
class Order {
    constructor(name, address) {
        this.name = name;
        this.address = address;
    }
}

class Store {
    constructor(address, latLong) {
        this.address = address;
        this.latLong = latLong;
    }
}

/* Called when google cloud API has loaded */
function googleReady() {
    matrixService = new google.maps.DistanceMatrixService();
    directionService = new google.maps.DirectionsService();
    geocoder = new google.maps.Geocoder();
    // console.log("Delivery Assignment Testing");
    console.log("Distance matrix service ready.");
    console.log("Directions service ready.");
    console.log("Geocoder ready.");
    getLocation();
}

/* Checks array equality */
function arraysMatch(arr1, arr2) {
    // Check if the arrays are the same length
    if (arr1.length !== arr2.length) return false;

    // Check if all items exist and are in the same order
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
    }

    // Otherwise, return true
    return true;
}

/* Returns a random integer from min to max inclusively */
function uniformRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* Randomizes an array */
function shuffle(arr) {
    var currentIndex = arr.length,
        temporaryValue, randomIndex;

    // While there remain elements to shuffle
    while (0 !== currentIndex) {

        // Pick a remaining element
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // Swap it with the current element
        temporaryValue = arr[currentIndex];
        arr[currentIndex] = arr[randomIndex];
        arr[randomIndex] = temporaryValue;
    }
    return arr;
}

/* Adds a new row of input fields on the bottom */
function addField() {
    let i = numFields;
    let d = document.createElement("div");
    d.setAttribute("class", "form-row");
    d.setAttribute("id", "row" + (i + 1));
    for (let j = 0; j < 1; j++) {
        let din = document.createElement("div");
        din.setAttribute("class", "col col-md-" + (12 * (j + 1)));
        let inp = document.createElement("input");
        inp.setAttribute("class", "form-control");
        inp.setAttribute("type", "text");
        if (j == 1) {
            inp.setAttribute("placeholder", i + 1);
            inp.setAttribute("id", "n" + (i + 1));
        } else {
            inp.setAttribute("placeholder", "Address");
            inp.setAttribute("id", "a" + (i + 1));
        }
        inp.addEventListener("keyup", function (event) {
            // Enter key clicks assign button when any input field is selected
            if (event.keyCode === 13) {
                event.preventDefault();
                document.getElementById("assign").click();
            }
        });
        din.appendChild(inp);
        d.appendChild(din)
    }

    document.getElementById("fields").appendChild(d);
    numFields++;
}


function makeEndptFields() {
    let i = numFields;
    let d = document.createElement("div");
    d.setAttribute("class", "form-row");
    d.setAttribute("id", "endpts");
    for (let j = 0; j < 3; j++) {
        let din = document.createElement("div");
        din.setAttribute("class", "col col-md");
        let inp = document.createElement("input");
        inp.setAttribute("class", "form-control");
        inp.setAttribute("type", "text");
        if (j == 0) {
            inp.setAttribute("placeholder", "(City)");
            inp.setAttribute("id", "city");
        } else if (j == 1) {
            inp.setAttribute("placeholder", "*Start*");
            inp.setAttribute("id", "startAddress");
        } else {
            inp.setAttribute("placeholder", "(Finish)");
            inp.setAttribute("id", "stopAddress");
        }
        din.appendChild(inp);
        d.appendChild(din)
    }

    document.getElementById("start").appendChild(d);
    // numFields++;
}

/* Removes the last row of input fields */
function removeField() {
    if (numFields > 1) {
        let select = document.getElementById('fields');
        select.removeChild(select.lastChild);
        numFields -= 1;
    }
}

function geocodeLatLng(pos) {
    // console.log(pos)
    const latlng = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
    };
    coords = [latlng.lat, latlng.lng];
    geocoder.geocode({
        location: latlng
    }, (results, status) => {
        if (status === "OK") {
            if (results[0]) {
                document.getElementById("startAddress").value = results[0].formatted_address;
                // infowindow.setContent();
                // infowindow.open(map, marker);
            } else {
                // window.alert("No results found");
            }
        } else {
            // window.alert("Geocoder failed due to: " + status);
        }
    });
}

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(geocodeLatLng);
    } else {
        document.getElementById("startAddress").value = "Unknown";
    }
}