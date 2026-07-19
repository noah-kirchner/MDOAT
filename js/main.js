/* ============================================================
   MDOAT — Milwaukee Density Opportunity Analysis Tool
   Geography 576 | Noah Kirchner
   main.js — Phase 2 scaffold: nav + map init
   ============================================================ */

/* --- Layer URLs ------------------------------------------- */
const LAYERS = {
  parcels:      "https://milwaukeemaps.milwaukee.gov/arcgis/rest/services/property/parcels_mprop/FeatureServer/2",
  vacantLots:   "https://milwaukeemaps.milwaukee.gov/arcgis/rest/services/property/parcels_mprop/FeatureServer/17",
  landUse:      "https://milwaukeemaps.milwaukee.gov/arcgis/rest/services/property/parcels_mprop/FeatureServer/21",
  foreclosedCity: "https://milwaukeemaps.milwaukee.gov/arcgis/rest/services/property/parcels_mprop/FeatureServer/13",
  foreclosedBank: "https://milwaukeemaps.milwaukee.gov/arcgis/rest/services/property/parcels_mprop/FeatureServer/23",
  zoning:       "https://milwaukeemaps.milwaukee.gov/arcgis/rest/services/planning/zoning/MapServer/11",
  neighborhoods:"https://milwaukeemaps.milwaukee.gov/arcgis/rest/services/planning/special_districts/MapServer/4",
  annotations:  "https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/MDOAT_UserAnnotations/FeatureServer"
};

/* --- Nav -------------------------------------------------- */
const navBtns = document.querySelectorAll(".nav-btn");
const views   = document.querySelectorAll(".app-view");

navBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.view;

    navBtns.forEach(b => b.classList.remove("active"));
    views.forEach(v => v.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById("view-" + target).classList.add("active");
  });
});

/* --- Map -------------------------------------------------- */
require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/layers/MapImageLayer",
  "esri/widgets/Search",
  "esri/widgets/Expand",
  "esri/widgets/LayerList",
  "esri/widgets/BasemapGallery",
  "esri/widgets/Legend",
  "esri/widgets/Locate"
], function(
  Map, MapView, FeatureLayer, MapImageLayer,
  Search, Expand, LayerList, BasemapGallery, Legend, Locate
) {

  /* -- Parcel layer (core) -- */
  const parcelLayer = new FeatureLayer({
    url: LAYERS.parcels,
    title: "Parcels (MPROP)",
    outFields: [
      "TAXKEY", "OWNER_NAME_1",
      "HOUSE_NR_LO", "STREET", "STTYPE",
      "ZONING", "LAND_USE", "LAND_USE_GP",
      "C_A_LAND", "C_A_IMPRV", "C_A_TOTAL",
      "TAX_DELQ", "RAZE_STATUS", "BI_VIOL",
      "YR_BUILT", "BLDG_AREA", "LOT_AREA", "NR_UNITS"
    ],
    popupTemplate: {
      title: "Parcel #{TAXKEY}",
      content: [
        {
          type: "fields",
          fieldInfos: [
            { fieldName: "OWNER_NAME_1", label: "Owner" },
            { fieldName: "ZONING",       label: "Zoning Code" },
            { fieldName: "LAND_USE",     label: "Land Use Code" },
            { fieldName: "C_A_LAND",     label: "Assessed Land Value" },
            { fieldName: "C_A_IMPRV",    label: "Assessed Improvement Value" },
            { fieldName: "C_A_TOTAL",    label: "Total Assessed Value" },
            { fieldName: "TAX_DELQ",     label: "Years Tax Delinquent" },
            { fieldName: "RAZE_STATUS",  label: "Raze Status" },
            { fieldName: "YR_BUILT",     label: "Year Built" },
            { fieldName: "LOT_AREA",     label: "Lot Area (sq ft)" },
            { fieldName: "NR_UNITS",     label: "Dwelling Units" }
          ]
        }
      ]
    }
  });

  /* -- Vacant lots layer -- */
  const vacantLayer = new FeatureLayer({
    url: LAYERS.vacantLots,
    title: "Vacant Lots",
    visible: true
  });

  /* -- User annotations write layer -- */
  const annotationLayer = new FeatureLayer({
    url: LAYERS.annotations,
    title: "Tagged Opportunities",
    outFields: ["*"]
  });

  /* -- Map -- */
  const map = new Map({
    basemap: "gray-vector",
    layers: [parcelLayer, vacantLayer, annotationLayer]
  });

  /* -- View -- */
  const view = new MapView({
    container: "map-container",
    map: map,
    center: [-87.9065, 43.0389], // Milwaukee
    zoom: 12
  });

  /* -- Search widget -- */
  const search = new Search({ view });
  view.ui.add(search, "top-left");

  /* -- Layer list -- */
  const layerListExpand = new Expand({
    view,
    content: new LayerList({ view }),
    expandIconClass: "esri-icon-layers",
    expandTooltip: "Layers"
  });
  view.ui.add(layerListExpand, "top-right");

  /* -- Basemap gallery -- */
  const basemapExpand = new Expand({
    view,
    content: new BasemapGallery({ view }),
    expandIconClass: "esri-icon-basemap",
    expandTooltip: "Basemap"
  });
  view.ui.add(basemapExpand, "top-right");

  /* -- Legend -- */
  const legendExpand = new Expand({
    view,
    content: new Legend({ view }),
    expandIconClass: "esri-icon-legend",
    expandTooltip: "Legend"
  });
  view.ui.add(legendExpand, "top-right");

  /* -- Locate (mobile GPS) -- */
  const locate = new Locate({ view });
  view.ui.add(locate, "bottom-right");

}); // end require
