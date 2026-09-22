define('Modules/WidgetManager', [], function() {
    var pairedWidgets = [];
    var sameTabWidgets = [];
    function save() { try { widget.setValue('pairedWidgets', JSON.stringify(pairedWidgets)); } catch(e) {} }
    function restore() { try { pairedWidgets = JSON.parse(widget.getValue('pairedWidgets') || '[]'); } catch(e) { pairedWidgets = []; } }
    restore();
    return {
        refreshTabWidgetList: function() {
            sameTabWidgets = [];
            try {
                var instances = window.top && window.top.UWA && window.top.UWA.Widgets && window.top.UWA.Widgets.instances;
                var currentTabId = widget && widget._widget && widget._widget.tab && widget._widget.tab.id;
                for(var k in instances) {
                    var w = instances[k];
                    if(!w || w.id === widget.id) continue;
                    if(!currentTabId || (w._widget && w._widget.tab && w._widget.tab.id === currentTabId)) {
                        sameTabWidgets.push({id:w.id, title:w.title || (w.getTitle && w.getTitle()) || w.id, name:w.name || ''});
                    }
                }
            } catch(e) { console.warn('Unable to scan same tab widgets', e); }
            return sameTabWidgets;
        },
        getSameTabWidgets: function(){ return sameTabWidgets; },
        addPairedWidget: function(id,title){ if(!id) return; for(var i=0;i<pairedWidgets.length;i++){ if(pairedWidgets[i].id===id) return; } pairedWidgets.push({id:id,title:title || id}); save(); },
        removePairedWidget: function(id){ pairedWidgets = pairedWidgets.filter(function(w){return w.id!==id;}); save(); },
        getPairedWidgets: function(){ return pairedWidgets; },
        isPaired: function(id){ return pairedWidgets.some(function(w){return w.id===id;}); }
    };
});
