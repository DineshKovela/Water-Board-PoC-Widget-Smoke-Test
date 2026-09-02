define('Modules/CityApiV2Manager', ['Modules/WidgetManager'], function(WidgetManager) {
    var PlatformAPI = null;
    var pairedWidgetId = null;
    var pairedWidgetTitle = '';
    var pending = {};
    var statusCallback = function(){};
    var logCallback = function(){};
    var lastStatus = 'Not initialized';
    var FOLDER_ID = 'DJB_SYNTHETIC_CITY_OVERLAY';

    function uuid() {
        try { return UWA.Utils.getUUID(); } catch(e) { return 'djb-' + Date.now() + '-' + Math.floor(Math.random()*100000); }
    }
    function isObj(v){ return v && typeof v === 'object'; }
    function log(msg, obj) { try { logCallback(msg + (obj ? ' ' + JSON.stringify(obj).substring(0,900) : '')); } catch(e) { logCallback(msg); } }
    function setStatus(s, cls) { lastStatus = s; statusCallback(s, cls || 'warn'); }
    function num(v){ var n=parseFloat(v); return isFinite(n)?n:0; }
    function str(v){ return v === undefined || v === null ? '' : String(v); }

    function isForThisWidget(res) {
        if(!res) return false;
        if(res.messageType === 'broadcast' && res.subscribeType === 'dashboard') return true;
        var target = res.widgetId || res.publisher;
        if(Array.isArray(target)) return target.indexOf(widget.id) >= 0;
        return target === widget.id || !target;
    }
    function resolve(res) {
        if(!isForThisWidget(res)) return;
        log('xCity.resolve:', res);
        if(res && res.topic === 'xCity.pair' && isObj(res.data)) {
            if(res.data.status === 'pairing-success' || res.data.status === 'paired') {
                pairedWidgetId = res.publisher || pairedWidgetId;
                pairedWidgetTitle = res.data.title || pairedWidgetTitle || pairedWidgetId;
                WidgetManager.addPairedWidget(pairedWidgetId, pairedWidgetTitle);
                setStatus('Paired with City widget: ' + pairedWidgetTitle, 'ok');
            } else if(res.data.status === 'pairing-removed') {
                pairedWidgetId = null;
                setStatus('City pairing removed', 'warn');
            }
        } else {
            setStatus('City API response received: ' + (res.topic || 'unknown'), 'ok');
        }
    }
    function reject(res) {
        if(!isForThisWidget(res)) return;
        log('xCity.catch:', res);
        setStatus('City API error: ' + (res && (res.error || res.message || res.topic) || 'unknown'), 'crit');
    }
    function legacyReturn(topic) {
        return function(res) { log(topic + 'Return:', res); setStatus(topic + ' returned from City', 'ok'); };
    }
    function setup(api, onStatus, onLog) {
        PlatformAPI = api;
        statusCallback = onStatus || statusCallback;
        logCallback = onLog || logCallback;
        WidgetManager.refreshTabWidgetList();
        try {
            PlatformAPI.unsubscribe('xCity.resolve');
            PlatformAPI.unsubscribe('xCity.catch');
            PlatformAPI.subscribe('xCity.resolve', resolve);
            PlatformAPI.subscribe('xCity.catch', reject);
            ['Add3DPOI','AddLine','AddPolygon','RemoveContent','GetSelectedItems','BufferQuery','ConvertCoordinates','GetGroundHeight','GetTerrainHeight','SelectObject'].forEach(function(t){
                try { PlatformAPI.unsubscribe('3DEXPERIENCity.' + t + 'Return'); PlatformAPI.subscribe('3DEXPERIENCity.' + t + 'Return', legacyReturn('3DEXPERIENCity.' + t)); } catch(e) {}
            });
            setStatus('City API V2 + legacy subscriptions ready', 'ok');
        } catch(e) { setStatus('Subscription setup failed: ' + e.message, 'crit'); }
    }
    function autoPairCandidate() {
        var candidates = WidgetManager.getSameTabWidgets();
        if(candidates && candidates.length) {
            var preferred = null;
            for(var i=0;i<candidates.length;i++) {
                var title = (candidates[i].title || candidates[i].name || '').toLowerCase();
                if(title.indexOf('geospatial')>=0 || title.indexOf('city')>=0 || title.indexOf('3d')>=0 || title.indexOf('globe')>=0) { preferred = candidates[i]; break; }
            }
            preferred = preferred || candidates[0];
            pairedWidgetId = preferred.id;
            pairedWidgetTitle = preferred.title || preferred.name || preferred.id;
            WidgetManager.addPairedWidget(pairedWidgetId, pairedWidgetTitle);
            setStatus('Auto-targeted City widget: ' + pairedWidgetTitle, 'warn');
            return preferred;
        }
        setStatus('No City widget found in same dashboard tab', 'crit');
        return null;
    }
    function getTargetId() { if(!pairedWidgetId) autoPairCandidate(); return pairedWidgetId; }
    function request(topic, data) {
        if(!PlatformAPI) { setStatus('PlatformAPI unavailable. Open inside 3DEXPERIENCE dashboard.', 'crit'); return null; }
        var req = { messageId: uuid(), publisher: widget.id };
        if(topic !== 'ping' && topic !== 'pair') {
            req.widgetId = getTargetId();
            if(!req.widgetId) { setStatus('No City widget paired. Add Geospatial Design/3D City in same dashboard tab and click Pair.', 'crit'); return null; }
        }
        if(isObj(data)) req.data = data;
        pending[req.messageId] = {topic:topic, timestamp:new Date().toISOString()};
        log('publish xCity.' + topic + ':', req);
        PlatformAPI.publish('xCity.' + topic, req);
        setStatus('Request sent: xCity.' + topic, 'warn');
        return req;
    }
    function legacy(topic, data) {
        if(!PlatformAPI) { setStatus('PlatformAPI unavailable for legacy topic.', 'crit'); return null; }
        log('publish 3DEXPERIENCity.' + topic + ':', data || {});
        PlatformAPI.publish('3DEXPERIENCity.' + topic, data || {});
        setStatus('Legacy City request sent: ' + topic, 'warn');
        return data;
    }

    function fc(features) { return { type:'FeatureCollection', features: features || [] }; }
    function pointFeature(lon, lat, z, props) { return { type:'Feature', properties: props || {}, geometry:{ type:'Point', coordinates:[num(lon), num(lat), z || 3] } }; }
    function lineFeature(coords, props) { return { type:'Feature', properties: props || {}, geometry:{ type:'LineString', coordinates: coords } }; }
    function polygonFeature(coords, props) { return { type:'Feature', properties: props || {}, geometry:{ type:'Polygon', coordinates:[coords] } }; }
    function wgs84Options() { return { projection: { from:'WGS84', preserveElevation:true } }; }
    function folder(name) { return { id:FOLDER_ID, name:name || 'DJB Synthetic City Overlay', parentID:'root' }; }

    function addPoiLayer(layerId, layerName, features, styleClass, color) {
        if(!features.length) { log('No POI features for ' + layerName); return; }
        var payload = {
            widgetID: widget.id,
            geojson: fc(features),
            layer: { id: layerId, name: layerName, selectable:true, visible:true, folder: folder() },
            render: {
                anchor: true,
                anchorWidth: 2,
                scale: styleClass === 'critical' ? 1.4 : 1,
                shape: 'sphere',
                styleClass: styleClass || 'poi3D',
                switchDistance: 0,
                minDist: 0,
                maxDist: 10000000,
                opacity: 1,
                color: color || 'rgb(0,174,239)'
            },
            options: wgs84Options()
        };
        request('add3DPOI', payload);
        legacy('Add3DPOI', payload);
    }
    function addLineLayer(layerId, layerName, features, color, width) {
        if(!features.length) { log('No line features for ' + layerName); return; }
        var payload = {
            widgetID: widget.id,
            geojson: fc(features),
            layer: { id: layerId, name: layerName, offset:[0,0,2], selectable:true, visible:true, folder: folder() },
            folder: folder(),
            render: { renderMode:'occluded', color: color || 'rgb(0,174,239)', minWidth: width || 4, minDist:0, maxDist:10000000, lineWidth: width || 5, opacity:1 },
            options: wgs84Options()
        };
        request('addLine', payload);
        legacy('AddLine', payload);
    }
    function addPolygonLayer(layerId, layerName, features, color) {
        if(!features.length) return;
        var payload = {
            widgetID: widget.id,
            geojson: fc(features),
            layer: { id: layerId, name: layerName, offset:[0,0,1], selectable:true, visible:true, folder: folder() },
            render: { renderMode:'overlay', color: color || 'rgb(255,204,0)', minWidth:2, minDist:0, maxDist:10000000, lineWidth:3, opacity:0.35 },
            options: wgs84Options()
        };
        request('addPolygon', payload);
        legacy('AddPolygon', payload);
    }
    function severityColor(sev) {
        sev = str(sev).toLowerCase();
        if(sev.indexOf('critical') >= 0) return 'rgb(220,38,38)';
        if(sev.indexOf('warning') >= 0 || sev.indexOf('high') >= 0) return 'rgb(245,158,11)';
        return 'rgb(0,174,239)';
    }
    function getAssetRows(data){ return data && data['01_asset_master.csv'] || []; }
    function getAlertRows(data){ return data && data['09_alert_log.csv'] || []; }

    function renderSyntheticOverlay(data, selectedZone) {
        clearGeneratedOverlays();
        var assets = getAssetRows(data).filter(function(r){ return !selectedZone || selectedZone === 'ALL' || r.Zone_ID === selectedZone; });
        var alerts = getAlertRows(data).filter(function(r){ return !selectedZone || selectedZone === 'ALL' || r.Zone_ID === selectedZone; });
        var criticalAlerts = alerts.filter(function(r){ return str(r.Alarm_Status).toLowerCase() === 'critical' || str(r.Alert_Message).toLowerCase().indexOf('critical') >= 0; }).slice(0, 80);
        var warningAlerts = alerts.filter(function(r){ return str(r.Alarm_Status).toLowerCase() === 'warning'; }).slice(0, 80);

        var assetPts = assets.filter(function(r){ return r.Longitude && r.Latitude && r.Asset_Type !== 'Pipeline'; }).slice(0, 120).map(function(r){
            return pointFeature(r.Longitude, r.Latitude, 4, {
                STRID: r.GIS_Feature_ID || r.Asset_ID,
                NAME: r.Asset_ID + ' ' + r.Asset_Type,
                ASSET_ID: r.Asset_ID,
                SENSOR_ID: r.Associated_Sensor_ID,
                ZONE_ID: r.Zone_ID,
                TYPE: r.Asset_Type,
                STYLECLASS: 'poi3D'
            });
        });
        var critPts = criticalAlerts.map(function(r){ return pointFeature(r.Longitude, r.Latitude, 10, {
            STRID: r.Alert_ID || r.Asset_ID, NAME: 'CRITICAL ' + (r.Asset_ID || r.Network_Element_ID), ALERT_ID: r.Alert_ID, ASSET_ID: r.Asset_ID,
            SENSOR_ID: r.Sensor_ID, PIPE_ID: r.Network_Element_ID, ZONE_ID: r.Zone_ID, PARAMETER: r.Parameter, VALUE: r.Value, MESSAGE: r.Alert_Message, STYLECLASS:'poi3D'
        }); });
        var warnPts = warningAlerts.map(function(r){ return pointFeature(r.Longitude, r.Latitude, 8, {
            STRID: r.Alert_ID || r.Asset_ID, NAME: 'WARNING ' + (r.Asset_ID || r.Network_Element_ID), ALERT_ID: r.Alert_ID, ASSET_ID: r.Asset_ID,
            SENSOR_ID: r.Sensor_ID, PIPE_ID: r.Network_Element_ID, ZONE_ID: r.Zone_ID, PARAMETER: r.Parameter, VALUE: r.Value, MESSAGE: r.Alert_Message, STYLECLASS:'poi3D'
        }); });

        addPoiLayer('DJB_ASSET_SENSOR_POINTS', 'DJB Assets / Sensors from synthetic CSV', assetPts, 'asset', 'rgb(0,174,239)');
        addPoiLayer('DJB_CRITICAL_ALERT_POINTS', 'DJB Critical Alerts from synthetic CSV', critPts, 'critical', 'rgb(220,38,38)');
        addPoiLayer('DJB_WARNING_ALERT_POINTS', 'DJB Warning Alerts from synthetic CSV', warnPts, 'warning', 'rgb(245,158,11)');

        var byZone = {};
        assets.filter(function(r){ return r.Asset_Type === 'Pipeline' && r.Longitude && r.Latitude; }).forEach(function(r){
            byZone[r.Zone_ID] = byZone[r.Zone_ID] || [];
            byZone[r.Zone_ID].push(r);
        });
        var lineFeatures = [];
        Object.keys(byZone).forEach(function(zone){
            var rows = byZone[zone].sort(function(a,b){ return str(a.Network_Element_ID).localeCompare(str(b.Network_Element_ID)); });
            if(rows.length < 2) return;
            var coords = rows.map(function(r){ return [num(r.Longitude), num(r.Latitude), 3]; });
            lineFeatures.push(lineFeature(coords, { STRID:'DJB_PIPELINE_' + zone, NAME:'Synthetic pipeline backbone ' + zone, ZONE_ID:zone, SOURCE:'Synthetic telemetry asset master' }));
        });
        addLineLayer('DJB_SYNTHETIC_PIPELINES', 'DJB Synthetic Pipeline Network', lineFeatures, 'rgb(0,174,239)', 7);
        addAOI();
        log('Rendered synthetic overlay: assets=' + assetPts.length + ', critical=' + critPts.length + ', warning=' + warnPts.length + ', pipelines=' + lineFeatures.length);
    }

    function highlightFeature(feature) {
        if(!feature) { setStatus('No row selected for highlight', 'crit'); return; }
        var id = feature.gis_feature_id || feature.Geospatial_Feature_ID || feature.GIS_Feature_ID || feature.Network_Element_ID || feature.Asset_ID || feature.Sensor_ID || feature.id || 'DJB feature';
        var lon = parseFloat(feature.Longitude || feature.longitude || feature.LON || feature.lon);
        var lat = parseFloat(feature.Latitude || feature.latitude || feature.LAT || feature.lat);
        var title = id;
        var severity = feature.Severity || feature.Alarm_Status || feature.Status || 'Info';
        if(!isNaN(lon) && !isNaN(lat)) {
            addPoiLayer('DJB_SELECTED_FEATURE', 'DJB Selected Feature', [pointFeature(lon, lat, 14, {STRID:'DJB_SELECTED_'+title, NAME:title, SEVERITY:severity, ASSET_ID:feature.Asset_ID, SENSOR_ID:feature.Sensor_ID, PIPE_ID:feature.Network_Element_ID, ZONE_ID:feature.Zone_ID, MESSAGE:feature.Alert_Message || feature.Recommended_Action || ''})], 'selected', severityColor(severity));
            request('moveTo', { position: { longitude: lon, latitude: lat, altitude: 200 }, duration: 1.5, properties: feature });
        } else {
            request('selectFeature', { featureId:id, properties:feature });
        }
    }
    function addDemoLine(id, coordinates, props) { addLineLayer(id || 'DJB_DEMO_PIPELINE', (props && props.name) || 'Demo visible pipeline', [lineFeature(coordinates, props || {name:id})], 'rgb(0,174,239)', 7); }
    function addDemoPolygon(id, coordinates, props) { addPolygonLayer(id || 'DJB_AOI_SONIA_VIHAR', (props && props.name) || 'Sonia Vihar AOI', [polygonFeature(coordinates, props || {name:id})], 'rgb(255,204,0)'); }
    function addAOI(){
        addDemoPolygon('DJB_AOI_SONIA_VIHAR', [[77.228493,28.696644,2],[77.281486,28.696644,2],[77.281486,28.743358,2],[77.228493,28.743358,2],[77.228493,28.696644,2]], { STRID:'DJB_AOI_SONIA_VIHAR', NAME:'Sonia Vihar AOI', CRS:'EPSG:32644', AREA_SQKM:'25.28' });
    }
    function clearGeneratedOverlays() {
        ['DJB_SYNTHETIC_CITY_OVERLAY','DJB_ASSET_SENSOR_POINTS','DJB_CRITICAL_ALERT_POINTS','DJB_WARNING_ALERT_POINTS','DJB_SYNTHETIC_PIPELINES','DJB_SELECTED_FEATURE','DJB_AOI_SONIA_VIHAR'].forEach(function(id){ legacy('RemoveContent', id); });
        request('removeContent', { ids:['DJB_SYNTHETIC_CITY_OVERLAY','DJB_ASSET_SENSOR_POINTS','DJB_CRITICAL_ALERT_POINTS','DJB_WARNING_ALERT_POINTS','DJB_SYNTHETIC_PIPELINES','DJB_SELECTED_FEATURE','DJB_AOI_SONIA_VIHAR'] });
    }
    return {
        setup:setup, request:request, legacy:legacy, ping:function(){request('ping');}, pair:function(){autoPairCandidate(); request('pair',{title:widget.title});}, autoPair:autoPairCandidate, getTargetId:getTargetId,
        highlightFeature:highlightFeature, addDemoLine:addDemoLine, addDemoPolygon:addDemoPolygon, addAOI:addAOI, renderSyntheticOverlay:renderSyntheticOverlay, clearGeneratedOverlays:clearGeneratedOverlays, status:function(){return lastStatus;}
    };
});
