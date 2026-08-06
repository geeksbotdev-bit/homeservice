import { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface Props {
  latitude: number;
  longitude: number;
  zoom?: number;
  /** Fixed pixel height. Omit to fill the parent (flex: 1). */
  height?: number;
  /** Allow the user to tap / drag the pin to choose a spot. */
  interactive?: boolean;
  /** Called with the newly picked coordinate. */
  onPick?: (lat: number, lng: number) => void;
}

/** Interactive OpenStreetMap (Leaflet) — real streets, drag + zoom, no API key. */
function buildHtml(lat: number, lng: number, zoom: number, interactive: boolean) {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{height:100%;margin:0;padding:0;background:#EDE8DF}
.leaflet-control-attribution{font-size:9px;opacity:.6}</style>
</head><body><div id="map"></div>
<script>
  var map = L.map('map',{zoomControl:true,attributionControl:true}).setView([${lat},${lng}], ${zoom});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
  var icon = L.divIcon({className:'',html:'<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:#0B7C82;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);transform:rotate(-45deg)"></div>',iconSize:[26,26],iconAnchor:[13,26]});
  var marker = L.marker([${lat},${lng}],{draggable:${interactive}, icon:icon}).addTo(map);
  function post(o){ try{ if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify(o));} else {parent.postMessage(JSON.stringify(o),'*');} }catch(e){} }
  ${interactive ? `
  map.on('click', function(e){ marker.setLatLng(e.latlng); post({type:'pick',lat:e.latlng.lat,lng:e.latlng.lng}); });
  marker.on('dragend', function(){ var p=marker.getLatLng(); map.panTo(p); post({type:'pick',lat:p.lat,lng:p.lng}); });
  ` : ''}
  setTimeout(function(){ map.invalidateSize(); }, 200);
</script></body></html>`;
}

export function OsmMap({ latitude, longitude, zoom = 15, height, interactive = false, onPick }: Props) {
  const html = buildHtml(latitude, longitude, zoom, interactive);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const containerStyle = height != null ? { height, overflow: 'hidden' as const } : { flex: 1, overflow: 'hidden' as const };
  const iframeHeight = height != null ? height : '100%';

  const handle = (raw: string) => {
    try {
      const m = JSON.parse(raw);
      if (m?.type === 'pick' && onPickRef.current) onPickRef.current(m.lat, m.lng);
    } catch { /* ignore */ }
  };

  // Web: listen for postMessage from the Leaflet iframe.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onMsg = (e: MessageEvent) => { if (typeof e.data === 'string') handle(e.data); };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  if (Platform.OS === 'web') {
    return (
      <View style={containerStyle}>
        <iframe srcDoc={html} style={{ border: 0, width: '100%', height: iframeHeight }} title="map" />
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        onMessage={(e) => handle(e.nativeEvent.data)}
        style={{ flex: 1, backgroundColor: '#EDE8DF' }}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
}

export default OsmMap;
