import dotenv from "dotenv";
import fs from "fs/promises";

dotenv.config();

// desired genre/tag
const TARGET_TAG = "shoegaze";
const TOTAL_ARTISTS_TO_FETCH = 100;
const OUTPUT_FILENAME = `${TARGET_TAG.toLowerCase().replace(
  /\s+/g,
  "_"
)}_artists.txt`;

const LASTFM_API_KEY = process.env.LASTFM_KEY;
const API_BASE_URL = "http://ws.audioscrobbler.com/2.0/";

async function fetchTopArtistsLastfm() {
  console.log(
    `--- Starting Last.fm Top Artist Fetcher for tag: "${TARGET_TAG}" ---`
  );

  if (!LASTFM_API_KEY) {
    console.error(
      "Error: LASTFM_KEY not found in .env file. Please add it. Exiting."
    );
    return;
  }

  let allArtistNames = [];

  console.log(
    `Fetching top ${TOTAL_ARTISTS_TO_FETCH} artists for tag "${TARGET_TAG}" in a single request...`
  );

  const params = new URLSearchParams({
    method: "tag.gettopartists",
    tag: TARGET_TAG,
    api_key: LASTFM_API_KEY,
    format: "json",
    limit: TOTAL_ARTISTS_TO_FETCH.toString(),
  });
  const apiUrl = `${API_BASE_URL}?${params}`;

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      console.error(
        `      Error fetching artists: HTTP ${response.status} - ${response.statusText}`
      );
      const errorBody = await response.text();
      console.error(`      Response: ${errorBody.substring(0, 200)}...`);
      return;
    }

    const data = await response.json();

    if (data.error) {
      console.error(
        `      Last.fm API Error (Code: ${data.error}): ${data.message}`
      );
      return;
    }

    if (data.topartists && data.topartists.artist) {
      const fetchedArtists = data.topartists.artist;
      console.log(
        `      Found ${fetchedArtists.length} artists in the response.`
      );
      // ensure we don't exceed total_artists_to_fetch if api returns more
      allArtistNames = fetchedArtists
        .slice(0, TOTAL_ARTISTS_TO_FETCH)
        .map((artist) => artist.name);
    } else {
      console.log(
        `      No artists found in the response or unexpected format.`
      );
    }
  } catch (error) {
    console.error(
      `      Network or parsing error during fetch:`,
      error.message
    );
  }

  console.log(`\nTotal artists collected: ${allArtistNames.length}`);

  if (allArtistNames.length > 0) {
    try {
      await fs.writeFile(OUTPUT_FILENAME, allArtistNames.join("\n"), "utf-8");
      console.log(
        `Successfully wrote ${allArtistNames.length} artist names to ${OUTPUT_FILENAME}`
      );
    } catch (error) {
      console.error(`Error writing to file ${OUTPUT_FILENAME}:`, error.message);
    }
  } else {
    console.log("No artist names to write.");
  }

  console.log("--- Last.fm Top Artist Fetcher Finished ---");
}

fetchTopArtistsLastfm();
