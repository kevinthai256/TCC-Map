// Mock MapTiler SDK before imports
jest.mock('@maptiler/sdk', () => {
  const mockMapInstance = {
    on: jest.fn((event, callback) => {
      if (event === 'load') {
        // Immediately call the callback to simulate map load
        setTimeout(callback, 0);
      }
    }),
    getSource: jest.fn(() => null),
    addSource: jest.fn(),
    addLayer: jest.fn(),
    flyTo: jest.fn(),
    getCanvas: jest.fn(() => ({
      style: { cursor: '' }
    }))
  };

  function MockMap() {
    return mockMapInstance;
  }

  return {
    config: {
      apiKey: 'test-key'
    },
    Map: MockMap,
    MapStyle: {
      STREETS: 'streets'
    }
  };
});

import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

// Mock fetch for GeoJSON
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      type: 'FeatureCollection',
      features: []
    })
  })
);

test('renders TCC Interactive Campus Map', async () => {
  render(<App />);
  const titleElement = await waitFor(() => 
    screen.getByText(/TCC Interactive Campus Map/i)
  );
  expect(titleElement).toBeInTheDocument();
});
