/*  Title: ACRoute
    Version: 1.2   
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
    locality,
    coords,
    geocoder,
    route,
    autoStartAddress = false;

/* Sends route request */
function requestRoute() {
    addressArray = [];

    locality = document.getElementById("city").value;
    if (locality == '') {
        locality = "New York, NY";
    }
    startVal = document.getElementById("startAddress").value;
    stopVal = document.getElementById("stopAddress").value;

    if (startVal == '') {
        document.getElementById("tbl").innerHTML = '';
        document.getElementById("map").style.height = "30px";
        document.getElementById("map").innerHTML = "Enter a starting location.";
        return;
    } else {
        if (stopVal == '') {
            stopVal = startVal;
        }
    }

    for (let i = 1; i < (numFields + 1); i++) {
        let aTemp = document.getElementById("a" + i).value;
        if (aTemp.match(/\S/)) {
            addressArray.push(aTemp + ", " + locality);
        }
    }

    // Don't process when all fields are empty or only one order present
    if (addressArray.length < 1) {
        document.getElementById("tbl").innerHTML = '';
        document.getElementById("map").style.height = "30px";
        document.getElementById("map").innerHTML = "Enter at least one waypoint.";
        return;
    }

    // if (coords === undefined){
    //     document.getElementById("map").style.height = "30px";
    //     document.getElementById("map").innerHTML = "Can't connect to Google.";
    //     return;
    // }
    // Initialize variables
    numDrivers = 1;
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
    
    let waypts = [];
    for (let i = 0; i < addressArray.length; i++) {
        waypts.push({
            location: addressArray[i] + ', ' + locality,
            stopover: true
        });
    }

    let originVal, destVal;

    if (autoStartAddress){
        originVal = startVal;
        destVal = stopVal;
    }else{
       originVal = startVal + ', ' + locality;
        destVal = stopVal + ', ' + locality;
    }

    let directionsRequest = {
        origin: originVal,
        destination: destVal,
        travelMode: transportation,
        waypoints: waypts,
        optimizeWaypoints: true,
        provideRouteAlternatives: false,
    };

    directionsService.route(directionsRequest, routeCallback);

    $(".collapse").collapse('show');
}

/* Runs whenever directions are received */
function routeCallback(response, status) {
    if (status === 'OK') {
        // console.log("Route received.");
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

        let otherMarkers = [];
        for (let i = 1; i < legs.length + 1; i++){
            if(i==legs.length){
                otherMarkers.push(
                    new google.maps.Marker({
                        position: legs[i-1].end_location,
                        map,
                        icon: 'img/pins/destination.png'
                      })
                );
            }else{
                otherMarkers.push(
                    new google.maps.Marker({
                        position: legs[i-1].end_location,
                        map,
                        icon: 'img/pins/number_'+i+'.png'
                      })
                );
            }
        }

        let origMarker = new google.maps.Marker({
            position: legs[0].start_location,
            map,
            icon: 'img/pins/number_0.png'
          });


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
    console.log("Google Maps is ready.")
    getLocation();
}


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
    coords = [latlng.lat, latlng.lng];
    geocoder.geocode({
        location: latlng
    }, (results, status) => {
        if (status === "OK") {
            if (results[0]) {
                document.getElementById("startAddress").value = results[0].formatted_address;
            }
            autoStartAddress = true;
        }
    });
}