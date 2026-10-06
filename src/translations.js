// @ts-check
import { effect, signal } from "@preact/signals";

export const english = {
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
    "menu.removeSaved": (/** @type {string} */ name) =>
        `Remove saved dropzone ${name}`,
    "menu.confirmRemove": "Are you sure you want to remove the saved DZ?",
    "menu.namePrompt": "Name",
    "time.clock": (/** @type {string} */ time) => `at ${time}`,
    "weather.clock": "Time",
    "weather.gust": "Gust",
    "weather.wind": "Wind",
    "weather.direction": "Direction",
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
    "compass.help":
        "The ranges below the wind readings show the minimum and maximum gust, mean wind, and direction observed during the last hour. Values are rounded to whole numbers. The arrow shows wind direction and its length shows the gust. The orange circle is the student limit (8 m/s), and the black circle is the licence limit (11 m/s). The animation replays the last hour chronologically. When it is off, the arrow shows the latest observation.",
    "source.openMeteoModeled": "Open-Meteo (modeled)",
    "source.developerMode": "Developer mode",
    "error.noMetar": (/** @type {string} */ code) =>
        `No METAR message for ${code}.`,
    "error.stationNotFound": (/** @type {string} */ id) =>
        `Observation station ${id} was not found.`,
    "error.stationInvalid": (/** @type {string} */ id) =>
        `Observation station ${id} does not appear to work here.`,
    "error.coordinatesMissing":
        "Coordinates are missing. Enter latitude and longitude or select an FMI or Fintraffic observation station.",
    "error.noForecasts": "No forecasts found.",
    "error.fmiFetch": (/** @type {string} */ id) =>
        `Error retrieving data from FMI observation station ${id}.`,
    "fromNow.hours": (/** @type {number} */ value) =>
        new Intl.RelativeTimeFormat(getIntlLocale()).format(value, "hours"),
    "fromNow.minutes": (/** @type {number} */ value) =>
        new Intl.RelativeTimeFormat(getIntlLocale()).format(value, "minutes"),
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
    "cloud.modelledLayers": "Modelled clouds · current hour",
    "cloud.altitudeSeaLevel": "Altitude above sea level",
    "cloud.modelUnavailable": "Current cloud forecast unavailable.",
    "cloud.modelledMeaning":
        "Modelled means a computer weather model estimates the clouds using weather observations and calculations of how the atmosphere changes. This is the model's estimate for the current hour near the selected coordinates, rather than a direct cloud observation. Actual cloud cover and heights may differ.",
    "cloud.modelledCoverage":
        "The percentage estimates the part of the model's area covered by clouds at this altitude. It is not the probability of clouds. The sampled altitude is not a cloud base or top, and clouds between the sampled levels may be missed.",
    "cloud.modelHelp":
        "Modelled cloud cover at sampled altitudes, not live observations or cloud bases. Clouds between levels may be missed.",
    "cloud.forecast": "Cloud forecast",
    "cloud.forecast12h": "Forecast · 12 hours",
    "cloud.forecastTable": "Detailed cloud forecast",
    "cloud.hourlyForecast": "Hourly cloud forecast, scroll horizontally",
    "cloud.cover": "Cloud cover",
    "cloud.totalCover": "Total cloud cover",
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
        "Open-Meteo rows show cloud cover at modeled altitudes above sea level, rounded to the nearest 50 metres.",
    "cloud.coverage": (/** @type {string} */ value) => `${value} of sky`,
    "cloud.condensationEstimate": "Condensation level estimate",
    "cloud.baseHelp":
        "Cloud base is the height of the bottom of the cloud layer above the observation site's ground level.",
    "cloud.roundingHelp": "The card value is rounded to the nearest 50 metres.",
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
    "title.groundTemperature": (/** @type {string} */ value) =>
        `${value}°C ground,`,
    "title.altitudeTemperature": (/** @type {string} */ value) =>
        `${value}°C at 4 km`,
    "title.temperatureHelp":
        "Temperature change according to the ICAO standard atmosphere in the troposphere (-6.5°C/km)",
    "map.loading": "Loading map…",
    "common.retry": "Try again",
    "map.title": "Windmap",
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
        "Open-Meteo provides wind speed and direction at pressure levels. The app maps them to approximate altitudes of 110, 800, 1,500, 3,000, and 4,200 m above sea level and interpolates between 800 and 4,200 m for the freefall-drift estimate.",
    "map.forecastImplicationHelp":
        "Actual winds at the dropzone can differ from the forecast, especially between the modelled levels or when conditions change. Treat the drift arrow and jump-run layout as planning estimates, verify the current conditions with observations and information from the pilot or dropzone, and do not use the map as the sole basis for operational decisions.",
    "map.groundObservationHelp":
        "The Ground row is separate from the forecast and shows the latest available measurement from the configured observation station.",
    "map.usingHelpTitle": "Using the map",
    "map.jumpRunHelpTitle": "Jump run",
    "map.selectWind": "Select an altitude to show its wind on the map.",
    "map.navigationHelp": "Pan and zoom the map with two fingers.",
    "map.jumpRunHelp":
        "Each jumper or jump group gets a predicted freefall-drift arrow. Settings control ground track, aircraft true airspeed, exit interval, and shared exit altitude. Each jumper has its own opening altitude and freefall speed.",
    "map.automaticHelpTitle": "Automatic placement",
    "map.automaticHelp":
        "On initial placement, the configured default axis is reversed when necessary to face into the average 4200–800 m wind. Every predicted opening is placed at least 50 m upwind of the landing target relative to each non-calm wind layer at or below that opening. The preferred offset estimates canopy wind drift at a constant descent speed of 5 m/s, using ground, 110 m, 800 m, and any higher layers below opening. This does not model canopy glide or guarantee landing-area reachability.",
    "map.automaticLimitsHelp":
        "Automatic placement requires a ground observation no older than one hour and current forecast winds. Missing data, an unachievable ground track, or conflicting wind directions can prevent placement. The positioning button repeats the calculation for the configured landing coordinates using the current direction. Manual edits and later weather updates do not automatically repeat placement and can leave openings outside these limits.",
    "map.positioningHelpTitle": "Manual positioning",
    "map.positioningHelp":
        "Click or tap the map, then choose Opening to place the central predicted opening point there, Center jump run to place the middle of the exit sequence there, or Landing to use that point as the landing target for automatic placement with the current direction. For an even number of jumpers, the central opening point is the midpoint of the two middle openings. Clicking elsewhere cancels the callout. Press Enter on the focused map to place the central opening point at the map centre. Add jumpers with the plus button.",
    "map.directionHelpTitle": "Direction controls",
    "map.directionControlsHelp":
        "The direction menu contains drag mode, 90° rotations, and reset. In drag mode, drag with the mouse or a finger to rotate the run around its central predicted opening point. Click the map or press the direction button again to finish. Reset restores the configured default axis, reversed when necessary to face into the average wind, while keeping that opening point.",
    "map.legendHelp":
        "Arrows show flow direction. Line length represents speed.",
    "map.flowHelp":
        "Moving lines show the selected wind's flow direction. Stronger wind appears as longer, faster-moving lines.",
    "map.confirmJumpRunPosition": "Opening",
    "map.centerJumpRunPosition": "Center jump run",
    "map.parachuteLandingPosition": "Landing",
    "map.directionPrompt": "Drag to set the jump-run direction.",
    "map.averageHelp":
        "Average speed and direction at 800, 1,500, 3,000, and 4,200 m. Direction averaging accounts for crossing north and provides a rough freefall-drift estimate.",
    "map.shareFailed": "Sharing the map failed.",
    "map.driftUnavailable":
        "Drift estimate unavailable: upper-wind data is missing.",
    "map.automaticRunUnavailable":
        "Automatic placement unavailable: current wind data is missing, the track cannot be flown, or all openings cannot be placed upwind of every lower wind layer.",
    "map.jumpRunUnavailable":
        "Jump-run positions unavailable: exit-altitude wind is missing or the selected track cannot be flown at this airspeed.",
    "map.directionHint":
        "Drag with the mouse or a finger. Open the direction menu and press the direction button again to finish.",
    "toolbar.freefallValues": "Freefall values",
    "toolbar.jumpRun": "Jump run",
    "toolbar.removeJumper": "Remove jumper",
    "toolbar.removeJumpRun": "Remove jump run",
    "toolbar.positionJumpRun": "Automatic jump run position",
    "toolbar.shareMap": "Share map",
    "toolbar.restoreMap": "Restore Windmap",
    "toolbar.expandMap": "Expand Windmap to full window",
    "toolbar.exit": "Exit",
    "toolbar.exitTooltip":
        "Exit altitude used for all jumpers on the jump run.",
    "toolbar.openingTooltip": "Opening altitude for the next jumper you add.",
    "toolbar.speedTooltip": "Freefall speed for the next jumper you add.",
    "toolbar.jumpRunTooltip":
        "Jump-run ground track and aircraft true airspeed. Wind is accounted for when calculating ground speed.",
    "toolbar.separation": "Separation",
    "toolbar.separationTooltip":
        "Time between consecutive jumper exits on the jump run.",
    "toolbar.opening": "Opening",
    "toolbar.speed": "Speed",
    "toolbar.windLevels": "Wind levels",

    "settings.jumpRunDirectionHelp":
        "Direction of travel over the ground: 0°/360° north, 90° east, 180° south, and 270° west. Wind correction determines the aircraft heading needed to follow this track. Changing direction rotates an existing run around its central predicted opening point. Missing wind data or a track that cannot be flown at the selected airspeed can prevent the calculation.",
    "settings.altitudeReferenceHelp":
        "The calculation uses nominal forecast heights, approximately above sea level, without correcting for dropzone elevation. These values are not a terrain-adjusted height-above-ground model.",
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
    "settings.jumperInterval": "Jumper interval (s)",
    "settings.jumperIntervalHelp":
        "Time in seconds between consecutive jump group exits. The same interval applies to every group on the jump run. The aircraft’s ground speed, including wind at exit altitude, determines the distance between exit points. Different freefall speeds and opening altitudes can produce different spacing between opening points.",
    "settings.nextJumper": "Settings for the next jumper",
    "settings.currentJumpers": "Current jumpers",
    "settings.jumpers": "Jumpers / jump groups",
    "settings.setJumpRunDirection": "Freely rotate the jump run by dragging",
    "settings.resetJumpRunDirection": "Reset jump run to default direction",
    "settings.rotateJumpRunClockwise": "Rotate jump run 90° clockwise",
    "settings.rotateJumpRunCounterclockwise":
        "Rotate jump run 90° counterclockwise",
    "settings.addJumper": "Add jumper",
    "settings.jumper": (/** @type {number} */ number) => `Jumper ${number}`,
    "settings.removeJumper": (/** @type {number} */ number) =>
        `Remove jumper ${number}`,
    "settings.speedExplanation":
        "Enter true airspeed (TAS), not indicated airspeed (IAS). Wind at exit altitude is used to calculate ground speed along the selected ground track. Ground speed and the exit interval determine the distance between exit points. The freefall estimate also includes forward movement inherited from the aircraft.",
    "settings.exitExplanation":
        "The exit altitude is shared by all jumpers. It must be above every existing jumper’s opening altitude and the opening altitude set for the next jumper.",
    "settings.profileRange":
        "The freefall calculation supports altitudes from 800 to 4,200 m.",
    "settings.openingRange":
        "Altitude where the predicted freefall path ends. It must be at least 800 m and below exit altitude. Lower openings generally allow more time for freefall drift.",
    "highWinds.title": "ECMWF upper-wind forecasts",
    "highWinds.helpForecast":
        "These are forecasts, not measurements. The app requests hourly wind speed and direction from Open-Meteo for the forecast coordinates.",
    "highWinds.helpLevels":
        "The values come from the 1,000, 925, 850, 700, and 600 hPa pressure levels, shown as approximate altitudes of 110, 800, 1,500, 3,000, and 4,200 m.",
    "highWinds.helpPeriods":
        "The summary shows three-hour periods. The current period uses the forecast for the current hour; other periods average three hourly forecasts. Details shows every hour separately. Data for each location is fetched at most once per hour and cached in the browser.",
    "highWinds.showSummary": "Show summary",
    "highWinds.showDetails": "Show details",
    "footer.airfieldElevation": "Airfield elevation above sea level",
    "footer.observationStation": "Observation data retrieved from station",
    "footer.and": "and",
    "footer.code": "Code",
    "developer.active": "Developer mode active.",
    "developer.testSettings": "Test settings are in use.",
    "developer.edit": "Edit",
    "developer.restore": "Restore real data",
    "developer.title": "Developer mode",
    "developer.debug": "Debug mode (console logs and all observation times)",
    "developer.mock": "Use FMI sample data",
    "developer.metar": "METAR text",
    "developer.upperTitle": "Open-Meteo winds for the current hour",
    "developer.altitude": "Altitude",
    "developer.upperHelp":
        "Editing this table replaces the five altitude winds used by the map, freefall and canopy drift calculations. An empty value means missing wind data. Ground wind comes from the observations below.",
    "developer.description":
        "Test values are stored in DEV_ URL parameters. An empty METAR field uses real data.",
    "developer.capture": "Save current values as test values",
    "developer.copyUrl": "Copy URL",
    "developer.clear": "Clear test values",
    "developer.groundTitle": "Ground observations from the last hour",
    "developer.minutesAgo": "Minutes ago",
    "developer.meanWindUnit": "Mean (m/s)",
    "developer.directionUnit": "Direction (°)",
    "developer.saved": "Current values saved in the URL.",
    "developer.copied": "URL copied.",
    "developer.copyFailed": "Copy failed. Copy the URL from the field below.",
    "developer.windInvalid":
        "Check the allowed wind-value and direction ranges.",
    "developer.metarInvalid": "Could not parse the METAR text. Check the text.",
    "developer.observationsInvalid":
        "Check the observation wind values and directions.",
    "developer.immediate":
        "Changes take effect immediately and are stored in the URL.",
    "developer.shareUrl": "Shareable URL",
    "developer.groundHelp":
        "The newest row is the current ground wind. Editing the table replaces the last hour of observations. An empty wind value means a missing observation. Direction −1 means variable wind.",
    "developer.meanWind": "Mean wind",
    "developer.queryString": "Query string",
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
    "landing.mapHelp": "Click the map to select the dropzone location.",
    "landing.latitude": "Latitude",
    "landing.longitude": "Longitude",
    "landing.decimal": "In decimal format.",
    "landing.other": "Other information",
    "landing.name": "Name",
    "landing.defaultJumpRunDirection": "Default jump run direction",
    "landing.defaultJumpRunDirectionHelp": "In degrees (0–360).",
    "landing.defaultJumperCount": "Default jump group count",
    "landing.defaultJumperCountHelp":
        "Used when automatically creating a jump run.",
    "landing.fmiHelp": "Find the FMISID of an FMI observation station",
    "landing.here": "here",
    "landing.roadStation": "Fintraffic weather station",
    "landing.nearestRoadStation": "Find the nearest road station",
    "landing.roadHelp":
        "If no suitable FMI observation station is available, you can use a Fintraffic road weather station instead. Find its station ID",
    "landing.icaoHelp": "Four-letter airport identifier, e.g. EFUT",
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
    "menu.removeSaved": (name) => `Poista tallennettu hyppypaikka ${name}`,
    "menu.confirmRemove": "Haluatko varmasti poistaa tallennetun DZ:n?",
    "menu.namePrompt": "Nimi",
    "time.clock": (time) => `klo ${time}`,
    "weather.clock": "Kello",
    "weather.gust": "Puuska",
    "weather.wind": "Tuuli",
    "weather.direction": "Suunta",
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
    "compass.help":
        "Tuulilukemien alla näkyvät vaihteluvälit kertovat puuskan, keskituulen ja suunnan pienimmän ja suurimman havaitun arvon viimeisen tunnin ajalta. Arvot on pyöristetty kokonaisluvuiksi. Kompassin nuoli kertoo tuulen suunnan ja pituus tuulen puuskan. Oranssi ympyrä on oppilasraja (8 m/s) ja musta ympyrä on kelppariraja (11 m/s). Animaatio toistaa viimeisen tunnin havainnot aikajärjestyksessä. Kun animaatio on pois päältä, nuoli näyttää uusimman havainnon.",
    "source.openMeteoModeled": "Open-Meteo (mallinnettu)",
    "source.developerMode": "Kehittäjätila",
    "error.noMetar": (code) => `Ei METAR-sanomaa kentälle ${code}.`,
    "error.stationNotFound": (id) => `Havaintoasemaa ${id} ei löytynyt.`,
    "error.stationInvalid": (id) =>
        `Havaintoasema ${id} ei taida toimia tässä.`,
    "error.coordinatesMissing":
        "Koordinaatit puuttuvat. Anna leveys- ja pituusaste tai määritä FMI:n tai Fintrafficin havaintoasema.",
    "error.noForecasts": "Ennusteita ei löytynyt.",
    "error.fmiFetch": (id) =>
        `Virhe Ilmatieteenlaitoksen havaintoaseman ${id} tietojen hakemisessa.`,
    "fromNow.hours": (value) =>
        new Intl.RelativeTimeFormat(getIntlLocale()).format(value, "hours"),
    "fromNow.minutes": (value) =>
        new Intl.RelativeTimeFormat(getIntlLocale()).format(value, "minutes"),
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
    "cloud.modelledLayers": "Mallinnetut pilvet · nykyinen tunti",
    "cloud.altitudeSeaLevel": "Korkeus merenpinnasta",
    "cloud.modelUnavailable": "Nykyisen tunnin pilviennuste ei ole saatavilla.",
    "cloud.modelledMeaning":
        "Mallinnettu tarkoittaa, että tietokoneen säämalli arvioi pilviä säähavaintojen ja ilmakehän muutoksia kuvaavien laskelmien avulla. Tämä on mallin arvio nykyiselle tunnille valittujen koordinaattien lähellä, ei suora pilvihavainto. Todellinen pilvipeitto ja pilvien korkeudet voivat poiketa arviosta.",
    "cloud.modelledCoverage":
        "Prosenttiluku arvioi, kuinka suuri osa mallin alueesta on pilvien peitossa tällä korkeudella. Se ei tarkoita pilvien todennäköisyyttä. Näytetty korkeus ei ole pilven ala- tai yläraja, ja tasojen välissä olevat pilvet voivat jäädä näkymättä.",
    "cloud.modelHelp":
        "Mallinnettu pilvipeitto eri korkeuksilla, ei reaaliaikainen havainto tai pilven alaraja. Tasojen välissä olevat pilvet voivat jäädä näkymättä.",
    "cloud.forecast": "Pilvien ennuste",
    "cloud.forecast12h": "Ennuste · 12 tuntia",
    "cloud.forecastTable": "Yksityiskohtainen pilviennuste",
    "cloud.hourlyForecast": "Pilvien tuntiennuste, vieritä sivulle",
    "cloud.cover": "Pilvipeitto",
    "cloud.totalCover": "Kokonaispilvipeite",
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
        "Open-Meteon rivit näyttävät pilvipeiton mallinnetuilla korkeuksilla merenpinnasta, pyöristettynä lähimpään 50 metriin.",
    "cloud.coverage": (value) => `${value} taivaasta`,
    "cloud.condensationEstimate": "Tiivistymiskorkeuden arvio",
    "cloud.baseHelp":
        "Pilven alaraja on pilvikerroksen pohjan korkeus havaintopaikan maanpinnasta.",
    "cloud.roundingHelp": "Kortin arvo on pyöristetty lähimpään 50 metriin.",
    "cloud.metarHeightHelp":
        "METARin numerot ilmaisevat korkeuden satoina jalkoina (ft).",
    "cloud.estimateHelp": (temperature, dewPoint) =>
        `Arvio mahdollisten pilvien korkeudesta tiivistymiskorkeuden perusteella. Laskettu lämpötilasta ${temperature}°C ja kastepisteestä ${dewPoint}°C pyöristäen lähimpään 100 metriin.`,
    "cloud.estimateCaveat":
        "Arvio on järjellinen vain silloin kun pilvet ovat muodostuneet mittauspaikalla. Jos pilvet ovat muodostuneet toisaalla eri lämpötilassa ja kastepisteessä ja saapuneet tuulen mukana, arvio on todennäköisesti päin prinkkalaa.",
    "cloud.forecastHelp":
        "Tiivistymiskorkeuden ja matalien (alle 2 km) pilvien peittävyyden tuntiennuste. Vieritä sivulle nähdäksesi lisää tunteja.",
    "title.groundTemperature": (value) => `${value}°C maassa,`,
    "title.altitudeTemperature": (value) => `${value}°C 4km:ssä`,
    "title.temperatureHelp":
        "ICAO:n ilmakehämallin mukainen lämpötilan muutos troposfäärissä (-6.5°C/km)",
    "map.loading": "Ladataan karttaa…",
    "common.retry": "Yritä uudelleen",
    "map.title": "Tuulikartta",
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
        "Open-Meteo antaa tuulen nopeuden ja suunnan painepinnoilla. Sovellus yhdistää ne likimääräisiin korkeuksiin 110, 800, 1 500, 3 000 ja 4 200 m merenpinnasta ja interpoloi vapaapudotusajautumista varten korkeuksien 800 ja 4 200 m väliset tuulet.",
    "map.forecastImplicationHelp":
        "Hyppypaikan todellinen tuuli voi poiketa ennusteesta etenkin mallinnettujen korkeuksien välillä tai sään muuttuessa. Käytä ajautumisnuolta ja hyppylinjaa suunnittelun arvioina, varmista vallitsevat olosuhteet havainnoista sekä lentäjältä tai hyppypaikalta äläkä tee operatiivisia päätöksiä pelkän kartan perusteella.",
    "map.groundObservationHelp":
        "Maanpinta-rivi on ennusteesta erillinen ja näyttää viimeisimmän saatavilla olevan mittaustuloksen määritetyltä havaintoasemalta.",
    "map.usingHelpTitle": "Kartan käyttäminen",
    "map.jumpRunHelpTitle": "Hyppylinja",
    "map.selectWind": "Valitse korkeus nähdäksesi sen tuulen kartalla.",
    "map.navigationHelp": "Karttaa voi liikuttaa ja zoomata kahdella sormella.",
    "map.jumpRunHelp":
        "Jokaiselle hyppääjälle tai hyppyryhmälle piirretään ennustettu vapaapudotusajautumisen nuoli. Asetukset määrittävät lentoradan suunnan maan suhteen, lentokoneen todellisen ilmanopeuden, uloshyppyjen aikavälin ja yhteisen uloshyppykorkeuden. Jokaisella hyppääjällä on oma avauskorkeus ja vapaapudotusnopeus.",
    "map.automaticHelpTitle": "Automaattinen sijoitus",
    "map.automaticHelp":
        "Ensimmäisessä sijoituksessa määritetty oletusakseli käännetään tarvittaessa vasten 4200–800 m keskituulta. Jokainen ennustettu avautumiskohta sijoitetaan vähintään 50 m laskeutumiskohteen tuulenpuolelle suhteessa jokaiseen avautumiskorkeuden tai sen alapuoliseen tuulikerrokseen, jossa ei ole tyyntä. Tavoitesiirtymä arvioi varjon varassa tapahtuvaa tuuliajautumista vakionopeudella 5 m/s alaspäin käyttäen maanpinnan, 110 m:n, 800 m:n ja avautumisen alapuolisten ylempien kerrosten tuulia. Arvio ei mallinna varjon liitoa eikä takaa laskeutumisalueelle pääsyä.",
    "map.automaticLimitsHelp":
        "Automaattinen sijoitus vaatii enintään tunnin ikäisen maatuulihavainnon ja nykyisen tunnin ennustetuulet. Puuttuvat tiedot, lentorata jota ei voi lentää tai ristiriitaiset tuulensuunnat voivat estää sijoittamisen. Sijoituspainike toistaa laskennan määritetyille laskeutumiskoordinaateille nykyisellä suunnalla. Käsin tehdyt muutokset ja myöhemmät sääpäivitykset eivät toista sijoitusta automaattisesti ja voivat jättää avautumiskohtia näiden rajojen ulkopuolelle.",
    "map.positioningHelpTitle": "Sijoittaminen käsin",
    "map.positioningHelp":
        "Klikkaa tai napauta karttaa ja valitse Avaus sijoittaaksesi keskimmäisen ennustetun avautumiskohdan siihen, Keskitä hyppylinja sijoittaaksesi uloshyppyjonon keskikohdan siihen tai Laskeutuminen käyttääksesi kohtaa automaattisen sijoituksen laskeutumiskohteena nykyisellä suunnalla. Kun hyppääjien määrä on parillinen, keskimmäinen avautumiskohta on kahden keskimmäisen avautumiskohdan puolivälissä. Klikkaus muualle sulkee puhekuplan. Enter kohdistetulla kartalla sijoittaa keskimmäisen avautumiskohdan kartan keskikohtaan. Lisää hyppääjiä pluspainikkeesta.",
    "map.directionHelpTitle": "Suunnan säätäminen",
    "map.directionControlsHelp":
        "Suuntavalikko sisältää vetotilan, 90° kierrot ja palautuksen. Vedä vetotilassa hiirellä tai sormella kiertääksesi hyppylinjaa sen keskimmäisen ennustetun avautumiskohdan ympäri. Klikkaa karttaa tai paina suuntapainiketta uudelleen lopettaaksesi. Palautus palauttaa määritetyn oletusakselin, tarvittaessa käännettynä vasten keskituulta, säilyttäen tuon avautumiskohdan.",
    "map.legendHelp":
        "Nuolet näyttävät virtaussuunnan. Kartan viivojen pituus kuvaa nopeutta.",
    "map.flowHelp":
        "Kartan liikkuvat viivat näyttävät valitun tuulen virtaussuunnan. Voimakkaampi tuuli näkyy pidempinä ja nopeammin liikkuvina viivoina.",
    "map.confirmJumpRunPosition": "Avaus",
    "map.centerJumpRunPosition": "Keskitä hyppylinja",
    "map.parachuteLandingPosition": "Laskeutuminen",
    "map.directionPrompt": "Vedä asettaaksesi hyppylinjan suunnan.",
    "map.averageHelp":
        "Nopeuden ja suunnan keskiarvo korkeuksilta 800, 1500, 3000 ja 4200 m. Suunnan keskiarvo huomioi pohjoissuunnan ylityksen ja antaa karkean arvion vapaapudotusajautumisesta.",
    "map.shareFailed": "Kartan jakaminen epäonnistui.",
    "map.driftUnavailable":
        "Ajautumisarvio ei saatavilla: ylätuulitietoja puuttuu.",
    "map.automaticRunUnavailable":
        "Automaattinen sijoitus ei ole saatavilla: ajantasaisia tuulitietoja puuttuu, lentorataa ei voi lentää tai kaikkia avautumiskohtia ei voi sijoittaa jokaisen alatuulikerroksen tuulenpuolelle.",
    "map.jumpRunUnavailable":
        "Hyppylinjan paikat eivät ole saatavilla: uloshyppykorkeuden tuulitieto puuttuu tai valittua lentorataa ei voi lentää tällä ilmanopeudella.",
    "map.directionHint":
        "Vedä hiirellä tai sormella. Avaa suuntavalikko ja paina suuntapainiketta uudelleen lopettaaksesi.",
    "toolbar.freefallValues": "Vapaapudotuksen arvot",
    "toolbar.jumpRun": "Hyppylinja",
    "toolbar.removeJumper": "Poista hyppääjä",
    "toolbar.removeJumpRun": "Poista hyppylinja",
    "toolbar.positionJumpRun": "Hyppylinjan automaattinen sijoitus",
    "toolbar.shareMap": "Jaa kartta",
    "toolbar.restoreMap": "Palauta Tuulikartta",
    "toolbar.expandMap": "Laajenna Tuulikartta koko ikkunaan",
    "toolbar.exit": "Uloshyppy",
    "toolbar.exitTooltip": "Kaikkien hyppylinjan hyppääjien uloshyppykorkeus.",
    "toolbar.openingTooltip": "Seuraavaksi lisättävän hyppääjän avauskorkeus.",
    "toolbar.speedTooltip":
        "Seuraavaksi lisättävän hyppääjän vapaapudotusnopeus.",
    "toolbar.jumpRunTooltip":
        "Hyppylinjan suunta maan suhteen ja lentokoneen todellinen ilmanopeus. Tuuli huomioidaan maanopeuden laskennassa.",
    "toolbar.separation": "Hyppääjien väli",
    "toolbar.separationTooltip":
        "Peräkkäisten uloshyppyjen välinen aika hyppylinjalla.",
    "toolbar.opening": "Avaus",
    "toolbar.speed": "Nopeus",
    "toolbar.windLevels": "Tuulikorkeudet",
    "settings.jumpRunDirectionHelp":
        "Lentoradan suunta maan suhteen: 0°/360° pohjoinen, 90° itä, 180° etelä ja 270° länsi. Tuulikorjaus määrittää lentokoneen nokan suunnan, jolla tätä lentorataa seurataan. Suunnan muuttaminen kiertää olemassa olevaa hyppylinjaa sen keskimmäisen ennustetun avautumiskohdan ympäri. Puuttuvat tuulitiedot tai lentorata, jota ei voi lentää valitulla ilmanopeudella, voivat estää laskennan.",
    "settings.altitudeReferenceHelp":
        "Laskenta käyttää ennusteen nimelliskorkeuksia, likimäärin merenpinnasta, ilman hyppypaikan korkeuden korjausta. Arvot eivät muodosta maaston mukaan korjattua mallia korkeudesta maanpinnan yläpuolella.",
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
    "settings.jumperInterval": "Hyppääjien väli (s)",
    "settings.jumperIntervalHelp":
        "Peräkkäisten hyppyryhmien uloshyppyjen välinen aika sekunteina. Sama aikaväli koskee jokaista hyppylinjan ryhmää. Lentokoneen maanopeus, jossa huomioidaan tuuli uloshyppykorkeudella, määrää uloshyppykohtien välimatkan. Erilaiset vapaapudotusnopeudet ja avauskorkeudet voivat tuottaa erilaiset avautumiskohtien välit.",
    "settings.nextJumper": "Lisättävän hyppääjän asetukset",
    "settings.currentJumpers": "Nykyiset hyppääjät",
    "settings.jumpers": "Hyppääjät / hyppyryhmät",
    "settings.setJumpRunDirection": "Kierrä hyppylinjaa vapaasti vetämällä",
    "settings.resetJumpRunDirection": "Palauta hyppylinjan oletussuunta",
    "settings.rotateJumpRunClockwise": "Kierrä hyppylinjaa 90° myötäpäivään",
    "settings.rotateJumpRunCounterclockwise":
        "Kierrä hyppylinjaa 90° vastapäivään",
    "settings.addJumper": "Lisää hyppääjä",
    "settings.jumper": (number) => `Hyppääjä ${number}`,
    "settings.removeJumper": (number) => `Poista hyppääjä ${number}`,
    "settings.speedExplanation":
        "Syötä todellinen ilmanopeus (TAS), ei mittarinopeutta (IAS). Uloshyppykorkeuden tuulen avulla lasketaan maanopeus valitulla lentoradalla. Maanopeus ja uloshyppyjen aikaväli määräävät uloshyppykohtien välimatkan. Vapaapudotusarvio huomioi myös lentokoneelta perityn etenemisnopeuden.",
    "settings.exitExplanation":
        "Uloshyppykorkeus on yhteinen kaikille hyppääjille. Sen on oltava jokaisen olemassa olevan hyppääjän avauskorkeutta sekä lisättävälle hyppääjälle asetettua avauskorkeutta ylempänä.",
    "settings.profileRange":
        "Vapaapudotuslaskenta tukee korkeuksia 800–4200 m.",
    "settings.openingRange":
        "Korkeus, johon ennustettu vapaapudotusreitti päättyy. Sen on oltava vähintään 800 m ja uloshyppykorkeutta alempana. Matalampi avaus antaa yleensä enemmän aikaa vapaapudotusajautumiselle.",
    "highWinds.title": "ECMWF Ylätuuliennusteet",
    "highWinds.helpForecast":
        "Nämä ovat ennusteita, eivät mittaushavaintoja. Sovellus pyytää Open-Meteon rajapinnasta tuntikohtaisen tuulen nopeuden ja suunnan ennustesijainnin koordinaateille.",
    "highWinds.helpLevels":
        "Arvot tulevat painepinnoilta 1 000, 925, 850, 700 ja 600 hPa, jotka näytetään likimääräisinä korkeuksina 110, 800, 1 500, 3 000 ja 4 200 m.",
    "highWinds.helpPeriods":
        "Kooste näyttää kolmen tunnin jaksot. Meneillään oleva jakso käyttää nykyisen tunnin ennustetta, ja muut jaksot ovat kolmen tuntiennusteen keskiarvoja. Tarkat tiedot näyttävät jokaisen tunnin erikseen. Tiedot haetaan kullekin sijainnille enintään kerran tunnissa ja säilytetään selaimen välimuistissa.",
    "highWinds.showSummary": "Näytä kooste",
    "highWinds.showDetails": "Näytä tarkat tiedot",
    "footer.airfieldElevation": "Lentokentän korkeus meren pinnasta",
    "footer.observationStation": "Havaintotiedot haettu havaintoasemalta",
    "footer.and": "ja",
    "footer.code": "Koodi",
    "developer.active": "Kehittäjätila käytössä.",
    "developer.testSettings": "Käytössä on testiasetuksia.",
    "developer.edit": "Muokkaa",
    "developer.restore": "Palauta oikeat tiedot",
    "developer.title": "Kehittäjätila",
    "developer.debug": "Debug-tila (konsolilokit ja kaikki havaintoajat)",
    "developer.mock": "Käytä FMI:n esimerkkitietoja",
    "developer.metar": "METAR-teksti",
    "developer.upperTitle": "Open-Meteon tuulet nykyiselle tunnille",
    "developer.altitude": "Korkeus",
    "developer.upperHelp":
        "Taulukon muokkaus korvaa kartan, vapaapudotuksen ja varjon varassa ajautumisen laskennassa käytettävät viiden korkeuden tuulet. Tyhjä arvo tarkoittaa puuttuvaa tuulitietoa. Maanpinnan tuuli tulee alla olevista havainnoista.",
    "developer.description":
        "Testiarvot tallennetaan osoitteen DEV_-parametreihin. Tyhjä METAR-kenttä käyttää oikeita tietoja.",
    "developer.capture": "Tallenna nykyiset arvot testiarvoiksi",
    "developer.copyUrl": "Kopioi URL",
    "developer.clear": "Tyhjennä testiarvot",
    "developer.groundTitle": "Maanpinnan havainnot viimeiseltä tunnilta",
    "developer.minutesAgo": "Min sitten",
    "developer.meanWindUnit": "Keski (m/s)",
    "developer.directionUnit": "Suunta (°)",
    "developer.saved": "Nykyiset arvot tallennettu osoitteeseen.",
    "developer.copied": "Osoite kopioitu.",
    "developer.copyFailed":
        "Kopiointi ei onnistunut. Kopioi osoite alla olevasta kentästä.",
    "developer.windInvalid":
        "Tarkista tuuliarvojen ja suuntien sallitut rajat.",
    "developer.metarInvalid":
        "METAR-tekstin lukeminen epäonnistui. Tarkista teksti.",
    "developer.observationsInvalid":
        "Tarkista havaintojen tuuliarvot ja suunnat.",
    "developer.immediate":
        "Muokkaukset tulevat voimaan heti ja tallentuvat osoitteeseen.",
    "developer.shareUrl": "Jaettava osoite",
    "developer.groundHelp":
        "Uusin rivi on nykyinen maanpinnan tuuli. Taulukon muokkaus korvaa viimeisen tunnin havainnot. Tyhjä tuuliarvo tarkoittaa puuttuvaa havaintoa. Suunta −1 tarkoittaa vaihtelevaa tuulta.",
    "developer.meanWind": "Keskituuli",
    "developer.queryString": "Kyselymerkkijono",
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
    "landing.mapHelp": "Valitse hyppypaikan sijainti kartalta napsauttamalla.",
    "landing.latitude": "Leveysaste",
    "landing.longitude": "Pituusaste",
    "landing.decimal": "Desimaalimuodossa.",
    "landing.other": "Muut tiedot",
    "landing.name": "Nimi",
    "landing.defaultJumpRunDirection": "Hyppylinjan oletussuunta",
    "landing.defaultJumpRunDirectionHelp": "Asteina (0–360).",
    "landing.defaultJumperCount": "Hyppyryhmien oletusmäärä",
    "landing.defaultJumperCountHelp":
        "Käytetään hyppylinjan automaattisessa luonnissa.",
    "landing.fmiHelp": "Hae Ilmatieteenlaitoksen havaintoaseman FMISID",
    "landing.here": "täältä",
    "landing.roadStation": "Fintraffic sääasema",
    "landing.nearestRoadStation": "Hae lähin tieasema",
    "landing.roadHelp":
        "Jos sopivaa Ilmatieteenlaitoksen havaintoasemaa ei löydy, voit käyttää vaihtoehtoisesti Fintrafficin tiesääasemaa. Hae aseman ID",
    "landing.icaoHelp": "Nelikirjaminen lentokentän tunnus, esim. EFUT",
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
