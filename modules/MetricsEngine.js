define('Modules/MetricsEngine', [], function(){
    function num(v){ var n=parseFloat(v); return isNaN(n)?0:n; }
    function between(row, from, to){ var d=row.Timestamp || row.Date || row.Start || ''; if(from && d.substring(0,10)<from) return false; if(to && d.substring(0,10)>to) return false; return true; }
    function byZone(row, zone){ return !zone || zone==='ALL' || row.Zone_ID===zone; }
    function filter(rows, zone, from, to){ return (rows||[]).filter(function(r){ return byZone(r, zone) && between(r, from, to); }); }
    function avg(rows, col){ if(!rows.length) return 0; return rows.reduce(function(a,r){return a+num(r[col]);},0)/rows.length; }
    function sum(rows, col){ return rows.reduce(function(a,r){return a+num(r[col]);},0); }
    function max(rows, col){ return rows.reduce(function(a,r){return Math.max(a,num(r[col]));}, -Infinity); }
    function statusCounts(rows){ var c={Normal:0,Warning:0,Critical:0,Missing:0}; rows.forEach(function(r){ var s=r.Alarm_Status || r.Status || r.Overall_Status || r.Severity || 'Normal'; c[s]=(c[s]||0)+1; }); return c; }
    function zones(rows){ var z={ALL:'ALL'}; (rows||[]).forEach(function(r){ if(r.Zone_ID) z[r.Zone_ID]=r.Zone_ID; }); return Object.keys(z); }
    return {num:num, filter:filter, avg:avg, sum:sum, max:max, statusCounts:statusCounts, zones:zones};
});
