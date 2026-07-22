/* ============================================================
   MDOAT — Milwaukee Density Opportunity Analysis Tool
   Geography 576 | Noah Kirchner
   main.js — Phase 3: renderer, popup action, annotation form
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
  "esri/widgets/Search",
  "esri/widgets/Expand",
  "esri/widgets/LayerList",
  "esri/widgets/BasemapGallery",
  "esri/widgets/Legend",
  "esri/widgets/Locate",
  "esri/core/reactiveUtils"
], function(
  Map, MapView, FeatureLayer,
  Search, Expand, LayerList, BasemapGallery, Legend, Locate,
  reactiveUtils
) {

  /* -- Renderers -------------------------------------------- */

  // Parcel renderer: color by land use group
  // LAND_USE_GP codes relevant to MDOAT:
  //   2 = Residential (single family)
  //   3 = Residential (multi family)
  //   4 = Commercial
  //   7 = Industrial
  //   8 = Surface parking / transportation
  //   9 = Vacant land
  const parcelRenderer = {
    type: "unique-value",
    field: "LAND_USE_GP",
    defaultSymbol: {
      type: "simple-fill",
      color: [200, 200, 200, 0.4],
      outline: { color: [180, 180, 180, 0.5], width: 0.3 }
    },
    uniqueValueInfos: [
      {
        value: 8,
        label: "Surface Parking / Transportation",
        symbol: {
          type: "simple-fill",
          color: [214, 81, 60, 0.75],
          outline: { color: [180, 50, 30, 0.8], width: 0.4 }
        }
      },
      {
        value: 9,
        label: "Vacant Land",
        symbol: {
          type: "simple-fill",
          color: [244, 165, 40, 0.75],
          outline: { color: [200, 130, 20, 0.8], width: 0.4 }
        }
      },
      {
        value: 2,
        label: "Residential — Single Family",
        symbol: {
          type: "simple-fill",
          color: [180, 210, 240, 0.45],
          outline: { color: [140, 180, 220, 0.5], width: 0.3 }
        }
      },
      {
        value: 3,
        label: "Residential — Multi Family",
        symbol: {
          type: "simple-fill",
          color: [100, 160, 220, 0.5],
          outline: { color: [70, 130, 200, 0.6], width: 0.3 }
        }
      },
      {
        value: 4,
        label: "Commercial",
        symbol: {
          type: "simple-fill",
          color: [160, 120, 200, 0.5],
          outline: { color: [130, 90, 180, 0.6], width: 0.3 }
        }
      },
      {
        value: 7,
        label: "Industrial",
        symbol: {
          type: "simple-fill",
          color: [120, 120, 120, 0.45],
          outline: { color: [90, 90, 90, 0.5], width: 0.3 }
        }
      }
    ]
  };

  // Annotation renderer: priority tier color
  const annotationRenderer = {
    type: "unique-value",
    field: "PRIORITY",
    uniqueValueInfos: [
      {
        value: "High",
        label: "High Priority",
        symbol: {
          type: "simple-marker",
          color: [214, 40, 40, 0.9],
          size: 10,
          outline: { color: [255, 255, 255], width: 1.5 }
        }
      },
      {
        value: "Medium",
        label: "Medium Priority",
        symbol: {
          type: "simple-marker",
          color: [244, 165, 40, 0.9],
          size: 10,
          outline: { color: [255, 255, 255], width: 1.5 }
        }
      },
      {
        value: "Low",
        label: "Low Priority",
        symbol: {
          type: "simple-marker",
          color: [60, 160, 80, 0.9],
          size: 10,
          outline: { color: [255, 255, 255], width: 1.5 }
        }
      }
    ]
  };

  /* -- Parcel layer (core) -- */
  const parcelLayer = new FeatureLayer({
    url: LAYERS.parcels,
    title: "Parcels (MPROP)",
    renderer: parcelRenderer,
    outFields: [
      "TAXKEY", "OWNER_NAME_1",
      "HOUSE_NR_LO", "STREET", "STTYPE",
      "ZONING", "LAND_USE", "LAND_USE_GP",
      "C_A_LAND", "C_A_IMPRV", "C_A_TOTAL",
      "TAX_DELQ", "RAZE_STATUS", "BI_VIOL",
      "YR_BUILT", "BLDG_AREA", "LOT_AREA", "NR_UNITS"
    ],
    popupTemplate: {
      title: "{HOUSE_NR_LO} {STREET} {STTYPE} — Parcel #{TAXKEY}",
      content: [
        {
          type: "fields",
          fieldInfos: [
            { fieldName: "OWNER_NAME_1", label: "Owner" },
            { fieldName: "ZONING",       label: "Zoning Code" },
            { fieldName: "LAND_USE_GP",  label: "Land Use Group" },
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
    renderer: annotationRenderer,
    outFields: ["*"],
    popupTemplate: {
      title: "Tagged Site — {TAXKEY}",
      content: [
        {
          type: "fields",
          fieldInfos: [
            { fieldName: "PRIORITY",      label: "Priority Tier" },
            { fieldName: "NOTES",         label: "Notes" },
            { fieldName: "SUBMITTED_BY",  label: "Submitted By" },
            { fieldName: "CREATED_DATE",  label: "Date Tagged" }
          ]
        }
      ]
    }
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
    center: [-87.9065, 43.0389],
    zoom: 12
  });

  /* -- Flag button: show/hide on parcel selection ----------- */
  let selectedTaxkey = null;
  let selectedAddress = null;
  const flagBtn = document.getElementById("flag-btn");

  // Flag button opens modal
  flagBtn.addEventListener("click", () => {
    if (!selectedTaxkey) return;

    document.getElementById("modal-parcel-label").textContent =
      `${selectedAddress} — Parcel #${selectedTaxkey}`;

    document.getElementById("priority-select").value = "";
    document.getElementById("notes-input").value = "";
    document.getElementById("submitter-input").value = "";
    document.getElementById("modal-status").textContent = "";

    document.getElementById("annotation-modal").classList.remove("hidden");
    view.popup.close();
    flagBtn.classList.add("hidden");
  });

  /* -- Widgets and watchers — after view is ready ----------- */
  view.when(() => {

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

    /* -- Watch for parcel popup selection (SDK 4.29+) -- */
    reactiveUtils.watch(
      () => view.popup.selectedFeature,
      feature => {
        if (feature && feature.layer === parcelLayer) {
          const attrs = feature.attributes;
          selectedTaxkey = attrs.TAXKEY;

          const parts = [
            attrs.HOUSE_NR_LO,
            attrs.STREET,
            attrs.STTYPE
          ].filter(Boolean);
          selectedAddress = parts.length > 0
            ? parts.join(" ")
            : `Parcel #${selectedTaxkey}`;

          flagBtn.classList.remove("hidden");
        } else {
          flagBtn.classList.add("hidden");
          selectedTaxkey = null;
          selectedAddress = null;
        }
      }
    );

  }); // end view.when

  /* -- Modal controls -- */
  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal-cancel").addEventListener("click", closeModal);

  function closeModal() {
    document.getElementById("annotation-modal").classList.add("hidden");
    selectedTaxkey = null;
  }

  /* -- Annotation submit -- */
  document.getElementById("modal-submit").addEventListener("click", () => {
    const priority  = document.getElementById("priority-select").value;
    const notes     = document.getElementById("notes-input").value.trim();
    const submitter = document.getElementById("submitter-input").value.trim();
    const status    = document.getElementById("modal-status");

    if (!priority) {
      status.textContent = "Please select a priority tier.";
      status.style.color = "#c0392b";
      return;
    }

    if (!selectedTaxkey) {
      status.textContent = "No parcel selected. Please try again.";
      status.style.color = "#c0392b";
      return;
    }

    const newFeature = {
      attributes: {
        TAXKEY:       selectedTaxkey,
        PRIORITY:     priority,
        NOTES:        notes,
        SUBMITTED_BY: submitter || "Anonymous",
        CREATED_DATE: Date.now()
      }
    };

    annotationLayer.applyEdits({ addFeatures: [newFeature] }).then(result => {
      if (result.addFeatureResults[0].error) {
        status.textContent = "Submission failed. Please try again.";
        status.style.color = "#c0392b";
      } else {
        status.textContent = "Site flagged successfully.";
        status.style.color = "#27ae60";
        setTimeout(closeModal, 1200);
      }
    }).catch(() => {
      status.textContent = "Network error. Please try again.";
      status.style.color = "#c0392b";
    });
  });

}); // end require
