define('Modules/SchemaValidator', [], function(){
    var schema = {
        '03_operational_telemetry_hourly.csv':['Timestamp','Sensor_ID','Asset_ID','Network_Element_ID','Latitude','Longitude','Parameter','Value','Unit','Quality_Status','Alarm_Status','Source_System','Zone_ID'],
        '02_semantic_mapping.csv':['Sensor_Tag','Asset_ID','Geospatial_Feature_ID','Network_Element_ID','Dymola_Component','FMU_Variable','Parameter','Zone_ID'],
        '09_alert_log.csv':['Alert_ID','Timestamp','Sensor_ID','Asset_ID','Network_Element_ID','Zone_ID','Parameter','Value','Alarm_Status','Latitude','Longitude'],
        '05_nrw_zone_daily.csv':['Date','Zone_ID','System_Input_m3','Billed_Authorized_Consumption_m3','NRW_Volume_m3','NRW_Percentage'],
        '06_leak_detection_events.csv':['Timestamp','Zone_ID','Network_Element_ID','Actual_Value','Expected_Value','Deviation','Leak_Suspicion_Score','Severity'],
        '07_water_quality_daily_summary.csv':['Date','Sensor_ID','Asset_ID','Network_Element_ID','Zone_ID','Parameter','Avg_Value','Warning_Count','Critical_Count','Status'],
        '08_hydraulic_simulation_actual_vs_predicted.csv':['Timestamp','Scenario_ID','Zone_ID','Network_Element_ID','Parameter','Actual_Value','Predicted_Value','Deviation','Status']
    };
    function validate(file, rows) {
        var req=schema[file] || []; var res={file:file, ok:true, missing:[], rowCount:rows?rows.length:0};
        if(!rows || !rows.length) { res.ok=false; res.missing=req.slice(); return res; }
        req.forEach(function(c){ if(!(c in rows[0])) {res.ok=false; res.missing.push(c);} });
        return res;
    }
    return { validate:validate, schemas:schema };
});
