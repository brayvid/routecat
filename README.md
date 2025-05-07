# RouteCat – Multi-Driver Route Planner
https://routecat.netlify.app

RouteCat is a web application designed to calculate and visualize routes with multiple waypoints using the Google Maps API. Users can input a starting point, destination, and multiple waypoints, and RouteCat will find the most optimized route. It also displays the route on a Google Map and updates a table showing the route details.

- Optimally divide deliveries among multiple drivers 
- Use distance-based clustering to group nearby deliveries  
- Plan efficient routes with multiple stops   
- Visualize color-coded routes on an interactive map  
- Display each driver’s route in a clear table format

---
## How It Works

1. Enter a **start** and optional **finish** location
2. Add one or more **delivery addresses**
3. Choose the **number of drivers**
4. Click **ROUTE**
5. The app:
   - Calls Google Maps to cluster deliveries
   - Assigns deliveries to each driver
   - Builds and displays optimized routes
   - Renders a summary table

---

## Tech Stack Overview

RouteCat is built as a lightweight client-side web application using:

### Front-End

| Technology | Purpose |
|------------|---------|
| **HTML5**  | Structure of the app (forms, inputs, map container, etc.) |
| **CSS3**   | Custom styles + layout adjustments for responsive behavior |
| **Bootstrap 4** + **MDBootstrap** | UI components, layout grid, form styling |
| **JavaScript (Vanilla)** | Core logic for routing, clustering, DOM manipulation |

### Google Maps Platform

| API | Use |
|-----|-----|
| **Google Maps JavaScript API** | Renders the interactive map |
| **Google Maps Directions API** | Calculates optimized driving/biking/walking routes between stops |
| **Google Maps Distance Matrix API** | Measures travel time between all address pairs to enable clustering |
| **Geocoding API** | Translates input addresses to geographic coordinates for route calculation |

### Algorithms

| Module | Role |
|--------|------|
| **Distance Matrix–based clustering** | Custom grouping logic determines which stops go to which driver based on average travel time |
| **Waypoint Optimization** | Uses Google’s built-in optimization to reorder stops for minimum travel time |

### Other Tools

| Tool | Use |
|------|-----|
| **jQuery** | DOM manipulation and event handling for UI actions |
| **Font Awesome** | Icon support |
| **Netlify Functions (optional)** | Securely load API keys using a serverless endpoint |

---

## License

**Non-commercial use only**  
© 2020 Blake Rayvid – https://github.com/brayvid