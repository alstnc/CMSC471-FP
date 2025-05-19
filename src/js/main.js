import "../css/style.css";

let currentGenre = "trap";
let originalArtists = [];
let top50Artists = [];
let currentBubbleMetric = "popularity"; // default bubble metric

// genre color schemes
const genreColorSchemes = {
  trap: {
    bubbleFill: "fill-teal-500",
    bubbleStroke: "stroke-teal-700",
    primaryText: "text-teal-600",
    secondaryText: "text-teal-700",
    mapStateFill: "fill-stone-300",
    mapStateStroke: "stroke-white",
  },
  grunge: {
    bubbleFill: "fill-amber-500",
    bubbleStroke: "stroke-amber-700",
    primaryText: "text-amber-600",
    secondaryText: "text-amber-700",
    mapStateFill: "fill-stone-300",
    mapStateStroke: "stroke-white",
  },
  bluegrass: {
    bubbleFill: "fill-orange-500",
    bubbleStroke: "stroke-orange-700",
    primaryText: "text-orange-600",
    secondaryText: "text-orange-700",
    mapStateFill: "fill-stone-300",
    mapStateStroke: "stroke-white",
  },
  house: {
    bubbleFill: "fill-purple-500",
    bubbleStroke: "stroke-purple-700",
    primaryText: "text-purple-600",
    secondaryText: "text-purple-700",
    mapStateFill: "fill-stone-300",
    mapStateStroke: "stroke-white",
  },
  shoegaze: {
    bubbleFill: "fill-sky-500",
    bubbleStroke: "stroke-sky-700",
    primaryText: "text-sky-600",
    secondaryText: "text-sky-700",
    mapStateFill: "fill-stone-300",
    mapStateStroke: "stroke-white",
  },
};

const genreDetails = {
  trap: {
    title: "The Rise of Trap",
    overview:
      "Emerging from the Southern United States, particularly Atlanta, in the early 1990s, Trap music sonically distinguishes itself with deep, booming 808 kick drums, crisp hi-hats often programmed in complex rhythmic patterns (like triplets), and cinematic, multi-layered synthesizers. Its lyrical content frequently delves into the realities of street life, economic hardship, and the aspiration to escape the 'trap,' reflecting the environment from which it was born. Initially an underground subgenre of Southern hip hop, Trap has steadily evolved, with its distinct sound and production techniques profoundly influencing mainstream pop, R&B, and hip hop globally.",
  },
  grunge: {
    title: "The Sound of Seattle: Grunge",
    overview:
      "Grunge developed in Seattle, Washington, during the mid-1980s, blossoming from the Pacific Northwest's independent rock scene and offering a stark alternative to the glam metal prevalent at the time. Characterized by its fusion of punk rock's raw energy and heavy metal's power, the 'Seattle sound' featured heavily distorted guitars, dynamic shifts between quiet verses and loud choruses, and deeply introspective, often angst-ridden lyrics. This raw, unpolished aesthetic, championed by bands like Nirvana, Pearl Jam, and Soundgarden, resonated with a generation and catapulted grunge to international prominence in the early 1990s, leaving a lasting impact on alternative rock.",
  },
  bluegrass: {
    title: "The Heartbeat of Appalachia: Bluegrass",
    overview:
      "Forged in the Appalachian region of the United States during the 1940s, Bluegrass music draws from a rich tapestry of influences including traditional British folk ballads, blues, and jazz. Pioneered by figures like Bill Monroe and his Blue Grass Boys, the genre is defined by its all-acoustic string instrumentation, featuring virtuosic, often improvisational, solos on the banjo (typically played in a three-finger style), fiddle, mandolin, guitar, and upright bass. Its distinctive 'high, lonesome sound' in vocal harmonies and its intricate instrumental interplay have cemented Bluegrass as a significant and enduring American roots music tradition.",
  },
  house: {
    title: "The Beat of the Underground: House",
    overview:
      "House music first emerged from the underground club scene in Chicago, specifically from venues like The Warehouse, in the early 1980s. Born from the ashes of disco, early house pioneers, often from Black and LGBTQ+ communities, utilized newly affordable drum machines (like the Roland TR-808 and TR-909) and synthesizers to create a new, soulful, and relentlessly danceable sound. Its signature four-on-the-floor kick drum, off-beat hi-hats, and prominent basslines created a hypnotic groove that quickly spread beyond Chicago, laying the foundational blueprint for countless electronic dance music genres that followed worldwide.",
  },
  shoegaze: {
    title: "Dreamlike Distortion: American Shoegaze",
    overview:
      "Shoegaze originally emerged from the UK in the late 1980s, but American bands quickly embraced and expanded upon its atmospheric soundscapes, characterized by heavy use of distortion, reverb-soaked guitars, ethereal vocals, and immersive walls of sound. While the U.S. lacked a single geographic epicenter for shoegaze, influential scenes blossomed in cities like Philadelphia, Boston, and San Francisco, where bands such as Drop Nineteens, Nothing, and Deafheaven blended dreamlike textures with introspective lyricism. Over the decades, American shoegaze has evolved, interweaving with genres like black metal, emo, and indie rock, cementing its place as a captivating chapter in alternative music.",
  },
};

// render artist list sidebar
function renderArtistList(artistsToRender, titlePrefix = null) {
  const artistListContainer = d3.select("#artist-list-area");
  artistListContainer.html("");

  const activeColorScheme =
    genreColorSchemes[currentGenre] || genreColorSchemes.trap;

  let sidebarTitle = `Top ${
    currentGenre.charAt(0).toUpperCase() + currentGenre.slice(1)
  } Artists by Popularity Score`;
  if (titlePrefix) {
    sidebarTitle = `${titlePrefix} (${artistsToRender.length})`;
  }

  artistListContainer
    .append("h2")
    .attr("class", "text-lg font-semibold mb-2")
    .html(sidebarTitle);

  const artistItems = artistListContainer
    .selectAll(".artist-item")
    .data(artistsToRender, (d) => d.id)
    .join("div")
    .attr(
      "class",
      "artist-item flex items-center p-2 border-b border-gray-200 hover:bg-gray-50"
    )
    .attr("id", (d) => `artist-${d.id}`);

  artistItems
    .append("span")
    .attr(
      "class",
      (d) =>
        `text-lg font-semibold mr-6 w-8 text-right flex-shrink-0 ${activeColorScheme.secondaryText}`
    )
    .text((d, i) => `${i + 1}`);

  artistItems
    .append("img")
    .attr("src", (d) =>
      d.images && d.images.length > 0
        ? d.images[0].url
        : "https://via.placeholder.com/50"
    )
    .attr("alt", (d) => `${d.name} image`)
    .attr("class", "w-12 h-12 rounded-full mr-3 object-cover flex-shrink-0");

  const detailsDiv = artistItems
    .append("div")
    .attr("class", "flex-grow min-w-0");

  // name
  detailsDiv
    .append("a")
    .attr("href", (d) => d.external_urls.spotify)
    .attr("target", "_blank")
    .attr("rel", "noopener noreferrer")
    .attr(
      "class",
      (d) =>
        `block text-md font-bold hover:underline truncate mb-1 ${activeColorScheme.primaryText}`
    )
    .text((d) => d.name);

  // followers
  detailsDiv
    .append("p")
    .attr("class", "text-xs text-gray-600 mb-1")
    .text((d) => `${d.followers.total.toLocaleString()} followers`);

  // location
  detailsDiv
    .append("p")
    .attr("class", "text-xs text-gray-500 flex items-center mb-1")
    .html(
      (d) =>
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor" class="w-2.5 h-3.5 inline-block mr-1 flex-shrink-0"><path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/></svg>
           <span class="truncate">${
             d.processed_origin_name || "Unknown Location"
           }</span>`
    );

  const genresDiv = detailsDiv
    .append("div")
    .attr("class", "mt-1 flex flex-wrap gap-1");

  genresDiv
    .selectAll(".genre-badge")
    .data((d) => (d.genres.length > 0 ? d.genres : ["N/A"]))
    .join("span")
    .attr(
      "class",
      "genre-badge text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full whitespace-nowrap"
    )
    .text((d) => d);

  artistItems
    .append("span")
    .attr(
      "class",
      "text-lg font-semibold text-gray-600 ml-auto pl-2 flex-shrink-0"
    )
    .text((d) => d.popularity);
}

// draw map and bubbles using aggregated data
function drawMap(
  us,
  aggregatedLocations,
  allFilteredArtists,
  initialTop50,
  activeColorScheme
) {
  const mapContainer = d3.select("#map-area");
  mapContainer.html("");

  const containerNode = mapContainer.node();
  if (!containerNode) {
    console.error("#map-area container not found");
    return;
  }
  const width = containerNode.clientWidth;
  const height = containerNode.clientHeight;

  const projection = d3
    .geoAlbersUsa()
    .scale(width * 1.1)
    .translate([width / 2, height / 2]);

  const path = d3.geoPath().projection(projection);

  let metricAccessor;
  if (currentBubbleMetric === "followers") {
    metricAccessor = (d) => d.totalFollowers;
  } else {
    metricAccessor = (d) => d.totalPopularity; // default: popularity
  }

  const maxMetricValue = d3.max(aggregatedLocations, metricAccessor) || 1;
  const radius = d3
    .scaleSqrt()
    .domain([0, maxMetricValue])
    .range([0, Math.min(width, height) * 0.08]);

  const svg = mapContainer
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("style", "max-width: 100%; height: auto;");

  // zoomable elements group
  const g = svg.append("g");

  // Select the tooltip element
  const tooltip = d3.select("#timeline-tooltip");

  g.append("path")
    .datum(topojson.feature(us, us.objects.states))
    .attr("class", activeColorScheme.mapStateFill)
    .attr("stroke", "white")
    .attr("stroke-linejoin", "round")
    .attr("d", path);

  const bubbles = g
    .selectAll("circle")
    .data(
      aggregatedLocations
        .map((d) => ({ ...d, coords: projection([d.lon, d.lat]) }))
        .filter((d) => d.coords !== null)
        .sort((a, b) => metricAccessor(b) - metricAccessor(a)) // sort by current metric
    )
    .join("circle")
    .attr("cx", (d) => d.coords[0])
    .attr("cy", (d) => d.coords[1])
    .attr("r", 0)
    .attr("class", activeColorScheme.bubbleFill)
    .attr("fill-opacity", 0.5)
    .attr(
      "class",
      (d) => `${activeColorScheme.bubbleFill} ${activeColorScheme.bubbleStroke}`
    )
    .attr("stroke-width", 0.5)
    .style("cursor", "pointer")
    .on("mouseover", function (event, d) {
      // highlight
      d3.select(this).attr("fill-opacity", 0.8).attr("stroke-width", 1.5);

      // Show and populate tooltip
      tooltip.style("opacity", 1).classed("hidden", false);
      let metricName;
      let metricValue;
      if (currentBubbleMetric === "followers") {
        metricName = "Total Followers";
        metricValue = (metricAccessor(d) || 0).toLocaleString();
      } else {
        metricName = "Total Popularity";
        metricValue = (metricAccessor(d) || 0).toLocaleString();
      }
      tooltip.html(
        `<strong>${d.locationName}</strong><br>` +
          `${metricName}: ${metricValue}<br>` +
          `Artists (${d.artistCount}): ${d.artistNames.join(", ")}`
      );

      // filter & update list
      const artistsInBubble = allFilteredArtists
        .filter((artist) => d.artistNames.includes(artist.name))
        .sort((a, b) => b.popularity - a.popularity); // sort for display
      renderArtistList(
        artistsInBubble,
        `Top <span class="${activeColorScheme.primaryText}">${
          currentGenre.charAt(0).toUpperCase() + currentGenre.slice(1)
        }</span> Artists from ${d.locationName}`
      );
    })
    .on("mouseout", function (event, d) {
      // remove highlight
      d3.select(this).attr("fill-opacity", 0.5).attr("stroke-width", 0.5);

      // Hide tooltip
      tooltip.style("opacity", 0).classed("hidden", true);

      // reset list
      renderArtistList(initialTop50);
    });

  // Add mousemove event for tooltip positioning
  bubbles.on("mousemove", function (event, d) {
    tooltip
      .style("left", event.pageX + 15 + "px")
      .style("top", event.pageY - 10 + "px");
  });

  // animate bubbles
  bubbles
    .transition()
    .duration(800)
    .attr("r", (d) => radius(metricAccessor(d)));

  const zoom = d3
    .zoom()
    .scaleExtent([1, 8]) // zoom scale extent
    .on("zoom", zoomed);

  svg.call(zoom);

  function zoomed(event) {
    g.attr("transform", event.transform);
  }
}

function drawTimelineChart(timelineData, activeColorScheme, containerSelector) {
  const container = d3.select(containerSelector);
  container.html(""); // clear prev chart/msg

  if (!timelineData || timelineData.length === 0) {
    container
      .append("p")
      .attr("class", "text-center text-gray-500 p-4")
      .text("Timeline data not available for this genre.");
    return;
  }

  const margin = { top: 20, right: 20, bottom: 70, left: 60 }; // inc. bottom/left margins
  const containerRect = container.node().getBoundingClientRect();
  const width = containerRect.width - margin.left - margin.right;
  const height = containerRect.height - margin.top - margin.bottom;

  const svg = container
    .append("svg")
    .attr("width", containerRect.width)
    .attr("height", containerRect.height)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const firstYearWithData =
    d3.min(
      timelineData.filter((d) => d.count > 0),
      (d) => d.year
    ) || d3.min(timelineData, (d) => d.year);
  const lastYearWithData =
    d3.max(
      timelineData.filter((d) => d.count > 0),
      (d) => d.year
    ) || d3.max(timelineData, (d) => d.year);

  const filteredData = timelineData.filter(
    (d) => d.year >= firstYearWithData && d.year <= lastYearWithData
  );

  const x = d3
    .scaleBand()
    .domain(filteredData.map((d) => d.year))
    .range([0, width])
    .padding(0.2);

  const xAxisGroup = svg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(
      d3
        .axisBottom(x)
        .tickValues(
          x
            .domain()
            .filter(
              (d, i) =>
                i % 5 === 0 || d === firstYearWithData || d === lastYearWithData
            )
        )
        .tickFormat(d3.format("d"))
    );

  xAxisGroup
    .selectAll("text")
    .attr("fill", "currentColor")
    .attr("transform", "translate(-10,0)rotate(-45)")
    .style("text-anchor", "end");

  xAxisGroup.selectAll(".domain").attr("class", "stroke-gray-300");
  xAxisGroup.selectAll(".tick line").attr("class", "stroke-gray-300");

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(filteredData, (d) => d.count) || 1])
    .range([height, 0]);

  const yAxisGroup = svg.append("g").call(d3.axisLeft(y));

  yAxisGroup.selectAll("text").attr("fill", "currentColor");

  yAxisGroup.selectAll(".domain").attr("class", "stroke-gray-300");
  yAxisGroup.selectAll(".tick line").attr("class", "stroke-gray-300");

  // horizontal grid lines
  svg
    .append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).tickSize(-width).tickFormat(""))
    .selectAll("line")
    .attr("class", "stroke-gray-200 stroke-opacity-50");
  svg.selectAll(".grid .domain").remove();

  // apply text color to axes ticks
  xAxisGroup.attr("class", activeColorScheme.secondaryText);
  yAxisGroup.attr("class", activeColorScheme.secondaryText);

  // timeline tooltip
  const tooltip = d3.select("#timeline-tooltip");

  const bars = svg
    .selectAll(".bar")
    .data(filteredData, (d) => d.year)
    .join("rect")
    .attr("class", (d) => `bar ${activeColorScheme.bubbleFill}`)
    .attr("x", (d) => x(d.year))
    .attr("width", x.bandwidth())
    .attr("y", (d) => y(0))
    .attr("height", (d) => 0)
    .attr("fill-opacity", 0.7);

  // animate bars
  bars
    .transition()
    .duration(800)
    .attr("y", (d) => y(d.count))
    .attr("height", (d) => height - y(d.count));

  bars
    .on("mouseover", function (event, d) {
      d3.select(this).attr("fill-opacity", 1);
      tooltip.style("opacity", 1).classed("hidden", false);
    })
    .on("mousemove", function (event, d) {
      tooltip
        .html(
          `<strong>Year:</strong> ${
            d.year
          }<br><strong>Albums Released:</strong> ${d.count.toLocaleString()}`
        )
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mouseout", function (event, d) {
      d3.select(this).attr("fill-opacity", 0.7);
      tooltip.style("opacity", 0).classed("hidden", true);
    });

  // x-axis label
  svg
    .append("text")
    .attr(
      "transform",
      "translate(" + width / 2 + " ," + (height + margin.top + 40) + ")"
    )
    .style("text-anchor", "middle")
    .attr("class", activeColorScheme.secondaryText)
    .text("Year");

  // y-axis label
  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - height / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .attr("class", activeColorScheme.secondaryText)
    .text("Albums Released");
}

async function loadVisualization() {
  try {
    const genreTitleElement = document.getElementById(
      "genre-title-placeholder"
    );
    const activeColorScheme =
      genreColorSchemes[currentGenre] || genreColorSchemes.trap;

    if (genreTitleElement) {
      genreTitleElement.classList.remove(
        ...Object.values(genreColorSchemes).flatMap((s) =>
          [s.primaryText, s.secondaryText].filter(Boolean)
        )
      );
      genreTitleElement.classList.add(activeColorScheme.primaryText);
      genreTitleElement.innerHTML = `<span class="${
        activeColorScheme.primaryText
      }">${
        currentGenre.charAt(0).toUpperCase() + currentGenre.slice(1)
      }</span>`;
    }

    const deepDiveGenreNameElement = document.getElementById(
      "deep-dive-genre-name"
    );
    if (deepDiveGenreNameElement) {
      deepDiveGenreNameElement.textContent =
        currentGenre.charAt(0).toUpperCase() + currentGenre.slice(1);
      deepDiveGenreNameElement.classList.remove(
        ...Object.values(genreColorSchemes).flatMap((s) =>
          [s.primaryText, s.secondaryText].filter(Boolean)
        )
      );
      deepDiveGenreNameElement.classList.add(activeColorScheme.primaryText);
    }

    const genreSpecificTitleElement = document.getElementById(
      "genre-specific-title"
    );
    const genreOverviewTextElement = document.getElementById(
      "genre-overview-text"
    );
    const timelineContainerSelector = "#timeline-chart-svg-container";

    const details = genreDetails[currentGenre] || {
      title: "Genre Information",
      overview: "Details for this genre are not yet available.",
    };

    if (genreSpecificTitleElement) {
      genreSpecificTitleElement.textContent = details.title;
      genreSpecificTitleElement.classList.remove(
        ...Object.values(genreColorSchemes).flatMap((s) =>
          [s.primaryText, s.secondaryText].filter(Boolean)
        )
      );
      genreSpecificTitleElement.classList.add(activeColorScheme.secondaryText); // or primary for emphasis
    }
    if (genreOverviewTextElement) {
      genreOverviewTextElement.textContent = details.overview;
    }

    // fetch timeline data
    let timelineData = [];
    try {
      const timelineResponse = await fetch(
        `/data/${currentGenre}_timeline.json`
      );
      if (timelineResponse.ok) {
        timelineData = await timelineResponse.json();
      } else {
        console.warn(
          `Timeline data for ${currentGenre} not found or failed to load. Status: ${timelineResponse.status}`
        );
        // drawTimelineChart handles empty data msg
      }
    } catch (error) {
      console.error(`Error fetching timeline data for ${currentGenre}:`, error);
      // drawTimelineChart handles empty data msg on error
    }
    drawTimelineChart(
      timelineData,
      activeColorScheme,
      timelineContainerSelector
    );

    // fetch artist & map data
    const [artistsResponse, usResponse] = await Promise.all([
      fetch(`/data/${currentGenre}_artists.json`),
      d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"),
    ]);

    if (!artistsResponse.ok) {
      throw new Error(`HTTP error! status: ${artistsResponse.status}`);
    }

    const allArtists = await artistsResponse.json();
    const us = usResponse;

    // filter continental us artists w/ valid coords
    originalArtists = allArtists.filter(
      (artist) =>
        artist.coordinates &&
        artist.coordinates.lat != null &&
        artist.coordinates.lon != null &&
        artist.coordinates.lat >= 24.5 &&
        artist.coordinates.lat <= 49.5 &&
        artist.coordinates.lon >= -125.0 &&
        artist.coordinates.lon <= -66.5
    );

    const locationMap = new Map();
    originalArtists.forEach((artist) => {
      const key = `${artist.coordinates.lat},${artist.coordinates.lon}`;
      if (!locationMap.has(key)) {
        locationMap.set(key, {
          lat: artist.coordinates.lat,
          lon: artist.coordinates.lon,
          locationName: artist.processed_origin_name || "Unknown Location",
          totalPopularity: 0,
          totalFollowers: 0, // init total followers
          artistCount: 0,
          artistNames: [],
        });
      }
      const locationData = locationMap.get(key);
      locationData.totalPopularity += artist.popularity;
      locationData.totalFollowers += artist.followers.total; // aggregate total followers
      locationData.artistCount++;
      locationData.artistNames.push(artist.name);
    });
    const aggregatedLocations = Array.from(locationMap.values());

    originalArtists.sort((a, b) => b.popularity - a.popularity);

    // top 50 for initial list
    top50Artists = originalArtists.slice(0, 50);

    renderArtistList(top50Artists);
    drawMap(
      us,
      aggregatedLocations,
      originalArtists,
      top50Artists,
      activeColorScheme
    );
  } catch (error) {
    console.error("failed to load visualization data:", error);
    d3.select("#artist-list-area").html(
      "<p class='text-red-500 p-4'>Error loading artist data.</p>"
    );
    d3.select("#map-area").html(
      "<p class='text-red-500 p-4'>Error loading map data.</p>"
    );
  }
}

loadVisualization();

// genre dropdown listener
d3.select("#genre-select").on("change", function () {
  currentGenre = this.value;
  loadVisualization();
});

d3.select("#metric-select").on("change", function () {
  currentBubbleMetric = this.value;
  loadVisualization(); // reload data & redraw map
});
