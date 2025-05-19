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
  - **Ancestor Path:** The genre’s lineage back to the root (e.g., Pop → Rock → Alternative Rock).
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

## HeatMap

### Overview

### Interactive Components & Features

### ~Any other notes~

### Acknowledgements
