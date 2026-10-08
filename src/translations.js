// @ts-check
import { effect, signal } from "@preact/signals";

export const english = {
    "theme.system": "System",
    "theme.light": "Light",
    "theme.dark": "Dark",
    "theme.toggle": (
        /** @type {string} */ current,
        /** @type {string} */ next,
    ) => `Appearance: ${current}. Switch to ${next}.`,
    "language.label": "Language",
    "language.english": "English",
    "language.finnish": "Finnish",
    "common.close": "Close",
    "common.help": "Help",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.remove": "Remove",
    "common.source": "Source",
    "common.sources": "Sources",
    "common.today": "Today",
    "common.tomorrow": "Tomorrow",
    "common.dayAfterTomorrow": "the day after tomorrow",
    "common.timePrefix": "at",
    "common.noData": "No data",
    "common.error": "Something went wrong :(",
    "common.modeled": "modeled",
    "common.calm": "calm",
    "common.waitingCoordinates": "Waiting for coordinates…",
    "common.asTable": (/** @type {string} */ title) => `${title} as a table`,
    "menu.label": "Menu",
    "menu.close": "Close menu",
    "menu.dropzones": "Dropzones",
    "menu.saved": "Saved",
    "menu.saveCurrent": "+ Save current",
    "menu.home": "Home",
    "menu.reset": "Reset",
    "menu.removeSaved": (/** @type {string} */ name) =>
        `Remove saved dropzone ${name}`,
    "menu.confirmRemove": "Are you sure you want to remove the saved DZ?",
    "menu.namePrompt": "Name",
    "time.clock": (/** @type {string} */ time) => `at ${time}`,
    "weather.clock": "Time",
    "weather.gust": "Gust",
    "weather.groundGust": "Ground gust",
    "weather.wind": "Wind",
    "weather.direction": "Direction",
    "weather.windVariationHelp":
        "Variation during the last hour: the highest reading minus the lowest reading, rounded to the nearest m/s.",
    "weather.directionVariationHelp":
        "Direction variation during the last hour: the width of the smallest arc containing all readings, accounting for crossing north, rounded to the nearest degree.",
    "weather.gustVariationWarning": (/** @type {string} */ change) =>
        `Gust variation during the last hour is ${change} m/s (highest minus lowest reading). Warning threshold: 8 m/s or more.`,
    "weather.directionVariationWarning": (/** @type {string} */ change) =>
        `Direction variation during the last hour is ${change}° (smallest arc containing all readings, accounting for crossing north). Warning threshold: 100° or more.`,
    "weather.temperature": "Temperature",
    "weather.condensationLevelShort": "LCL",
    "weather.condensationLevel": "Lifted condensation level",
    "weather.readMore": "Read more",
    "weather.cloudsLow": "Clouds L",
    "weather.cloudsMiddle": "Clouds ML",
    "weather.rain": "Rain",
    "weather.observations": "Observations",
    "weather.forecast": "Forecast",
    "weather.clouds": "Clouds",
    "weather.winds": "Winds",
    "weather.forecasts": "Forecasts",
    "weather.licensed": "B+ licence holders",
    "weather.students": "Students",
    "weather.gustUnit": "Gust (m/s)",
    "weather.windUnit": "Wind (m/s)",
    "weather.gustForecastUnit": "Gust forecast (m/s)",
    "weather.lowCloudHelp":
        "Coverage of low-level clouds, usually below 2 kilometres (about 6,500 feet) above sea level.",
    "weather.middleCloudHelp":
        "Coverage of mid-level clouds, usually 2–7 kilometres (about 6,500–23,000 feet) above sea level.",
    "weather.rainHelp": "Probability of precipitation as a percentage.",
    "compass.animation": "Animation",
    "compass.minimize": "Minimize wind compass",
    "compass.restore": "Show wind compass",
    "cloud.minimize": "Minimize cloud summary",
    "cloud.restore": "Show cloud summary",
    "compass.help":
        "The ranges below the wind readings show the minimum and maximum gust, mean wind, and direction observed during the last hour. Values are rounded to whole numbers. The arrow shows wind direction and its length shows the gust. The inner circle is the student limit (8 m/s), and the outer circle is the licence limit (11 m/s). The animation replays the last hour chronologically. When it is off, the arrow shows the latest observation.",
    "source.openMeteoModeled": "Open-Meteo (modeled)",
    "source.manualMode": "Manual mode",
    "error.noMetar": (/** @type {string} */ code) =>
        `No METAR message for ${code}.`,
    "error.stationNotFound": (/** @type {string} */ id) =>
        `Observation station ${id} was not found.`,
    "error.stationInvalid": (/** @type {string} */ id) =>
        `Observation station ${id} does not appear to work here.`,
    "error.coordinatesMissing":
        "Coordinates are missing. Enter latitude and longitude or select an FMI or Fintraffic observation station.",
    "error.noForecasts": "No forecasts found.",
    "error.cachedFetch": (
        /** @type {string} */ provider,
        /** @type {string} */ error,
    ) =>
        `${provider}: refresh failed (${error}). Showing stale cached data until a refresh succeeds.`,
    "error.apiFetch": (
        /** @type {string} */ provider,
        /** @type {string} */ error,
    ) => `${provider}: fetch failed (${error}). No cached data available.`,
    "error.fmiFetch": (/** @type {string} */ id) =>
        `Error retrieving data from FMI observation station ${id}.`,
    "fromNow.hours": (/** @type {number} */ value) =>
        new Intl.RelativeTimeFormat(getIntlLocale()).format(value, "hours"),
    "fromNow.minutes": (/** @type {number} */ value) =>
        new Intl.RelativeTimeFormat(getIntlLocale()).format(value, "minutes"),
    "metar.help": "METAR report",
    "metar.intro":
        "Read the groups from left to right. Times are UTC; wind directions refer to true north. Cloud heights are above the reporting aerodrome, not the dropzone.",
    "metar.report": "METAR: routine aerodrome weather report.",
    "metar.special":
        "SPECI: special report issued when weather changes significantly.",
    "metar.station": (/** @type {string} */ value) =>
        `ICAO identifier of the reporting aerodrome: ${value}.`,
    "metar.day": (/** @type {string} */ value) => `Day of the month: ${value}.`,
    "metar.utc": (/** @type {string} */ value) =>
        `Observation time: ${value} UTC. Z means UTC (Zulu).`,
    "metar.auto": "AUTO: automatic observation.",
    "metar.correction": "Corrected report.",
    "metar.direction": (/** @type {string} */ value) =>
        `Wind from ${value}° true north.`,
    "metar.windFormat":
        "The first three digits give direction, the next digits speed, and G introduces gusts. KT = knots, MPS = m/s, KPH = km/h.",
    "metar.ndv": "NDV: no directional visibility variation is reported.",
    "metar.variable": "VRB: variable wind direction.",
    "metar.calm": "00000: calm wind.",
    "metar.speed": (/** @type {string} */ value) =>
        `Mean wind speed: ${value}.`,
    "metar.gust": (/** @type {string} */ value) => `G: gusts up to ${value}.`,
    "metar.knots": "kt (knots; 1 kt ≈ 0.514 m/s)",
    "metar.variation": (/** @type {string} */ value) =>
        `Wind direction varies between ${value}°; V separates the limits.`,
    "metar.visibility": (/** @type {string} */ value) =>
        `Horizontal visibility: ${value} m. Four digits give metres; a suffix gives the direction of minimum visibility.`,
    "metar.visibility10": "9999: horizontal visibility 10 km or more.",
    "metar.visibility50": "0000: horizontal visibility less than 50 m.",
    "metar.miles": (/** @type {string} */ value) =>
        `Horizontal visibility: ${value} statute miles. SM means statute miles; P means more than, M means less than.`,
    "metar.cavok":
        "CAVOK: visibility at least 10 km, no significant weather, no clouds below 5,000 ft or the highest minimum sector altitude (whichever is higher), and no CB or TCU clouds.",
    "metar.height": (/** @type {string} */ value) =>
        `The three digits × 100 give a height of ${value} ft above the aerodrome.`,
    "metar.unknownHeight": "///: height unavailable.",
    "metar.unknownCover": "//////: cloud amount and height unavailable.",
    "metar.unknownType": "/// after the height: cloud type unavailable.",
    "metar.tcu": "TCU: towering cumulus clouds.",
    "metar.skc": "SKC: sky clear.",
    "metar.clr":
        "CLR: no clouds detected below 12,000 ft by the automatic system.",
    "metar.temperature": (/** @type {string} */ value) =>
        `Temperature / dew point: ${value} °C. M means minus; // means unavailable.`,
    "metar.pressure": (/** @type {string} */ value) =>
        `QNH: ${value} hPa, pressure adjusted to sea level. Q is followed by four digits.`,
    "metar.inches": (/** @type {string} */ value) =>
        `Altimeter setting: ${value} inHg. Divide the four digits after A by 100.`,
    "metar.rvr":
        "Runway visual range. R identifies the runway; L/C/R mean left/centre/right. Values are metres unless FT is present; M/P mean below/above, V separates a variable range, and U/D/N mean increasing/decreasing/no change.",
    "metar.nosig":
        "NOSIG: no significant change expected in the next two hours.",
    "metar.becmg":
        "BECMG: becoming; the following groups describe an expected change in the next two hours.",
    "metar.tempo":
        "TEMPO: temporary conditions expected in the next two hours.",
    "metar.trendTime":
        "Trend timing: FM = from, TL = until, AT = at; the four digits are hours and minutes in UTC.",
    "metar.nsw": "NSW: no significant weather expected.",
    "metar.recent":
        "RE: recent weather, observed since the previous report but no longer present.",
    "metar.light": "−: light intensity.",
    "metar.heavy": "+: heavy intensity.",
    "metar.moderate": "No intensity sign: moderate precipitation.",
    "metar.remarks":
        "RMK: supplementary remarks follow. These groups use regional conventions and are not decoded here.",
    "metar.unknown":
        "This group is not decoded here. Slashes indicate missing data; additional groups may use local conventions.",
    "metar.end": "= marks the end of the report.",
    "metar.nil": "NIL: no observation available.",
    "metar.weatherVC": "VC: in the vicinity.",
    "metar.weatherMI": "MI: shallow.",
    "metar.weatherPR": "PR: partial.",
    "metar.weatherBC": "BC: patches.",
    "metar.weatherDR": "DR: low drifting.",
    "metar.weatherBL": "BL: blowing.",
    "metar.weatherSH": "SH: showers.",
    "metar.weatherTS": "TS: thunderstorm.",
    "metar.weatherFZ": "FZ: freezing.",
    "metar.weatherRA": "RA: rain.",
    "metar.weatherDZ": "DZ: drizzle.",
    "metar.weatherSN": "SN: snow.",
    "metar.weatherSG": "SG: snow grains.",
    "metar.weatherIC": "IC: ice crystals.",
    "metar.weatherPL": "PL: ice pellets.",
    "metar.weatherGR": "GR: hail.",
    "metar.weatherGS": "GS: small hail or snow pellets.",
    "metar.weatherUP": "UP: unknown precipitation.",
    "metar.weatherFG": "FG: fog.",
    "metar.weatherVA": "VA: volcanic ash.",
    "metar.weatherBR": "BR: mist.",
    "metar.weatherHZ": "HZ: haze.",
    "metar.weatherDU": "DU: widespread dust.",
    "metar.weatherFU": "FU: smoke.",
    "metar.weatherSA": "SA: sand.",
    "metar.weatherPY": "PY: spray.",
    "metar.weatherSQ": "SQ: squalls.",
    "metar.weatherPO": "PO: dust or sand whirls.",
    "metar.weatherDS": "DS: duststorm.",
    "metar.weatherSS": "SS: sandstorm.",
    "metar.weatherFC": "FC: funnel cloud.",
    "cloud.none": "No clouds",
    "cloud.noneObserved": "No clouds observed",
    "cloud.noneDescription":
        "NCD means the automatic measurement did not detect clouds within its observation range.",
    "cloud.noSignificant": "No significant clouds",
    "cloud.noSignificantCoverage": "No significant cloud cover",
    "cloud.noSignificantDescription":
        "NSC means no clouds significant to aviation were observed. Clouds may still exist higher up.",
    "cloud.few": "Few clouds",
    "cloud.fewShort": "Few",
    "cloud.fewDescription":
        "FEW means this layer covers 1–2 eighths of the sky.",
    "cloud.scattered": "Scattered clouds",
    "cloud.scatteredShort": "Scattered",
    "cloud.scatteredDescription":
        "SCT means this layer covers 3–4 eighths of the sky.",
    "cloud.broken": "Broken cloud cover",
    "cloud.brokenShort": "Broken",
    "cloud.brokenDescription":
        "BKN means this layer covers 5–7 eighths of the sky.",
    "cloud.overcast": "Overcast",
    "cloud.overcastDescription":
        "OVC means the layer covers the entire sky, or 8/8.",
    "cloud.verticalVisibility": "Vertical visibility",
    "cloud.skyObscured": "Sky obscured",
    "cloud.fogEmphasis": "FOG",
    "cloud.verticalVisibilityDescription":
        "VV is how far upward can be seen when fog or another obstruction obscures the sky. It is not a measured cloud base.",
    "cloud.cumulonimbus": "Cumulonimbus clouds",
    "cloud.cumulonimbusHelp": "Cumulonimbus help",
    "cloud.cumulonimbusDescription":
        "CB means cumulonimbus, or a thunderstorm cloud. It can cause sudden changes in wind speed and direction and strong gusts.",
    "cloud.cumulonimbusUnknown":
        "The observation does not specify cumulonimbus coverage or height.",
    "cloud.base": "Cloud base",
    "cloud.layer": "Cloud layer",
    "cloud.cavok": "No clouds below 1,500 m",
    "cloud.cavokMessage": "No clouds below 1500M (CAVOK)",
    "cloud.observation": "Cloud observation",
    "cloud.observedLayers": "Observed cloud layers",
    "cloud.source": "Cloud data source",
    "cloud.modelledLayers": "Modelled clouds",
    "cloud.altitudeSeaLevel": "Altitude above sea level",
    "cloud.altitudeAboveDropzone": "Height above dropzone",
    "cloud.modelUnavailable": "Current cloud forecast unavailable.",
    "cloud.modelledMeaning":
        "Modelled means a computer weather model estimates the clouds using weather observations and calculations of how the atmosphere changes. This is the model's estimate for the current hour near the selected coordinates, rather than a direct cloud observation. Actual cloud cover and heights may differ.",
    "cloud.modelledCoverage":
        "The percentage estimates the part of the model's area covered by clouds at this altitude. For example, 50% means clouds cover half of the model's area at this altitude. The sampled altitude is not a cloud base or top, and clouds between the sampled levels may be missed.",
    "cloud.modelledSummaryHelp":
        "The card shows sampled levels with cloud cover greater than 0%. Icons indicate cloud cover at each level. Heights are above the dropzone ground, rounded to the nearest 100 metres. Focus or hover over a level to see its cloud cover percentage, pressure and height to the nearest metre. No clouds means the available sampled levels have 0% cover; it does not guarantee a clear sky.",
    "cloud.forecast": "Cloud forecast",
    "cloud.forecast12h": "Forecast · 12 hours",
    "cloud.forecastTable": "Detailed cloud forecast",
    "cloud.hourlyForecast": "Hourly cloud forecast, scroll horizontally",
    "cloud.cover": "Cloud cover",
    "cloud.totalCover": "Total cloud cover",
    "cloud.coverScale": "Cloud cover color scale",
    "cloud.rangeCover": (/** @type {string} */ range) =>
        `Cloud cover at ${range}`,
    "cloud.rangeCoverHelp":
        "The highest Open-Meteo cloud cover percentage among the available sampled levels from the dropzone ground through the level closest to the selected jump-run exit altitude, calculated separately for each hour. The closest level may be slightly above the exit altitude; equally close levels use the lower one.",
    "cloud.lowCover": "Low cloud cover",
    "cloud.middleCover": "Middle cloud cover",
    "cloud.highCover": "High cloud cover",
    "cloud.middleAndLowCover": "Middle and low cloud cover",
    "cloud.totalCoverHelp":
        "Covers all altitudes: low, middle and high clouds. FMI's forecast of the fraction of sky covered by clouds across all cloud layers. Overlapping layers mean the individual cover percentages cannot simply be added together.",
    "cloud.highCoverHelp":
        "High-cloud bases are typically around 5–9 km above ground or higher. FMI's forecast of the fraction of sky covered by high clouds. This row excludes middle and low clouds and does not show the height of the cloud base.",
    "cloud.middleCoverHelp":
        "Middle-cloud bases are typically around 2–6 km above ground. FMI's forecast of the fraction of sky covered by middle clouds only. Low clouds are excluded; their combined cover is shown in the Middle and low cloud cover row.",
    "cloud.middleAndLowCoverHelp":
        "Covers low and middle clouds together, with bases generally below about 6 km above ground. FMI's combined forecast of the fraction of sky covered by middle and low clouds. High clouds are excluded. Because layers can overlap, this is not the sum of the separate middle and low percentages.",
    "cloud.lowCoverHelp":
        "Low-cloud bases are generally below 2 km above ground. FMI's forecast of the fraction of sky covered by low clouds. This describes cloud cover, not the height of the cloud base; the condensation level is a separate estimate.",
    "cloud.fmiCoverHelp":
        "0% means no cloud cover in the indicated layers and 100% means complete cover. The percentage is a weather-model forecast, not a probability of clouds or a direct observation. The altitude ranges describe typical cloud-base categories, not exact limits or a predicted cloud-base height.",
    "cloud.condensationForecastHelp":
        "An estimate of the height above ground where rising air would begin to condense, calculated from FMI's forecast temperature and dew point and rounded to the nearest 100 metres. It is not a forecast or observation of every cloud layer's base. Clouds formed elsewhere can have a different base.",
    "cloud.altitudeMeters": (/** @type {string} */ altitude) => `${altitude} m`,
    "cloud.forecastTableHelp":
        "Percentages estimate cloud cover at each altitude or altitude range: 0% means no cover and 100% means complete cover.",
    "cloud.coverage": (/** @type {string} */ value) => `${value} of sky`,
    "cloud.condensationEstimate": "Condensation level estimate",
    "cloud.baseHelp":
        "Cloud base is the height of the bottom of the cloud layer above the observation site's ground level.",
    "cloud.roundingHelp":
        "The card value is rounded to the nearest 100 metres.",
    "cloud.modelRoundingHelp":
        "Open-Meteo altitudes are rounded to the nearest 500 metres. Each altitude has a tooltip showing its value to the nearest metre.",
    "cloud.metarHeightHelp":
        "The METAR digits express altitude in hundreds of feet (ft).",
    "cloud.estimateHelp": (
        /** @type {string} */ temperature,
        /** @type {string} */ dewPoint,
    ) =>
        `An estimate of potential cloud height based on the lifted condensation level. Calculated from a temperature of ${temperature}°C and a dew point of ${dewPoint}°C, rounded to the nearest 100 metres.`,
    "cloud.estimateCaveat":
        "The estimate is meaningful only when the clouds formed at the observation site. If they formed elsewhere under different temperature and dew-point conditions and arrived with the wind, the estimate is likely inaccurate.",
    "cloud.forecastHelp":
        "Hourly forecast of the condensation level and low-cloud coverage below 2 km. Scroll horizontally for more hours.",
    "title.elevation": (/** @type {string} */ elevation) =>
        `${elevation} m above sea level`,
    "title.groundTemperature": (/** @type {string} */ value) =>
        `${value}°C ground,`,
    "title.altitudeTemperature": (/** @type {string} */ value) =>
        `${value}°C at 4 km`,
    "title.temperatureHelp":
        "Temperature change according to the ICAO standard atmosphere in the troposphere (-6.5°C/km)",
    "map.loading": "Loading map…",
    "common.retry": "Try again",
    "map.title": "Jump run",
    "map.region": "Dropzone map and wind profile",
    "map.onMap": (/** @type {string} */ name) => `${name} on map`,
    "map.ground": "Ground",
    "map.fmiStation": "FMI weather station",
    "map.fintrafficStation": "Fintraffic weather station",
    "map.windLabelCalm": (/** @type {string} */ label) => `${label}: calm`,
    "map.windLabelMissing": (/** @type {string} */ label) =>
        `${label}: no data`,
    "map.windLabel": (
        /** @type {string} */ label,
        /** @type {string} */ speed,
        /** @type {number} */ direction,
    ) => `${label}: ${speed}, wind from ${direction}°`,
    "map.sourceNoCurrent": "no data for the current hour",
    "map.sourceNoObservation": "no observation",
    "map.dataHelpTitle": "Wind data and limitations",
    "map.forecastNatureHelp":
        "The upper-level winds are not measurements taken at the dropzone. They are hourly weather-model forecasts retrieved from Open-Meteo for the selected forecast coordinates.",
    "map.forecastLevelsHelp":
        "Open-Meteo provides wind speed, direction, and geopotential height at pressure levels. The map subtracts the dropzone elevation and uses the nearest wind level for freefall and aircraft wind correction. Canopy drift linearly interpolates wind vectors between reported heights, including the ground wind, and holds the nearest endpoint wind outside the available range. This assumes a gradual transition through unmeasured heights. Levels below model terrain or at/below the dropzone are excluded. Manual winds retain their fixed sea-level heights of 110, 800, 1,500, 3,000, and 4,200 m before this adjustment.",
    "map.forecastImplicationHelp":
        "Actual winds at the dropzone can differ from the forecast, especially between the modelled levels or when conditions change. Treat the drift arrow and jump-run layout as planning estimates, verify the current conditions with observations and information from the pilot or dropzone, and do not use the map as the sole basis for operational decisions.",
    "map.groundObservationHelp":
        "Ground wind uses a valid station observation from the last hour, then a recent METAR, and finally the current Open-Meteo surface forecast. The selected source is shown below the map.",
    "map.usingHelpTitle": "Using the map",
    "map.jumpRunHelpTitle": "Jump run",
    "map.selectWind": "Select an altitude to show its wind on the map.",
    "map.navigationHelp": "Pan and zoom the map with two fingers.",
    "map.jumpRunHelp":
        "Each jumper or jump group gets a predicted freefall-drift arrow. Settings control ground track, aircraft true airspeed, exit interval, and shared exit altitude. Each jumper has its own opening altitude and freefall speed.",
    "map.automaticUpdate": "Update automatically",
    "map.automaticHelpTitle": "Automatic placement",
    "map.automaticHelp":
        "On initial placement, the configured default axis is reversed when necessary to face into the average upper wind. Every predicted opening is placed at least 50 m upwind of the landing target relative to the accumulated canopy wind drift below that opening. The preferred offset estimates canopy wind drift at a constant descent speed of 5 m/s, interpolating wind vectors between the ground observation and upper wind levels. This does not model canopy glide or guarantee landing-area reachability.",
    "map.automaticLimitsHelp":
        "Automatic placement requires a ground observation no older than one hour and current forecast winds. Missing data, an unachievable ground track, or conflicting wind directions can prevent placement. The positioning button reverses the current direction by 180° when needed to face into the average upper wind, then repeats the calculation for the configured landing coordinates. With Update automatically checked, new wind data repeats placement. Manual edits uncheck it and can leave openings outside these limits.",
    "map.positioningHelpTitle": "Manual positioning",
    "map.positioningHelp":
        "Click or tap the map, then choose Opening to place the central predicted opening point there, Jump run to place the middle of the exit sequence there, or Landing to use that point as the landing target for automatic placement with the current direction. For an even number of jumpers, the central opening point is the midpoint of the two middle openings. Clicking elsewhere cancels the callout. Press Enter on the focused map to place the central opening point at the map centre. Add jumpers with the plus button.",
    "map.directionHelpTitle": "Direction controls",
    "map.directionControlsHelp":
        "The direction menu contains drag mode, 90° rotations, and reset. In drag mode, drag with the mouse or a finger to rotate the run around the middle of its exit sequence. For an even number of groups, this is halfway between the two middle exits. Click the map or press the direction button again to finish. The 90° rotations and reset keep the central predicted opening point fixed. Reset restores the configured default axis, reversed when necessary to face into the average wind.",
    "map.legendHelp":
        "Arrows show flow direction. Line length represents speed.",
    "map.flowHelp":
        "Moving lines show the selected wind's flow direction. Stronger wind appears as longer, faster-moving lines.",
    "map.confirmJumpRunPosition": "Opening",
    "map.centerJumpRunPosition": "Jump run",
    "map.parachuteLandingPosition": "Landing",
    "map.directionPrompt": "Drag to set the jump-run direction.",
    "map.averageWind": "Average wind",
    "map.averageHelp":
        "Height-weighted average wind over the displayed freefall range above the dropzone. Uses forecast heights or manually entered measurements to provide a rough freefall-drift estimate.",
    "map.shareFailed": "Sharing the map failed.",
    "map.driftUnavailable":
        "Drift estimate unavailable: upper-wind data is missing.",
    "map.automaticRunUnavailable":
        "Automatic placement unavailable: current wind data is missing, the track cannot be flown, or all openings cannot be placed upwind of their accumulated canopy drift.",
    "map.jumpRunUnavailable":
        "Jump-run positions unavailable: exit-altitude wind is missing or the selected track cannot be flown at this airspeed.",
    "map.jumpRunWindMissing":
        "Jump run unavailable: wind data at exit altitude is missing.",
    "map.jumpRunTrackInfeasible":
        "Jump run unavailable: the selected direction cannot be flown at this airspeed in the current wind.",
    "map.directionHint":
        "Drag with the mouse or a finger. Open the direction menu and press the direction button again to finish.",
    "toolbar.freefallValues": "Freefall values",
    "toolbar.freefall": "Freefall",
    "toolbar.jumpRun": "Jump run",
    "toolbar.jumpRunLength": "Jump run length",
    "toolbar.jumpRunLengthTooltip":
        "Distance over the ground from the first exit to the last, using wind-adjusted ground speed and the time between exits.",
    "toolbar.removeJumper": "Remove jumper",
    "toolbar.removeJumpRun": "Remove jump run",
    "toolbar.positionJumpRun": "Automatic jump run position",
    "toolbar.positionView": "Fit map to jump run",
    "toolbar.zoomIn": "Zoom in",
    "toolbar.satellite": "Satellite imagery",
    "toolbar.zoomOut": "Zoom out",
    "toolbar.shareMap": "Share jump run",
    "toolbar.errors": "Errors",
    "toolbar.restoreMap": "Restore jump run",
    "toolbar.expandMap": "Expand jump run to full window",
    "toolbar.exit": "Exit",
    "toolbar.exitTooltip":
        "Exit altitude used for all jumpers on the jump run.",
    "toolbar.openingTooltip": "Opening altitude for the next jumper you add.",
    "toolbar.speedTooltip": "Freefall speed for the next jumper you add.",
    "toolbar.jumpRunDirectionTooltip": "Jump-run direction over the ground.",
    "toolbar.jumpRunSpeedTooltip":
        "Aircraft true airspeed. Wind is accounted for when calculating ground speed.",
    "toolbar.separation": "Separation",
    "toolbar.separationTooltip":
        "Time between consecutive jumper exits on the jump run.",
    "toolbar.opening": "Opening",
    "toolbar.speed": "Speed",
    "toolbar.windLevels": "Wind levels",
    "toolbar.wind": "Wind",
    "map.currentWinds": "Current winds",
    "map.windBarbHelpTitle": "Reading wind barbs",
    "map.windBarbDirectionHelp":
        "The shaft points from the circle toward the direction the wind comes from. Hover or focus a level to see its altitude; select it to show that wind on the map. The lowest wind is at the bottom, with the average freefall wind above the altitude levels.",
    "map.windBarbSpeedHelp":
        "Add the markings to read the speed in knots. Speeds are rounded to the nearest 5 knots. 1 knot is approximately 0.51 m/s.",
    "map.windBarbHalfHelp": "Short barb: 5 knots (≈ 2.6 m/s).",
    "map.windBarbFullHelp": "Long barb: 10 knots (≈ 5.1 m/s).",
    "map.windBarbFlagHelp": "Triangle: 50 knots (≈ 25.7 m/s).",
    "map.windBarbCombinedHelp":
        "A long and a short barb: 10 + 5 = 15 knots (≈ 7.7 m/s).",
    "map.windBarbCalmHelp": "A circle without a shaft means calm wind.",
    "map.windBarbMissingHelp":
        "A question mark means wind data is unavailable.",

    "settings.jumpRunDirectionHelp":
        "Direction of travel over the ground: 0°/360° north, 90° east, 180° south, and 270° west. Wind correction determines the aircraft heading needed to follow this track. Changing direction here keeps the central predicted opening point fixed (the midpoint of the two middle openings for an even number of groups). Free rotation by dragging keeps the middle of the exit sequence fixed. Missing wind data or a track that cannot be flown at the selected airspeed can prevent the calculation.",
    "settings.elevation": "Dropzone elevation (m)",
    "settings.elevationHelp":
        "Dropzone height above sea level. Used to adjust wind calculations and Open-Meteo cloud heights.",
    "settings.altitudeReferenceHelp":
        "Exit and opening altitudes are heights above the dropzone. Freefall, aircraft wind correction, and canopy drift use forecast geopotential heights minus the configured dropzone elevation. Manual winds use their fixed sea-level heights minus the same elevation. Heights are rounded only for display; surrounding terrain is not modelled.",
    "settings.freefallSpeedHelp":
        "The vertical terminal speed used in the freefall estimate. The calculation starts with zero vertical speed and includes forward movement inherited from the aircraft. Wind changes affect the jumper gradually. Presets set only this speed; they do not model horizontal tracking or wingsuit glide.",
    "settings.nextJumperHelp":
        "These values apply to subsequently added jumpers and the default group when first creating a run.",
    "settings.jumpRun": "Jump run settings",
    "settings.jumpRunDirection": "Jump run direction",
    "settings.defaultJumperCount": "Default jump group count",
    "settings.defaultJumperCountHelp":
        "Number of jump groups created when first positioning a jump run, if its jumper list has not been customized. Each group uses the next-jumper settings. Changing this value does not resize an existing run; add or remove jumpers in the list instead.",
    "settings.exitHeight": "Exit altitude (m)",
    "settings.openingHeight": "Opening altitude (m)",
    "settings.freefallSpeed": "Freefall speed (km/h)",
    "settings.jumpRunSpeed": "True airspeed (km/h)",
    "settings.jumperInterval": "Jumper separation (s)",
    "settings.jumperIntervalHelp":
        "Time in seconds between consecutive jump group exits. The same interval applies to every group on the jump run. The aircraft’s ground speed, including wind at exit altitude, determines the distance between exit points. Different freefall speeds and opening altitudes can produce different spacing between opening points.",
    "settings.nextJumper": "Add jumper",
    "settings.currentJumpers": "Current jumpers",
    "settings.jumpers": "Jumpers / jump groups",
    "settings.setJumpRunDirection": "Rotate by dragging",
    "settings.turnJumpRunIntoWind": "Turn into selected wind",
    "settings.resetJumpRunDirection": "Reset to default",
    "settings.rotateJumpRunClockwise": "Rotate 90° right",
    "settings.rotateJumpRunCounterclockwise": "Rotate 90° left",
    "settings.addJumper": "Add jumper",
    "settings.jumper": (/** @type {number} */ number) => `Jumper ${number}`,
    "settings.removeJumper": (/** @type {number} */ number) =>
        `Remove jumper ${number}`,
    "settings.speedExplanation":
        "Enter true airspeed (TAS), not indicated airspeed (IAS). Wind at exit altitude is used to calculate ground speed along the selected ground track. Ground speed and the exit interval determine the distance between exit points. The freefall estimate also includes forward movement inherited from the aircraft.",
    "settings.exitExplanation":
        "The exit altitude is shared by all jumpers. It must be above every existing jumper’s opening altitude and the opening altitude set for the next jumper.",
    "settings.profileRange":
        "Opening must be at least 800 m above the dropzone and below exit. Calculations use the nearest wind level by altitude, including above or below the available wind profile.",
    "settings.openingRange":
        "Altitude where the predicted freefall path ends. It must be at least 800 m and below exit altitude. Lower openings generally allow more time for freefall drift.",
    "highWinds.title": "ECMWF upper-wind forecasts",
    "highWinds.helpForecast":
        "These are forecasts, not measurements. The app requests hourly wind speed and direction from Open-Meteo for the forecast coordinates.",
    "highWinds.helpLevels":
        "The values come from the 1,000, 925, 850, 700, 600, 500, and 400 hPa pressure levels. Row heights use the current period, or the first available period, above sea level and are rounded to 500 m. Row and cell tooltips show heights to the nearest metre; other periods may have different heights.",
    "highWinds.helpPeriods":
        "The summary shows three-hour periods. The current period uses the forecast for the current hour; other periods average three hourly forecasts. Details shows every hour separately. Data for each location is fetched at most once per hour and cached in the browser.",
    "highWinds.showSummary": "Show summary",
    "highWinds.showDetails": "Show details",
    "footer.airfieldElevation": "Airfield elevation above sea level",
    "footer.observationStation": "Observation data retrieved from station",
    "footer.and": "and",
    "footer.code": "Code",
    "manual.active": "Manual mode active.",
    "manual.manualValues": "Manually entered values are in use.",
    "manual.edit": "Edit",
    "manual.restore": "Restore real data",
    "manual.title": "Manual mode",
    "manual.metar": "METAR text",
    "manual.upperTitle": "Open-Meteo winds for the current hour",
    "manual.altitude": "Height above ground (m)",
    "manual.belowGroundHelp":
        "A negative height is below the dropzone ground level. Rows at or below ground level are excluded from drift calculations.",
    "manual.freefallWindHelp":
        "Freefall drift uses the nearest wind level at each height from exit to opening, switching halfway between level heights. Wind at exit also affects aircraft ground speed and the spacing between jumpers.",
    "manual.canopyWindHelp":
        "Canopy drift uses the same wind profile from opening to ground, including recent ground observations at zero height. Drift depends on the time spent descending through each wind layer.",
    "manual.windRangeHelp":
        "Outside the available height range, the nearest wind level is reused. Rows at or below ground are excluded. If a required wind value is missing, that drift estimate is unavailable.",
    "manual.upperHelp":
        "Editing this table replaces the altitude winds used by the map, freefall and canopy drift calculations. Heights are measured above the dropzone ground level and default to the current forecast heights. You can replace them with aircraft measurements. Placeholders show rounded defaults. Clearing an entered value restores the forecast default. Ground wind comes from the observations below.",
    "manual.description":
        "Manual values are stored in MANUAL_ URL parameters. An empty METAR field uses real data.",
    "manual.capture": "Save current values as manual values",
    "manual.copyUrl": "Copy URL",
    "manual.clear": "Clear manual values",
    "manual.resetUpperWinds": "Restore forecast winds",
    "manual.resetGroundObservations": "Restore live observations",
    "manual.groundTitle": "Ground observations from the last hour",
    "manual.minutesAgo": "Minutes ago",
    "manual.meanWindUnit": "Mean (m/s)",
    "manual.directionUnit": "Direction (°)",
    "manual.saved": "Current values saved in the URL.",
    "manual.copied": "URL copied.",
    "manual.copyFailed": "Copy failed. Copy the URL from the field below.",
    "manual.windInvalid":
        "Check the allowed height, wind speed and direction ranges.",
    "manual.metarInvalid": "Could not parse the METAR text. Check the text.",
    "manual.observationsInvalid":
        "Check the observation wind values and directions.",
    "manual.immediate":
        "Changes take effect immediately and are stored in the URL.",
    "manual.shareUrl": "Shareable URL",
    "manual.groundHelp":
        "The newest row is the current ground wind. Editing the table replaces the last hour of observations. Clearing a wind value restores the live observation. Direction −1 means variable wind.",
    "manual.meanWind": "Mean wind",
    "manual.queryString": "Query string",
    "footer.stationDistance": (/** @type {string} */ km) =>
        `Distance to observation station: ${km} km.`,
    "footer.disclaimer":
        "Use the data at your own risk. No guarantee is made that it is correct.",
    "footer.logbook": "Psst, need a skydiving logbook? Check out",
    "title.edit": "Edit name",
    "forecast.location": "The forecast is for the area",
    "title.emptyName":
        "An empty name restores the automatically generated name.",
    "landing.dropzones": "Dropzones",
    "landing.complete":
        "Comprehensive weather data is available for these dropzones:",
    "landing.partial": "Partial data is also available for these locations:",
    "landing.mapRegion": "Select the DZ location on the map",
    "landing.useLocation": "Use my current location",
    "landing.clear": (/** @type {string} */ label) => `Clear ${label}`,
    "landing.coordinatesMissing": "Coordinates are missing",
    "landing.stationOrCoordinates":
        "Enter coordinates or an FMI or Fintraffic observation station ID.",
    "landing.create": "Create a dropzone",
    "landing.coordinates": "DZ coordinates",
    "landing.mapHelp":
        "Open a dropzone by clicking its pin, or click elsewhere to create a new dropzone.",
    "landing.mapCreate": "Create Dropzone",
    "landing.placeSearch": "Search for a place",
    "landing.search": "Search",
    "landing.searching": "Searching…",
    "landing.searchResults": "Place search results",
    "landing.searchEmpty": "No places found. Try a different name or address.",
    "landing.searchError": "Place search failed. Please try again.",
    "landing.optional": "optional",
    "landing.stationSource": "Observation source",
    "landing.onlyNameRequired":
        "Only the name is required. All other fields are optional.",
    "landing.latitude": "Latitude",
    "landing.longitude": "Longitude",
    "landing.decimal": "In decimal format.",
    "landing.other": "Other information",
    "landing.name": "Name",
    "landing.locationGroup": "Dropzone location",
    "landing.weatherGroup": "Weather observations",
    "landing.jumpRunGroup": "Jump run defaults",
    "landing.defaultJumpRunDirection": "Default jump run direction",
    "landing.defaultJumpRunDirectionHelp":
        "In degrees (0–360). Usually the runway direction.",
    "landing.defaultExitAltitude": "Default exit altitude (m)",
    "landing.defaultExitAltitudeHelp":
        "Metres above the dropzone ground. Must be greater than 800 m.",
    "landing.defaultJumperCount": "Default jump group count",
    "landing.defaultJumperCountHelp":
        "Used when automatically creating a jump run.",
    "landing.fmiHelp": "Find the FMISID of an FMI observation station",
    "landing.here": "here",
    "landing.roadStation": "Fintraffic weather station",
    "landing.roadHelp": "Find the station ID",
    "landing.icaoHelp":
        "Four-letter airport identifier, e.g. EFUT. Used for METAR reports and cloud observations.",
    "landing.createButton": "Create",
    "landing.savedLocally":
        "The dropzone is saved only in this browser. Share the dropzone by sharing its link.",
    "landing.partialJamijarvi":
        "– Jämijärvi. No METAR messages; the observation station is far away.",
    "landing.partialAlavus":
        "– Alavus. No METAR messages; a road weather observation station is used.",
    "landing.partialVesivehmaa":
        "– Vesivehmaa, Asikkala. METAR messages and forecasts only.",
    "landing.partialImmola": "– Immola. No METAR messages.",
    "landing.partialMeripuisto":
        "– Meripuisto, Helsinki. EFHK observations and METAR messages.",
};

/** @satisfies {TranslationCatalog<typeof english>} */
const finnish = {
    "theme.system": "Järjestelmä",
    "theme.light": "Vaalea",
    "theme.dark": "Tumma",
    "theme.toggle": (current, next) =>
        `Ulkoasu: ${current}. Vaihda tilaan ${next}.`,
    "language.label": "Kieli",
    "language.english": "Englanti",
    "language.finnish": "Suomi",
    "common.close": "Sulje",
    "common.help": "Ohje",
    "common.save": "Tallenna",
    "common.cancel": "Peruuta",
    "common.remove": "Poista",
    "common.source": "Lähde",
    "common.sources": "Lähteet",
    "common.today": "Tänään",
    "common.tomorrow": "Huomenna",
    "common.dayAfterTomorrow": "ylihuomenna",
    "common.timePrefix": "klo",
    "common.noData": "Ei tietoa",
    "common.error": "Tässä tapahtui virhe :(",
    "common.modeled": "mallinnettu",
    "common.calm": "tyyntä",
    "common.waitingCoordinates": "Odotetaan koordinaatteja…",
    "common.asTable": (title) => `${title} taulukkona`,
    "menu.label": "Valikko",
    "menu.close": "Sulje valikko",
    "menu.dropzones": "Hyppypaikat",
    "menu.saved": "Tallennetut",
    "menu.saveCurrent": "+ Tallenna nykyinen",
    "menu.home": "Etusivulle",
    "menu.reset": "Palauta oletukset",
    "menu.removeSaved": (name) => `Poista tallennettu hyppypaikka ${name}`,
    "menu.confirmRemove": "Haluatko varmasti poistaa tallennetun DZ:n?",
    "menu.namePrompt": "Nimi",
    "time.clock": (time) => `klo ${time}`,
    "weather.clock": "Kello",
    "weather.gust": "Puuska",
    "weather.groundGust": "Puuska maassa",
    "weather.wind": "Tuuli",
    "weather.direction": "Suunta",
    "weather.windVariationHelp":
        "Vaihtelu viimeisen tunnin aikana: suurin lukema miinus pienin lukema, pyöristettynä lähimpään m/s.",
    "weather.directionVariationHelp":
        "Suunnan vaihtelu viimeisen tunnin aikana: kaikki lukemat sisältävän pienimmän kaaren leveys, huomioiden pohjoisen ylitys, pyöristettynä lähimpään asteeseen.",
    "weather.gustVariationWarning": (change) =>
        `Puuskien vaihtelu viimeisen tunnin aikana on ${change} m/s (suurin lukema miinus pienin lukema). Varoitusraja: vähintään 8 m/s.`,
    "weather.directionVariationWarning": (change) =>
        `Suunnan vaihtelu viimeisen tunnin aikana on ${change}° (kaikki lukemat sisältävä pienin kaari, huomioiden pohjoisen ylitys). Varoitusraja: vähintään 100°.`,
    "weather.temperature": "Lämpötila",
    "weather.condensationLevelShort": "TK",
    "weather.condensationLevel": "Tiivistymiskorkeus",
    "weather.readMore": "Lue lisää",
    "weather.cloudsLow": "Pilvet L",
    "weather.cloudsMiddle": "Pilvet ML",
    "weather.rain": "Sade",
    "weather.observations": "Havainnot",
    "weather.forecast": "Ennuste",
    "weather.clouds": "Pilvet",
    "weather.winds": "Tuulet",
    "weather.forecasts": "Ennusteet",
    "weather.licensed": "B+ Kelpparit",
    "weather.students": "Oppilaat",
    "weather.gustUnit": "Puuska (m/s)",
    "weather.windUnit": "Tuuli (m/s)",
    "weather.gustForecastUnit": "Puuskaennuste (m/s)",
    "weather.lowCloudHelp":
        "Matalakerroksen pilvien peittävyys, yleensä alle 2 kilometriä merenpinnasta.",
    "weather.middleCloudHelp":
        "Keskikerroksen pilvien peittävyys, yleensä 2–7 kilometriä merenpinnasta.",
    "weather.rainHelp": "Sateen todennäköisyys prosentteina.",
    "compass.animation": "Animaatio",
    "compass.minimize": "Pienennä tuulikompassi",
    "compass.restore": "Näytä tuulikompassi",
    "cloud.minimize": "Pienennä pilviyhteenveto",
    "cloud.restore": "Näytä pilviyhteenveto",
    "compass.help":
        "Tuulilukemien alla näkyvät vaihteluvälit kertovat puuskan, keskituulen ja suunnan pienimmän ja suurimman havaitun arvon viimeisen tunnin ajalta. Arvot on pyöristetty kokonaisluvuiksi. Kompassin nuoli kertoo tuulen suunnan ja pituus tuulen puuskan. Sisempi ympyrä on oppilasraja (8 m/s) ja ulompi ympyrä on kelppariraja (11 m/s). Animaatio toistaa viimeisen tunnin havainnot aikajärjestyksessä. Kun animaatio on pois päältä, nuoli näyttää uusimman havainnon.",
    "source.openMeteoModeled": "Open-Meteo (mallinnettu)",
    "source.manualMode": "Manuaalitila",
    "error.noMetar": (code) => `Ei METAR-sanomaa kentälle ${code}.`,
    "error.stationNotFound": (id) => `Havaintoasemaa ${id} ei löytynyt.`,
    "error.stationInvalid": (id) =>
        `Havaintoasema ${id} ei taida toimia tässä.`,
    "error.coordinatesMissing":
        "Koordinaatit puuttuvat. Anna leveys- ja pituusaste tai määritä FMI:n tai Fintrafficin havaintoasema.",
    "error.noForecasts": "Ennusteita ei löytynyt.",
    "error.cachedFetch": (provider, error) =>
        `${provider}: päivitys epäonnistui (${error}). Näytetään vanhentuneita välimuistin tietoja, kunnes päivitys onnistuu.`,
    "error.apiFetch": (provider, error) =>
        `${provider}: haku epäonnistui (${error}). Välimuistissa ei ole tietoja.`,
    "error.fmiFetch": (id) =>
        `Virhe Ilmatieteenlaitoksen havaintoaseman ${id} tietojen hakemisessa.`,
    "fromNow.hours": (value) =>
        new Intl.RelativeTimeFormat(getIntlLocale()).format(value, "hours"),
    "fromNow.minutes": (value) =>
        new Intl.RelativeTimeFormat(getIntlLocale()).format(value, "minutes"),
    "metar.help": "METAR-sanoma",
    "metar.intro":
        "Lue ryhmät vasemmalta oikealle. Ajat ovat UTC-aikaa ja tuulen suunnat viittaavat tosipohjoiseen. Pilvikorkeudet mitataan havaintolentopaikan maanpinnasta, eivät hyppypaikasta.",
    "metar.report": "METAR: lentopaikan määräaikainen säähavainto.",
    "metar.special":
        "SPECI: erityissäähavainto merkittävän säämuutoksen vuoksi.",
    "metar.station": (value) => `Havaintolentopaikan ICAO-tunnus: ${value}.`,
    "metar.day": (value) => `Kuukauden päivä: ${value}.`,
    "metar.utc": (value) =>
        `Havaintoaika: ${value} UTC. Z tarkoittaa UTC-aikaa (Zulu).`,
    "metar.auto": "AUTO: automaattinen säähavainto.",
    "metar.correction": "Korjattu säähavainto.",
    "metar.direction": (value) =>
        `Tuuli suunnasta ${value}° tosipohjoiseen nähden.`,
    "metar.windFormat":
        "Kolme ensimmäistä numeroa kertoo suunnan, seuraavat nopeuden ja G aloittaa puuskanopeuden. KT = solmua, MPS = m/s, KPH = km/h.",
    "metar.ndv": "NDV: näkyvyyden vaihtelua eri suunnissa ei ilmoiteta.",
    "metar.variable": "VRB: tuulen suunta vaihtelee.",
    "metar.calm": "00000: tyyntä.",
    "metar.speed": (value) => `Tuulen keskinopeus: ${value}.`,
    "metar.gust": (value) => `G: puuskat enintään ${value}.`,
    "metar.knots": "kt (solmua; 1 kt ≈ 0,514 m/s)",
    "metar.variation": (value) =>
        `Tuulen suunta vaihtelee välillä ${value}°; V erottaa rajat.`,
    "metar.visibility": (value) =>
        `Vaakanäkyvyys: ${value} m. Neljä numeroa kertoo metrit; mahdollinen kirjainosa kertoo huonoimman näkyvyyden suunnan.`,
    "metar.visibility10": "9999: vaakanäkyvyys vähintään 10 km.",
    "metar.visibility50": "0000: vaakanäkyvyys alle 50 m.",
    "metar.miles": (value) =>
        `Vaakanäkyvyys: ${value} mailia. SM tarkoittaa maamaileja; P tarkoittaa enemmän kuin ja M vähemmän kuin.`,
    "metar.cavok":
        "CAVOK: näkyvyys vähintään 10 km, ei merkittävää säätä eikä pilviä alle 5 000 jalan tai korkeimman minimisektorikorkeuden (näistä korkeampi), eikä CB- tai TCU-pilviä.",
    "metar.height": (value) =>
        `Kolme numeroa × 100 kertoo korkeuden ${value} ft lentopaikan maanpinnasta.`,
    "metar.unknownHeight": "///: korkeutta ei ole saatavilla.",
    "metar.unknownCover":
        "//////: pilvien määrää ja korkeutta ei ole saatavilla.",
    "metar.unknownType":
        "/// korkeuden jälkeen: pilven tyyppiä ei ole saatavilla.",
    "metar.tcu": "TCU: korkeaksi kasvaneita kumpupilviä.",
    "metar.skc": "SKC: taivas selkeä.",
    "metar.clr":
        "CLR: automaattinen järjestelmä ei havainnut pilviä alle 12 000 jalan.",
    "metar.temperature": (value) =>
        `Lämpötila / kastepiste: ${value} °C. M tarkoittaa miinusta; // tarkoittaa puuttuvaa tietoa.`,
    "metar.pressure": (value) =>
        `QNH: ${value} hPa, merenpinnan tasolle korjattu ilmanpaine. Q:n jälkeen on neljä numeroa.`,
    "metar.inches": (value) =>
        `Korkeusmittarin paineasetus: ${value} inHg. Jaa A:n jälkeiset neljä numeroa sadalla.`,
    "metar.rvr":
        "Kiitotienäkyvyys. R kertoo kiitotien; L/C/R tarkoittavat vasenta/keskimmäistä/oikeaa. Arvot ovat metrejä, ellei mukana ole FT; M/P tarkoittavat alle/yli, V erottaa vaihteluvälin ja U/D/N tarkoittavat paranevaa/heikkenevää/muuttumatonta.",
    "metar.nosig":
        "NOSIG: merkittäviä muutoksia ei odoteta seuraavien kahden tunnin aikana.",
    "metar.becmg":
        "BECMG: sää muuttuu; seuraavat ryhmät kuvaavat odotettua muutosta seuraavien kahden tunnin aikana.",
    "metar.tempo":
        "TEMPO: tilapäisiä sääolosuhteita odotetaan seuraavien kahden tunnin aikana.",
    "metar.trendTime":
        "Muutoksen aika: FM = alkaen, TL = asti, AT = hetkellä; neljä numeroa kertoo tunnit ja minuutit UTC-ajassa.",
    "metar.nsw": "NSW: merkittävää säätä ei odoteta.",
    "metar.recent":
        "RE: viimeaikaista säätä, jota havaittiin edellisen sanoman jälkeen mutta ei enää havaintohetkellä.",
    "metar.light": "−: heikko voimakkuus.",
    "metar.heavy": "+: voimakas.",
    "metar.moderate": "Ei voimakkuusmerkkiä: kohtalainen sade.",
    "metar.remarks":
        "RMK: seuraavat lisähuomiot käyttävät alueellisia käytäntöjä, eikä niitä pureta tässä.",
    "metar.unknown":
        "Tätä ryhmää ei pureta tässä. Kauttaviivat ilmaisevat puuttuvia tietoja; lisäryhmät voivat käyttää paikallisia käytäntöjä.",
    "metar.end": "= merkitsee sanoman loppua.",
    "metar.nil": "NIL: havaintoa ei ole saatavilla.",
    "metar.weatherVC": "VC: lähiympäristössä.",
    "metar.weatherMI": "MI: matala.",
    "metar.weatherPR": "PR: osittainen.",
    "metar.weatherBC": "BC: lauttoja.",
    "metar.weatherDR": "DR: matalaa tuiskua.",
    "metar.weatherBL": "BL: korkeaa tuiskua.",
    "metar.weatherSH": "SH: kuuroja.",
    "metar.weatherTS": "TS: ukkonen.",
    "metar.weatherFZ": "FZ: jäätävä.",
    "metar.weatherRA": "RA: vesisade.",
    "metar.weatherDZ": "DZ: tihkusade.",
    "metar.weatherSN": "SN: lumisade.",
    "metar.weatherSG": "SG: lumijyväset.",
    "metar.weatherIC": "IC: jääkiteet.",
    "metar.weatherPL": "PL: jääjyväset.",
    "metar.weatherGR": "GR: rakeet.",
    "metar.weatherGS": "GS: pienet rakeet tai lumirakeet.",
    "metar.weatherUP": "UP: tunnistamaton sade.",
    "metar.weatherFG": "FG: sumu.",
    "metar.weatherVA": "VA: vulkaaninen tuhka.",
    "metar.weatherBR": "BR: utu.",
    "metar.weatherHZ": "HZ: auer.",
    "metar.weatherDU": "DU: laaja-alainen pöly.",
    "metar.weatherFU": "FU: savu.",
    "metar.weatherSA": "SA: hiekka.",
    "metar.weatherPY": "PY: pärskeet.",
    "metar.weatherSQ": "SQ: puuskarintamat.",
    "metar.weatherPO": "PO: pöly- tai hiekkapyörteet.",
    "metar.weatherDS": "DS: pölymyrsky.",
    "metar.weatherSS": "SS: hiekkamyrsky.",
    "metar.weatherFC": "FC: suppilopilvi.",
    "cloud.none": "Ei pilviä",
    "cloud.noneObserved": "Ei havaittuja pilviä",
    "cloud.noneDescription":
        "NCD tarkoittaa, ettei automaattinen mittaus havainnut pilviä mittauksen havaintoalueella.",
    "cloud.noSignificant": "Ei merkittäviä pilviä",
    "cloud.noSignificantCoverage": "Ei merkittävää pilvisyyttä",
    "cloud.noSignificantDescription":
        "NSC tarkoittaa, ettei havaittu lentotoiminnan kannalta merkittäviä pilviä. Korkeammalla voi silti olla pilviä.",
    "cloud.few": "Muutamia pilviä",
    "cloud.fewShort": "Muutamia",
    "cloud.fewDescription":
        "FEW tarkoittaa muutamia pilviä: tämä pilvikerros peittää 1–2 kahdeksasosaa taivaasta.",
    "cloud.scattered": "Hajanaisia pilviä",
    "cloud.scatteredShort": "Hajanaisia",
    "cloud.scatteredDescription":
        "SCT tarkoittaa hajanaisia pilviä: tämä pilvikerros peittää 3–4 kahdeksasosaa taivaasta.",
    "cloud.broken": "Rakoileva pilvikatto",
    "cloud.brokenShort": "Rakoileva",
    "cloud.brokenDescription":
        "BKN tarkoittaa rakoilevaa pilvikattoa: tämä pilvikerros peittää 5–7 kahdeksasosaa taivaasta.",
    "cloud.overcast": "Täysi pilvikatto",
    "cloud.overcastDescription":
        "OVC tarkoittaa täyttä pilvikattoa: tämä pilvikerros peittää koko taivaan eli 8/8.",
    "cloud.verticalVisibility": "Pystynäkyvyys",
    "cloud.skyObscured": "Taivas peittynyt",
    "cloud.fogEmphasis": "SUMUA PERKELE",
    "cloud.verticalVisibilityDescription":
        "VV tarkoittaa pystynäkyvyyttä: kuinka korkealle maanpinnasta nähdään ylöspäin, kun sumu tai muu este peittää taivaan. Arvo ei ole mitattu pilven alaraja.",
    "cloud.cumulonimbus": "Ukkospilviä",
    "cloud.cumulonimbusHelp": "Ukkospilvien ohje",
    "cloud.cumulonimbusDescription":
        "CB tarkoittaa cumulonimbusta eli ukkospilveä. Ukkospilvi voi aiheuttaa äkillisiä muutoksia tuulen nopeudessa ja suunnassa sekä voimakkaita puuskia.",
    "cloud.cumulonimbusUnknown":
        "Havainto ei kerro ukkospilvien peittävyyttä tai korkeutta.",
    "cloud.base": "Pilven alaraja",
    "cloud.layer": "Pilvikerros",
    "cloud.cavok": "Ei pilviä alle 1 500 m",
    "cloud.cavokMessage": "Ei pilviä alle 1500M (CAVOK)",
    "cloud.observation": "Pilvihavainto",
    "cloud.observedLayers": "Havaitut pilvikerrokset",
    "cloud.source": "Pilvitietojen lähde",
    "cloud.modelledLayers": "Mallinnetut pilvet",
    "cloud.altitudeSeaLevel": "Korkeus merenpinnasta",
    "cloud.altitudeAboveDropzone": "Korkeus hyppypaikan maanpinnasta",
    "cloud.modelUnavailable": "Nykyisen tunnin pilviennuste ei ole saatavilla.",
    "cloud.modelledMeaning":
        "Mallinnettu tarkoittaa, että tietokoneen säämalli arvioi pilviä säähavaintojen ja ilmakehän muutoksia kuvaavien laskelmien avulla. Tämä on mallin arvio nykyiselle tunnille valittujen koordinaattien lähellä, ei suora pilvihavainto. Todellinen pilvipeitto ja pilvien korkeudet voivat poiketa arviosta.",
    "cloud.modelledCoverage":
        "Prosenttiluku arvioi, kuinka suuri osa mallin alueesta on pilvien peitossa tällä korkeudella. Esimerkiksi 50 % tarkoittaa, että pilvet peittävät puolet mallin alueesta tällä korkeudella. Näytetty korkeus ei ole pilven ala- tai yläraja, ja tasojen välissä olevat pilvet voivat jäädä näkymättä.",
    "cloud.modelledSummaryHelp":
        "Kortti näyttää tarkastellut tasot, joiden pilvipeitto on yli 0 %. Kuvakkeet kuvaavat kunkin tason pilvipeittoa. Korkeudet ovat hyppypaikan maanpinnasta, pyöristettyinä lähimpään 100 metriin. Kohdista tasoon tai vie osoitin sen päälle nähdäksesi pilvipeittoprosentin, ilmanpaineen ja korkeuden metrin tarkkuudella. Ei pilviä tarkoittaa, että saatavilla olevien tasojen pilvipeitto on 0 %; se ei takaa pilvetöntä taivasta.",
    "cloud.forecast": "Pilvien ennuste",
    "cloud.forecast12h": "Ennuste · 12 tuntia",
    "cloud.forecastTable": "Yksityiskohtainen pilviennuste",
    "cloud.hourlyForecast": "Pilvien tuntiennuste, vieritä sivulle",
    "cloud.cover": "Pilvipeitto",
    "cloud.totalCover": "Kokonaispilvipeite",
    "cloud.coverScale": "Pilvipeitteen väriasteikko",
    "cloud.rangeCover": (range) => `Pilvipeitto ${range}:n korkeudella`,
    "cloud.rangeCoverHelp":
        "Suurin Open-Meteon pilvipeittoprosentti saatavilla olevilta mallitasoilta hyppypaikan maanpinnasta valittua hyppylinjan uloshyppykorkeutta lähimpään mallitasoon asti, laskettuna erikseen jokaiselle tunnille. Lähin mallitaso voi olla hieman uloshyppykorkeuden yläpuolella; yhtä lähellä olevista tasoista käytetään alempaa.",
    "cloud.lowCover": "Matalat pilvet",
    "cloud.middleCover": "Keskipilvet",
    "cloud.highCover": "Korkeat pilvet",
    "cloud.middleAndLowCover": "Keski- ja alapilvet",
    "cloud.totalCoverHelp":
        "Sisältää kaikki korkeudet: ala-, keski- ja yläpilvet. Ilmatieteen laitoksen ennuste siitä, kuinka suuri osa taivaasta on pilvien peitossa kaikki pilvikerrokset huomioiden. Eri kerrosten pilvet voivat olla päällekkäin, joten kerrosten prosentteja ei voi suoraan laskea yhteen.",
    "cloud.highCoverHelp":
        "Yläpilvien alaraja on tyypillisesti noin 5–9 km maanpinnasta tai korkeammalla. Ilmatieteen laitoksen ennuste korkeiden pilvien peittämästä osuudesta taivaalla. Rivi ei sisällä keski- tai alapilviä eikä kerro pilven alarajan korkeutta.",
    "cloud.middleCoverHelp":
        "Keskipilvien alaraja on tyypillisesti noin 2–6 km maanpinnasta. Ilmatieteen laitoksen ennuste pelkkien keskipilvien peittämästä osuudesta taivaalla. Alapilvet eivät sisälly tähän lukuun; niiden yhteinen peittävyys näkyy Keski- ja alapilvet -rivillä.",
    "cloud.middleAndLowCoverHelp":
        "Sisältää ala- ja keskipilvet yhdessä, joiden alaraja on yleensä alle noin 6 km maanpinnasta. Ilmatieteen laitoksen ennuste keski- ja alapilvien yhdessä peittämästä osuudesta taivaalla. Korkeat pilvet eivät sisälly lukuun. Kerrokset voivat olla päällekkäin, joten luku ei ole keski- ja alapilvien erillisten prosenttien summa.",
    "cloud.lowCoverHelp":
        "Alapilvien alaraja on yleensä alle 2 km maanpinnasta. Ilmatieteen laitoksen ennuste matalien pilvien peittämästä osuudesta taivaalla. Luku kuvaa pilvipeittoa, ei pilven alarajan korkeutta; tiivistymiskorkeus on erillinen arvio.",
    "cloud.fmiCoverHelp":
        "0 % tarkoittaa, ettei kyseisissä kerroksissa ole pilvipeittoa, ja 100 % tarkoittaa täyttä peittoa. Prosentti on säämallin ennuste, ei pilvien todennäköisyys tai suora havainto. Korkeusvälit kuvaavat pilvilajien tyypillisiä alarajoja, eivät tarkkoja rajoja tai ennustettua pilven alarajaa.",
    "cloud.condensationForecastHelp":
        "Arvio korkeudesta maanpinnasta, jolla nousevan ilman vesihöyry alkaa tiivistyä. Lasketaan Ilmatieteen laitoksen ennustamasta lämpötilasta ja kastepisteestä ja pyöristetään lähimpään 100 metriin. Se ei ole kaikkien pilvikerrosten alarajan ennuste tai havainto. Muualla syntyneiden pilvien alaraja voi olla eri korkeudella.",
    "cloud.altitudeMeters": (altitude) => `${altitude} m`,
    "cloud.forecastTableHelp":
        "Prosentit arvioivat pilvipeittoa kullakin korkeudella tai korkeusvälillä: 0 % tarkoittaa, ettei pilvipeittoa ole, ja 100 % tarkoittaa täyttä pilvipeittoa.",
    "cloud.coverage": (value) => `${value} taivaasta`,
    "cloud.condensationEstimate": "Tiivistymiskorkeuden arvio",
    "cloud.baseHelp":
        "Pilven alaraja on pilvikerroksen pohjan korkeus havaintopaikan maanpinnasta.",
    "cloud.roundingHelp": "Kortin arvo on pyöristetty lähimpään 100 metriin.",
    "cloud.modelRoundingHelp":
        "Open-Meteon korkeudet on pyöristetty lähimpään 500 metriin. Kunkin korkeuden työkaluvihje näyttää arvon metrin tarkkuudella.",
    "cloud.metarHeightHelp":
        "METARin numerot ilmaisevat korkeuden satoina jalkoina (ft).",
    "cloud.estimateHelp": (temperature, dewPoint) =>
        `Arvio mahdollisten pilvien korkeudesta tiivistymiskorkeuden perusteella. Laskettu lämpötilasta ${temperature}°C ja kastepisteestä ${dewPoint}°C pyöristäen lähimpään 100 metriin.`,
    "cloud.estimateCaveat":
        "Arvio on järjellinen vain silloin kun pilvet ovat muodostuneet mittauspaikalla. Jos pilvet ovat muodostuneet toisaalla eri lämpötilassa ja kastepisteessä ja saapuneet tuulen mukana, arvio on todennäköisesti päin prinkkalaa.",
    "cloud.forecastHelp":
        "Tiivistymiskorkeuden ja matalien (alle 2 km) pilvien peittävyyden tuntiennuste. Vieritä sivulle nähdäksesi lisää tunteja.",
    "title.elevation": (/** @type {string} */ elevation) =>
        `${elevation} m merenpinnasta`,
    "title.groundTemperature": (value) => `${value}°C maassa,`,
    "title.altitudeTemperature": (value) => `${value}°C 4km:ssä`,
    "title.temperatureHelp":
        "ICAO:n ilmakehämallin mukainen lämpötilan muutos troposfäärissä (-6.5°C/km)",
    "map.loading": "Ladataan karttaa…",
    "common.retry": "Yritä uudelleen",
    "map.title": "Hyppylinja",
    "map.region": "Hyppypaikan kartta ja tuuliprofiili",
    "map.onMap": (name) => `${name} kartalla`,
    "map.ground": "Maanpinta",
    "map.fmiStation": "FMI sääasema",
    "map.fintrafficStation": "Fintraffic sääasema",
    "map.windLabelCalm": (label) => `${label}: tyyntä`,
    "map.windLabelMissing": (label) => `${label}: ei tietoa`,
    "map.windLabel": (label, speed, direction) =>
        `${label}: ${speed}, tuuli suunnasta ${direction}°`,
    "map.sourceNoCurrent": "ei nykyisen tunnin tietoja",
    "map.sourceNoObservation": "ei havaintoa",
    "map.dataHelpTitle": "Tuulitiedot ja niiden rajoitukset",
    "map.forecastNatureHelp":
        "Korkeuksien tuulet eivät ole hyppypaikalla mitattuja arvoja. Ne ovat Open-Meteosta valitun ennustesijainnin koordinaateille haettuja säämallin tuntiennusteita.",
    "map.forecastLevelsHelp":
        "Open-Meteo antaa tuulen nopeuden, suunnan ja geopotentiaalikorkeuden painepinnoilla. Kartta vähentää hyppypaikan korkeuden merenpinnasta ja käyttää korkeudeltaan lähintä tuulitasoa vapaapudotuksessa ja lentokoneen tuulikorjauksessa. Varjon varassa tapahtuva ajautuminen interpoloidaan lineaarisesti tuulivektoreista ilmoitettujen korkeuksien välillä, mukaan lukien maatuuli. Korkeusvälin ulkopuolella käytetään lähintä päätepisteen tuulta. Tämä olettaa asteittaisen muutoksen mittaamattomilla korkeuksilla. Mallin maaston alapuoliset sekä hyppypaikan tasolla tai sen alapuolella olevat tasot jätetään pois. Käsin syötettyjen tuulten kiinteät korkeudet ennen korjausta ovat 110, 800, 1 500, 3 000 ja 4 200 m merenpinnasta.",
    "map.forecastImplicationHelp":
        "Hyppypaikan todellinen tuuli voi poiketa ennusteesta etenkin mallinnettujen korkeuksien välillä tai sään muuttuessa. Käytä ajautumisnuolta ja hyppylinjaa suunnittelun arvioina, varmista vallitsevat olosuhteet havainnoista sekä lentäjältä tai hyppypaikalta äläkä tee operatiivisia päätöksiä pelkän kartan perusteella.",
    "map.groundObservationHelp":
        "Maatuuli käyttää kelvollista havaintoaseman havaintoa viimeisen tunnin ajalta, sitten tuoretta METAR-sanomaa ja lopuksi Open-Meteon nykyhetken pintatuuliennustetta. Valittu lähde näkyy kartan alla.",
    "map.usingHelpTitle": "Kartan käyttäminen",
    "map.jumpRunHelpTitle": "Hyppylinja",
    "map.selectWind": "Valitse korkeus nähdäksesi sen tuulen kartalla.",
    "map.navigationHelp": "Karttaa voi liikuttaa ja zoomata kahdella sormella.",
    "map.jumpRunHelp":
        "Jokaiselle hyppääjälle tai hyppyryhmälle piirretään ennustettu vapaapudotusajautumisen nuoli. Asetukset määrittävät lentoradan suunnan maan suhteen, lentokoneen todellisen ilmanopeuden, uloshyppyjen aikavälin ja yhteisen uloshyppykorkeuden. Jokaisella hyppääjällä on oma avauskorkeus ja vapaapudotusnopeus.",
    "map.automaticUpdate": "Päivitä automaattisesti",
    "map.automaticHelpTitle": "Automaattinen sijoitus",
    "map.automaticHelp":
        "Ensimmäisessä sijoituksessa määritetty oletusakseli käännetään tarvittaessa vasten yläkorkeuksien keskituulta. Jokainen ennustettu avautumiskohta sijoitetaan vähintään 50 m laskeutumiskohteen tuulenpuolelle suhteessa avautumiskorkeuden alapuolella kertyvään tuuliajautumiseen. Tavoitesiirtymä arvioi varjon varassa tapahtuvaa tuuliajautumista vakionopeudella 5 m/s alaspäin interpoloimalla tuulivektoreita maatuulihavainnon ja ylätuulitasojen välillä. Arvio ei mallinna varjon liitoa eikä takaa laskeutumisalueelle pääsyä.",
    "map.automaticLimitsHelp":
        "Automaattinen sijoitus vaatii enintään tunnin ikäisen maatuulihavainnon ja nykyisen tunnin ennustetuulet. Puuttuvat tiedot, lentorata jota ei voi lentää tai ristiriitaiset tuulensuunnat voivat estää sijoittamisen. Sijoituspainike kääntää nykyistä suuntaa tarvittaessa 180° vasten yläkorkeuksien keskituulta ja toistaa laskennan määritetyille laskeutumiskoordinaateille. Kun Päivitä automaattisesti on valittuna, uudet tuulitiedot toistavat sijoituksen. Käsin tehdyt muutokset poistavat valinnan ja voivat jättää avautumiskohtia näiden rajojen ulkopuolelle.",
    "map.positioningHelpTitle": "Sijoittaminen käsin",
    "map.positioningHelp":
        "Klikkaa tai napauta karttaa ja valitse Avaus sijoittaaksesi keskimmäisen ennustetun avautumiskohdan siihen, Hyppylinja sijoittaaksesi uloshyppyjonon keskikohdan siihen tai Laskeutuminen käyttääksesi kohtaa automaattisen sijoituksen laskeutumiskohteena nykyisellä suunnalla. Kun hyppääjien määrä on parillinen, keskimmäinen avautumiskohta on kahden keskimmäisen avautumiskohdan puolivälissä. Klikkaus muualle sulkee puhekuplan. Enter kohdistetulla kartalla sijoittaa keskimmäisen avautumiskohdan kartan keskikohtaan. Lisää hyppääjiä pluspainikkeesta.",
    "map.directionHelpTitle": "Suunnan säätäminen",
    "map.directionControlsHelp":
        "Suuntavalikko sisältää vetotilan, 90° kierrot ja palautuksen. Vedä vetotilassa hiirellä tai sormella kiertääksesi hyppylinjaa uloshyppyjonon keskikohdan ympäri. Parillisella ryhmämäärällä tämä on kahden keskimmäisen uloshypyn puoliväli. Klikkaa karttaa tai paina suuntapainiketta uudelleen lopettaaksesi. 90° kierrot ja palautus pitävät keskimmäisen ennustetun avautumiskohdan paikallaan. Palautus palauttaa määritetyn oletusakselin, tarvittaessa käännettynä vasten keskituulta.",
    "map.legendHelp":
        "Nuolet näyttävät virtaussuunnan. Kartan viivojen pituus kuvaa nopeutta.",
    "map.flowHelp":
        "Kartan liikkuvat viivat näyttävät valitun tuulen virtaussuunnan. Voimakkaampi tuuli näkyy pidempinä ja nopeammin liikkuvina viivoina.",
    "map.confirmJumpRunPosition": "Avaus",
    "map.centerJumpRunPosition": "Hyppylinja",
    "map.parachuteLandingPosition": "Laskeutuminen",
    "map.directionPrompt": "Vedä asettaaksesi hyppylinjan suunnan.",
    "map.averageWind": "Keskituuli",
    "map.averageHelp":
        "Korkeudella painotettu keskituuli näytetyllä vapaapudotuksen korkeusvälillä hyppypaikan maanpinnasta. Käyttää ennusteen korkeuksia tai käsin syötettyjä mittauksia ja antaa karkean arvion vapaapudotusajautumisesta.",
    "map.shareFailed": "Kartan jakaminen epäonnistui.",
    "map.driftUnavailable":
        "Ajautumisarvio ei saatavilla: ylätuulitietoja puuttuu.",
    "map.automaticRunUnavailable":
        "Automaattinen sijoitus ei ole saatavilla: ajantasaisia tuulitietoja puuttuu, lentorataa ei voi lentää tai kaikkia avautumiskohtia ei voi sijoittaa kertyvän tuuliajautumisensa tuulenpuolelle.",
    "map.jumpRunUnavailable":
        "Hyppylinjan paikat eivät ole saatavilla: uloshyppykorkeuden tuulitieto puuttuu tai valittua lentorataa ei voi lentää tällä ilmanopeudella.",
    "map.jumpRunWindMissing":
        "Hyppylinjan paikat eivät ole saatavilla: uloshyppykorkeuden tuulitieto puuttuu.",
    "map.jumpRunTrackInfeasible":
        "Hyppylinjan paikat eivät ole saatavilla: valittua suuntaa ei voi lentää tällä ilmanopeudella nykyisessä tuulessa.",
    "map.directionHint":
        "Vedä hiirellä tai sormella. Avaa suuntavalikko ja paina suuntapainiketta uudelleen lopettaaksesi.",
    "toolbar.freefallValues": "Vapaapudotuksen arvot",
    "toolbar.freefall": "Vapaapudotus",
    "toolbar.jumpRun": "Hyppylinja",
    "toolbar.jumpRunLength": "Hyppylinjan pituus",
    "toolbar.jumpRunLengthTooltip":
        "Ensimmäisen ja viimeisen uloshypyn välinen matka maan suhteen. Laskenta huomioi tuulikorjatun maanopeuden ja uloshyppyjen välisen ajan.",
    "toolbar.removeJumper": "Poista hyppääjä",
    "toolbar.removeJumpRun": "Poista hyppylinja",
    "toolbar.positionJumpRun": "Hyppylinjan automaattinen sijoitus",
    "toolbar.positionView": "Sovita karttanäkymä hyppylinjaan",
    "toolbar.zoomIn": "Lähennä karttaa",
    "toolbar.satellite": "Satelliittikuvat",
    "toolbar.zoomOut": "Loitonna karttaa",
    "toolbar.shareMap": "Jaa hyppylinja",
    "toolbar.errors": "Virheet",
    "toolbar.restoreMap": "Palauta Hyppylinja",
    "toolbar.expandMap": "Laajenna Hyppylinja koko ikkunaan",
    "toolbar.exit": "Uloshyppy",
    "toolbar.exitTooltip": "Kaikkien hyppylinjan hyppääjien uloshyppykorkeus.",
    "toolbar.openingTooltip": "Seuraavaksi lisättävän hyppääjän avauskorkeus.",
    "toolbar.speedTooltip":
        "Seuraavaksi lisättävän hyppääjän vapaapudotusnopeus.",
    "toolbar.jumpRunDirectionTooltip": "Hyppylinjan suunta maan suhteen.",
    "toolbar.jumpRunSpeedTooltip":
        "Lentokoneen todellinen ilmanopeus. Tuuli huomioidaan maanopeuden laskennassa.",
    "toolbar.separation": "Väli",
    "toolbar.separationTooltip":
        "Peräkkäisten uloshyppyjen välinen aika hyppylinjalla.",
    "toolbar.opening": "Avaus",
    "toolbar.speed": "Nopeus",
    "toolbar.windLevels": "Tuulikorkeudet",
    "toolbar.wind": "Tuuli",
    "map.currentWinds": "Nykyiset tuulet",
    "map.windBarbHelpTitle": "Tuuliväkästen lukeminen",
    "map.windBarbDirectionHelp":
        "Varsi osoittaa ympyrästä suuntaan, josta tuuli tulee. Vie osoitin korkeuden päälle tai siirrä siihen kohdistus nähdäksesi korkeuden. Valitse korkeus näyttääksesi sen tuulen kartalla. Alin tuuli on alimpana ja vapaapudotuksen keskituuli korkeuksien yläpuolella.",
    "map.windBarbSpeedHelp":
        "Laske merkkien arvot yhteen saadaksesi nopeuden solmuina. Nopeus pyöristetään lähimpään 5 solmuun. 1 solmu on noin 0,51 m/s.",
    "map.windBarbHalfHelp": "Lyhyt väkänen: 5 solmua (≈ 2,6 m/s).",
    "map.windBarbFullHelp": "Pitkä väkänen: 10 solmua (≈ 5,1 m/s).",
    "map.windBarbFlagHelp": "Kolmio: 50 solmua (≈ 25,7 m/s).",
    "map.windBarbCombinedHelp":
        "Pitkä ja lyhyt väkänen: 10 + 5 = 15 solmua (≈ 7,7 m/s).",
    "map.windBarbCalmHelp": "Ympyrä ilman vartta tarkoittaa tyyntä.",
    "map.windBarbMissingHelp":
        "Kysymysmerkki tarkoittaa, ettei tuulitietoa ole saatavilla.",
    "settings.jumpRunDirectionHelp":
        "Lentoradan suunta maan suhteen: 0°/360° pohjoinen, 90° itä, 180° etelä ja 270° länsi. Tuulikorjaus määrittää lentokoneen nokan suunnan, jolla tätä lentorataa seurataan. Suunnan muuttaminen tässä pitää keskimmäisen ennustetun avautumiskohdan paikallaan (parillisella ryhmämäärällä kahden keskimmäisen avautumiskohdan puoliväli). Vapaa kierto vetämällä pitää uloshyppyjonon keskikohdan paikallaan. Puuttuvat tuulitiedot tai lentorata, jota ei voi lentää valitulla ilmanopeudella, voivat estää laskennan.",
    "settings.elevation": "Hyppypaikan korkeus merenpinnasta (m)",
    "settings.elevationHelp":
        "Hyppypaikan korkeus merenpinnasta. Käytetään tuulilaskelmien ja Open-Meteon pilvikorkeuksien korjaamiseen.",
    "settings.altitudeReferenceHelp":
        "Uloshyppy- ja avauskorkeudet mitataan hyppypaikan maanpinnasta. Vapaapudotus, lentokoneen tuulikorjaus ja varjon varassa tapahtuva ajautuminen lasketaan ennusteen geopotentiaalikorkeuksista, joista vähennetään asetettu hyppypaikan korkeus merenpinnasta. Käsin syötetyillä tuulilla käytetään kiinteitä korkeuksia merenpinnasta samalla korjauksella. Korkeudet pyöristetään vain näytettäessä; ympäröivää maastoa ei mallinneta.",
    "settings.freefallSpeedHelp":
        "Vapaapudotusarviossa käytettävä pystysuuntainen rajanopeus. Laskennan pystynopeus alkaa nollasta, ja arvio huomioi lentokoneelta perityn etenemisnopeuden. Tuulen muutokset vaikuttavat hyppääjään vähitellen. Esivalinnat asettavat vain tämän nopeuden; ne eivät mallinna vaakasuuntaista liukumista tai liitopuvun liitoa.",
    "settings.nextJumperHelp":
        "Nämä arvot koskevat myöhemmin lisättäviä hyppääjiä sekä oletusryhmää, kun hyppylinja luodaan ensimmäisen kerran.",
    "settings.jumpRun": "Hyppylinjan asetukset",
    "settings.jumpRunDirection": "Hyppylinjan suunta",
    "settings.defaultJumperCount": "Hyppyryhmien oletusmäärä",
    "settings.defaultJumperCountHelp":
        "Hyppyryhmien määrä, kun hyppylinja sijoitetaan ensimmäisen kerran eikä sen hyppääjälistaa ole muokattu. Jokainen ryhmä käyttää lisättävän hyppääjän asetuksia. Arvon muuttaminen ei muuta olemassa olevan hyppylinjan kokoa; lisää tai poista hyppääjiä listassa.",
    "settings.exitHeight": "Uloshyppykorkeus (m)",
    "settings.openingHeight": "Avauskorkeus (m)",
    "settings.freefallSpeed": "Vapaapudotusnopeus (km/h)",
    "settings.jumpRunSpeed": "Todellinen ilmanopeus (km/h)",
    "settings.jumperInterval": "Hyppääjien porrastus (s)",
    "settings.jumperIntervalHelp":
        "Peräkkäisten hyppyryhmien uloshyppyjen välinen aika sekunteina. Sama aikaväli koskee jokaista hyppylinjan ryhmää. Lentokoneen maanopeus, jossa huomioidaan tuuli uloshyppykorkeudella, määrää uloshyppykohtien välimatkan. Erilaiset vapaapudotusnopeudet ja avauskorkeudet voivat tuottaa erilaiset avautumiskohtien välit.",
    "settings.nextJumper": "Lisää hyppääjä",
    "settings.currentJumpers": "Nykyiset hyppääjät",
    "settings.jumpers": "Hyppääjät / hyppyryhmät",
    "settings.setJumpRunDirection": "Kierrä vetämällä",
    "settings.turnJumpRunIntoWind": "Käännä valittuun tuuleen",
    "settings.resetJumpRunDirection": "Palauta oletussuunta",
    "settings.rotateJumpRunClockwise": "Kierrä 90° oikealle",
    "settings.rotateJumpRunCounterclockwise": "Kierrä 90° vasemmalle",
    "settings.addJumper": "Lisää hyppääjä",
    "settings.jumper": (number) => `Hyppääjä ${number}`,
    "settings.removeJumper": (number) => `Poista hyppääjä ${number}`,
    "settings.speedExplanation":
        "Syötä todellinen ilmanopeus (TAS), ei mittarinopeutta (IAS). Uloshyppykorkeuden tuulen avulla lasketaan maanopeus valitulla lentoradalla. Maanopeus ja uloshyppyjen aikaväli määräävät uloshyppykohtien välimatkan. Vapaapudotusarvio huomioi myös lentokoneelta perityn etenemisnopeuden.",
    "settings.exitExplanation":
        "Uloshyppykorkeus on yhteinen kaikille hyppääjille. Sen on oltava jokaisen olemassa olevan hyppääjän avauskorkeutta sekä lisättävälle hyppääjälle asetettua avauskorkeutta ylempänä.",
    "settings.profileRange":
        "Avauskorkeuden on oltava vähintään 800 m hyppypaikan maanpinnasta ja uloshyppykorkeuden alapuolella. Laskenta käyttää korkeudeltaan lähintä tuulitasoa myös saatavilla olevan tuuliprofiilin ylä- ja alapuolella.",
    "settings.openingRange":
        "Korkeus, johon ennustettu vapaapudotusreitti päättyy. Sen on oltava vähintään 800 m ja uloshyppykorkeutta alempana. Matalampi avaus antaa yleensä enemmän aikaa vapaapudotusajautumiselle.",
    "highWinds.title": "ECMWF Ylätuuliennusteet",
    "highWinds.helpForecast":
        "Nämä ovat ennusteita, eivät mittaushavaintoja. Sovellus pyytää Open-Meteon rajapinnasta tuntikohtaisen tuulen nopeuden ja suunnan ennustesijainnin koordinaateille.",
    "highWinds.helpLevels":
        "Arvot tulevat painepinnoilta 1 000, 925, 850, 700, 600, 500 ja 400 hPa. Rivien korkeudet ovat nykyisen tai ensimmäisen saatavilla olevan jakson korkeuksia merenpinnasta, pyöristettyinä 500 metriin. Rivien ja solujen työkaluvihjeet näyttävät korkeudet metrin tarkkuudella; muiden jaksojen korkeudet voivat poiketa näistä.",
    "highWinds.helpPeriods":
        "Kooste näyttää kolmen tunnin jaksot. Meneillään oleva jakso käyttää nykyisen tunnin ennustetta, ja muut jaksot ovat kolmen tuntiennusteen keskiarvoja. Tarkat tiedot näyttävät jokaisen tunnin erikseen. Tiedot haetaan kullekin sijainnille enintään kerran tunnissa ja säilytetään selaimen välimuistissa.",
    "highWinds.showSummary": "Näytä kooste",
    "highWinds.showDetails": "Näytä tarkat tiedot",
    "footer.airfieldElevation": "Lentokentän korkeus meren pinnasta",
    "footer.observationStation": "Havaintotiedot haettu havaintoasemalta",
    "footer.and": "ja",
    "footer.code": "Koodi",
    "manual.active": "Manuaalitila käytössä.",
    "manual.manualValues": "Käytössä on käsin syötettyjä arvoja.",
    "manual.edit": "Muokkaa",
    "manual.restore": "Palauta oikeat tiedot",
    "manual.title": "Manuaalitila",
    "manual.metar": "METAR-teksti",
    "manual.upperTitle": "Open-Meteon tuulet nykyiselle tunnille",
    "manual.altitude": "Korkeus maasta (m)",
    "manual.belowGroundHelp":
        "Negatiivinen korkeus on hyppypaikan maanpinnan alapuolella. Maanpinnan tasolla tai sen alapuolella olevia rivejä ei käytetä ajautumislaskennassa.",
    "manual.freefallWindHelp":
        "Vapaapudotusajautuminen käyttää kullakin korkeudella lähintä tuulitasoa uloshypystä avaukseen. Tuulitaso vaihtuu korkeuksien puolivälissä. Uloshyppykorkeuden tuuli vaikuttaa myös lentokoneen maanopeuteen ja hyppääjien välisiin etäisyyksiin.",
    "manual.canopyWindHelp":
        "Varjon varassa ajautuminen käyttää samaa tuuliprofiilia avauksesta maanpintaan sekä tuoreita maanpinnan havaintoja nollakorkeudella. Ajautuminen riippuu kussakin tuulikerroksessa laskeutumiseen kuluvasta ajasta.",
    "manual.windRangeHelp":
        "Saatavilla olevan korkeusvälin ulkopuolella käytetään lähintä tuulitasoa. Maanpinnan tasolla tai sen alapuolella olevat rivit jätetään pois. Jos tarvittava tuuliarvo puuttuu, kyseinen ajautumisarvio ei ole saatavilla.",
    "manual.upperHelp":
        "Taulukon muokkaus korvaa kartan, vapaapudotuksen ja varjon varassa ajautumisen laskennassa käytettävät korkeustuulet. Korkeudet ovat hyppypaikan maanpinnasta, ja oletuksena käytetään nykyisen ennusteen korkeuksia. Voit korvata ne lentokoneesta mitatuilla korkeuksilla. Paikkamerkit näyttävät pyöristetyt oletusarvot. Syötetyn arvon tyhjentäminen palauttaa ennusteen oletusarvon. Maanpinnan tuuli tulee alla olevista havainnoista.",
    "manual.description":
        "Käsin syötetyt arvot tallennetaan osoitteen MANUAL_-parametreihin. Tyhjä METAR-kenttä käyttää oikeita tietoja.",
    "manual.capture": "Tallenna nykyiset arvot manuaaliarvoiksi",
    "manual.copyUrl": "Kopioi URL",
    "manual.clear": "Tyhjennä manuaaliarvot",
    "manual.resetUpperWinds": "Palauta ennustetuulet",
    "manual.resetGroundObservations": "Palauta oikeat havainnot",
    "manual.groundTitle": "Maanpinnan havainnot viimeiseltä tunnilta",
    "manual.minutesAgo": "Min sitten",
    "manual.meanWindUnit": "Keski (m/s)",
    "manual.directionUnit": "Suunta (°)",
    "manual.saved": "Nykyiset arvot tallennettu osoitteeseen.",
    "manual.copied": "Osoite kopioitu.",
    "manual.copyFailed":
        "Kopiointi ei onnistunut. Kopioi osoite alla olevasta kentästä.",
    "manual.windInvalid":
        "Tarkista korkeuden, tuulen nopeuden ja suunnan sallitut rajat.",
    "manual.metarInvalid":
        "METAR-tekstin lukeminen epäonnistui. Tarkista teksti.",
    "manual.observationsInvalid": "Tarkista havaintojen tuuliarvot ja suunnat.",
    "manual.immediate":
        "Muokkaukset tulevat voimaan heti ja tallentuvat osoitteeseen.",
    "manual.shareUrl": "Jaettava osoite",
    "manual.groundHelp":
        "Uusin rivi on nykyinen maanpinnan tuuli. Taulukon muokkaus korvaa viimeisen tunnin havainnot. Tuuliarvon tyhjentäminen palauttaa oikean havainnon. Suunta −1 tarkoittaa vaihtelevaa tuulta.",
    "manual.meanWind": "Keskituuli",
    "manual.queryString": "Kyselymerkkijono",
    "footer.stationDistance": (km) => `Etäisyys havaintoasemalle ${km} km.`,
    "footer.disclaimer":
        "Tietojen käyttö omalla vastuulla. Ei takeita että tiedot ovat oikein.",
    "footer.logbook": "Psst, onko tarvetta hyppypäiväkirjalle? Tsekkaa",
    "title.edit": "Muokkaa nimeä",
    "forecast.location": "Ennuste on tehty alueelle",
    "title.emptyName": "Tyhjä nimi palauttaa automaattisen nimen.",
    "landing.dropzones": "Hyppypaikat",
    "landing.complete": "Seuraaville hyppypaikoille löytyy kattavat säätiedot:",
    "landing.partial":
        "Vajaavaiset tiedot löytyvät myös seuraaville paikoille:",
    "landing.mapRegion": "Valitse DZ:n sijainti kartalta",
    "landing.useLocation": "Käytä nykyistä sijaintiani",
    "landing.clear": (label) => `Tyhjennä ${label}`,
    "landing.coordinatesMissing": "Koordinaatit puuttuvat",
    "landing.stationOrCoordinates":
        "Anna koordinaatit tai FMI:n tai Fintrafficin havaintoaseman tunnus.",
    "landing.create": "Luo hyppypaikka",
    "landing.coordinates": "DZ koordinaatit",
    "landing.mapHelp":
        "Avaa hyppypaikka napsauttamalla sen merkkiä tai luo uusi hyppypaikka napsauttamalla muualle kartalla.",
    "landing.mapCreate": "Luo hyppypaikka",
    "landing.placeSearch": "Hae paikkaa",
    "landing.search": "Hae",
    "landing.searching": "Haetaan…",
    "landing.searchResults": "Paikkahaun tulokset",
    "landing.searchEmpty":
        "Paikkoja ei löytynyt. Kokeile toista nimeä tai osoitetta.",
    "landing.searchError": "Paikkahaku epäonnistui. Yritä uudelleen.",
    "landing.optional": "valinnainen",
    "landing.stationSource": "Havaintojen lähde",
    "landing.onlyNameRequired":
        "Vain nimi on pakollinen. Kaikki muut kentät ovat valinnaisia.",
    "landing.latitude": "Leveysaste",
    "landing.longitude": "Pituusaste",
    "landing.decimal": "Desimaalimuodossa.",
    "landing.other": "Muut tiedot",
    "landing.name": "Nimi",
    "landing.locationGroup": "Hyppypaikan sijainti",
    "landing.weatherGroup": "Säähavainnot",
    "landing.jumpRunGroup": "Hyppylinjan oletukset",
    "landing.defaultJumpRunDirection": "Hyppylinjan oletussuunta",
    "landing.defaultJumpRunDirectionHelp":
        "Asteina (0–360). Yleensä kiitotien suunta.",
    "landing.defaultExitAltitude": "Uloshyppykorkeuden oletus (m)",
    "landing.defaultExitAltitudeHelp":
        "Metreinä hyppypaikan maanpinnasta. Korkeuden on oltava yli 800 m.",
    "landing.defaultJumperCount": "Hyppyryhmien oletusmäärä",
    "landing.defaultJumperCountHelp":
        "Käytetään hyppylinjan automaattisessa luonnissa.",
    "landing.fmiHelp": "Hae Ilmatieteenlaitoksen havaintoaseman FMISID",
    "landing.here": "täältä",
    "landing.roadStation": "Fintraffic sääasema",
    "landing.roadHelp": "Hae aseman ID",
    "landing.icaoHelp":
        "Nelikirjaiminen lentokentän tunnus, esim. EFUT. Käytetään METAR-sanomiin ja pilvihavaintoihin.",
    "landing.createButton": "Luo",
    "landing.savedLocally":
        "Hyppypaikka tallennetaan vain tähän selaimeen. Hyppypaikan voi jakaa muille jakamalla sen linkin.",
    "landing.partialJamijarvi":
        "– Jämijärvi. Ei METAR-sanomia, havaintoasema kaukana.",
    "landing.partialAlavus":
        "– Alavus. Ei METAR-sanomia, käytetään tieliikenteen säähavaintoasemaa.",
    "landing.partialVesivehmaa":
        "– Vesivehmaa, Asikkala. Vain METAR-sanomat ja ennusteet.",
    "landing.partialImmola": "– Immola. Ei METAR-sanomia.",
    "landing.partialMeripuisto":
        "– Meripuisto, Helsinki. EFKH:n havainnot ja METAR-sanomat.",
};

export const supportedLanguages = /** @type {const} */ (["en", "fi"]);

function browserLanguage() {
    return navigator.language.toLowerCase().startsWith("fi") ? "fi" : "en";
}

const savedLanguage = localStorage.getItem("language");
/** @type {Signal<"en" | "fi">} */
export const LANGUAGE = signal(
    savedLanguage === "en" || savedLanguage === "fi"
        ? savedLanguage
        : browserLanguage(),
);

const catalogs = { en: english, fi: finnish };

export function getIntlLocale() {
    return LANGUAGE.value === "fi" ? "fi-FI" : "en-US";
}

/** @param {"en" | "fi"} language */
export function setLanguage(language) {
    LANGUAGE.value = language;
    localStorage.setItem("language", language);
}

/**
 * @template {keyof typeof english} K
 * @param {K} key
 * @param {TranslationArgs<(typeof english)[K]>} args
 * @returns {string}
 */
export function t(key, ...args) {
    const value = /** @type {string | ((...args: any[]) => string)} */ (
        catalogs[LANGUAGE.value][key]
    );
    return typeof value === "function" ? value(...args) : value;
}

effect(() => {
    const language = LANGUAGE.value;
    document.documentElement.lang = language;
    for (const element of document.querySelectorAll("[data-language]")) {
        if (element instanceof HTMLElement) {
            element.hidden = element.dataset.language !== language;
        }
    }
});
