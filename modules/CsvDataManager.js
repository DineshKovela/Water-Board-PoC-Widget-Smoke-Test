define('Modules/CsvDataManager', [], function() {
    function parseCSV(text) {
        var rows=[], row=[], cur='', q=false;
        for(var i=0;i<text.length;i++){
            var c=text[i], n=text[i+1];
            if(c==='"' && q && n==='"'){ cur+='"'; i++; }
            else if(c==='"'){ q=!q; }
            else if(c===',' && !q){ row.push(cur); cur=''; }
            else if((c==='\n' || c==='\r') && !q){ if(c==='\r' && n==='\n') i++; row.push(cur); if(row.some(function(v){return v!=='';})) rows.push(row); row=[]; cur=''; }
            else cur+=c;
        }
        row.push(cur); if(row.some(function(v){return v!=='';})) rows.push(row);
        if(!rows.length) return [];
        var headers=rows.shift().map(function(h){ return String(h).trim(); });
        return rows.map(function(r){ var o={}; headers.forEach(function(h,idx){ o[h]=r[idx]===undefined?'':r[idx]; }); return o; });
    }
    function load(path) {
        return new Promise(function(resolve,reject){
            var xhr = new XMLHttpRequest();
            xhr.open('GET', path, true);
            xhr.onreadystatechange = function(){ if(xhr.readyState===4){ if(xhr.status===200 || xhr.status===0) resolve(parseCSV(xhr.responseText)); else reject(new Error('Cannot load ' + path + ' status ' + xhr.status)); } };
            xhr.onerror = function(){ reject(new Error('Network error loading ' + path)); };
            xhr.send();
        });
    }
    function loadMany(files, base) {
        var out = {};
        return Promise.all(files.map(function(f){ return load((base || 'assets/data/') + f).then(function(rows){ out[f]=rows; }); })).then(function(){ return out; });
    }
    return { parseCSV:parseCSV, load:load, loadMany:loadMany };
});
