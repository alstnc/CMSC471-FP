# Soundwaves: A Visual History of Musical Trends

Created by Alston Chan and Maia Gustafson

**Soundwaves** is an interactive data visualization project that explores interesting patterns within music genres.

---

## Process

The initial goal of this project was to explore patterns in music. We eventually narrowed the focus to genres and subgenres. Our two main questions became:

1. **Geographical Popularity:** How does the popularity of musical genres vary across regions (e.g., parts of a country)?
2. **Genre Interrelation:** What are the relationships between genres? Can we identify a hierarchical structure?

To address these, we developed two visualizations:

- **Geographical Heat Map:** Shows the influence of specific genres in different regions (e.g., Grunge in Seattle, Trap in Atlanta).
- **Directed Force Graph:** Provides an interactive view of how genres connect and branch from one another.

### Teamwork

The high-level direction of the project was a collaborative effort. We also outlined the desired components of each visualization together. The implementation was divided: Alston created the heat map, and Maia built the force graph.

---

## Force Graph

### Overview

The force-directed graph visualizes music genres as a network of nodes (genres) and links (relationships). It's designed to show:

- **Interconnectedness:** How related genres are.
- **Hierarchy:** Starting from a root genre (pop), the graph illustrates how subgenres branch out, allowing users to trace 'genre families.'
- **Popularity/Influence:** Genre popularity influenced the hierarchy. A popularity ranking is also visible.

### Interactive Components & Features

- **Dynamic Node Display:** A sidebar lets users control how many genres are displayed. Genres are added using Breadth-First Search (BFS) traversal from the root.
- **Zoom & Pan:** Essential when displaying many nodes for readability.
- **Tooltip:** Hovering over a node reveals:
  - **Genre:** The genre's name.
  - **Rank:** Its global popularity (1 = most popular).
  - **Ancestor Path:** The genre's lineage back to the root (e.g., Pop → Rock → Alternative Rock).
- **Ancestor Highlighting:** Hovering over a genre highlights it and its direct ancestors. Other nodes and links are de-emphasized.

### Notes on the Data

**Similarity Analysis:** We used a **cosine similarity matrix** to quantify how similar genres are.

**BFS Tree Construction:**

- We made an adjacency list using **Breadth-First Search** starting from "pop."
- Constraints include:
  - Limiting the graph to the top 300 genres globaly.
  - Each genre is connected to at most it's 3 nearest neighbors.

### Acknowledgements

Sample Visulization: https://observablehq.com/@d3/force-directed-graph-component

DataSet: https://www.kaggle.com/datasets/ambaliyagati/spotify-dataset-for-playing-around-with-sql

## Genre Bubble Map

### Overview

### Interactive Components & Features

### Data Collection Methodology

#### Initial Artist List Generation (Last.fm API)

The initial set of artists is obtained using the Last.fm API. The process involves:

- Specifying a music genre/tag (e.g., "shoegaze").
- Fetching the top artists associated with this tag via Last.fm's `tag.gettopartists` endpoint.
- Saving the resulting list of artists to a text file (e.g., `shoegaze_artists.txt`).

#### Data Collection and Augmentation Pipeline

After acquiring the initial artist list, the following multi-step pipeline is used for further data enrichment:

**I. Configuration and Setup**

- **Input and Output**
  - Input: Artist names from a text file (e.g., `shoegaze_artists.txt`).
  - Output: JSON file containing detailed artist information, including geocoded locations (e.g., `shoegaze_artists.json`).
- **APIs Used**
  - Spotify API
  - Wikimedia Enterprise API
  - MusicBrainz API
  - Geocoding via geocode.maps.co

**II. Data Processing Steps**

- **Step 1: Reading Artist Names**
  - Read artist names from the input file, cleaning and preparing for API queries.
- **Step 2: Fetching Initial Data from Spotify**
  - Authenticate via Spotify API to obtain an access token.
  - Search for each artist:
    - Attempt exact name match; if unavailable, use closest match.
    - Collect artist metadata (Spotify ID, official name).
  - Handle Spotify rate limits gracefully with retries upon encountering errors.
- **Step 3: Determining Artist Origin (Wikipedia & MusicBrainz)**
  - **Primary Source: Wikipedia**
    - Query Wikimedia Enterprise API using the Spotify-acquired artist name.
    - Extract the "Origin" or "Born" fields from Wikipedia infoboxes.
    - Clean extracted location strings, specifically normalizing US location notations.
  - **Fallback Source: MusicBrainz**
    - If Wikipedia provides no usable data, query MusicBrainz.
    - Search and retrieve artist information:
      - Prefer exact name matches.
    - Extract location details from `begin-area` or `area` fields.
- **Step 4: Geocoding Extracted Locations**
  - Convert extracted textual locations into latitude and longitude coordinates using geocode.maps.co.
  - Parse API responses and apply necessary rate limiting.
- **Step 5: Output Data Compilation**
  - Aggregate collected data (Spotify metadata, location information, geographic coordinates).
  - Save the structured data as a readable JSON file.

### Acknowledgements

- TopoJSON: Used to display geographic data for the map visualizations on continental US map
- Tailwind CSS: CSS framework used for styling
- Vite: Employed to optimize development server and production builds
