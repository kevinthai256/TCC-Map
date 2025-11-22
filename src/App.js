import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Map, config, MapStyle } from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';

// Constants
const MAP_CENTER = [-122.524401, 47.245287];
const MAP_ZOOM = 16.5;
const MAP_ZOOM_SELECTED = 18;
const MAP_FLY_DURATION = 1500;

const HEADER_HEIGHT = 70;
const SIDEBAR_WIDTH = '35%';
const MAP_WIDTH = '65%';

// Styles
const styles = {
  container: {
    margin: 0,
    padding: 0,
    fontFamily: 'Arial, sans-serif',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: `${HEADER_HEIGHT}px`,
    backgroundColor: '#003366',
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    boxSizing: 'border-box',
    zIndex: 10,
  },
  logo: {
    height: '50px',
    marginRight: '20px',
  },
  headerTitle: {
    color: 'white',
    fontSize: '24px',
    fontWeight: 'bold',
  },
  sidebar: {
    position: 'absolute',
    top: `${HEADER_HEIGHT}px`,
    left: 0,
    width: SIDEBAR_WIDTH,
    bottom: 0,
    overflowY: 'auto',
    background: '#f9f9f9',
    borderRight: '1px solid #ddd',
    boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
    padding: '20px',
    boxSizing: 'border-box',
    zIndex: 10,
  },
  searchInput: {
    width: '100%',
    padding: '15px',
    marginBottom: '20px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '16px',
    boxSizing: 'border-box',
  },
  emptyState: {
    textAlign: 'center',
    padding: '20px',
    color: '#777',
  },
  buildingCard: (isSelected) => ({
    padding: '15px',
    marginBottom: '15px',
    background: isSelected ? '#e1ecf7' : 'white',
    border: '1px solid #ccc',
    borderLeft: '4px solid #003366',
    borderRadius: '5px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'background 0.3s, transform 0.2s',
    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
  }),
  buildingName: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#003366',
  },
  buildingDetails: {
    fontSize: '14px',
    color: '#555',
    lineHeight: '1.6',
  },
  buildingImage: {
    width: '100%',
    maxHeight: '200px',
    objectFit: 'cover',
    marginTop: '10px',
    borderRadius: '4px',
  },
  mapContainer: {
    position: 'absolute',
    top: `${HEADER_HEIGHT}px`,
    bottom: 0,
    width: MAP_WIDTH,
    left: SIDEBAR_WIDTH,
    height: `calc(100vh - ${HEADER_HEIGHT}px)`,
  },
};

function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [buildings, setBuildings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [geojsonData, setGeojsonData] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  /**
   * Handles building selection and updates map visualization
   */
  const handleBuildingClick = useCallback((feature) => {
    console.log('handleBuildingClick called', feature);
    if (!geojsonData || !map.current || !mapLoaded) {
      console.log('Early return:', { geojsonData: !!geojsonData, map: !!map.current, mapLoaded });
      return;
    }

    const buildingName = feature.properties.buildingName;
    console.log('Selecting building:', buildingName);

    // Update highlight in geojson data
    const updatedData = {
      ...geojsonData,
      features: geojsonData.features.map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          highlight: f.properties.buildingName === buildingName ? 'true' : 'false',
        },
      })),
    };

    setGeojsonData(updatedData);
    setSelectedBuilding(buildingName);

    // Update map source
    const source = map.current.getSource('campus_directory');
    if (source) {
      source.setData(updatedData);
    }

    // Fly to location
    const [lng, lat] = feature.geometry.coordinates;
    map.current.flyTo({
      center: [lng, lat],
      zoom: MAP_ZOOM_SELECTED,
      duration: MAP_FLY_DURATION,
    });
  }, [geojsonData, mapLoaded]);

  /**
   * Filters buildings based on search query
   */
  const filteredBuildings = buildings.filter((feature) => {
    const buildingName = feature.properties.buildingName || '';
    return buildingName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  /**
   * Initialize MapTiler map
   */
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const apiKey = process.env.REACT_APP_MAP_API_KEY || '';

    if (!apiKey) {
      console.error('MapTiler API key is missing. Please set REACT_APP_MAP_API_KEY in your .env file.');
      return;
    }

    config.apiKey = apiKey;

    try {
      const styleUrl = MapStyle?.STREETS || `https://api.maptiler.com/maps/streets-v2/style.json?key=${apiKey}`;

      map.current = new Map({
        container: mapContainer.current,
        style: styleUrl,
        center: MAP_CENTER,
        zoom: MAP_ZOOM,
        preserveDrawingBuffer: true,
      });

      map.current.on('load', () => {
        setMapLoaded(true);
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
      });
    } catch (error) {
      console.error('Error creating map:', error);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  /**
   * Load GeoJSON data from public folder
   */
  useEffect(() => {
    const loadGeoJSON = async () => {
      try {
        const response = await fetch('/TCC_Campus_Map.geojson');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Add highlight property to all features
        const processedData = {
          ...data,
          features: data.features.map((feature) => ({
            ...feature,
            properties: {
              ...feature.properties,
              highlight: 'false',
            },
          })),
        };

        setGeojsonData(processedData);
        setBuildings(processedData.features);
      } catch (error) {
        console.error('Error fetching GeoJSON:', error);
        setGeojsonData({ type: 'FeatureCollection', features: [] });
        setBuildings([]);
      }
    };

    loadGeoJSON();
  }, []);

  /**
   * Setup map layers when data is loaded
   */
  useEffect(() => {
    if (!map.current || !geojsonData || !mapLoaded) return;

    const source = map.current.getSource('campus_directory');
    
    // Function to add map layers
    const addMapLayers = () => {
      // Add dim points layer (unselected buildings) if it doesn't exist
      if (!map.current.getLayer('dim-points')) {
        try {
          map.current.addLayer({
            id: 'dim-points',
            type: 'circle',
            source: 'campus_directory',
            paint: {
              'circle-radius': 8,
              'circle-color': '#808080',
              'circle-opacity': 0.7,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
            },
            filter: ['==', '$type', 'Point'],
          });
          console.log('Dim points layer added successfully');
        } catch (error) {
          console.error('Error adding dim-points layer:', error);
        }
      }

      // Add highlighted point layer (selected building) if it doesn't exist
      if (!map.current.getLayer('highlighted-point')) {
        try {
          map.current.addLayer({
            id: 'highlighted-point',
            type: 'circle',
            source: 'campus_directory',
            paint: {
              'circle-radius': 12,
              'circle-color': '#B42222',
              'circle-opacity': 1,
              'circle-stroke-width': 3,
              'circle-stroke-color': '#ffffff',
            },
            filter: ['==', ['get', 'highlight'], 'true'],
          });
          console.log('Highlighted points layer added successfully');
        } catch (error) {
          console.error('Error adding highlighted-point layer:', error);
        }
      }
    };
    
    // Add or update source
    if (source) {
      source.setData(geojsonData);
      console.log('Source data updated:', geojsonData.features.length, 'features');
      addMapLayers();
    } else {
      map.current.addSource('campus_directory', {
        type: 'geojson',
        data: geojsonData,
      });
      console.log('Source added:', geojsonData.features.length, 'features');
      
      // For GeoJSON sources, data is available immediately, so add layers
      addMapLayers();
    }

    // Remove existing event listeners to avoid duplicates
    map.current.off('click', 'dim-points');
    map.current.off('click', 'highlighted-point');
    map.current.off('click');
    map.current.off('mouseenter', 'dim-points');
    map.current.off('mouseleave', 'dim-points');
    map.current.off('mouseenter', 'highlighted-point');
    map.current.off('mouseleave', 'highlighted-point');

    // Add click event to dim points
    map.current.on('click', 'dim-points', (e) => {
      console.log('Clicked on dim-points layer', e.features);
      if (e.features && e.features.length > 0) {
        handleBuildingClick(e.features[0]);
      }
    });

    // Add click event to highlighted points
    map.current.on('click', 'highlighted-point', (e) => {
      console.log('Clicked on highlighted-point layer', e.features);
      if (e.features && e.features.length > 0) {
        handleBuildingClick(e.features[0]);
      }
    });

    // Change cursor on hover for dim points
    map.current.on('mouseenter', 'dim-points', () => {
      map.current.getCanvas().style.cursor = 'pointer';
    });

    map.current.on('mouseleave', 'dim-points', () => {
      map.current.getCanvas().style.cursor = '';
    });

    // Change cursor on hover for highlighted points
    map.current.on('mouseenter', 'highlighted-point', () => {
      map.current.getCanvas().style.cursor = 'pointer';
    });

    map.current.on('mouseleave', 'highlighted-point', () => {
      map.current.getCanvas().style.cursor = '';
    });
  }, [geojsonData, mapLoaded, handleBuildingClick]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <img
          src="/images/tccLogoNew.png"
          alt="Tacoma Community College Logo"
          style={styles.logo}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
        <span style={styles.headerTitle}>TCC Interactive Campus Map</span>
      </div>

      {/* Sidebar with Search and Building List */}
      <div style={styles.sidebar}>
        <input
          type="text"
          placeholder="Search for buildings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />

        <div>
          {filteredBuildings.length === 0 && (
            <div style={styles.emptyState}>
              {searchQuery ? 'No buildings found' : 'Loading buildings...'}
            </div>
          )}
          {filteredBuildings.map((feature, index) => {
            const props = feature.properties;
            const buildingName = props.buildingName || 'Unnamed Building';
            const isSelected = buildingName === selectedBuilding;

            return (
              <div
                key={`${buildingName}-${index}`}
                onClick={() => handleBuildingClick(feature)}
                style={styles.buildingCard(isSelected)}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = '#e1ecf7';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'white';
                }}
              >
                <div style={styles.buildingName}>{buildingName}</div>
                <div style={styles.buildingDetails}>
                  {props.numFloors && (
                    <>
                      Floors: {props.numFloors}
                      <br />
                    </>
                  )}
                  {props.buildingNumber && (
                    <>
                      Building Number: {props.buildingNumber}
                      <br />
                    </>
                  )}
                  {props.buildingDescription && (
                    <div style={{ marginTop: '8px' }}>{props.buildingDescription}</div>
                  )}
                </div>
                {isSelected && props.imageURL && (
                  <img
                    src={`/images/${props.imageURL}`}
                    alt={buildingName}
                    style={styles.buildingImage}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Map Container */}
      <div ref={mapContainer} style={styles.mapContainer} />

      {/* Responsive CSS */}
      <style>{`
        @media (max-width: 768px) {
          div[style*="width: ${MAP_WIDTH}"] {
            width: 100% !important;
            left: 0 !important;
            height: 50% !important;
            top: ${HEADER_HEIGHT}px !important;
          }
          div[style*="width: ${SIDEBAR_WIDTH}"] {
            width: 100% !important;
            height: calc(50% - ${HEADER_HEIGHT}px) !important;
            bottom: 0 !important;
            top: auto !important;
            border-right: none !important;
            border-top: 1px solid #ddd !important;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
