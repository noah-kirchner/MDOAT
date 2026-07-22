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

  /* ============================================================
     PHASE 4 — Query Panel
     ============================================================ */

  // Land use group code → label map
  const LAND_USE_LABELS = {
    2: "Residential — Single Family",
    3: "Residential — Multi Family",
    4: "Commercial",
    7: "Industrial",
    8: "Surface Parking / Transportation",
    9: "Vacant Land"
  };

  /* -- Populate neighborhood dropdown from layer ------------- */
  parcelLayer.load().then(() => {
    const query = parcelLayer.createQuery();
    query.outFields = ["NEIGHBORHOOD"];
    query.returnDistinctValues = true;
    query.returnGeometry = false;
    query.orderByFields = ["NEIGHBORHOOD ASC"];
    query.where = "NEIGHBORHOOD IS NOT NULL AND NEIGHBORHOOD <> ''";

    return parcelLayer.queryFeatures(query);
  }).then(result => {
    const select = document.getElementById("q-neighborhood");
    result.features.forEach(f => {
      const val = f.attributes.NEIGHBORHOOD;
      if (val) {
        const opt = document.createElement("option");
        opt.value = val;
        opt.textContent = val;
        select.appendChild(opt);
      }
    });
  }).catch(err => console.warn("Neighborhood load error:", err));

  /* -- Run query --------------------------------------------- */
  document.getElementById("query-run").addEventListener("click", runQuery);
  document.getElementById("query-reset").addEventListener("click", resetQuery);

  function resetQuery() {
    document.getElementById("q-parcel").value = "";
    document.getElementById("q-neighborhood").value = "";
    document.getElementById("q-zoning").value = "";
    document.getElementById("q-landuse").value = "";
    document.querySelectorAll(".query-toggles input[type=checkbox]")
      .forEach(cb => cb.checked = false);
    document.getElementById("query-tbody").innerHTML = "";
    document.getElementById("query-result-count").textContent = "";
    document.getElementById("query-export").classList.add("hidden");
    document.getElementById("query-msg").textContent =
      "Configure filters above and click Run Query.";
    document.getElementById("query-msg").classList.remove("hidden");
    document.getElementById("query-table-wrap").style.display = "none";
  }

  // Hide table on load
  document.getElementById("query-table-wrap").style.display = "none";

  function runQuery() {
    const parcelInput    = document.getElementById("q-parcel").value.trim();
    const neighborhood   = document.getElementById("q-neighborhood").value;
    const zoningInput    = document.getElementById("q-zoning").value.trim().toUpperCase();
    const landUse        = document.getElementById("q-landuse").value;
    const togVacant      = document.getElementById("tog-vacant").checked;
    const togTaxDelq     = document.getElementById("tog-taxdelq").checked;

    // Build WHERE clause from attribute filters
    const clauses = [];

    if (parcelInput) {
      // Try as TAXKEY first, then partial address match
      if (/^\d{10}$/.test(parcelInput)) {
        clauses.push(`TAXKEY = '${parcelInput}'`);
      } else {
        const escaped = parcelInput.replace(/'/g, "''").toUpperCase();
        clauses.push(`UPPER(STREET) LIKE '%${escaped}%'`);
      }
    }

    if (neighborhood) {
      clauses.push(`NEIGHBORHOOD = '${neighborhood}'`);
    }

    if (zoningInput) {
      clauses.push(`UPPER(ZONING) LIKE '${zoningInput}%'`);
    }

    if (landUse) {
      clauses.push(`LAND_USE_GP = ${landUse}`);
    }

    if (togVacant) {
      // Vacant buildings: RAZE_STATUS > 0 or BI_VIOL is not null
      clauses.push(`(RAZE_STATUS > 0 OR BI_VIOL IS NOT NULL)`);
    }

    if (togTaxDelq) {
      clauses.push(`TAX_DELQ > 0`);
    }

    const where = clauses.length > 0 ? clauses.join(" AND ") : "1=1";

    const msg = document.getElementById("query-msg");
    msg.textContent = "Running query…";
    msg.classList.remove("hidden");
    document.getElementById("query-table-wrap").style.display = "none";
    document.getElementById("query-result-count").textContent = "";
    document.getElementById("query-export").classList.add("hidden");

    const q = parcelLayer.createQuery();
    q.where = where;
    q.outFields = [
      "TAXKEY", "HOUSE_NR_LO", "STREET", "STTYPE",
      "ZONING", "LAND_USE_GP",
      "C_A_LAND", "C_A_IMPRV",
      "YR_BUILT", "TAX_DELQ", "OWNER_NAME_1"
    ];
    q.returnGeometry = false;
    q.num = 500; // cap at 500 results

    parcelLayer.queryFeatures(q).then(result => {
      const features = result.features;

      if (features.length === 0) {
        msg.textContent = "No parcels matched your query. Try broadening your filters.";
        return;
      }

      // Build table
      const tbody = document.getElementById("query-tbody");
      tbody.innerHTML = "";

      features.forEach(f => {
        const a = f.attributes;
        const addrParts = [a.HOUSE_NR_LO, a.STREET, a.STTYPE].filter(Boolean);
        const addr = addrParts.length > 0 ? addrParts.join(" ") : "—";
        const luLabel = LAND_USE_LABELS[a.LAND_USE_GP] || a.LAND_USE_GP || "—";

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${addr}</td>
          <td>${a.TAXKEY || "—"}</td>
          <td>${a.ZONING || "—"}</td>
          <td>${luLabel}</td>
          <td>${a.C_A_LAND ? "$" + Number(a.C_A_LAND).toLocaleString() : "—"}</td>
          <td>${a.C_A_IMPRV ? "$" + Number(a.C_A_IMPRV).toLocaleString() : "—"}</td>
          <td>${a.YR_BUILT || "—"}</td>
          <td>${a.TAX_DELQ || "0"}</td>
          <td>${a.OWNER_NAME_1 || "—"}</td>
        `;
        tbody.appendChild(tr);
      });

      const capped = features.length === 500;
      document.getElementById("query-result-count").textContent =
        `${features.length}${capped ? "+" : ""} parcel${features.length !== 1 ? "s" : ""} found${capped ? " (capped at 500 — refine filters for more precision)" : ""}`;

      msg.classList.add("hidden");
      document.getElementById("query-table-wrap").style.display = "block";
      document.getElementById("query-export").classList.remove("hidden");

    }).catch(err => {
      msg.textContent = "Query failed. Check your filters and try again.";
      console.error("Query error:", err);
    });
  }

  /* -- Export CSV ------------------------------------------- */
  document.getElementById("query-export").addEventListener("click", () => {
    const rows = document.querySelectorAll("#query-tbody tr");
    if (!rows.length) return;

    const headers = ["Address","TAXKEY","Zoning","Land Use Group",
                     "Land Value","Improvement Value","Yr Built",
                     "Tax Delinquent (yrs)","Owner"];

    const lines = [headers.join(",")];
    rows.forEach(row => {
      const cells = Array.from(row.querySelectorAll("td"))
        .map(td => `"${td.textContent.replace(/"/g, '""')}"`);
      lines.push(cells.join(","));
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "MDOAT_query_results.csv";
    a.click();
    URL.revokeObjectURL(url);
  });

}); // end require
