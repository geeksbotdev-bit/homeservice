import { useEffect, useRef } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';
import { Text } from './Text';
import { colors, radius, shadow } from '../theme/theme';

export interface Pt { lat: number; lng: number }

interface Props {
  pro?: Pt | null;    // cleaner's live position (orange, moving)
  cust?: Pt | null;   // customer / destination (teal)
  height?: number;
  etaText?: string;
  cleanerName?: string;
  live?: boolean;
}

const DEFAULT = { lat: 31.5204, lng: 74.3587 }; // Lahore

// Leaflet page with two updatable markers + a route line. `__update(data)` and
// window 'message' both move the markers so we never remount (no flicker).
function buildHtml(center: Pt, initial: string) {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{height:100%;margin:0;padding:0;background:#EDE8DF}.leaflet-control-attribution{font-size:8px;opacity:.5}</style>
</head><body><div id="map"></div>
<script>
  var map = L.map('map',{zoomControl:false,attributionControl:true}).setView([${center.lat},${center.lng}],14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
  function dot(color){ return L.divIcon({className:'',html:'<div style="width:22px;height:22px;border-radius:50%;background:'+color+';border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>',iconSize:[22,22],iconAnchor:[11,11]}); }
  function pin(color){ return L.divIcon({className:'',html:'<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:'+color+';border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);transform:rotate(-45deg)"></div>',iconSize:[26,26],iconAnchor:[13,26]}); }
  var proM=null, custM=null, line=null, did=false;
  function upd(d){
    if(!d) return;
    if(d.pro){ if(!proM){proM=L.marker([d.pro.lat,d.pro.lng],{icon:dot('#F39C12')}).addTo(map);} else proM.setLatLng([d.pro.lat,d.pro.lng]); }
    if(d.cust){ if(!custM){custM=L.marker([d.cust.lat,d.cust.lng],{icon:pin('#0B7C82')}).addTo(map);} else custM.setLatLng([d.cust.lat,d.cust.lng]); }
    if(d.pro&&d.cust){ var pts=[[d.pro.lat,d.pro.lng],[d.cust.lat,d.cust.lng]]; if(line){line.setLatLngs(pts);} else {line=L.polyline(pts,{color:'#F39C12',weight:4,dashArray:'8,6'}).addTo(map);} if(!did){map.fitBounds(L.latLngBounds(pts).pad(0.5)); did=true;} }
    else if(d.pro){ if(!did){map.setView([d.pro.lat,d.pro.lng],15); did=true;} }
    else if(d.cust){ if(!did){map.setView([d.cust.lat,d.cust.lng],15); did=true;} }
  }
  window.__update = upd;
  window.addEventListener('message', function(e){ try{ upd(JSON.parse(e.data)); }catch(_){} });
  document.addEventListener('message', function(e){ try{ upd(JSON.parse(e.data)); }catch(_){} });
  upd(${initial});
  setTimeout(function(){ map.invalidateSize(); }, 250);
</script></body></html>`;
}

export function LiveMap({ pro, cust, height = 240, etaText, cleanerName, live = true }: Props) {
  const center = pro || cust || DEFAULT;
  const initialRef = useRef(JSON.stringify({ pro: pro || null, cust: cust || null }));
  const htmlRef = useRef(buildHtml(center, initialRef.current));
  const webRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const payload = JSON.stringify({ pro: pro || null, cust: cust || null });
  useEffect(() => {
    if (Platform.OS === 'web') {
      try { iframeRef.current?.contentWindow?.postMessage(payload, '*'); } catch { /* ignore */ }
    } else {
      webRef.current?.injectJavaScript(`window.__update && window.__update(${payload}); true;`);
    }
  }, [payload]);

  return (
    <View style={{ height, overflow: 'hidden', position: 'relative' }}>
      {Platform.OS === 'web'
        ? <iframe ref={iframeRef} srcDoc={htmlRef.current} style={{ border: 0, width: '100%', height }} title="live-map" />
        : <WebView ref={webRef} originWhitelist={['*']} source={{ html: htmlRef.current }} style={{ flex: 1, backgroundColor: '#EDE8DF' }} javaScriptEnabled domStorageEnabled />}

      {!!etaText && (
        <View style={styles.eta}>
          <Text variant="caption" color={colors.textDisabled} style={{ letterSpacing: 1, fontSize: 9 }}>{cleanerName ? 'CLEANER' : 'STATUS'}</Text>
          <Text weight="extrabold" style={{ fontSize: 18, letterSpacing: -0.5 }}>{etaText}</Text>
          {!!cleanerName && <Text variant="bodySm" color={colors.textTertiary}>{cleanerName}</Text>}
        </View>
      )}
      {live && (
        <View style={styles.live}><View style={styles.liveDot} /><Text weight="bold" color={colors.white} style={{ fontSize: 10, letterSpacing: 0.5 }}>LIVE</Text></View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  eta: { position: 'absolute', top: 12, left: 12, backgroundColor: colors.white, borderRadius: radius.lg, padding: 11, minWidth: 120, ...shadow.card },
  live: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.error, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
});

export default LiveMap;
