// ============================================================
// BusMap — Leaflet 地圖組件
// 顯示路線 polyline（實際道路線條）+ 車站 marker
// 數據來源：後端 API（代理 hkbus/route-waypoints GeoJSON）
// Web-only（react-native-web 用 DOM render）
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { View, Platform, StyleSheet, Text } from 'react-native';
import type { RouteStopDetail } from '../types';

interface BusMapProps {
  stops: RouteStopDetail[];
  height?: number;
  route?: string;
  bound?: string;
  company?: string;
}

const LEAFLET_CSS =
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

const SHAPE_API_BASE = '/api/route-shape';

export default function BusMap({ stops, height = 300, route, bound, company }: BusMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shapeCoords, setShapeCoords] = useState<[number, number][] | null>(null);

  // Fetch shape data from backend
  useEffect(() => {
    if (!route || !bound || !company) return;
    let cancelled = false;

    fetch(`${SHAPE_API_BASE}/${company}/${route}/${bound}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.coordinates) {
          setShapeCoords(data.coordinates);
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [route, bound, company]);

  // Leaflet map
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    let cancelled = false;
    let mapInstance: any = null;

    (async () => {
      try {
        const L = (await import('leaflet')) as typeof import('leaflet');

        // Inject CSS once
        if (!document.getElementById('leaflet-style')) {
          const link = document.createElement('link');
          link.id = 'leaflet-style';
          link.rel = 'stylesheet';
          link.href = LEAFLET_CSS;
          document.head.appendChild(link);
        }

        if (cancelled || !containerRef.current) return;

        const validStops = stops.filter(
          (s) => s.lat && s.long && s.lat !== '0' && s.long !== '0',
        );

        // If no stops and no shape, nothing to show
        if (validStops.length === 0 && !shapeCoords) {
          return;
        }

        // Fix Leaflet default icon path issue
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl:
            'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl:
            'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl:
            'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        // Create map
        mapInstance = L.map(containerRef.current, {
          zoomControl: true,
          attributionControl: true,
        });

        // ── User location ──
        let userMarker: any = null;

        function onLocationFound(e: any) {
          if (userMarker) {
            userMarker.setLatLng(e.latlng);
          } else {
            userMarker = L.circleMarker(e.latlng, {
              radius: 10,
              fillColor: '#60b0f4',
              color: '#FFFFFF',
              weight: 3,
              opacity: 1,
              fillOpacity: 0.6,
            }).addTo(mapInstance);
            // autoPan: false — 唔好 marker 一郁就強制拉返地圖去而家位置
            userMarker.bindPopup('你嘅位置', { autoPan: false });
          }
          // Pan to user on locate button click
          if (locateRequested) {
            mapInstance.setView(e.latlng, 16);
            locateRequested = false;
          }
        }

        function onLocationError() {
          locateRequested = false;
        }

        mapInstance.on('locationfound', onLocationFound);
        mapInstance.on('locationerror', onLocationError);
        mapInstance.locate({ setView: false, watch: true, enableHighAccuracy: true });

        // ── Custom Locate Button ──
        let locateRequested = false;
        const LocateControl = L.Control.extend({
          onAdd() {
            const btn = L.DomUtil.create('button', 'map-locate-btn');
            btn.innerHTML = '📍';
            btn.title = '定位我';
            btn.style.cssText = `
              background: white; border: 2px solid rgba(0,0,0,0.2);
              border-radius: 4px; width: 36px; height: 36px;
              font-size: 18px; cursor: pointer; display: flex;
              align-items: center; justify-content: center;
              box-shadow: 0 1px 5px rgba(0,0,0,0.3);
            `;
            L.DomEvent.on(btn, 'click', () => {
              locateRequested = true;
              mapInstance.locate({ setView: false, watch: false, enableHighAccuracy: true });
            });
            return btn;
          },
        });
        mapInstance.addControl(new LocateControl({ position: 'topleft' }));

        // OpenStreetMap tiles (free, no API key)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(mapInstance);

        // ── Route polyline (actual road shape) ──
        if (shapeCoords && shapeCoords.length > 1) {
          L.polyline(shapeCoords, {
            color: '#60b0f4',
            weight: 5,
            opacity: 0.85,
          }).addTo(mapInstance);
        } else if (validStops.length > 1) {
          // Fallback: connect stops in order
          const stopCoords: [number, number][] = validStops.map((s) => [
            parseFloat(s.lat),
            parseFloat(s.long),
          ]);
          L.polyline(stopCoords, {
            color: '#60b0f4',
            weight: 4,
            opacity: 0.8,
            dashArray: '8, 6', // Dashed to indicate it's approximate
          }).addTo(mapInstance);
        }

        // ── Stop markers ──
        if (validStops.length > 0) {
          const startIcon = L.divIcon({
            html: '<div style="background:#4ecdc4;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
            className: '',
          });

          const endIcon = L.divIcon({
            html: '<div style="background:#ff6b6b;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
            className: '',
          });

          const midIcon = L.divIcon({
            html: '<div style="background:#60b0f4;width:10px;height:10px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>',
            iconSize: [10, 10],
            iconAnchor: [5, 5],
            className: '',
          });

          const stopCoords = validStops.map((s) => [
            parseFloat(s.lat),
            parseFloat(s.long),
          ] as [number, number]);

          validStops.forEach((stop, i) => {
            const icon =
              i === 0 ? startIcon : i === validStops.length - 1 ? endIcon : midIcon;
            const marker = L.marker(stopCoords[i], { icon }).addTo(mapInstance);
            marker.bindPopup(
              `<div style="font-family:sans-serif;padding:2px">
                <b>${stop.seq}. ${stop.name_tc}</b>
                <br/>
                <span style="color:#5a7a9a;font-size:12px">${stop.name_en}</span>
              </div>`,
            );
          });
        }

        // Fit bounds
        let allPoints: [number, number][] = [];
        if (shapeCoords && shapeCoords.length > 0) {
          allPoints = shapeCoords;
        } else if (validStops.length > 0) {
          allPoints = validStops.map((s) => [
            parseFloat(s.lat),
            parseFloat(s.long),
          ] as [number, number]);
        }

        if (allPoints.length > 1) {
          mapInstance.fitBounds(allPoints, { padding: [50, 50] });
        } else if (allPoints.length > 0) {
          mapInstance.setView(allPoints[0], 15);
        }

        // Invalidate size after render
        setTimeout(() => {
          if (mapInstance) mapInstance.invalidateSize();
        }, 300);
      } catch (e) {
        console.error('BusMap init error:', e);
      }
    })();

    return () => {
      cancelled = true;
      if (mapInstance) {
        mapInstance.remove();
        mapInstance = null;
      }
    };
    // Re-run when shapeCoords or stops change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops.length, shapeCoords, Platform.OS]);

  if (Platform.OS !== 'web') {
    return (
      <View style={[styles.fallback, { height }]}>
        <Text style={styles.fallbackText}>地圖僅支援網頁版</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { height }]}>
      <div ref={containerRef} style={styles.map} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 12,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#142238',
    borderRadius: 12,
  },
  fallbackText: {
    fontSize: 14,
    color: '#5a7a9a',
  },
});