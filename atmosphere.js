
/* Shared atmospheric state for every page. */
(function () {
 // The watches and their start hours are HOURS, in shared.js.
 const TIME_BLOCKS = HOURS;
 const WEATHER_KEY = 'earthly-hours-weather';
 // The measured values behind a "look outside" detection (temperature,
 // wind, cloud cover) — kept apart from the conditions themselves, and
 // only ever present while the active conditions are exactly the detected
 // ones: any manual change drops it (see toggleWeatherCondition), so a
 // stored 75° can never sit beside a hand-picked Cold.
 const READING_KEY = 'earthly-hours-weather-reading';
 // The rounded location from the last "look outside" (the same ~1 km
 // coordinates it sends to Open-Meteo), kept in this browser only, so the
 // Hours dial can work out each day's sunrise and sunset — see sunTimes()
 // — without another lookup, and without the day running out at midnight.
 // Not undone by choosing weather by hand: it's where you are, not what
 // the weather is.
 const LOCATION_KEY = 'earthly-hours-location';
 // One word each, on purpose — they're read out on their own (the Weather
 // card, the hour page) as well as under weather.js's picker row headings.
 const WEATHER = [
 'clear', 'dappled', 'overcast', 'mist', 'fog',
 'drizzle', 'rain', 'thunder', 'ice', 'snow',
 'wind', 'heat', 'cold', 'humid', 'changing',
 'dew', 'frost', 'puddles', 'parched', 'snowpack'
 ];

 // The one list of valid conditions — weather.js's weather picker builds its
 // tiles from this (deriving display labels mechanically, see
 // weatherLabel() there) instead of hand-maintaining a second, differently-
 // cased copy that has to be kept in sync by hand.
 window.WEATHER_VALUES = WEATHER.slice();

 // Every condition's kebab-case value ('snow-on-ground') mechanically
 // produces its display label ('Snow on ground') — capitalize the first
 // letter, turn hyphens into spaces — so there's no separate hand-written
 // display list to keep in sync. Global so hours.js's #weather-line and
 // weather.js's tiles/readout share one copy.
 window.weatherLabel = function (value) {
 return value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
 };

 // The one way a list of conditions is written out anywhere on the site
 // (the hour page's #weather-line, the Weather card's readout) — each name
 // in its own .wx element carrying data-wx, so styles.css can tint every
 // condition the same way wherever it appears.
 window.weatherConditionsHTML = function (values) {
 return (values || [])
 .map(value => `<span class="wx" data-wx="${value}">${window.weatherLabel(value)}</span>`)
 .join('<span class="sep" aria-hidden="true">✦</span>');
 };

 // How long a chosen/detected condition stays in effect before the site
 // quietly falls back to ambient (ordinary ticking clock/season, no
 // weather class). 3 hours, not 1 — real weather doesn't usually flip
 // inside an hour, and reverting too eagerly would undo someone's
 // choice mid-visit. Adjust this one line if that balance feels off.
 // Multiple conditions can be active at once (e.g. cold + snow), each
 // with its own setAt, so toggling one on doesn't reset the clock on
 // conditions already active.
 const WEATHER_TTL_MS = 3 * 60 * 60 * 1000;

 function timeKey(date) {
 const hour = date.getHours();
 return TIME_BLOCKS.slice().reverse().find(block => hour >= block.start).key;
 }

 // The season's months are defined once, in shared.js, which every page
 // loads before this file (scripts/check_data.py checks the order).
 function seasonKey(date) {
 return currentSeason(date);
 }

 function readEntries() {
 try {
 const raw = window.localStorage.getItem(WEATHER_KEY);
 if (!raw) return [];
 const parsed = JSON.parse(raw);
 const entries = parsed && parsed.entries;
 if (!Array.isArray(entries)) throw new Error('not a multi-condition record');
 return entries.filter(e => e && WEATHER.includes(e.value) && typeof e.setAt === 'number');
 } catch (error) {
 // Covers a leftover single-condition record from before conditions
 // could stack (a bare {value, setAt}, not {entries}) as well as any
 // other parse failure.
 try { window.localStorage.removeItem(WEATHER_KEY); } catch (_) {}
 return [];
 }
 }

 function writeEntries(entries) {
 try {
 if (entries.length) {
 window.localStorage.setItem(WEATHER_KEY, JSON.stringify({ entries }));
 } else {
 window.localStorage.removeItem(WEATHER_KEY);
 }
 } catch (error) {
 // The visual state still applies when storage is unavailable.
 }
 }

 function writeReading(reading) {
 try {
 if (reading) {
 window.localStorage.setItem(READING_KEY, JSON.stringify(reading));
 } else {
 window.localStorage.removeItem(READING_KEY);
 }
 } catch (error) {}
 }

 // Same TTL as the conditions it was detected alongside.
 function storedReading() {
 try {
 const raw = window.localStorage.getItem(READING_KEY);
 if (!raw) return null;
 const reading = JSON.parse(raw);
 if (!reading || typeof reading.setAt !== 'number' || Date.now() - reading.setAt > WEATHER_TTL_MS) {
 writeReading(null);
 return null;
 }
 return reading;
 } catch (error) {
 writeReading(null);
 return null;
 }
 }

 // Sunrise and sunset for a date and place, by the standard sunrise
 // equation (solar mean anomaly, equation of center, declination, hour
 // angle at −0.833° for refraction and the sun's radius). Within about 3
 // minutes of Open-Meteo's own times from the equator to the Arctic. Null
 // on days the sun doesn't rise or doesn't set (polar winter/summer).
 function sunTimes(latitude, longitude, date = new Date()) {
 const rad = Math.PI / 180;
 const jdNoon = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12) / 86400000 + 2440587.5;
 const n = Math.ceil(jdNoon - 2451545.0 + 0.0008);
 const meanSolarTime = n - longitude / 360;
 const M = (357.5291 + 0.98560028 * meanSolarTime) % 360;
 const C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
 const lambda = (M + C + 180 + 102.9372) % 360;
 const transit = 2451545.0 + meanSolarTime + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * lambda * rad);
 const sinDecl = Math.sin(lambda * rad) * Math.sin(23.4397 * rad);
 const cosDecl = Math.cos(Math.asin(sinDecl));
 const cosHour = (Math.sin(-0.833 * rad) - Math.sin(latitude * rad) * sinDecl) / (Math.cos(latitude * rad) * cosDecl);
 if (cosHour < -1 || cosHour > 1) return null;
 const hourAngle = Math.acos(cosHour) / rad;
 const toDate = jd => new Date((jd - 2440587.5) * 86400000);
 return { sunrise: toDate(transit - hourAngle / 360), sunset: toDate(transit + hourAngle / 360) };
 }

 // ── The light the reader is in ─────────────────────────────────
 // The watches keep the clock, but the light falls on each one from the
 // reader's own sky. Four watches meet sunrise or sunset somewhere in
 // the year, and each has a second state of its own palette for it
 // (styles.css, "Light from the reader's sky"):
 //   Chorus or Doldrums with the sky still or already dark → sky-dark
 //   Hush, Convivium or Denouement with the sun up → sky-light
 // In twilight (the sun between the horizon and 6° below) the clock
 // decides as before, so nothing flickers at the turn. Where the reader
 // is comes from "look outside" if they've used it, or else from their
 // browser's time zone (TZ_PLACES); with neither, the clock alone.
 // ?sky=dark or ?sky=light forces it, for testing.
 const SKY_VARIANTS = {
 chorus: 'dark', doldrums: 'dark',
 hush: 'light', convivium: 'light', denouement: 'light'
 };

 // tz-places:start (written by scripts/build_tz_places.py)
 const TZ_PLACES = {
 Africa: 'Abidjan 5 -4|Accra 6 0|Addis_Ababa 9 39|Algiers 37 3|Asmara 15 39|Asmera 15 39|Bamako 13 -8|Bangui 4 19|Banjul 13 -17|Bissau 12 -16|Blantyre -16 35|Brazzaville -4 15|Bujumbura -3 29|Cairo 30 31|Casablanca 34 -8|Ceuta 36 -5|Conakry 10 -14|Dakar 15 -17|Dar_es_Salaam -7 39|Djibouti 12 43|Douala 4 10|El_Aaiun 27 -13|Freetown 8 -13|Gaborone -25 26|Harare -18 31|Johannesburg -26 28|Juba 5 32|Kampala 0 32|Khartoum 16 33|Kigali -2 30|Kinshasa -4 15|Lagos 6 3|Libreville 0 9|Lome 6 1|Luanda -9 13|Lubumbashi -12 27|Lusaka -15 28|Malabo 4 9|Maputo -26 33|Maseru -29 28|Mbabane -26 31|Mogadishu 2 45|Monrovia 6 -11|Nairobi -1 37|Ndjamena 12 15|Niamey 14 2|Nouakchott 18 -16|Ouagadougou 12 -2|Porto-Novo 6 3|Sao_Tome 0 7|Timbuktu 13 -8|Tripoli 33 13|Tunis 37 10|Windhoek -23 17',
 America: 'Adak 52 -177|Anchorage 61 -150|Anguilla 18 -63|Antigua 17 -62|Araguaina -7 -48|Argentina/Buenos_Aires -35 -58|Argentina/Catamarca -28 -66|Argentina/ComodRivadavia -28 -66|Argentina/Cordoba -31 -64|Argentina/Jujuy -24 -65|Argentina/La_Rioja -29 -67|Argentina/Mendoza -33 -69|Argentina/Rio_Gallegos -52 -69|Argentina/Salta -25 -65|Argentina/San_Juan -32 -69|Argentina/San_Luis -33 -66|Argentina/Tucuman -27 -65|Argentina/Ushuaia -55 -68|Aruba 12 -70|Asuncion -25 -58|Atikokan 49 -92|Atka 52 -177|Bahia -13 -39|Bahia_Banderas 21 -105|Barbados 13 -60|Belem -1 -48|Belize 18 -88|Blanc-Sablon 51 -57|Boa_Vista 3 -61|Bogota 5 -74|Boise 44 -116|Buenos_Aires -35 -58|Cambridge_Bay 69 -105|Campo_Grande -20 -55|Cancun 21 -87|Caracas 10 -67|Catamarca -28 -66|Cayenne 5 -52|Cayman 19 -81|Chicago 42 -88|Chihuahua 29 -106|Ciudad_Juarez 32 -106|Coral_Harbour 49 -92|Cordoba -31 -64|Costa_Rica 10 -84|Coyhaique -46 -72|Creston 49 -117|Cuiaba -16 -56|Curacao 12 -69|Danmarkshavn 77 -19|Dawson 64 -139|Dawson_Creek 56 -120|Denver 40 -105|Detroit 42 -83|Dominica 15 -61|Edmonton 54 -113|Eirunepe -7 -70|El_Salvador 14 -89|Ensenada 33 -117|Fort_Nelson 59 -123|Fort_Wayne 40 -86|Fortaleza -4 -38|Glace_Bay 46 -60|Godthab 64 -52|Goose_Bay 53 -60|Grand_Turk 21 -71|Grenada 12 -62|Guadeloupe 16 -62|Guatemala 15 -91|Guayaquil -2 -80|Guyana 7 -58|Halifax 45 -64|Havana 23 -82|Hermosillo 29 -111|Indiana/Indianapolis 40 -86|Indiana/Knox 41 -87|Indiana/Marengo 38 -86|Indiana/Petersburg 38 -87|Indiana/Tell_City 38 -87|Indiana/Vevay 39 -85|Indiana/Vincennes 39 -88|Indiana/Winamac 41 -87|Indianapolis 40 -86|Inuvik 68 -134|Iqaluit 64 -68|Jamaica 18 -77|Jujuy -24 -65|Juneau 58 -134|Kentucky/Louisville 38 -86|Kentucky/Monticello 37 -85|Knox_IN 41 -87|Kralendijk 12 -68|La_Paz -16 -68|Lima -12 -77|Los_Angeles 34 -118|Louisville 38 -86|Lower_Princes 18 -63|Maceio -10 -36|Managua 12 -86|Manaus -3 -60|Marigot 18 -63|Martinique 15 -61|Matamoros 26 -98|Mazatlan 23 -106|Mendoza -33 -69|Menominee 45 -88|Merida 21 -90|Metlakatla 55 -132|Mexico_City 19 -99|Miquelon 47 -56|Moncton 46 -65|Monterrey 26 -100|Montevideo -35 -56|Montreal 44 -79|Montserrat 17 -62|Nassau 25 -77|New_York 41 -74|Nipigon 44 -79|Nome 65 -165|Noronha -4 -32|North_Dakota/Beulah 47 -102|North_Dakota/Center 47 -101|North_Dakota/New_Salem 47 -101|Nuuk 64 -52|Ojinaga 30 -104|Panama 9 -80|Pangnirtung 64 -68|Paramaribo 6 -55|Phoenix 33 -112|Port-au-Prince 19 -72|Port_of_Spain 11 -62|Porto_Acre -10 -68|Porto_Velho -9 -64|Puerto_Rico 18 -66|Punta_Arenas -53 -71|Rainy_River 50 -97|Rankin_Inlet 63 -92|Recife -8 -35|Regina 50 -105|Resolute 75 -95|Rio_Branco -10 -68|Rosario -31 -64|Santa_Isabel 33 -117|Santarem -2 -55|Santiago -33 -71|Santo_Domingo 18 -70|Sao_Paulo -24 -47|Scoresbysund 70 -22|Shiprock 40 -105|Sitka 57 -135|St_Barthelemy 18 -63|St_Johns 48 -53|St_Kitts 17 -63|St_Lucia 14 -61|St_Thomas 18 -65|St_Vincent 13 -61|Swift_Current 50 -108|Tegucigalpa 14 -87|Thule 77 -69|Thunder_Bay 44 -79|Tijuana 33 -117|Toronto 44 -79|Tortola 18 -65|Vancouver 49 -123|Virgin 18 -65|Whitehorse 61 -135|Winnipeg 50 -97|Yakutat 60 -140|Yellowknife 54 -113',
 Antarctica: 'Casey -66 111|Davis -69 78|DumontDUrville -67 140|Macquarie -54 159|Mawson -68 63|McMurdo -78 167|Palmer -65 -64|Rothera -68 -68|South_Pole -78 167|Syowa -69 40|Troll -72 3|Vostok -78 107',
 Arctic: 'Longyearbyen 78 16',
 Asia: 'Aden 13 45|Almaty 43 77|Amman 32 36|Anadyr 65 177|Aqtau 45 50|Aqtobe 50 57|Ashgabat 38 58|Ashkhabad 38 58|Atyrau 47 52|Baghdad 33 44|Bahrain 26 51|Baku 40 50|Bangkok 14 101|Barnaul 53 84|Beirut 34 36|Bishkek 43 75|Brunei 5 115|Calcutta 23 88|Chita 52 113|Choibalsan 48 107|Chongqing 31 121|Chungking 31 121|Colombo 7 80|Dacca 24 90|Damascus 34 36|Dhaka 24 90|Dili -9 126|Dubai 25 55|Dushanbe 39 69|Famagusta 35 34|Gaza 32 34|Harbin 31 121|Hebron 32 35|Ho_Chi_Minh 11 107|Hong_Kong 22 114|Hovd 48 92|Irkutsk 52 104|Istanbul 41 29|Jakarta -6 107|Jayapura -3 141|Jerusalem 32 35|Kabul 35 69|Kamchatka 53 159|Karachi 25 67|Kashgar 44 88|Kathmandu 28 85|Katmandu 28 85|Khandyga 63 136|Kolkata 23 88|Krasnoyarsk 56 93|Kuala_Lumpur 3 102|Kuching 2 110|Kuwait 29 48|Macao 22 114|Macau 22 114|Magadan 60 151|Makassar -5 119|Manila 15 121|Muscat 24 59|Nicosia 35 33|Novokuznetsk 54 87|Novosibirsk 55 83|Omsk 55 73|Oral 51 51|Phnom_Penh 12 105|Pontianak 0 109|Pyongyang 39 126|Qatar 25 52|Qostanay 53 64|Qyzylorda 45 65|Rangoon 17 96|Riyadh 25 47|Saigon 11 107|Sakhalin 47 143|Samarkand 40 67|Seoul 38 127|Shanghai 31 121|Singapore 1 104|Srednekolymsk 67 154|Taipei 25 122|Tashkent 41 69|Tbilisi 42 45|Tehran 36 51|Tel_Aviv 32 35|Thimbu 27 90|Thimphu 27 90|Tokyo 36 140|Tomsk 56 85|Ujung_Pandang -5 119|Ulaanbaatar 48 107|Ulan_Bator 48 107|Urumqi 44 88|Ust-Nera 65 143|Vientiane 18 103|Vladivostok 43 132|Yakutsk 62 130|Yangon 17 96|Yekaterinburg 57 61|Yerevan 40 44',
 Atlantic: 'Azores 38 -26|Bermuda 32 -65|Canary 28 -15|Cape_Verde 15 -24|Faeroe 62 -7|Faroe 62 -7|Jan_Mayen 60 11|Madeira 33 -17|Reykjavik 64 -22|South_Georgia -54 -37|St_Helena -16 -6|Stanley -52 -58',
 Australia: 'ACT -34 151|Adelaide -35 139|Brisbane -27 153|Broken_Hill -32 141|Canberra -34 151|Currie -43 147|Darwin -12 131|Eucla -32 129|Hobart -43 147|LHI -32 159|Lindeman -20 149|Lord_Howe -32 159|Melbourne -38 145|NSW -34 151|North -12 131|Perth -32 116|Queensland -27 153|South -35 139|Sydney -34 151|Tasmania -43 147|Victoria -38 145|West -32 116|Yancowinna -32 141',
 Brazil: 'Acre -10 -68|DeNoronha -4 -32|East -24 -47|West -3 -60',
 Canada: 'Atlantic 45 -64|Central 50 -97|Eastern 44 -79|Mountain 54 -113|Newfoundland 48 -53|Pacific 49 -123|Saskatchewan 50 -105|Yukon 61 -135',
 Chile: 'Continental -33 -71|EasterIsland -27 -109',
 Europe: 'Amsterdam 52 5|Andorra 42 2|Astrakhan 46 48|Athens 38 24|Belfast 52 0|Belgrade 45 20|Berlin 52 13|Bratislava 48 17|Brussels 51 4|Bucharest 44 26|Budapest 48 19|Busingen 48 9|Chisinau 47 29|Copenhagen 56 13|Dublin 53 -6|Gibraltar 36 -5|Guernsey 49 -3|Helsinki 60 25|Isle_of_Man 54 -4|Istanbul 41 29|Jersey 49 -2|Kaliningrad 55 20|Kiev 50 31|Kirov 59 50|Kyiv 50 31|Lisbon 39 -9|Ljubljana 46 15|London 52 0|Luxembourg 50 6|Madrid 40 -4|Malta 36 15|Mariehamn 60 20|Minsk 54 28|Monaco 44 7|Moscow 56 38|Nicosia 35 33|Oslo 60 11|Paris 49 2|Podgorica 42 19|Prague 50 14|Riga 57 24|Rome 42 12|Samara 53 50|San_Marino 44 12|Sarajevo 44 18|Saratov 52 46|Simferopol 45 34|Skopje 42 21|Sofia 43 23|Stockholm 59 18|Tallinn 59 25|Tirane 41 20|Tiraspol 47 29|Ulyanovsk 54 48|Uzhgorod 50 31|Vaduz 47 10|Vatican 42 12|Vienna 48 16|Vilnius 55 25|Volgograd 49 44|Warsaw 52 21|Zagreb 46 16|Zaporozhye 50 31|Zurich 47 9',
 Indian: 'Antananarivo -19 48|Chagos -7 72|Christmas -10 106|Cocos -12 97|Comoro -12 43|Kerguelen -49 70|Mahe -5 55|Maldives 4 74|Mauritius -20 58|Mayotte -13 45|Reunion -21 55',
 Mexico: 'BajaNorte 33 -117|BajaSur 23 -106|General 19 -99',
 Pacific: 'Apia -14 -172|Auckland -37 175|Bougainville -6 156|Chatham -44 -177|Chuuk 7 152|Easter -27 -109|Efate -18 168|Enderbury -3 -172|Fakaofo -9 -171|Fiji -18 178|Funafuti -9 179|Galapagos -1 -90|Gambier -23 -135|Guadalcanal -10 160|Guam 13 145|Honolulu 21 -158|Johnston 21 -158|Kanton -3 -172|Kiritimati 2 -157|Kosrae 5 163|Kwajalein 9 167|Majuro 7 171|Marquesas -9 -140|Midway 28 -177|Nauru -1 167|Niue -19 -170|Norfolk -29 168|Noumea -22 166|Pago_Pago -14 -171|Palau 7 134|Pitcairn -25 -130|Pohnpei 7 158|Ponape 7 158|Port_Moresby -10 147|Rarotonga -21 -160|Saipan 15 146|Samoa -14 -171|Tahiti -18 -150|Tarawa 1 173|Tongatapu -21 -175|Truk 7 152|Wake 19 167|Wallis -13 -176|Yap 7 152',
 US: 'Alaska 61 -150|Aleutian 52 -177|Arizona 33 -112|Central 42 -88|East-Indiana 40 -86|Eastern 41 -74|Hawaii 21 -158|Indiana-Starke 41 -87|Michigan 42 -83|Mountain 40 -105|Pacific 34 -118|Samoa -14 -171'
 };
 // tz-places:end

 function timeZonePlace() {
 try {
 const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
 const cut = zone.indexOf('/');
 const list = TZ_PLACES[zone.slice(0, cut)];
 if (cut < 0 || !list) return null;
 const city = zone.slice(cut + 1);
 const entry = list.split('|').find(e => e.slice(0, e.indexOf(' ')) === city);
 if (!entry) return null;
 const [, lat, lon] = entry.split(' ');
 return { latitude: Number(lat), longitude: Number(lon) };
 } catch (error) {
 return null;
 }
 }

 // The sun's height above the horizon in degrees, at a moment and place
 // (the low-precision solar position, good to a fraction of a degree:
 // far finer than the light needs).
 function sunAltitude(latitude, longitude, date) {
 const rad = Math.PI / 180;
 const d = date.getTime() / 86400000 + 2440587.5 - 2451545.0;
 const g = (357.529 + 0.98560028 * d) * rad;
 const q = 280.459 + 0.98564736 * d;
 const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * rad;
 const e = (23.439 - 0.00000036 * d) * rad;
 const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) / rad;
 const dec = Math.asin(Math.sin(e) * Math.sin(L));
 const gmst = (18.697374558 + 24.06570982441908 * d) % 24;
 const hourAngle = (gmst * 15 + longitude - ra) * rad;
 const lat = latitude * rad;
 return Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(hourAngle)) / rad;
 }

 // 'light' with the sun up, 'dark' once it's 6° down, null between or
 // when there's no telling where the reader is.
 function skyNow(date) {
 const forced = new URLSearchParams(window.location.search).get('sky');
 if (forced === 'dark' || forced === 'light') return forced;
 const place = storedLocation() || timeZonePlace();
 if (!place) return null;
 const altitude = sunAltitude(place.latitude, place.longitude, date);
 if (altitude > -0.833) return 'light';
 if (altitude < -6) return 'dark';
 return null;
 }

 // The body class for a watch under the current sky, or null when the
 // watch is in its own light.
 window.skyClassFor = function (watchKey) {
 const sky = window.siteAtmosphere && window.siteAtmosphere.sky;
 return sky && SKY_VARIANTS[watchKey] === sky ? `sky-${sky}` : null;
 };

 function storedLocation() {
 try {
 const raw = window.localStorage.getItem(LOCATION_KEY);
 if (!raw) return null;
 const loc = JSON.parse(raw);
 return loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number' ? loc : null;
 } catch (error) {
 return null;
 }
 }

 function writeLocation(reading) {
 if (!reading || typeof reading.latitude !== 'number' || typeof reading.longitude !== 'number') return;
 try {
 window.localStorage.setItem(LOCATION_KEY, JSON.stringify({ latitude: reading.latitude, longitude: reading.longitude }));
 // The earlier, date-bound sunrise/sunset record this replaces.
 window.localStorage.removeItem('earthly-hours-sun');
 } catch (error) {}
 }

 function storedWeather() {
 const now = Date.now();
 const entries = readEntries();
 const active = entries.filter(e => now - e.setAt <= WEATHER_TTL_MS);
 if (active.length !== entries.length) writeEntries(active);
 return active.map(e => e.value);
 }

 function applyAtmosphere(date = new Date()) {
 const body = document.body;
 if (!body) return;

 body.classList.remove(...TIME_BLOCKS.map(block => `block-${block.key}`));
 body.classList.remove(...SEASON_KEYS.map(season => `season-${season}`));
 body.classList.remove(...WEATHER.map(weather => `weather-${weather}`));

 const currentTime = timeKey(date);
 // Named currentSeasonKey, not currentSeason — that name belongs to the
 // global function from shared.js that seasonKey() above may
 // delegate to; shadowing it here would be confusing even though it's
 // harmless (seasonKey's own reference to currentSeason() resolves
 // lexically, not against this local).
 const currentSeasonKey = seasonKey(date);
 const currentWeather = storedWeather();

 body.classList.remove('sky-dark', 'sky-light');
 body.classList.add(`block-${currentTime}`, `season-${currentSeasonKey}`);
 currentWeather.forEach(w => body.classList.add(`weather-${w}`));

 window.siteAtmosphere = {
 time: currentTime,
 season: currentSeasonKey,
 weather: currentWeather,
 // Everything readingFromOpenMeteo() in weather.js keeps — temperature
 // and dewPoint (°F), windSpeed (mph), windDirection (degrees the wind
 // blows *from*, 0 = north), cloudCover (%), visibility (ft), pressure
 // and pressureChange over 3 hours (hPa), and more — plus setAt; or null
 reading: currentWeather.length ? storedReading() : null,
 // Today's sunrise and sunset ({ sunrise, sunset } Dates), if "look
 // outside" has ever run here; null otherwise, or on a polar day/night.
 sun: (loc => loc ? sunTimes(loc.latitude, loc.longitude, date) : null)(storedLocation()),
 // 'light', 'dark' or null: see skyNow()
 sky: skyNow(date)
 };
 const skyClass = window.skyClassFor(currentTime);
 if (skyClass) body.classList.add(skyClass);
 }

 // For the self-select picker: flips one condition on or off, leaving
 // whatever else is already active untouched. Contradictory combinations
 // (e.g. Heat + Cold) are allowed on purpose — see setWeatherConditions
 // for the same call on detected results, which replaces wholesale instead.
 window.toggleWeatherCondition = function (condition) {
 const value = String(condition || '').toLowerCase().replace(/\s+/g, '-');
 if (!WEATHER.includes(value)) return;
 const entries = readEntries();
 const without = entries.filter(e => e.value !== value);
 const wasActive = without.length !== entries.length;
 writeEntries(wasActive ? without : [...without, { value, setAt: Date.now() }]);
 writeReading(null);
 applyAtmosphere();
 window.dispatchEvent(new CustomEvent('atmospherechange', { detail: window.siteAtmosphere }));
 };

 // For detection: replaces the active set wholesale with what Open-Meteo
 // reported (sky condition + any independent temperature/wind/ground
 // layers), rather than merging with whatever was manually toggled before.
 // reading (optional) is the measured values those conditions came from.
 window.setWeatherConditions = function (conditions, reading) {
 const setAt = Date.now();
 const values = (conditions || [])
 .map(c => String(c || '').toLowerCase().replace(/\s+/g, '-'))
 .filter(v => WEATHER.includes(v));
 writeEntries(values.map(value => ({ value, setAt })));
 writeReading(reading && values.length ? { ...reading, setAt } : null);
 writeLocation(reading);
 applyAtmosphere();
 window.dispatchEvent(new CustomEvent('atmospherechange', { detail: window.siteAtmosphere }));
 };

 window.clearWeatherCondition = function () {
 writeEntries([]);
 writeReading(null);
 applyAtmosphere();
 window.dispatchEvent(new CustomEvent('atmospherechange', { detail: window.siteAtmosphere }));
 };

 applyAtmosphere();
 // One shared heartbeat instead of every consumer running its own
 // setInterval(..., 60000) — hours.js's render loop listens for this
 // instead of keeping a second, independently-drifting 60s timer.
 // Distinct from 'atmospherechange' (dispatched only when something
 // actually changed, e.g. a weather toggle) since this fires every
 // tick regardless.
 window.setInterval(() => {
 applyAtmosphere();
 window.dispatchEvent(new CustomEvent('atmospheretick', { detail: window.siteAtmosphere }));
 }, 60000);
})();