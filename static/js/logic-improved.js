/**
 * Earthquake Visualization Map
 * 
 * This script creates an interactive Leaflet map displaying real-time earthquake data
 * from the USGS Earthquake Hazards Program. It visualizes earthquakes by magnitude
 * using color-coded circles and provides toggleable map layers.
 * 
 * Features:
 * - Real-time earthquake data from USGS
 * - User geolocation with accuracy radius
 * - Multiple map styles (Street, Satellite, Topographic)
 * - Magnitude-based visualization
 * 
 * Dependencies: Leaflet
 * Data Source: USGS Earthquake Feed (https://earthquake.usgs.gov/earthquakes/feed/)
 * Map Tiles: OpenStreetMap (free, open-source, commercial use allowed)
 */

// ==================== CONFIGURATION ====================

// USGS Data URL
const USGS_DATA_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson";
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
  magnitude.textContent = `Magnitude: ${parseFloat(properties.mag).toFixed(2)}`;
  container.appendChild(magnitude);
  
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

  // Show loading indicator
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

      // Add or update user marker
      addUserMarker(lat, lng, accuracy);

      // Center map on user location with zoom level 12
      if (globalMap) {
        globalMap.setView([lat, lng], 12);
      }

      // Reset button
      if (locButton) {
        locButton.textContent = '📍 My Location';
        locButton.disabled = false;
      }

      console.log(`User location: ${lat}, ${lng} (±${accuracy}m)`);
    },
    function(error) {
      console.error('Error getting user location:', error);
      let errorMessage = 'Unable to get your location.';
      
      if (error.code === error.PERMISSION_DENIED) {
        errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        errorMessage = 'Location information is unavailable.';
      } else if (error.code === error.TIMEOUT) {
        errorMessage = 'Location request timed out.';
      }
      
      alert(errorMessage);

      // Reset button
      if (locButton) {
        locButton.textContent = '📍 My Location';
        locButton.disabled = false;
      }
    },
    options
  );
}

/**
 * Add user location marker to map with accuracy circle
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} accuracy - Accuracy in meters
 */
function addUserMarker(lat, lng, accuracy) {
  if (!globalMap) return;

  // Remove existing marker and circle if present
  if (userMarker) {
    globalMap.removeLayer(userMarker);
  }
  if (accuracyCircle) {
    globalMap.removeLayer(accuracyCircle);
  }

  // Add accuracy circle
  accuracyCircle = L.circle([lat, lng], {
    radius: accuracy,
    fillColor: '#4285F4',
    fillOpacity: 0.1,
    color: '#4285F4',
    weight: 2,
    dashArray: '5, 5'
  }).addTo(globalMap);

  // Add user marker (blue dot)
  userMarker = L.circleMarker([lat, lng], {
    radius: 8,
    fillColor: '#4285F4',
    fillOpacity: 1,
    color: '#fff',
    weight: 2
  }).bindPopup(createUserLocationPopup(accuracy))
    .addTo(globalMap)
    .openPopup();
}

/**
 * Auto-locate user on map initialization
 */
function autoLocateUser() {
  if (!navigator.geolocation) {
    console.log('Geolocation not supported');
    return;
  }

  const options = {
    enableHighAccuracy: false,
    timeout: 5000,
    maximumAge: 0
  };

  navigator.geolocation.getCurrentPosition(
    function(position) {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = position.coords.accuracy;

      // Add user marker
      addUserMarker(lat, lng, accuracy);

      // Center map on user location with zoom level 10
      if (globalMap) {
        globalMap.setView([lat, lng], 10);
      }

      console.log(`Auto-located user at: ${lat}, ${lng} (±${accuracy}m)`);
    },
    function(error) {
      // Silent fail - just log error and keep default world view
      console.log('Auto-locate failed:', error);
    },
    options
  );
}

// ==================== TILE LAYER DEFINITIONS ====================

/**
 * Create tile layers for different map styles
 * Uses free OpenStreetMap tiles (no API key required, commercial use allowed)
 */
function createTileLayers() {
  // Light map layer - OpenStreetMap Standard
  const lightmap = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: MAX_ZOOM,
      id: "osm.light"
    }
  );

  // Satellite/Aerial map layer - USGS Imagery
  const satelliteMap = L.tileLayer(
    "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}",
    {
      attribution: '© USGS',
      maxZoom: MAX_ZOOM,
      id: "usgs.imagery"
    }
  );

  // Topographic map layer - OpenTopoMap
  const topoMap = L.tileLayer(
    "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    {
      attribution: '© <a href="https://opentopomap.org">OpenTopoMap</a>',
      maxZoom: MAX_ZOOM,
      id: "otp.topo"
    }
  );

  return { lightmap, satelliteMap, topoMap };
}

// ==================== EARTHQUAKE DATA PROCESSING ====================

/**
 * Process earthquake GeoJSON features and create map layers
 * @param {array} earthquakeData - Array of earthquake features from GeoJSON
 * @returns {L.FeatureGroup} Leaflet feature group with earthquake markers
 */
function createFeatures(earthquakeData) {
  if (!earthquakeData || !Array.isArray(earthquakeData)) {
    console.error('Invalid earthquake data received');
    return L.featureGroup([]);
  }

  const earthquakes = L.geoJSON(earthquakeData, {
    onEachFeature: function(feature, layer) {
      // Validate feature properties
      if (feature.properties) {
        const popupContent = createPopupContent(feature.properties);
        layer.bindPopup(popupContent);
      }
    },
    pointToLayer: function(feature, latlng) {
      // Validate magnitude
      const magnitude = parseFloat(feature.properties?.mag) || 0;
      
      return L.circle(latlng, {
        radius: markerSize(magnitude),
        fillColor: markerColor(magnitude),
        fillOpacity: 0.8,
        color: "#000",
        weight: 0.5,
        stroke: true
      });
    }
  });

  return earthquakes;
}

/**
 * Fetch earthquake data from USGS API
 * @returns {Promise<object>} GeoJSON data
 */
function fetchEarthquakeData() {
  return fetch(USGS_DATA_URL)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .catch(error => {
      console.error('Error fetching earthquake data:', error);
      // Return empty feature collection on error
      return { features: [] };
    });
}

// ==================== MAP INITIALIZATION ====================

/**
 * Create and configure the interactive map
 * @param {L.FeatureGroup} earthquakes - Earthquake feature group
 * @param {object} tileLayers - Object containing tile layer definitions
 */
function createMap(earthquakes, tileLayers) {
  // Base map layers
  const baseMaps = {
    "Street Map": tileLayers.lightmap,
    "Satellite": tileLayers.satelliteMap,
    "Topographic": tileLayers.topoMap
  };

  // Overlay layers
  const overlayMaps = {
    "Earthquakes": earthquakes
  };

  // Create map with initial center and zoom
  const myMap = L.map("map", {
    center: [20, 0],  // World center
    zoom: 2,
    layers: [tileLayers.lightmap, earthquakes]
  });

  // Store map reference globally
  globalMap = myMap;

  // Add layer control
  L.control.layers(baseMaps, overlayMaps, {
    collapsed: false
  }).addTo(myMap);

  // Create and add legend
  createLegend(myMap);

  // Create and add geolocation control
  createGeolocationControl(myMap);

  return myMap;
}

/**
 * Create custom geolocation control button
 * @param {L.Map} map - Leaflet map instance
 */
function createGeolocationControl(map) {
  const control = L.Control.extend({
    options: {
      position: 'topleft'
    },
    onAdd: function() {
      const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
      const button = L.DomUtil.create('a', 'leaflet-control-locate', container);
      button.id = 'locate-btn';
      button.href = '#';
      button.title = 'Find my location';
      button.textContent = '📍 My Location';
      button.style.padding = '5px 10px';
      button.style.fontSize = '14px';
      button.style.textDecoration = 'none';
      button.style.color = '#333';
      button.style.backgroundColor = '#fff';
      button.style.borderBottom = '1px solid #ccc';
      button.style.cursor = 'pointer';
      button.style.display = 'block';

      L.DomEvent.on(button, 'click', function(e) {
        L.DomEvent.preventDefault(e);
        getUserLocation();
      });

      return container;
    }
  });

  new control().addTo(map);
}

/**
 * Create and add a legend to the map showing magnitude scale
 * @param {L.Map} map - Leaflet map instance
 */
function createLegend(map) {
  const legend = L.control({ position: 'bottomright' });

  legend.onAdd = function() {
    const div = L.DomUtil.create('div', 'info legend');
    const magnitudes = [0, 1, 2, 3, 4, 5];

    // Add legend title
    const title = document.createElement('p');
    title.style.margin = '0 0 10px 0';
    title.style.fontWeight = 'bold';
    title.textContent = 'Magnitude';
    div.appendChild(title);

    // Add magnitude ranges
    for (let i = 0; i < magnitudes.length; i++) {
      const item = document.createElement('div');
      item.style.marginBottom = '8px';
      item.style.display = 'flex';
      item.style.alignItems = 'center';

      // Color box
      const colorBox = document.createElement('i');
      colorBox.style.display = 'inline-block';
      colorBox.style.width = '18px';
      colorBox.style.height = '18px';
      colorBox.style.marginRight = '8px';
      colorBox.style.backgroundColor = markerColor(magnitudes[i] + 0.5);
      colorBox.style.borderRadius = '50%';
      item.appendChild(colorBox);

      // Label
      const label = document.createElement('span');
      if (magnitudes[i + 1]) {
        label.textContent = `${magnitudes[i]} - ${magnitudes[i + 1]}`;
      } else {
        label.textContent = `${magnitudes[i]}+`;
      }
      item.appendChild(label);

      div.appendChild(item);
    }

    return div;
  };

  legend.addTo(map);
}

// ==================== APPLICATION ENTRY POINT ====================

/**
 * Initialize the earthquake visualization map
 * Fetches data and creates the map on page load
 * Auto-locates user if geolocation is available
 */
async function initializeMap() {
  try {
    // Fetch earthquake data
    const data = await fetchEarthquakeData();

    // Process earthquake features
    const earthquakes = createFeatures(data.features);

    // Create tile layers
    const tileLayers = createTileLayers();

    // Initialize map
    createMap(earthquakes, tileLayers);

    // Auto-locate user (silent, won't interrupt map loading)
    autoLocateUser();

    console.log(`Map initialized with ${data.features.length} earthquakes`);
  } catch (error) {
    console.error('Failed to initialize map:', error);
    // Display user-friendly error message
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
      mapContainer.innerHTML = '<div style="padding: 20px; color: red;">Error loading earthquake map. Please refresh the page.</div>';
    }
  }
}

// Initialize map when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeMap);
} else {
  initializeMap();
}
