import dotenv from "dotenv";
import fs from "fs/promises";
import SpotifyWebApi from "spotify-web-api-node";
import { MusicBrainzApi } from "musicbrainz-api";

dotenv.config();

const SPOTIFY_ARTIST_INPUT_FILE = "shoegaze_artists.txt";
const FINAL_OUTPUT_FILE = "shoegaze_artists.json";

// spotify api delay
const SPOTIFY_API_DELAY_MS = 250;
// musicbrainz api delay (> 1s)
const MUSICBRAINZ_API_DELAY_MS = 1100;
// geocode.maps.co api delay (1/sec)
const GEOCODING_MAPSCO_API_DELAY_MS = 1050;
// wikipedia api delay
const WIKIPEDIA_API_DELAY_MS = 1000;

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

const mbApi = new MusicBrainzApi({
  appName: "soundwaves-project-test",
  appVersion: "0.1.0",
  appContactInfo: "alstonc128@gmail.com",
  baseUrl: "https://musicbrainz.org",
});

const GEOCODING_MAPSCO_API_KEY = process.env.GEOCODING_KEY;
const WIKIMEDIA_ACCESS_TOKEN = process.env.WIKIMEDIA_ACCESS_TOKEN;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// find a field's value within an infobox structure
const findInfoboxFieldValue = (infobox, fieldName) => {
  if (!infobox || !infobox.has_parts || !Array.isArray(infobox.has_parts)) {
    return null;
  }
  const lowerFieldName = fieldName.toLowerCase();
  for (const part of infobox.has_parts) {
    if (
      part.type === "field" &&
      part.name &&
      part.name.toLowerCase() === lowerFieldName &&
      typeof part.value === "string"
    ) {
      return part.value.trim();
    }
    if (
      part.type === "section" &&
      part.has_parts &&
      Array.isArray(part.has_parts)
    ) {
      for (const subPart of part.has_parts) {
        if (
          subPart.type === "field" &&
          subPart.name &&
          subPart.name.toLowerCase() === lowerFieldName &&
          typeof subPart.value === "string"
        ) {
          return subPart.value.trim();
        }
      }
    }
  }
  return null;
};

// extract location from wikipedia text (origin or born fields)
const extractLocationFromWikiText = (text, artistName) => {
  if (!text || typeof text !== "string") return null;

  let locationText = text.trim();

  // 1. remove artist's name from beginning if present (case-insensitive)
  if (artistName) {
    const artistNameLower = artistName.toLowerCase();
    if (locationText.toLowerCase().startsWith(artistNameLower)) {
      locationText = locationText.substring(artistName.length).trim();
      locationText = locationText.replace(/^[\s,-]+/, "");
    }
  }

  // attempt to remove potential birth name (capitalized words at start)
  locationText = locationText
    .replace(/^([A-Z][a-z]+\s+){1,}([A-Z][a-z]+(?:\s*,\s*|\s+))(?=[A-Z\d])/, "")
    .trim();
  locationText = locationText.replace(/^[\s,-]+/, "");

  // regex strategy: find last occurrence of a 4-digit year or "yyyy or yyyy", then take text after it
  const yearPattern = /\b(\d{4}(?:\s+or\s+\d{4})?)\b/g;
  let lastMatch = null;
  let match;
  while ((match = yearPattern.exec(locationText)) !== null) {
    lastMatch = match;
  }

  if (lastMatch) {
    const afterYearIndex = lastMatch.index + lastMatch[0].length;
    locationText = locationText.substring(afterYearIndex).trim();
    // clean up leading non-alphanumeric chars (except spaces for names like "st. louis")
    locationText = locationText.replace(/^[^a-zA-Z0-9]+/, "");
  } else {
    // if no year pattern found, previous name stripping might be sufficient, or string didn't have year in expected format
    console.log(
      `      No year pattern found in "${text}" for artist "${artistName}". Using text after initial name stripping: "${locationText}"`
    );
  }

  // remove trailing commas or periods
  locationText = locationText.replace(/[,.]+$/, "").trim();

  return locationText || null;
};

async function getMusicBrainzData(artistName, apiDelayMs) {
  console.log(`      Attempting MusicBrainz lookup for: "${artistName}"`);

  try {
    await delay(apiDelayMs); // delay before first api call (search)
    const searchResults = await mbApi.search(
      "artist",
      { query: artistName },
      0,
      5
    );

    let bestMatch = null;
    if (searchResults.artists && searchResults.artists.length > 0) {
      bestMatch = searchResults.artists.find(
        (a) => a.name.toLowerCase() === artistName.toLowerCase()
      );
      if (!bestMatch) {
        bestMatch = searchResults.artists.sort(
          (a, b) => (b.score || 0) - (a.score || 0)
        )[0];
        if (bestMatch) {
          console.log(
            `      No exact MusicBrainz name match for "${artistName}". Closest: ${
              bestMatch.name
            } (Score: ${bestMatch.score || "N/A"})`
          );
        }
      } else {
        console.log(
          `      Found exact MusicBrainz name match for "${artistName}": ${
            bestMatch.name
          } (Score: ${bestMatch.score || "N/A"})`
        );
      }
    }

    if (bestMatch && bestMatch.id) {
      await delay(apiDelayMs); // delay before second api call (lookup)
      const mbArtistInfo = await mbApi.lookup("artist", bestMatch.id, []);

      if (mbArtistInfo) {
        const beginAreaName = mbArtistInfo["begin-area"]?.name || null;
        const areaName = mbArtistInfo.area?.name || null;
        const country = mbArtistInfo.country || null;

        if (beginAreaName)
          console.log(`        MusicBrainz Begin Area: ${beginAreaName}`);
        else if (areaName)
          console.log(
            `        MusicBrainz Area (used as fallback for begin-area): ${areaName}`
          );
        if (country) console.log(`        MusicBrainz Country: ${country}`);

        return {
          begin_area: beginAreaName,
          area: areaName,
          country: country,
        };
      } else {
        console.log(
          `      Could not retrieve full MusicBrainz lookup info for MBID: ${bestMatch.id} for "${artistName}".`
        );
        return null;
      }
    } else {
      console.log(
        `      No suitable MusicBrainz artist found (no results or no id) for "${artistName}".`
      );
      return null;
    }
  } catch (error) {
    if (
      error.statusCode === 503 ||
      (error.message && error.message.includes("503 Service Unavailable"))
    ) {
      console.warn(
        `      MusicBrainz API unavailable (503) for "${artistName}". Skipping MB lookup. Error: ${
          error.message || error
        }`
      );
    } else if (error.statusCode === 404) {
      console.log(
        `      MusicBrainz API returned 404 for artist query "${artistName}". Error: ${
          error.message || error
        }`
      );
    } else {
      const errorMessage = error.message || String(error);
      if (
        errorMessage.includes("Unexpected token '<'") &&
        errorMessage.includes("not valid JSON")
      ) {
        console.error(
          `      Error during MusicBrainz API call for "${artistName}": MusicBrainz returned non-JSON content (likely HTML error/rate-limit page).`
        );
        console.error(`        Original error: ${errorMessage}`);
        console.error(`        Full error object:`, error);
      } else {
        console.error(
          `      Error during MusicBrainz API call for "${artistName}":`,
          errorMessage,
          error
        );
      }
    }
    return null;
  }
}

async function masterProcessArtists() {
  console.log("--- Starting Master Artist Processing Script ---");

  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    console.error(
      "Error: Spotify API credentials not found in .env file. Exiting."
    );
    return;
  }
  if (!GEOCODING_MAPSCO_API_KEY) {
    console.error("Error: GEOCODING_KEY not found in .env file. Exiting.");
    return;
  }
  if (!WIKIMEDIA_ACCESS_TOKEN) {
    console.error(
      "Error: WIKIMEDIA_ACCESS_TOKEN not found in .env file. Exiting."
    );
    return;
  }

  // 1. read artist names
  let artistNamesToProcess;
  try {
    console.log(
      `\n[Step 1/5] Reading artist names from ${SPOTIFY_ARTIST_INPUT_FILE}...`
    );
    const artistListRaw = await fs.readFile(SPOTIFY_ARTIST_INPUT_FILE, "utf-8");
    artistNamesToProcess = artistListRaw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    console.log(
      `Found ${artistNamesToProcess.length} artist names to process.`
    );
    if (artistNamesToProcess.length === 0) {
      console.log("No artist names found. Exiting.");
      return;
    }
  } catch (error) {
    console.error(`Error reading ${SPOTIFY_ARTIST_INPUT_FILE}:`, error.message);
    return;
  }

  // 2. fetch spotify data
  let spotifyArtists = [];
  try {
    console.log("\n[Step 2/5] Fetching data from Spotify API...");
    const tokenData = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(tokenData.body["access_token"]);
    console.log("   Spotify access token obtained.");

    for (let i = 0; i < artistNamesToProcess.length; i++) {
      const name = artistNamesToProcess[i];
      await delay(SPOTIFY_API_DELAY_MS);
      let retry = true;
      let attempts = 0;
      const maxAttempts = 3;

      while (retry && attempts < maxAttempts) {
        retry = false;
        attempts++;
        try {
          console.log(
            `   Searching Spotify for "${name}" (Attempt ${attempts})...`
          );
          const data = await spotifyApi.searchArtists(name, {
            limit: 5,
            market: "US",
          });
          const items = data.body.artists.items;
          const match = items.find(
            (item) => item.name.toLowerCase() === name.toLowerCase()
          );

          if (match) {
            spotifyArtists.push(match);
            console.log(
              `   Found exact Spotify match: "${match.name}" (${match.id})`
            );
          } else if (items.length > 0) {
            spotifyArtists.push(items[0]); // use first result if no exact name match
            console.warn(
              `   No exact Spotify match for "${name}", using first result "${items[0].name}"`
            );
          } else {
            console.warn(`   ⚠️ No Spotify results found for "${name}".`);
          }
        } catch (err) {
          if (err.statusCode === 429 && attempts < maxAttempts) {
            const retryAfter = parseInt(err.headers["retry-after"] || "1", 10);
            console.warn(
              `   Spotify rate limit hit. Retrying after ${retryAfter} seconds...`
            );
            await delay((retryAfter + 1) * 1000);
            retry = true;
          } else {
            console.error(
              `   Error searching Spotify for "${name}":`,
              err.message || err
            );
          }
        }
      }
      if (attempts >= maxAttempts && retry) {
        console.error(
          `   Failed to fetch data for "${name}" after ${maxAttempts} attempts due to persistent errors.`
        );
      }
    }
    console.log(
      `   Fetched Spotify data for ${spotifyArtists.length} artists.`
    );
  } catch (authErr) {
    console.error(
      "   Failed to authenticate with Spotify API:",
      authErr.message || authErr
    );
    return;
  }

  // 3. fetch origin from wikipedia api
  console.log("\n[Step 3/5] Fetching Origin from Wikipedia API...");
  let artistsWithWikiInfo = [];
  let wikiSuccessCount = 0;

  for (let i = 0; i < spotifyArtists.length; i++) {
    const artist = spotifyArtists[i];
    let artistOrigin = null;
    let artistCountry = null;
    let processedOriginName = null;

    console.log(
      `   Processing for Wikipedia: ${artist.name} (Spotify name: "${
        artist.name
      }") (${i + 1}/${spotifyArtists.length})`
    );

    let rawApiResponse = null;
    let wikiApiUrl = `https://api.enterprise.wikimedia.com/v2/structured-contents/${encodeURIComponent(
      artist.name
    )}`;
    let response = null;

    try {
      console.log(
        `      Attempting Wikipedia API call with original name: ${artist.name} (URL: ${wikiApiUrl})`
      );
      response = await fetch(wikiApiUrl, {
        headers: {
          Authorization: `Bearer ${WIKIMEDIA_ACCESS_TOKEN}`,
        },
      });

      if (!response.ok) {
        console.warn(
          `      Wikipedia API error for "${artist.name}" (Spotify: "${artist.name}"): Status ${response.status} ${response.statusText}`
        );
        if (response.status === 404) {
          console.log(
            `      No Wikipedia page found for "${artist.name}" (Spotify: "${artist.name}") with original name. Attempting title-cased fallback.`
          );

          const titleCasedName = artist.name
            .toLowerCase()
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");

          if (titleCasedName !== artist.name) {
            const fallbackWikiApiUrl = `https://api.enterprise.wikimedia.com/v2/structured-contents/${encodeURIComponent(
              titleCasedName
            )}`;
            console.log(
              `      Attempting Wikipedia API call with title-cased name: ${titleCasedName} (URL: ${fallbackWikiApiUrl})`
            );

            response = await fetch(fallbackWikiApiUrl, {
              headers: {
                Authorization: `Bearer ${WIKIMEDIA_ACCESS_TOKEN}`,
              },
            });

            if (!response.ok) {
              console.warn(
                `      Wikipedia API error for title-cased "${titleCasedName}" (Spotify: "${artist.name}"): Status ${response.status} ${response.statusText}`
              );
              if (response.status === 404) {
                console.log(
                  `      No Wikipedia page found for title-cased "${titleCasedName}" (Spotify: "${artist.name}") either.`
                );
              }
            } else {
              console.log(
                `      Successfully fetched data with title-cased name "${titleCasedName}".`
              );
              rawApiResponse = await response.json();
            }
          } else {
            console.log(
              `      Original name "${artist.name}" is already effectively title-cased or single word. No different fallback to attempt.`
            );
          }
        }
        if (!rawApiResponse) {
          // if still no rawApiResponse after potential fallback
          await delay(WIKIPEDIA_API_DELAY_MS);
          continue; // skip to next artist
        }
      } else {
        console.log(
          `      Successfully fetched data with original name "${artist.name}".`
        );
        rawApiResponse = await response.json();
      }

      let articleData = null;
      if (Array.isArray(rawApiResponse)) {
        articleData = rawApiResponse.find(
          (entry) =>
            (entry.url && entry.url.startsWith("https://en.wikipedia.org/")) ||
            (entry.is_part_of && entry.is_part_of.identifier === "enwiki") ||
            (entry.in_language && entry.in_language.identifier === "en")
        );
        if (articleData) {
          console.log(
            `      Found English Wikipedia article data in API response array for "${artist.name}" (Spotify: "${artist.name}"). URL: ${articleData.url}`
          );
        } else if (rawApiResponse.length > 0) {
          articleData = rawApiResponse[0]; // fallback to the first item
          console.warn(
            `      Could not find specific English Wikipedia entry for "${
              artist.name
            }" (Spotify: "${
              artist.name
            }") in API response array. Using first entry: ${
              articleData.url || "URL not available"
            }`
          );
        } else {
          console.warn(
            `      Wikipedia API returned an empty array for "${artist.name}" (Spotify: "${artist.name}"). URL: ${wikiApiUrl}`
          );
        }
      } else if (
        typeof rawApiResponse === "object" &&
        rawApiResponse !== null &&
        Object.keys(rawApiResponse).length > 0
      ) {
        articleData = rawApiResponse;
        console.log(
          `      Using direct API response object for "${artist.name}" (Spotify: "${artist.name}").`
        );
      } else if (
        typeof rawApiResponse === "object" &&
        rawApiResponse !== null &&
        Object.keys(rawApiResponse).length === 0
      ) {
        console.warn(
          `      Wikipedia API returned an empty object for "${artist.name}" (Spotify: "${artist.name}"). URL: ${wikiApiUrl}`
        );
      } else {
        console.warn(
          `      Unexpected Wikipedia API response structure for "${artist.name}" (Spotify: "${artist.name}"). URL: ${wikiApiUrl}. Response:`,
          JSON.stringify(rawApiResponse, null, 2)
        );
      }

      const infobox =
        articleData && articleData.infoboxes && articleData.infoboxes.length > 0
          ? articleData.infoboxes[0]
          : null;

      if (infobox) {
        console.log(
          `      Raw Infobox data for "${artist.name}" (Spotify: "${artist.name}") found`
        );

        let extractedWikiText = findInfoboxFieldValue(infobox, "origin");
        if (extractedWikiText) {
          let tempOriginName = extractLocationFromWikiText(
            extractedWikiText,
            artist.name
          );
          if (tempOriginName) {
            const originalForLog = tempOriginName;
            if (tempOriginName.endsWith(", U.S.")) {
              tempOriginName = tempOriginName.slice(0, -5).trim();
              artistCountry = "US";
              console.log(
                `      Modified Wikipedia 'Origin' from "${originalForLog}" to "${tempOriginName}" and set country to "US".`
              );
            } else if (tempOriginName.endsWith(", U.S")) {
              tempOriginName = tempOriginName.slice(0, -4).trim();
              artistCountry = "US";
              console.log(
                `      Modified Wikipedia 'Origin' from "${originalForLog}" to "${tempOriginName}" (removed ', U.S') and set country to "US".`
              );
            }
            processedOriginName = tempOriginName;
            console.log(
              `      Found and processed 'Origin' for "${artist.name}" (Spotify: "${artist.name}"): ${processedOriginName}`
            );
            artistOrigin = processedOriginName;
          } else {
            console.log(
              `      'Origin' field found for "${artist.name}" but was empty after processing.`
            );
          }
        } else {
          console.log(
            `      'Origin' field not found or empty for "${artist.name}" (Spotify: "${artist.name}"). Trying 'Born' field.`
          );
        }

        if (!artistOrigin) {
          extractedWikiText = findInfoboxFieldValue(infobox, "born");
          if (extractedWikiText) {
            let potentialOriginFromBorn = extractedWikiText;
            const bornParts = extractedWikiText.split("\n");
            if (bornParts.length > 1) {
              potentialOriginFromBorn = bornParts[bornParts.length - 1].trim();
              console.log(
                `      'Born' field for "${artist.name}" has multiple lines. Using last line: "${potentialOriginFromBorn}"`
              );
            } else {
              console.log(
                `      'Born' field for "${artist.name}" is single line: "${potentialOriginFromBorn}"`
              );
            }

            let tempBornName = extractLocationFromWikiText(
              potentialOriginFromBorn,
              artist.name
            );
            if (tempBornName) {
              const originalForLog = tempBornName;
              if (tempBornName.endsWith(", U.S.")) {
                tempBornName = tempBornName.slice(0, -5).trim();
                artistCountry = "US";
                console.log(
                  `      Modified Wikipedia 'Born' from "${originalForLog}" to "${tempBornName}" and set country to "US".`
                );
              } else if (tempBornName.endsWith(", U.S")) {
                tempBornName = tempBornName.slice(0, -4).trim();
                artistCountry = "US";
                console.log(
                  `      Modified Wikipedia 'Born' from "${originalForLog}" to "${tempBornName}" (removed ', U.S') and set country to "US".`
                );
              }
              processedOriginName = tempBornName;
              console.log(
                `      Processed 'Born' field for "${artist.name}" (Spotify: "${artist.name}"): ${processedOriginName}`
              );
              artistOrigin = processedOriginName;
            } else {
              console.log(
                `      'Born' field found for "${artist.name}" but was empty after processing.`
              );
            }
          } else {
            if (!findInfoboxFieldValue(infobox, "origin")) {
              console.log(
                `      Neither 'Origin' nor 'Born' field found or usable for "${artist.name}" (Spotify: "${artist.name}").`
              );
            }
          }
        }
      } else if (articleData) {
        console.log(
          `      No infobox found for "${artist.name}" (Spotify: "${
            artist.name
          }") in the processed article data. URL: ${articleData.url || "N/A"}`
        );
        if (articleData.infoboxes && articleData.infoboxes.length === 0) {
          console.log(
            `      'infoboxes' array was present but empty for "${artist.name}" (Spotify: "${artist.name}").`
          );
        } else if (articleData.infoboxes) {
          console.log(
            `      'infoboxes' key was present for "${artist.name}" (Spotify: "${artist.name}") but not usable:`,
            JSON.stringify(articleData.infoboxes, null, 2)
          );
        } else {
          console.log(
            `      'infoboxes' key was not found in articleData for "${
              artist.name
            }" (Spotify: "${artist.name}"). Article data keys: ${Object.keys(
              articleData
            ).join(", ")}`
          );
        }
      } else {
        console.log(
          `      No article data could be processed for "${artist.name}" (Spotify: "${artist.name}") from Wikipedia API. Cannot look for infobox.`
        );
      }

      if (!artistOrigin) {
        console.log(
          `      No origin found from Wikipedia for "${artist.name}". Attempting MusicBrainz fallback.`
        );
        const mbData = await getMusicBrainzData(
          artist.name,
          MUSICBRAINZ_API_DELAY_MS
        );
        if (mbData) {
          artistOrigin = mbData.begin_area || mbData.area || null; // use area if begin_area is not specific or missing
          artistCountry = mbData.country || null;
          if (artistOrigin) {
            processedOriginName = artistOrigin; // musicbrainz data is usually just location name
            console.log(
              `      Found origin from MusicBrainz for "${artist.name}" (Spotify: "${artist.name}"): ${artistOrigin}`
            );
          } else {
            console.log(
              `      MusicBrainz data found for "${artist.name}", but no usable origin/area field.`
            );
          }
        } else {
          console.log(
            `      No origin found from MusicBrainz for "${artist.name}" (Spotify: "${artist.name}").`
          );
        }
      } else {
        // process wikipedia-derived origin for ", u.s."
        if (artistOrigin.endsWith(", U.S.")) {
          const originalWikiOriginForLog = artistOrigin;
          artistOrigin = artistOrigin.slice(0, -5).trim(); // remove ", u.s."
          artistCountry = "US"; // explicitly set country
          console.log(
            `      Modified Wikipedia origin from "${originalWikiOriginForLog}" to "${artistOrigin}" and set country to "US".`
          );
        }
        processedOriginName = artistOrigin;
      }

      artistsWithWikiInfo.push({
        ...artist,
        processed_origin_name: processedOriginName,
        musicbrainz_country: artistCountry,
        coordinates: artist.coordinates || null,
      });

      if (i < spotifyArtists.length - 1) {
        await delay(WIKIPEDIA_API_DELAY_MS);
      }
    } catch (error) {
      console.error(
        `      Error processing Wikipedia for "${artist.name}":`,
        error.message
      );
    }

    if (artistOrigin) {
      wikiSuccessCount++;
    }
  }
  console.log(
    `   Successfully processed ${wikiSuccessCount} artists with origin info from Wikipedia.`
  );

  // 4. geocode location
  console.log("\n[Step 4/5] Geocoding extracted locations...");
  let processedArtists = [];
  let geocodeSuccessCount = 0;

  for (let i = 0; i < artistsWithWikiInfo.length; i++) {
    const artist = artistsWithWikiInfo[i];
    let coordinates = null;
    console.log(
      `   Processing for GeocodeMapsCo: ${artist.name} (${i + 1}/${
        artistsWithWikiInfo.length
      })`
    );

    const geoQueryText = artist.processed_origin_name; // use consolidated origin name

    if (geoQueryText) {
      let apiUrl = `https://geocode.maps.co/search?q=${encodeURIComponent(
        geoQueryText
      )}&api_key=${GEOCODING_MAPSCO_API_KEY}`;
      console.log(
        `      Querying GeocodeMapsCo for "${geoQueryText}" (URL: ${apiUrl})`
      );

      try {
        const response = await fetch(apiUrl);

        if (!response.ok) {
          console.error(
            `      GeocodeMapsCo API error! Status: ${response.status} ${response.statusText}`
          );
          const errorBody = await response.text();
          console.error(
            `      Response body: ${errorBody.substring(0, 200)}...`
          );
        } else {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            const firstResult = data[0];
            if (firstResult.lat && firstResult.lon) {
              coordinates = {
                lat: parseFloat(firstResult.lat),
                lon: parseFloat(firstResult.lon),
              };
              console.log(
                `      Coordinates found via GeocodeMapsCo for "${geoQueryText}": Lat ${coordinates.lat}, Lon ${coordinates.lon}`
              );
              geocodeSuccessCount++;
            } else {
              console.log(
                `      GeocodeMapsCo response for "${geoQueryText}" did not contain lat/lon in the first result:`,
                firstResult
              );
            }
          } else {
            console.log(
              `      No coordinates found by GeocodeMapsCo for "${geoQueryText}". Response:`,
              data
            );
          }
        }
      } catch (fetchError) {
        console.error(
          `      Network or fetch error processing GeocodeMapsCo for "${artist.name}" (Query: "${geoQueryText}"):`,
          fetchError.message
        );
      }
    } else {
      console.log(
        `      Skipping GeocodeMapsCo for ${artist.name} - No processed_origin_name available.`
      );
    }
    processedArtists.push({ ...artist, coordinates });
    if (i < artistsWithWikiInfo.length - 1) {
      await delay(GEOCODING_MAPSCO_API_DELAY_MS);
    }
  }
  console.log(
    `   Successfully fetched coordinates for ${geocodeSuccessCount} artists. Skipped (no begin_area): ${
      artistsWithWikiInfo.length - geocodeSuccessCount
    }.`
  );

  // write final output
  try {
    console.log(`\n--- Writing Final Output to ${FINAL_OUTPUT_FILE} ---`);
    await fs.writeFile(
      FINAL_OUTPUT_FILE,
      JSON.stringify(processedArtists, null, 2),
      "utf-8"
    );
    console.log(
      `Successfully wrote ${processedArtists.length} processed artist entries to ${FINAL_OUTPUT_FILE}.`
    );
  } catch (error) {
    console.error(`Error writing ${FINAL_OUTPUT_FILE}:`, error.message);
  }

  console.log("\n--- Artist Processing Script Finished ---");
  console.log(`Total artists processed: ${artistNamesToProcess.length}`);
  console.log(`   Spotify matches found: ${spotifyArtists.length}`);
  console.log(
    `   Artists with Origin (Wikipedia/MusicBrainz): ${wikiSuccessCount}`
  );
  console.log(
    `   Successfully geocoded locations: ${geocodeSuccessCount} / ${artistsWithWikiInfo.length}`
  );
  console.log(`Final processed data saved to: ${FINAL_OUTPUT_FILE}`);
}

masterProcessArtists();
