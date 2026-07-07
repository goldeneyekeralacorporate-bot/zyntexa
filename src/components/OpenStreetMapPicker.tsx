import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Navigation, AlertTriangle, Loader2 } from 'lucide-react';

interface OpenStreetMapPickerProps {
  onLocationSelected: (location: {
    lat: number;
    lng: number;
    street: string;
    city: string;
    state: string;
    pincode: string;
  }) => void;
  initialCoords?: { latitude: number; longitude: number } | null;
}

// Default center: Bengaluru, India
const DEFAULT_CENTER: [number, number] = [12.9716, 77.5946];

// Custom CSS-based Pin to avoid any Leaflet bundler image-loading bugs
const createCustomMarker = () => {
  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-8 h-8 bg-indigo-500/30 rounded-full animate-ping"></div>
        <div class="relative bg-indigo-600 text-white p-2 rounded-full shadow-lg border border-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      </div>
    `,
    className: 'custom-leaflet-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

export default function OpenStreetMapPicker({ onLocationSelected, initialCoords }: OpenStreetMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [addressPreview, setAddressPreview] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Reverse geocode lat/lng using free OpenStreetMap Nominatim API
  const handleLocationChange = async (lat: number, lng: number) => {
    setStatusMessage('Resolving address details...');
    setErrorMessage('');
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en'
          }
        }
      );
      if (!response.ok) throw new Error('Failed to fetch address');
      const data = await response.json();
      
      if (data && data.address) {
        const address = data.address;
        
        const street = address.road || address.suburb || address.neighbourhood || address.pedestrian || address.house_number || '';
        const city = address.city || address.town || address.village || address.county || '';
        const state = address.state || '';
        const pincode = address.postcode || '';

        const formatted = data.display_name || '';
        setAddressPreview(formatted);
        setStatusMessage('Location updated successfully!');

        onLocationSelected({
          lat,
          lng,
          street: street || 'Selected Map Location',
          city: city || 'Bengaluru',
          state: state || 'Karnataka',
          pincode: pincode || '560001'
        });
      } else {
        setErrorMessage('Could not retrieve detailed address components.');
      }
    } catch (err) {
      console.error('Error reverse geocoding:', err);
      setErrorMessage('Network error while retrieving location details.');
    }
  };

  // Setup Leaflet map on mount
  useEffect(() => {
    if (mapContainerRef.current && !leafletMap.current) {
      const initialLat = initialCoords?.latitude || DEFAULT_CENTER[0];
      const initialLng = initialCoords?.longitude || DEFAULT_CENTER[1];

      // Initialize Map
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: true
      }).setView([initialLat, initialLng], 14);

      // OpenStreetMap Standard Tile Layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      // Create draggable Pin
      const marker = L.marker([initialLat, initialLng], {
        icon: createCustomMarker(),
        draggable: true
      }).addTo(map);

      leafletMap.current = map;
      markerRef.current = marker;

      // Click to select new position
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        handleLocationChange(lat, lng);
      });

      // Drag to select new position
      marker.on('dragend', () => {
        const position = marker.getLatLng();
        handleLocationChange(position.lat, position.lng);
      });

      // Fetch initial address if coordinates are already present
      if (initialCoords) {
        handleLocationChange(initialLat, initialLng);
      }
    }

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Sync initialCoord changes from external sources
  useEffect(() => {
    if (leafletMap.current && initialCoords) {
      const { latitude, longitude } = initialCoords;
      const currentCenter = leafletMap.current.getCenter();
      
      // If significant difference, pan/update view
      if (Math.abs(currentCenter.lat - latitude) > 0.0001 || Math.abs(currentCenter.lng - longitude) > 0.0001) {
        leafletMap.current.setView([latitude, longitude], 15);
        if (markerRef.current) {
          markerRef.current.setLatLng([latitude, longitude]);
        }
        handleLocationChange(latitude, longitude);
      }
    }
  }, [initialCoords]);

  // Search address handler using open Nominatim API
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setErrorMessage('');
    setStatusMessage('Searching location...');

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery + ', India')}&format=json&addressdetails=1&limit=1`,
        {
          headers: {
            'Accept-Language': 'en'
          }
        }
      );
      if (!response.ok) throw new Error('Search request failed');
      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);

        if (leafletMap.current) {
          leafletMap.current.setView([lat, lng], 15);
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        }

        const address = result.address || {};
        const street = address.road || address.suburb || address.neighbourhood || address.pedestrian || '';
        const city = address.city || address.town || address.village || address.county || '';
        const state = address.state || '';
        const pincode = address.postcode || '';

        setAddressPreview(result.display_name || '');
        setStatusMessage('Location found!');
        setIsSearching(false);

        onLocationSelected({
          lat,
          lng,
          street: street || 'Selected Map Location',
          city: city || 'Bengaluru',
          state: state || 'Karnataka',
          pincode: pincode || '560001'
        });
      } else {
        setErrorMessage('Location not found. Try adding a more specific neighborhood or city name.');
        setStatusMessage('');
        setIsSearching(false);
      }
    } catch (err) {
      console.error('Search error:', err);
      setErrorMessage('Failed to connect to location search service.');
      setStatusMessage('');
      setIsSearching(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }

    setStatusMessage('Retrieving GPS coordinates...');
    setErrorMessage('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (leafletMap.current) {
          leafletMap.current.setView([latitude, longitude], 15);
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([latitude, longitude]);
        }
        handleLocationChange(latitude, longitude);
      },
      () => {
        setErrorMessage('Unable to access your device GPS location. Please type manually in search.');
        setStatusMessage('');
      }
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col h-[400px] w-full" id="openstreetmap-selector-container">
      {/* Search Header Controls */}
      <div className="p-3 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row gap-2 shrink-0">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search area, town, pincode, or street..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs transition-colors shrink-0 disabled:opacity-50 flex items-center gap-1"
          >
            {isSearching && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isSearching ? 'Searching...' : 'Search'}</span>
          </button>
        </form>

        <button
          type="button"
          onClick={handleGetCurrentLocation}
          className="flex items-center justify-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-extrabold px-3 py-1.5 rounded-xl text-xs transition-colors shrink-0"
        >
          <Navigation className="w-3.5 h-3.5 text-indigo-600 fill-indigo-100" />
          <span>Use My GPS Location</span>
        </button>
      </div>

      {/* Map Window */}
      <div className="flex-1 relative min-h-0 bg-slate-100">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating status & alert banner overlays */}
        {(statusMessage || errorMessage) && (
          <div className="absolute bottom-3 left-3 right-3 p-2.5 rounded-xl text-xs font-medium shadow-md flex items-center justify-between border animate-fade-in z-[1000] bg-white max-w-sm mx-auto">
            {errorMessage ? (
              <div className="flex items-center gap-1.5 text-rose-600">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="font-semibold">{errorMessage}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-indigo-700">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 shrink-0" />
                <span className="truncate max-w-[280px] font-semibold">{statusMessage}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected location card banner footer */}
      {addressPreview && (
        <div className="p-3 bg-indigo-50/40 border-t border-indigo-50 shrink-0 flex items-start gap-2 animate-fade-in z-10">
          <MapPin className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">Verified Delivery Point:</p>
            <p className="text-xs text-slate-600 font-semibold leading-relaxed line-clamp-2">{addressPreview}</p>
          </div>
        </div>
      )}
    </div>
  );
}
