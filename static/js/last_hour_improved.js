/**
 * Earthquake Visualization Map - Last Hour
 * 
 * This script creates an interactive Leaflet map displaying earthquake data
 * from the past hour from the USGS Earthquake Hazards Program.
 * 
 * Features:
 * - Real-time earthquake data from USGS (last hour)
 * - User geolocation with accuracy radius
 * - Multiple map styles (Street, Satellite, Topographic)
 * - Magnitude-based visualization
 * 
 * Dependencies: Leaflet
 * Data Source: USGS Earthquake Feed (https://earthquake.usgs.gov/earthquakes/feed/)
 * Map Tiles: OpenStreetMap (free, open-source, commercial use allowed)
 */

// ==================== CONFIGURATION ====================

// USGS Data URL - Last hour earthquakes
const USGS_DATA_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson";
const MAX_ZOOM = 19;

// Color scale for earthquake magnitude
const MAGNITUDE_COLORS = {
  1: "#F2FDA1",    // Light yellow - magnitude 0-1
  2: "#5FCFD1",    // Cyan - magnitude 1-2
  3: "#843699",    // Purple - magnitude 2-3
  4: "#CC6456",    // Coral - magnitude 3-4
  5: "#FF2872",    // Pink - magnitude 4-5
  6: "#3ED145"     // Green - magnitude 5+
};

// Global map reference
let globalMap = null;
let userMarker = null;
let accuracyCircle = null;

// ==================== UTILITY FUNCTIONS ====================

/**
 * Calculate marker radius based on earthquake magnitude
 * Scaled by 500 for better visibility on map
 * @param {number} magnitude - Earthquake magnitude
 * @returns {number} Radius in meters
 */
function markerSize(magnitude) {
  if (typeof magnitude !== 'number' || magnitude < 0) {
    return 500;
  }
  return magnitude * 500;
}

/**
 * Get color based on earthquake magnitude
 * Color intensity increases with magnitude
 * @param {number} magnitude - Earthquake magnitude
 * @returns {string} Hex color code
 */
function markerColor(magnitude) {
  if (typeof magnitude !== 'number') {
    return MAGNITUDE_COLORS[1];
  }

  if (magnitude <= 1) {
    return MAGNITUDE_COLORS[1];
  } else if (magnitude <= 2) {
    return MAGNITUDE_COLORS[2];
  } else if (magnitude <= 3) {
    return MAGNITUDE_COLORS[3];
  } else if (magnitude <= 4) {
    return MAGNITUDE_COLORS[4];
  } else if (magnitude <= 5) {
    return MAGNITUDE_COLORS[5];
  } else {
    return MAGNITUDE_COLORS[6];
  }
}

/**
 * Create safe popup content using DOM methods instead of string concatenation
 * Prevents XSS vulnerabilities
 * @param {object} properties - Feature properties from GeoJSON
 * @returns {HTMLElement} Popup content element
 */
function createPopupContent(properties) {
  const container = document.createElement('div');
  
  // Place name
  const title = document.createElement('h3');
  title.textContent = properties.place || 'Unknown Location';
  container.appendChild(title);
  
  container.appendChild(document.createElement('hr'));
  
  // Date and time
  const dateTime = document.createElement('p');
  const date = new Date(properties.time);
  dateTime.textContent = date.toLocaleString();
  container.appendChild(dateTime);
  
  // Magnitude
  const magnitude = document.createElement('p');
  magnitude.textContent = `Magnitude: ${parseFloat(properties.mag).toFixed(2)}`;\n  container.appendChild(magnitude);
  
  return container;
}

/**
 * Create user location popup
 * @param {number} accuracy - Accuracy in meters
 * @returns {HTMLElement} Popup content element
 */
function createUserLocationPopup(accuracy) {
  const container = document.createElement('div');
  
  const title = document.createElement('h3');
  title.textContent = 'Your Location';
  container.appendChild(title);
  
  container.appendChild(document.createElement('hr'));
  
  const accuracyText = document.createElement('p');
  accuracyText.textContent = `Accuracy: ±${accuracy.toFixed(0)} meters`;
  container.appendChild(accuracyText);
  
  return container;
}

// ==================== GEOLOCATION FUNCTIONS ====================

/**
 * Request user's geolocation and add marker to map
 */
function getUserLocation() {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser.');
    return;
  }

  const locButton = document.getElementById('locate-btn');
  if (locButton) {
    locButton.textContent = 'Locating...';
    locButton.disabled = true;
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  };

  navigator.geolocation.getCurrentPosition(
    function(position) {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = position.coords.accuracy;

      addUserMarker(lat, lng, accuracy);

      if (globalMap) {
        globalMap.setView([lat, lng], 12);
      }

      if (locButton) {
        locButton.textContent = '📍 My Location';
        locButton.disabled = false;
      }

      console.log(`User location: ${lat}, ${lng} (±${accuracy}m)`);\n    },\n    function(error) {\n      console.error('Error getting user location:', error);\n      let errorMessage = 'Unable to get your location.';\n      \n      if (error.code === error.PERMISSION_DENIED) {\n        errorMessage = 'Location permission denied. Please enable location access in your browser settings.';\n      } else if (error.code === error.POSITION_UNAVAILABLE) {\n        errorMessage = 'Location information is unavailable.';\n      } else if (error.code === error.TIMEOUT) {\n        errorMessage = 'Location request timed out.';\n      }\n      \n      alert(errorMessage);\n\n      if (locButton) {\n        locButton.textContent = '📍 My Location';\n        locButton.disabled = false;\n      }\n    },\n    options\n  );\n}\n\n/**\n * Add user location marker to map with accuracy circle\n * @param {number} lat - Latitude\n * @param {number} lng - Longitude\n * @param {number} accuracy - Accuracy in meters\n */\nfunction addUserMarker(lat, lng, accuracy) {\n  if (!globalMap) return;\n\n  if (userMarker) {\n    globalMap.removeLayer(userMarker);\n  }\n  if (accuracyCircle) {\n    globalMap.removeLayer(accuracyCircle);\n  }\n\n  accuracyCircle = L.circle([lat, lng], {\n    radius: accuracy,\n    fillColor: '#4285F4',\n    fillOpacity: 0.1,\n    color: '#4285F4',\n    weight: 2,\n    dashArray: '5, 5'\n  }).addTo(globalMap);\n\n  userMarker = L.circleMarker([lat, lng], {\n    radius: 8,\n    fillColor: '#4285F4',\n    fillOpacity: 1,\n    color: '#fff',\n    weight: 2\n  }).bindPopup(createUserLocationPopup(accuracy))\n    .addTo(globalMap)\n    .openPopup();\n}\n\n/**\n * Auto-locate user on map initialization\n */\nfunction autoLocateUser() {\n  if (!navigator.geolocation) {\n    console.log('Geolocation not supported');\n    return;\n  }\n\n  const options = {\n    enableHighAccuracy: false,\n    timeout: 5000,\n    maximumAge: 0\n  };\n\n  navigator.geolocation.getCurrentPosition(\n    function(position) {\n      const lat = position.coords.latitude;\n      const lng = position.coords.longitude;\n      const accuracy = position.coords.accuracy;\n\n      addUserMarker(lat, lng, accuracy);\n\n      if (globalMap) {\n        globalMap.setView([lat, lng], 10);\n      }\n\n      console.log(`Auto-located user at: ${lat}, ${lng} (±${accuracy}m)`);\n    },\n    function(error) {\n      console.log('Auto-locate failed:', error);\n    },\n    options\n  );\n}\n\n// ==================== TILE LAYER DEFINITIONS ====================\n\n/**\n * Create tile layers for different map styles\n * Uses free OpenStreetMap tiles (no API key required, commercial use allowed)\n */\nfunction createTileLayers() {\n  const lightmap = L.tileLayer(\n    \"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png\",\n    {\n      attribution: '© <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors',\n      maxZoom: MAX_ZOOM,\n      id: \"osm.light\"\n    }\n  );\n\n  const satelliteMap = L.tileLayer(\n    \"https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}\",\n    {\n      attribution: '© USGS',\n      maxZoom: MAX_ZOOM,\n      id: \"usgs.imagery\"\n    }\n  );\n\n  const topoMap = L.tileLayer(\n    \"https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png\",\n    {\n      attribution: '© <a href=\"https://opentopomap.org\">OpenTopoMap</a>',\n      maxZoom: MAX_ZOOM,\n      id: \"otp.topo\"\n    }\n  );\n\n  return { lightmap, satelliteMap, topoMap };\n}\n\n// ==================== EARTHQUAKE DATA PROCESSING ====================\n\n/**\n * Process earthquake GeoJSON features and create map layers\n * @param {array} earthquakeData - Array of earthquake features from GeoJSON\n * @returns {L.FeatureGroup} Leaflet feature group with earthquake markers\n */\nfunction createFeatures(earthquakeData) {\n  if (!earthquakeData || !Array.isArray(earthquakeData)) {\n    console.error('Invalid earthquake data received');\n    return L.featureGroup([]);\n  }\n\n  const earthquakes = L.geoJSON(earthquakeData, {\n    onEachFeature: function(feature, layer) {\n      if (feature.properties) {\n        const popupContent = createPopupContent(feature.properties);\n        layer.bindPopup(popupContent);\n      }\n    },\n    pointToLayer: function(feature, latlng) {\n      const magnitude = parseFloat(feature.properties?.mag) || 0;\n      \n      return L.circle(latlng, {\n        radius: markerSize(magnitude),\n        fillColor: markerColor(magnitude),\n        fillOpacity: 0.8,\n        color: \"#000\",\n        weight: 0.5,\n        stroke: true\n      });\n    }\n  });\n\n  return earthquakes;\n}\n\n/**\n * Fetch earthquake data from USGS API\n * @returns {Promise<object>} GeoJSON data\n */\nfunction fetchEarthquakeData() {\n  return fetch(USGS_DATA_URL)\n    .then(response => {\n      if (!response.ok) {\n        throw new Error(`HTTP error! status: ${response.status}`);\n      }\n      return response.json();\n    })\n    .catch(error => {\n      console.error('Error fetching earthquake data:', error);\n      return { features: [] };\n    });\n}\n\n// ==================== MAP INITIALIZATION ====================\n\n/**\n * Create and configure the interactive map\n * @param {L.FeatureGroup} earthquakes - Earthquake feature group\n * @param {object} tileLayers - Object containing tile layer definitions\n */\nfunction createMap(earthquakes, tileLayers) {\n  const baseMaps = {\n    \"Street Map\": tileLayers.lightmap,\n    \"Satellite\": tileLayers.satelliteMap,\n    \"Topographic\": tileLayers.topoMap\n  };\n\n  const overlayMaps = {\n    \"Earthquakes\": earthquakes\n  };\n\n  const myMap = L.map(\"map\", {\n    center: [20, 0],\n    zoom: 2,\n    layers: [tileLayers.lightmap, earthquakes]\n  });\n\n  globalMap = myMap;\n\n  L.control.layers(baseMaps, overlayMaps, {\n    collapsed: false\n  }).addTo(myMap);\n\n  createLegend(myMap);\n  createGeolocationControl(myMap);\n\n  return myMap;\n}\n\n/**\n * Create custom geolocation control button\n * @param {L.Map} map - Leaflet map instance\n */\nfunction createGeolocationControl(map) {\n  const control = L.Control.extend({\n    options: {\n      position: 'topleft'\n    },\n    onAdd: function() {\n      const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');\n      const button = L.DomUtil.create('a', 'leaflet-control-locate', container);\n      button.id = 'locate-btn';\n      button.href = '#';\n      button.title = 'Find my location';\n      button.textContent = '📍 My Location';\n      button.style.padding = '5px 10px';\n      button.style.fontSize = '14px';\n      button.style.textDecoration = 'none';\n      button.style.color = '#333';\n      button.style.backgroundColor = '#fff';\n      button.style.borderBottom = '1px solid #ccc';\n      button.style.cursor = 'pointer';\n      button.style.display = 'block';\n\n      L.DomEvent.on(button, 'click', function(e) {\n        L.DomEvent.preventDefault(e);\n        getUserLocation();\n      });\n\n      return container;\n    }\n  });\n\n  new control().addTo(map);\n}\n\n/**\n * Create and add a legend to the map showing magnitude scale\n * @param {L.Map} map - Leaflet map instance\n */\nfunction createLegend(map) {\n  const legend = L.control({ position: 'bottomright' });\n\n  legend.onAdd = function() {\n    const div = L.DomUtil.create('div', 'info legend');\n    const magnitudes = [0, 1, 2, 3, 4, 5];\n\n    const title = document.createElement('p');\n    title.style.margin = '0 0 10px 0';\n    title.style.fontWeight = 'bold';\n    title.textContent = 'Magnitude';\n    div.appendChild(title);\n\n    for (let i = 0; i < magnitudes.length; i++) {\n      const item = document.createElement('div');\n      item.style.marginBottom = '8px';\n      item.style.display = 'flex';\n      item.style.alignItems = 'center';\n\n      const colorBox = document.createElement('i');\n      colorBox.style.display = 'inline-block';\n      colorBox.style.width = '18px';\n      colorBox.style.height = '18px';\n      colorBox.style.marginRight = '8px';\n      colorBox.style.backgroundColor = markerColor(magnitudes[i] + 0.5);\n      colorBox.style.borderRadius = '50%';\n      item.appendChild(colorBox);\n\n      const label = document.createElement('span');\n      if (magnitudes[i + 1]) {\n        label.textContent = `${magnitudes[i]} - ${magnitudes[i + 1]}`;\n      } else {\n        label.textContent = `${magnitudes[i]}+`;\n      }\n      item.appendChild(label);\n\n      div.appendChild(item);\n    }\n\n    return div;\n  };\n\n  legend.addTo(map);\n}\n\n// ==================== APPLICATION ENTRY POINT ====================\n\n/**\n * Initialize the earthquake visualization map\n * Fetches data and creates the map on page load\n * Auto-locates user if geolocation is available\n */\nasync function initializeMap() {\n  try {\n    const data = await fetchEarthquakeData();\n    const earthquakes = createFeatures(data.features);\n    const tileLayers = createTileLayers();\n\n    createMap(earthquakes, tileLayers);\n    autoLocateUser();\n\n    console.log(`Map initialized with ${data.features.length} earthquakes (Last Hour)`);\n  } catch (error) {\n    console.error('Failed to initialize map:', error);\n    const mapContainer = document.getElementById('map');\n    if (mapContainer) {\n      mapContainer.innerHTML = '<div style=\"padding: 20px; color: red;\">Error loading earthquake map. Please refresh the page.</div>';\n    }\n  }\n}\n\nif (document.readyState === 'loading') {\n  document.addEventListener('DOMContentLoaded', initializeMap);\n} else {\n  initializeMap();\n}\n