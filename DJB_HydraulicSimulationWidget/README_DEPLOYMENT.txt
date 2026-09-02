Hydraulic Simulation Widget
===========================

Production-ready DJB 3DEXPERIENCE widget, refactored to the City API V2 custom widget template style.

Deployment:
1. Host this folder on an HTTPS endpoint trusted by the 3DEXPERIENCE tenant.
2. Register info.xml/index.html through the platform/widget deployment process.
3. Add this widget and a Geospatial Design / 3D City widget on the same dashboard tab.
4. Click Pair, then Ping. Confirm xCity.resolve in the log.
5. Use Run > Highlight selected / Draw AOI / Draw demo pipeline to confirm interaction with City.

Production gates included:
- UWA widget shell
- RequireJS/AMD modules
- City API V2 request envelope
- xCity.resolve/xCity.catch subscriptions
- Legacy 3DEXPERIENCity fallback topics
- CSV schema validation
- Semantic telemetry-to-GIS mapping
- Audit/status log in the UI

For final production, replace bundled CSVs with PCS-governed files or an approved secure service.
