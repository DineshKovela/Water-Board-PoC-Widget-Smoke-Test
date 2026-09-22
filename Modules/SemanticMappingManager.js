define('Modules/SemanticMappingManager', [], function(){
    var mapping=[];
    function setRows(rows){ mapping = rows || []; }
    function bySensor(sensorId){ return mapping.find(function(r){ return r.Sensor_Tag===sensorId; }); }
    function byNetworkElement(id){ return mapping.find(function(r){ return r.Network_Element_ID===id || r.Asset_ID===id || r.Geospatial_Feature_ID===id; }); }
    function enrich(row){ var m = bySensor(row.Sensor_ID || row.Sensor_Tag) || byNetworkElement(row.Network_Element_ID || row.Asset_ID); if(m){ for(var k in m){ if(!row[k]) row[k]=m[k]; } row.gis_feature_id=m.Geospatial_Feature_ID; } return row; }
    return { setRows:setRows, bySensor:bySensor, byNetworkElement:byNetworkElement, enrich:enrich };
});
