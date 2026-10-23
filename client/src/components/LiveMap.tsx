import { useEffect, useRef } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';
import { Text } from './Text';
import { colors, radius, shadow } from '../theme/theme';
import { API_URL } from '../services/client';

export interface Pt { lat: number; lng: number }

interface Props {
  pro?: Pt | null;    // cleaner's live position (orange, moving)
  cust?: Pt | null;   // customer / destination (teal)
  height?: number;
  etaText?: string;
  cleanerName?: string;
  live?: boolean;
  focusTick?: number; // bump to re-fit / re-centre the route in-app ("Navigate")
  /** Real driving ETA (seconds) and distance (metres) once the route loads. */
  onRoute?: (r: { eta: number; distance: number }) => void;
}

// Karachi city centre. Only ever used to give Leaflet a valid starting view
// while a real position loads — when nothing is known the map is covered by
// the "waiting for location" overlay below, so this is never presented as
// though it were the job's location.
const DEFAULT = { lat: 24.8607, lng: 67.0011 };

// Leaflet page for the live-tracking map. Kept as a single string so it can be
// handed to a WebView (native) or an iframe (web) without a build step.
//
// Behaves like a ride-hailing map: the route follows real roads, the car slides
// between GPS fixes instead of jumping, it points the way it is travelling, and
// the part of the route already covered is dimmed.
function buildHtml(center: Pt, initial: string, apiUrl: string) {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html,body,#map{height:100%;margin:0;padding:0;background:#EAEFF2}
  .leaflet-control-attribution{font-size:8px;opacity:.45}
  .car{will-change:transform}
  .car svg{display:block;filter:drop-shadow(0 3px 5px rgba(0,0,0,.35))}
  .pin{width:30px;height:30px;border-radius:50% 50% 50% 0;background:#0B7C82;border:3px solid #fff;
       box-shadow:0 3px 8px rgba(0,0,0,.3);transform:rotate(-45deg)}
  .pin i{position:absolute;inset:0;display:grid;place-items:center;transform:rotate(45deg);color:#fff;font:700 11px/1 system-ui}
  .halo{width:54px;height:54px;border-radius:50%;background:rgba(243,156,18,.22);animation:pulse 2.4s ease-out infinite}
  @keyframes pulse{0%{transform:scale(.55);opacity:.85}100%{transform:scale(1.25);opacity:0}}
  @media (prefers-reduced-motion:reduce){.halo{animation:none}}
</style>
</head><body><div id="map"></div>
<script>
  var API = ${JSON.stringify(apiUrl || '')};
  var map = L.map('map',{zoomControl:false,attributionControl:true,zoomSnap:.25})
             .setView([${center.lat},${center.lng}],14);
  // Esri's light canvas: clean, ride-hailing style, and no API key. CARTO's
  // basemaps now stamp "API KEY REQUIRED" across unkeyed tiles, so not those.
  // Streets go on top of the canvas so road names stay readable.
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:20,maxNativeZoom:19,attribution:'© OpenStreetMap'}).addTo(map);

  var carIcon = L.divIcon({className:'car',iconSize:[34,34],iconAnchor:[17,17],html:
    '<svg width="34" height="34" viewBox="0 0 34 34"><g id="rot" transform="rotate(0 17 17)">'+
    '<circle cx="17" cy="17" r="13" fill="#fff"/>'+
    '<path d="M17 6 L24 26 L17 21.5 L10 26 Z" fill="#F39C12"/></g></svg>'});
  var haloIcon = L.divIcon({className:'',iconSize:[54,54],iconAnchor:[27,27],html:'<div class="halo"></div>'});
  var pinIcon  = L.divIcon({className:'',iconSize:[30,30],iconAnchor:[15,30],html:'<div class="pin"><i>■</i></div>'});

  var carM=null, haloM=null, custM=null, doneLine=null, restLine=null, fallback=null;
  var routePts=[], routeKey='', fitted=false, cur=null, from=null, to=null, t0=0, dur=0, heading=0;

  function latlng(p){ return [p.lat,p.lng]; }
  function dist(a,b){ return map.distance(latlng(a),latlng(b)); }
  function bearing(a,b){
    var y=Math.sin((b.lng-a.lng)*Math.PI/180)*Math.cos(b.lat*Math.PI/180);
    var x=Math.cos(a.lat*Math.PI/180)*Math.sin(b.lat*Math.PI/180)-
          Math.sin(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.cos((b.lng-a.lng)*Math.PI/180);
    return (Math.atan2(y,x)*180/Math.PI+360)%360;
  }
  function setCar(p){
    if(!carM){
      haloM=L.marker(latlng(p),{icon:haloIcon,interactive:false}).addTo(map);
      carM=L.marker(latlng(p),{icon:carIcon,interactive:false,zIndexOffset:500}).addTo(map);
    } else { carM.setLatLng(latlng(p)); haloM.setLatLng(latlng(p)); }
    var el=carM.getElement&&carM.getElement();
    var g=el&&el.querySelector('#rot');
    if(g) g.setAttribute('transform','rotate('+heading.toFixed(1)+' 17 17)');
  }

  // Slide between GPS fixes rather than teleporting.
  function animate(ts){
    if(!from||!to){ return; }
    var k = dur<=0 ? 1 : Math.min((ts-t0)/dur, 1);
    var e = k<.5 ? 2*k*k : 1-Math.pow(-2*k+2,2)/2;          // easeInOutQuad
    cur = { lat: from.lat+(to.lat-from.lat)*e, lng: from.lng+(to.lng-from.lng)*e };
    setCar(cur);
    paintProgress();
    if(k<1) requestAnimationFrame(animate);
  }
  function moveTo(p){
    if(!cur){ cur=p; from=p; to=p; heading=0; setCar(p); return; }
    if(dist(cur,p)<1) return;
    heading = bearing(cur,p);
    from = cur; to = p; t0 = performance.now();
    dur = Math.min(2500, Math.max(600, dist(cur,p)*18));     // longer hop, longer glide
    requestAnimationFrame(animate);
  }

  // Dim the covered part of the route, keep the rest bright.
  function paintProgress(){
    if(!routePts.length||!cur) return;
    var best=0, bd=Infinity;
    for(var i=0;i<routePts.length;i+=2){
      var d=map.distance(routePts[i],[cur.lat,cur.lng]);
      if(d<bd){bd=d;best=i;}
    }
    var done=routePts.slice(0,best+1).concat([[cur.lat,cur.lng]]);
    var rest=[[cur.lat,cur.lng]].concat(routePts.slice(best+1));
    if(doneLine) doneLine.setLatLngs(done); else doneLine=L.polyline(done,{color:'#9CA3AF',weight:5,opacity:.55,lineCap:'round',lineJoin:'round'}).addTo(map);
    if(restLine) restLine.setLatLngs(rest); else restLine=L.polyline(rest,{color:'#0B7C82',weight:6,opacity:.95,lineCap:'round',lineJoin:'round'}).addTo(map);
    restLine.bringToFront();
  }

  function fit(){
    var pts=[];
    if(routePts.length) pts=routePts.slice();
    else { if(cur) pts.push(latlng(cur)); if(custM) pts.push([custM.getLatLng().lat,custM.getLatLng().lng]); }
    if(pts.length>1) map.fitBounds(L.latLngBounds(pts).pad(0.25));
    else if(pts.length===1) map.setView(pts[0],15);
  }

  function post(msg){
    try{ if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
         else parent.postMessage(JSON.stringify(msg),'*'); }catch(_){ }
  }

  function loadRoute(a,b){
    var key=a.lat.toFixed(3)+','+a.lng.toFixed(3)+';'+b.lat.toFixed(3)+','+b.lng.toFixed(3);
    if(key===routeKey) return; routeKey=key;
    fetch(API+'/route?from='+a.lat+','+a.lng+'&to='+b.lat+','+b.lng)
      .then(function(r){return r.json();})
      .then(function(j){
        if(!j||!j.coords||!j.coords.length) return;        // keep the straight line
        routePts=j.coords;
        if(fallback){ map.removeLayer(fallback); fallback=null; }
        paintProgress();
        if(!fitted){ fit(); fitted=true; }
        post({ eta:j.duration, distance:j.distance });
      })
      .catch(function(){});
  }

  function upd(d){
    if(!d) return;
    if(d.cust){
      if(!custM) custM=L.marker(latlng(d.cust),{icon:pinIcon}).addTo(map);
      else custM.setLatLng(latlng(d.cust));
    }
    if(d.pro) moveTo(d.pro);
    if(d.pro&&d.cust){
      if(!routePts.length){
        var straight=[latlng(d.pro),latlng(d.cust)];
        if(fallback) fallback.setLatLngs(straight);
        else fallback=L.polyline(straight,{color:'#0B7C82',weight:4,dashArray:'7,7',opacity:.5}).addTo(map);
      }
      loadRoute(d.pro,d.cust);
      if(!fitted){ fit(); fitted=true; }
    } else if(d.pro&&!fitted){ map.setView(latlng(d.pro),15); fitted=true; }
    else if(d.cust&&!fitted){ map.setView(latlng(d.cust),15); fitted=true; }
  }

  window.__update=upd;
  window.__fit=fit;
  window.addEventListener('message',function(e){ try{var m=JSON.parse(e.data); if(m&&m.__fit){fit();return;} upd(m);}catch(_){ } });
  document.addEventListener('message',function(e){ try{var m=JSON.parse(e.data); if(m&&m.__fit){fit();return;} upd(m);}catch(_){ } });
  upd(${initial});
  setTimeout(function(){ map.invalidateSize(); fit(); },250);
</script></body></html>`;
}

export function LiveMap({ pro, cust, height = 240, etaText, cleanerName, live = true, focusTick = 0, onRoute }: Props) {
  const center = pro || cust || DEFAULT;
  // With neither end known there is nothing truthful to draw, so say so
  // instead of showing an unrelated city's streets with no pins on them.
  const hasAnyPoint = !!(pro || cust);
  const initialRef = useRef(JSON.stringify({ pro: pro || null, cust: cust || null }));
  const htmlRef = useRef(buildHtml(center, initialRef.current, API_URL));
  const webRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // The map reports the real driving ETA once the route resolves.
  const routeCb = useRef(onRoute);
  routeCb.current = onRoute;
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onMsg = (e: MessageEvent) => {
      try {
        const m = JSON.parse(String(e.data));
        if (m && typeof m.eta === 'number') routeCb.current?.({ eta: m.eta, distance: m.distance ?? 0 });
      } catch { /* not ours */ }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const payload = JSON.stringify({ pro: pro || null, cust: cust || null });
  useEffect(() => {
    if (Platform.OS === 'web') {
      try { iframeRef.current?.contentWindow?.postMessage(payload, '*'); } catch { /* ignore */ }
    } else {
      webRef.current?.injectJavaScript(`window.__update && window.__update(${payload}); true;`);
    }
  }, [payload]);

  // "Navigate" pressed → re-fit the route inside the app (no external map).
  useEffect(() => {
    if (!focusTick) return;
    if (Platform.OS === 'web') {
      try { iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ __fit: true }), '*'); } catch { /* ignore */ }
    } else {
      webRef.current?.injectJavaScript(`window.__fit && window.__fit(); true;`);
    }
  }, [focusTick]);

  return (
    <View style={{ height, overflow: 'hidden', position: 'relative' }}>
      {Platform.OS === 'web'
        ? <iframe ref={iframeRef} srcDoc={htmlRef.current} style={{ border: 0, width: '100%', height }} title="live-map" />
        : <WebView
            ref={webRef}
            originWhitelist={['*']}
            source={{ html: htmlRef.current }}
            style={{ flex: 1, backgroundColor: '#EDE8DF' }}
            javaScriptEnabled
            domStorageEnabled
            // Prevent an Android WebView render-process crash from taking down the app.
            onMessage={(e) => {
              try {
                const m = JSON.parse(e.nativeEvent.data);
                if (m && typeof m.eta === 'number') routeCb.current?.({ eta: m.eta, distance: m.distance ?? 0 });
              } catch { /* ignore */ }
            }}
            onRenderProcessGone={() => {}}
            onError={() => {}}
            androidLayerType="hardware"
          />}

      {!!etaText && (
        <View style={styles.eta}>
          <Text variant="caption" color={colors.textDisabled} style={{ letterSpacing: 1, fontSize: 9 }}>{cleanerName ? 'CLEANER' : 'STATUS'}</Text>
          <Text weight="extrabold" style={{ fontSize: 18, letterSpacing: -0.5 }}>{etaText}</Text>
          {!!cleanerName && <Text variant="bodySm" color={colors.textTertiary}>{cleanerName}</Text>}
        </View>
      )}
      {live && hasAnyPoint && (
        <View style={styles.live}><View style={styles.liveDot} /><Text weight="bold" color={colors.white} style={{ fontSize: 10, letterSpacing: 0.5 }}>LIVE</Text></View>
      )}

      {!hasAnyPoint && (
        <View style={styles.waiting}>
          <Feather name="map-pin" size={20} color={colors.textTertiary} />
          <Text weight="semibold" style={{ fontSize: 13, marginTop: 8 }}>Waiting for location</Text>
          <Text variant="bodySm" color={colors.textTertiary} center style={{ marginTop: 2, paddingHorizontal: 24, lineHeight: 17 }}>
            The map appears once the job's location is known.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  eta: { position: 'absolute', top: 12, left: 12, backgroundColor: colors.white, borderRadius: radius.lg, padding: 11, minWidth: 120, ...shadow.card },
  waiting: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.93)' },
  live: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.error, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
});

export default LiveMap;
