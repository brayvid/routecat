/*  Title: RouteCat
    License: (c) 2020 Blake Rayvid. Non-commercial use only.
    Author: Blake Rayvid (https//github.com/brayvid)  */

    var initialInputRows = 6,
    transportation = 'BICYCLING', // or 'DRIVING' or 'WALKING'
    dropoffSeconds = 30, // rough time stopped at a waypoint
    defaultColors = [
        "#e6194B",
        "#3cb44b",
        "#4363d8",
        "#9A6324",
        "#f032e6",
        "#e6194B"
    ],
    numFields = 0,
    colors,
    numDrivers,
    directionsService,
    map,
    mapOptions,
    addressArray,
    orderedGroups,
    orderedColors,
    routeDurations,
    startVal,
    stopVal,
    coords,
    geocoder,
    route;

/* Sends route request */
function requestRoute() {
    addressArray = [];
    startVal = document.getElementById("startAddress").value;
    stopVal = document.getElementById("stopAddress").value;
    numDrivers = parseInt(document.getElementById("driverSelect").value || "1");

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
        document.getElementById("map").innerHTML = "Enter at least one waypoint.";
        return;
    }

    geocoder.geocode({ 'address': startVal }, function (results, status) {
        if (status === 'OK') {
            coords = results[0].geometry.location;
            clusterWaypoints(addressArray, numDrivers, sendClusteredRoutes);
        } else {
            document.getElementById("map").innerHTML = "Geocoder failure: " + status;
        }
    });
}

function clusterWaypoints(addresses, numDrivers, callback) {
    let matrixService = new google.maps.DistanceMatrixService();
    let fullAddresses = [startVal].concat(addresses);

    matrixService.getDistanceMatrix({
        origins: fullAddresses,
        destinations: fullAddresses,
        travelMode: transportation
    }, function (response, status) {
        if (status !== 'OK') {
            document.getElementById("map").innerHTML = "Distance matrix error: " + status;
            return;
        }

        let rows = response.rows;
        let matrixTimes = [], averageTimes = [];

        for (let i = 0; i < fullAddresses.length; i++) {
            matrixTimes[i] = [];
            averageTimes[i] = [];
            for (let j = 0; j < fullAddresses.length; j++) {
                matrixTimes[i][j] = rows[i].elements[j].duration.value;
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

        let matrixMidrange = (numDrivers == 2)
            ? avgMin + (avgMax - avgMin) / numDrivers
            : avgMin + (avgMax - avgMin) / 3;

        let groups = [];
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

        groups = groups.map(g => g.sort()).sort(() => Math.random() - 0.5);
        callback(groups.map(g => g.map(i => addresses[i - 1])));
    });
}

function sendClusteredRoutes(groupedAddresses) {
    orderedGroups = [];
    colors = defaultColors.slice();
    orderedColors = [];
    routeDurations = [];

    mapOptions.center = coords;
    map = new google.maps.Map(document.getElementById("map"), mapOptions);

    groupedAddresses.forEach((group, index) => {
        let waypts = group.map(addr => ({ location: addr, stopover: true }));
        let color = colors[index % colors.length];
        orderedColors.push(color);

        directionsService.route({
            origin: startVal,
            destination: stopVal,
            travelMode: transportation,
            waypoints: waypts,
            optimizeWaypoints: true
        }, function (response, status) {
            if (status === 'OK') {
                let route = response.routes[0];
                let legs = route.legs;
                let duration = 0;
                for (let k = 0; k < legs.length; k++) {
                    duration += legs[k].duration.value;
                }
                routeDurations.push(duration + dropoffSeconds * (legs.length - 1));
                orderedGroups.push(route.waypoint_order);

                let directionsRenderer = new google.maps.DirectionsRenderer({
                    polylineOptions: { strokeColor: color },
                    suppressMarkers: true,
                    preserveViewport: true
                });
                directionsRenderer.setMap(map);
                directionsRenderer.setDirections(response);

                let origMarker = new google.maps.Marker({
                    position: legs[0].start_location,
                    map,
                    icon: 'img/pins/start.png'
                });

                for (let i = 1; i < legs.length + 1; i++) {
                    let icon = (i === legs.length)
                        ? 'img/pins/stop.png'
                        : 'https://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=' + i + '|ff0000|000000';
                    new google.maps.Marker({
                        position: legs[i - 1].end_location,
                        map,
                        icon: icon
                    });
                }

                results();
                document.getElementById("map").style.height = "300px";
            } else {
                document.getElementById("map").innerHTML = "Route failed: " + status;
            }
        });
    });
}

function sendDirectionsRequest(){
    numDrivers = 1;
    orderedGroups = [];
    colors = defaultColors;
    orderedColors = [];
    routeDurations = [];
    mapOptions = {
        zoom: 11,
        center: coords,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: true,
        gestureHandling: 'cooperative'
    };
    map = new google.maps.Map(document.getElementById("map"), mapOptions);
    
    let waypts = [];
    for (let i = 0; i < addressArray.length; i++) {
        waypts.push({
            location: addressArray[i],
            stopover: true
        });
    }

    // let originVal, destVal;

    // if (autoStartAddress){
    //     originVal = startVal;
    //     destVal = stopVal;
    // }else{
    //    originVal = startVal;
    //     destVal = stopVal;
    // }

    let directionsRequest = {
        origin: startVal,
        destination: stopVal,
        travelMode: transportation,
        waypoints: waypts,
        optimizeWaypoints: true,
        provideRouteAlternatives: false,
    };

    directionsService.route(directionsRequest, routeCallback);
    console.log("Directions request sent")
}

/* Runs whenever directions are received */
function routeCallback(response, status) {
    if (status === 'OK') {
        console.log("Route received.");
        $(".collapse").collapse('show');
        let randInt = uniformRandomInt(0, colors.length - 1);
        let color = colors[randInt];
        colors.splice(randInt, 1);
        orderedColors.push(color);
        // Get route duration
        route = response.routes[0];
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
        
        // Waypoint markers
        let origMarker = new google.maps.Marker({
            position: legs[0].start_location,
            map,
            icon: 'img/pins/start.png'
          });
        let otherMarkers = [];
        for (let i = 1; i < legs.length + 1; i++){
            if(i==legs.length){
                otherMarkers.push(
                    new google.maps.Marker({
                        position: legs[i-1].end_location,
                        map,
                        icon: 'img/pins/stop.png'
                      })
                );
            }else{
                otherMarkers.push(
                    new google.maps.Marker({
                        position: legs[i-1].end_location,
                        map,
                        icon: 'https://chart.apis.google.com/chart?chst=d_map_pin_letter&chld='+i+'|ff0000|000000'
                      })
                );
            }
        }


        // Update table
        results();
        document.getElementById("map").style.height = "300px";
    } else {
        document.getElementById("map").style.height = "30px";
        document.getElementById("map").innerHTML = "Directions request unsuccessful: " + status;
    }
}

/* Updates table and console */
function results() {
    // Table header
    document.getElementById("tbl").innerHTML = '<table id="displayTable" class="table table-condensed"><tbody id="tablebody"></tbody></table>';
    for (let i = 0; i < numDrivers; i++) {
        let headNode = document.createElement("TH");
        let headText = document.createTextNode("Best route (" + (routeDurations[i] / 60).toFixed(1) + " mins)");
        // let headColor = document.createElement("SPAN");
        // headColor.innerHTML = " ";
        headNode.appendChild(headText);
        headNode.style.borderBottom = "20px solid " + orderedColors[i];
        // headNode.appendChild(headColor);
        document.getElementById("tablebody").appendChild(headNode);
    }

    // Table body
    for (let i = 1; i < route.legs.length; i++) { //  each row
        let bodyNode = document.createElement("TR");
        let bodyData = document.createElement("TD");
        let bodyText= document.createTextNode((i).toString()+") "+route.legs[i].start_address);
        bodyData.appendChild(bodyText);
        bodyNode.appendChild(bodyData);
        document.getElementById("tablebody").appendChild(bodyNode);
    }
    let bodyNode = document.createElement("TR");
    let bodyData = document.createElement("TD");
    bodyData.appendChild(document.createTextNode("🛑 "+route.legs[route.legs.length-1].end_address));
    bodyNode.appendChild(bodyData);
    document.getElementById("tablebody").appendChild(bodyNode);

    // Results have been printed to screen, process is complete.
}

/* Called when google cloud API has loaded */
function googleReady() {
    directionsService = new google.maps.DirectionsService();
    geocoder = new google.maps.Geocoder();
    console.log("Maps JavaScript API ready.");
}

// getLocation();
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(geocodeLatLng);
    } else {
        document.getElementById("startAddress").value = "Unknown";
    }
}


/* Returns a random integer from min to max inclusively */
function uniformRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* Adds a new row of input fields on the bottom */
function addField() {
    let i = numFields;
    let d = document.createElement("div");
    d.setAttribute("class", "form-row");
    d.setAttribute("id", "row" + (i + 1));
    let din = document.createElement("div");
    din.setAttribute("class", "col col-md-12");
    let inp = document.createElement("input");
    inp.setAttribute("class", "form-control");
    inp.setAttribute("type", "text");
    inp.setAttribute("placeholder", "Address");
    inp.setAttribute("id", "a" + (i + 1));
    inp.addEventListener("keyup", function (event) {
        // Enter key clicks assign button when any input field is selected
        if (event.keyCode === 13) {
            event.preventDefault();
            document.getElementById("assign").click();
        }
    });
    din.appendChild(inp);
    d.appendChild(din)
    document.getElementById("fields").appendChild(d);
    numFields++;
}


function makeEndptFields() {
    let i = numFields;
    let d = document.createElement("div");
    d.setAttribute("class", "form-row");
    d.setAttribute("id", "endpts");
    for (let j = 1; j < 3; j++) {
        let din = document.createElement("div");
        din.setAttribute("class", "col col-md");
        din.setAttribute("id", "textdiv"+j);
        let inp = document.createElement("input");
        inp.setAttribute("class", "form-control");
        inp.setAttribute("type", "text");
        if (j == 1) {
            inp.setAttribute("placeholder", "Start");
            inp.setAttribute("id", "startAddress");
        } else {
            inp.setAttribute("placeholder", "Finish");
            inp.setAttribute("id", "stopAddress");
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
    document.getElementById("start").appendChild(d);
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
    const latlng = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
    };
    coords = latlng;
    geocoder.geocode({
        location: latlng
    }, (results, status) => {
        if (status === "OK") {
            if (results[0]) {
                document.getElementById("startAddress").value = results[0].formatted_address;
                document.getElementById('startAddress').setAttribute('placeholder','Start');

            }
        }
            
    });
}