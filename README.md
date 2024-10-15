# RouteCat
https://routecat.netlify.app

## Overview

RouteCat is a web app designed to calculate and visualize routes with multiple waypoints using the Google Maps API. Users can input a starting point, destination, and multiple waypoints, and RouteCat will find the most optimized route. It also displays the route on a Google Map and updates a table showing the route details.

## Features

- **Multi-stop Routing**: Input a start location, end location, and multiple waypoints, and RouteCat will optimize the route.
- **Dynamic Input Fields**: Add or remove waypoint fields as needed.
- **Route Visualization**: The route is displayed on Google Maps with unique colored markers and lines for each segment.
- **Geolocation Support**: Automatically set the start location using your current geolocation.
- **Error Handling**: Provides feedback when required inputs are missing or if there are errors with the route request.

## Usage

1. **Set Up Locations**:
- Enter the starting address in the **Start** field.
- Enter the destination address in the **Finish** field (or check the option to finish at the starting location).
- Use the **Add Field** button to add additional waypoint fields for intermediate stops.

2. **Generate Route**:
- Click the **Assign** button to generate the route.
- The map will display the route, with markers for the start, waypoints, and end points. 
- The optimized route will appear in a table below the map with the total travel time.

## Geolocation Support
To use your current location as the starting point:
1. Ensure that the browser has permission to access your location.
2. The starting address field will auto-fill with your current address when geolocation is activated.

## Error Handling
- If any required fields (e.g., start or end address) are missing, the program will display a message prompting the user to input the missing information.
- If the geocoding or routing request fails, an error message will be shown on the map.
