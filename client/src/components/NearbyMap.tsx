import { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { WebView } from 'react-native-webview';

export interface NearbyPin { id: string; lat: number; lng: number; initials: string; matched?: boolean }

interface Props {
  latitude: number;    // the customer's live location
  longitude: number;
  cleaners: NearbyPin[];
  height?: number;     // omit to fill the parent (flex: 1)
}

// Base map: user (teal, pulsing) is drawn once; cleaner dots are refreshed
// imperatively so they glide/move without ever reloading the WebView.
function baseHtml(lat: number, lng: number) {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html,body,#map{height:100%;margin:0;padding:0;background:#EDE8DF}
  .leaflet-control-attribution{display:none}
  @keyframes pulse{0%{transform:scale(.4);opacity:.6}100%{transform:scale(2.4);opacity:0}}
  .pw{position:absolute;left:-20px;top:-20px;width:40px;height:40px;border-radius:50%;background:rgba(11,124,130,.25);animation:pulse 2s ease-out infinite}
  .cl{transition:transform 2.4s linear}
</style>
</head><body><div id="map"></div>
<script>
  var map = L.map('map',{zoomControl:false,attributionControl:false,dragging:true,scrollWheelZoom:true,doubleClickZoom:true,touchZoom:true}).setView([${lat},${lng}],14);
  // Esri World Street Map — English (latin) labels, no API key required.
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:19}).addTo(map);
  L.control.zoom({position:'bottomright'}).addTo(map);
  var youIcon = L.divIcon({className:'',html:'<div style="position:relative"><div class="pw"></div><div style="position:relative;width:16px;height:16px;border-radius:50%;background:#0B7C82;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div></div>',iconSize:[16,16],iconAnchor:[8,8]});
  var you = L.marker([${lat},${lng}],{icon:youIcon}).addTo(map);
  var markers = {};
  function iconFor(c){
    var bg = c.matched ? '#1E9E5A' : '#F39C12';
    return L.divIcon({className:'',html:'<div class="cl" style="width:30px;height:30px;border-radius:50%;background:'+bg+';border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:#fff;font:700 10px sans-serif">'+c.initials+'</div>',iconSize:[30,30],iconAnchor:[15,15]});
  }
  window.__setUser = function(la,ln){ you.setLatLng([la,ln]); };
  window.__setCleaners = function(list){
    var seen = {};
    list.forEach(function(c){
      seen[c.id] = 1;
      if(markers[c.id]){ markers[c.id].setLatLng([c.lat,c.lng]); markers[c.id].setIcon(iconFor(c)); }
      else { markers[c.id] = L.marker([c.lat,c.lng],{icon:iconFor(c)}).addTo(map); }
    });
    Object.keys(markers).forEach(function(id){ if(!seen[id]){ map.removeLayer(markers[id]); delete markers[id]; } });
    var pts = [you.getLatLng()];
    list.forEach(function(c){ pts.push([c.lat,c.lng]); });
    if(pts.length>1 && !window.__fitted){ map.fitBounds(L.latLngBounds(pts).pad(0.4)); window.__fitted = true; }
  };
  window.addEventListener('message', function(e){
    try { var m = typeof e.data==='string'?JSON.parse(e.data):e.data;
      if(m.type==='cleaners') window.__setCleaners(m.data);
      if(m.type==='user') window.__setUser(m.lat,m.lng); } catch(_){}
  });
  document.addEventListener('message', function(e){
    try { var m = JSON.parse(e.data);
      if(m.type==='cleaners') window.__setCleaners(m.data);
      if(m.type==='user') window.__setUser(m.lat,m.lng); } catch(_){}
  });
</script></body></html>`;
}

export function NearbyMap({ latitude, longitude, cleaners, height }: Props) {
  const container = height != null ? { height, overflow: 'hidden' as const } : { flex: 1, overflow: 'hidden' as const };
  const webRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Build the base once, anchored on the first known user location.
  const anchorRef = useRef({ lat: latitude, lng: longitude });
  const html = useRef(baseHtml(anchorRef.current.lat, anchorRef.current.lng)).current;

  // Push cleaner + user updates imperatively (no reload).
  useEffect(() => {
    const payload = JSON.stringify({ type: 'cleaners', data: cleaners });
    const userMsg = JSON.stringify({ type: 'user', lat: latitude, lng: longitude });
    if (Platform.OS === 'web') {
      const win = iframeRef.current?.contentWindow;
      win?.postMessage({ type: 'user', lat: latitude, lng: longitude }, '*');
      win?.postMessage({ type: 'cleaners', data: cleaners }, '*');
    } else {
      webRef.current?.injectJavaScript(`window.__setUser&&window.__setUser(${latitude},${longitude});window.__setCleaners&&window.__setCleaners(${JSON.stringify(cleaners)});true;`);
    }
  }, [cleaners, latitude, longitude]);

  if (Platform.OS === 'web') {
    return (
      <View style={container}>
        {/* onLoad seeds the first render once the iframe document is ready */}
        <iframe
          ref={iframeRef}
          srcDoc={html}
          onLoad={() => {
            const win = iframeRef.current?.contentWindow;
            win?.postMessage({ type: 'user', lat: latitude, lng: longitude }, '*');
            win?.postMessage({ type: 'cleaners', data: cleaners }, '*');
          }}
          style={{ border: 0, width: '100%', height: '100%' }}
          title="nearby"
        />
      </View>
    );
  }
  return (
    <View style={container}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html }}
        onLoadEnd={() => webRef.current?.injectJavaScript(`window.__setUser&&window.__setUser(${latitude},${longitude});window.__setCleaners&&window.__setCleaners(${JSON.stringify(cleaners)});true;`)}
        style={{ flex: 1, backgroundColor: '#EDE8DF' }}
        javaScriptEnabled
        domStorageEnabled
        onRenderProcessGone={() => {}}
        onError={() => {}}
        androidLayerType="hardware"
      />
    </View>
  );
}

export default NearbyMap;
