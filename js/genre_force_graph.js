// Starter code for the Force Graph based on a visual tool made by Mike Bostock
// Copyright 2021-2024 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/force-directed-graph

let allBFSOrderedNodes = [];
let allAdjacencyList = {};
let allGenreRanks = {};
let childParentMap = {};

function ForceGraph(
  { nodes, links },
  {
    nodeId = (d) => d.id,
    nodeGroup,
    nodeGroups,
    nodeFill = "steelblue",
    nodeStroke = "#fff",
    nodeStrokeWidth = 1.5,
    nodeStrokeOpacity = 1,
    nodeFillOpacity = 1,
    nodeRadius = 5,
    nodeStrength,
    labelFontSize = 10,
    labelColor = "#333",
    labelFillOpacity = 1,
    labelOffsetX = 2,
    labelOffsetY = 3,
    linkSource = ({ source }) => source,
    linkTarget = ({ target }) => target,
    linkStroke = "#999",
    linkStrokeOpacity = 0.6,
    linkStrokeWidth = 1.5,
    linkStrokeLinecap = "round",
    linkStrength,
    colors = d3.schemeTableau10,
    width = 640,
    height = 400,
    invalidation,
    rootId = "pop",
  } = {}
) {
  const N = d3.map(nodes, nodeId).map(intern);
  const G =
    nodeGroup == null ? null : d3.map(nodes, (d) => nodeGroup(d)).map(intern);
  if (G && nodeGroups === undefined) nodeGroups = d3.sort(G);
  const colorScale =
    G == null || nodeGroups == null
      ? null
      : d3.scaleOrdinal(nodeGroups, colors);

  let simNodes = d3.map(nodes, (d, i) => {
    const baseObj = { id: N[i], originalIndex: i, ...d };
    baseObj.originalFill = colorScale
      ? colorScale(nodeGroup(d))
      : typeof nodeFill === "function"
      ? nodeFill(d)
      : nodeFill;
    baseObj.originalRadius =
      typeof nodeRadius === "function" ? nodeRadius(d) : nodeRadius;
    baseObj.originalFillOpacity =
      typeof nodeFillOpacity === "function"
        ? nodeFillOpacity(d)
        : nodeFillOpacity;
    return baseObj;
  });

  const currentSimNodesMap = new Map(simNodes.map((d) => [d.id, d]));

  let simLinks = d3
    .map(links, (l, i) => {
      const sourceNode = currentSimNodesMap.get(intern(linkSource(l)));
      const targetNode = currentSimNodesMap.get(intern(linkTarget(l)));
      if (!sourceNode || !targetNode) return null;

      const baseLink = {
        ...l,
        source: sourceNode,
        target: targetNode,
        originalIndex: i,
      };
      baseLink.originalStroke =
        typeof linkStroke === "function" ? linkStroke(baseLink) : linkStroke;
      baseLink.originalOpacity =
        typeof linkStrokeOpacity === "function"
          ? linkStrokeOpacity(baseLink)
          : linkStrokeOpacity;
      baseLink.originalStrokeWidth =
        typeof linkStrokeWidth === "function"
          ? linkStrokeWidth(baseLink)
          : linkStrokeWidth;
      return baseLink;
    })
    .filter((l) => l !== null);

  const forceNode = d3.forceManyBody();
  const forceLink = d3.forceLink(simLinks).id((d) => d.id);
  if (nodeStrength !== undefined) forceNode.strength(nodeStrength);
  if (linkStrength !== undefined) forceLink.strength(linkStrength);

  const simulation = d3
    .forceSimulation(simNodes)
    .force("link", forceLink)
    .force("charge", forceNode)
    .force("center", d3.forceCenter())
    .on("tick", ticked);

  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [-width / 2, -height / 2, width, height])
    .attr("style", "max-width: 100%; height: 100%; height: intrinsic;");

  const zoomableGroup = svg.append("g");

  const linkElements = zoomableGroup
    .append("g")
    .attr("stroke-linecap", linkStrokeLinecap)
    .selectAll("line")
    .data(simLinks)
    .join("line")
    .attr("stroke", (d) => d.originalStroke)
    .attr("stroke-opacity", (d) => d.originalOpacity)
    .attr("stroke-width", (d) => d.originalStrokeWidth);

  const tooltip = d3.select("#tooltip");
  const highlightColor = "orange";
  const nodeDeemphasizeOpacity = 0.15;
  const linkDeemphasizeOpacity = 0.05;
  const labelDeemphasizeOpacity = 0.15;

  const nodeElements = zoomableGroup
    .append("g")
    .attr("stroke", nodeStroke)
    .attr("stroke-opacity", nodeStrokeOpacity)
    .attr("stroke-width", nodeStrokeWidth)
    .selectAll("circle")
    .data(simNodes)
    .join("circle")
    .attr("r", (d) => d.originalRadius)
    .attr("fill", (d) => d.originalFill)
    .style("opacity", (d) => d.originalFillOpacity)
    .call(drag(simulation))
    .on("mouseover", function (event, d_hovered) {
      const ancestorsIds = new Set();
      ancestorsIds.add(d_hovered.id);
      let currentAncestorId = d_hovered.id;
      let safety = 0;
      while (
        childParentMap[currentAncestorId] &&
        currentAncestorId !== rootId &&
        safety < simNodes.length
      ) {
        currentAncestorId = childParentMap[currentAncestorId];
        ancestorsIds.add(currentAncestorId);
        safety++;
        if (currentAncestorId === rootId) break;
      }
      if (d_hovered.id === rootId) ancestorsIds.add(rootId);

      nodeElements
        .transition()
        .duration(150)
        .attr("fill", (d) =>
          ancestorsIds.has(d.id) ? highlightColor : d.originalFill
        )
        .style("opacity", (d) =>
          ancestorsIds.has(d.id)
            ? d.originalFillOpacity
            : nodeDeemphasizeOpacity
        );

      linkElements
        .transition()
        .duration(150)
        .attr("stroke-opacity", (d) =>
          ancestorsIds.has(d.source.id) && ancestorsIds.has(d.target.id)
            ? d.originalOpacity
            : linkDeemphasizeOpacity
        )
        .attr("stroke", (d) =>
          ancestorsIds.has(d.source.id) && ancestorsIds.has(d.target.id)
            ? highlightColor
            : d.originalStroke
        );

      labelElements
        .transition()
        .duration(150)
        .style("opacity", (d) =>
          ancestorsIds.has(d.id)
            ? typeof labelFillOpacity === "function"
              ? labelFillOpacity(d)
              : labelFillOpacity
            : labelDeemphasizeOpacity
        );

      const displayPath = [];
      let currentDisplayPathId = d_hovered.id;
      safety = 0;
      while (
        currentDisplayPathId &&
        currentDisplayPathId !== rootId &&
        safety < simNodes.length
      ) {
        displayPath.unshift(currentDisplayPathId);
        if (!childParentMap[currentDisplayPathId]) break;
        currentDisplayPathId = childParentMap[currentDisplayPathId];
        safety++;
      }
      if (currentDisplayPathId === rootId || d_hovered.id === rootId) {
        displayPath.unshift(rootId);
      }
      if (displayPath.length === 0 && d_hovered.id)
        displayPath.push(d_hovered.id);

      const pathString =
        displayPath.length > 0 ? displayPath.join(" → ") : d_hovered.id;

      tooltip.classed("hidden", false).style("opacity", 1).html(`
                    <div><strong>Genre:</strong> ${d_hovered.id}</div>
                    <div><strong>Rank:</strong> ${d_hovered.rank}</div>
                    <div><strong>Path:</strong> ${pathString}</div>
                `);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", event.pageX + "px")
        .style("top", event.pageY + "px");
    })
    .on("mouseout", function () {
      nodeElements
        .transition()
        .duration(200)
        .attr("fill", (d) => d.originalFill)
        .style("opacity", (d) => d.originalFillOpacity);

      linkElements
        .transition()
        .duration(200)
        .attr("stroke", (d) => d.originalStroke)
        .attr("stroke-opacity", (d) => d.originalOpacity);

      labelElements
        .transition()
        .duration(200)
        .style("opacity", (d) =>
          typeof labelFillOpacity === "function"
            ? labelFillOpacity(d)
            : labelFillOpacity
        );

      tooltip.classed("hidden", true).style("opacity", 0);
    });

  const labelElements = zoomableGroup
    .append("g")
    .attr("class", "labels")
    .selectAll("text")
    .data(simNodes)
    .join("text")
    .text((d) => d.id)
    .attr("font-size", (d) =>
      typeof labelFontSize === "function" ? labelFontSize(d) : labelFontSize
    )
    .attr("fill", labelColor)
    .style("opacity", (d) =>
      typeof labelFillOpacity === "function"
        ? labelFillOpacity(d)
        : labelFillOpacity
    )
    .attr(
      "dx",
      (d) =>
        d.originalRadius +
        (typeof labelOffsetX === "function" ? labelOffsetX(d) : labelOffsetX)
    )
    .attr("dy", labelOffsetY)
    .style("pointer-events", "none");

  if (invalidation != null) invalidation.then(() => simulation.stop());

  const zoomHandler = d3
    .zoom()
    .scaleExtent([0.1, 10])
    .on("zoom", (event) => {
      zoomableGroup.attr("transform", event.transform);
    });
  svg.call(zoomHandler);

  function intern(value) {
    return value !== null && typeof value === "object"
      ? value.valueOf()
      : value;
  }

  function ticked() {
    linkElements
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);
    nodeElements.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    labelElements.attr("x", (d) => d.x).attr("y", (d) => d.y);
  }

  function drag(sim) {
    function dragstarted(event, d) {
      if (!event.active) sim.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
      tooltip.style("opacity", 0);
    }
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    function dragended(event, d) {
      if (!event.active) sim.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    return d3
      .drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }
  return Object.assign(svg.node(), { scales: { color: colorScale } });
}

document.addEventListener("DOMContentLoaded", () => {
  const jsonFilePath = "data/music_genres_data(1).json";
  const graphContainer = document.getElementById("force_graph");
  const visContainerParent = document.getElementById("vis-container");
  const slider = document.getElementById("nodeCountSlider");
  const countValueDisplay = document.getElementById("nodeCountValue");

  const baseNodeRadius = 7;
  const baseLabelFontSize = 15;
  const baseLabelOffset = 2;
  const baseNodeFillOpacity = 1.0;
  const baseLabelFillOpacity = 1.0;

  function prepareGraphData(numNodesToDisplay) {
    if (allBFSOrderedNodes.length === 0) return { nodes: [], links: [] };
    const selectedNodeIdsSlice = allBFSOrderedNodes.slice(0, numNodesToDisplay);
    const selectedNodeIds = new Set(selectedNodeIdsSlice);
    if (
      numNodesToDisplay > 0 &&
      allBFSOrderedNodes.length > 0 &&
      !selectedNodeIds.has(allBFSOrderedNodes[0])
    ) {
      selectedNodeIds.add(allBFSOrderedNodes[0]);
    }
    const visibleNodes = Array.from(selectedNodeIds).map((id) => ({
      id: id,
      rank: allGenreRanks[id] !== undefined ? allGenreRanks[id] : "N/A",
    }));
    const visibleLinks = [];
    for (const sourceId in allAdjacencyList) {
      if (selectedNodeIds.has(sourceId)) {
        allAdjacencyList[sourceId].forEach((targetId) => {
          if (selectedNodeIds.has(targetId)) {
            visibleLinks.push({ source: sourceId, target: targetId });
          }
        });
      }
    }
    return { nodes: visibleNodes, links: visibleLinks };
  }

  function renderGraph(numNodes) {
    graphContainer.innerHTML = ""; // clear the container before rendering
    const graphData = prepareGraphData(numNodes);
    let dynamicNodeRadius = baseNodeRadius;
    let dynamicFontSize = baseLabelFontSize;
    let dynamicNodeStrength = -150;
    let dynamicNodeFillOpacity = baseNodeFillOpacity;
    let dynamicLabelFillOpacity = baseLabelFillOpacity;

    if (numNodes > 200) {
      dynamicNodeRadius = 3;
      dynamicFontSize = 0;
      dynamicNodeStrength = -40 - numNodes / 10;
    } else if (numNodes > 100) {
      dynamicNodeRadius = 4;
      dynamicFontSize = 5;
      dynamicNodeStrength = -70 - numNodes / 8;
    } else if (numNodes > 50) {
      dynamicNodeRadius = 5;
      dynamicFontSize = 7;
      dynamicNodeStrength = -100 - numNodes / 6;
    } else {
      dynamicNodeRadius = baseNodeRadius;
      dynamicFontSize = baseLabelFontSize;
      dynamicNodeStrength = -150 - numNodes / 4;
    }
    if (dynamicFontSize === 0) dynamicLabelFillOpacity = 0;

    const graphOptions = {
      nodeId: (d) => d.id,
      nodeRadius: dynamicNodeRadius,
      nodeFillOpacity: dynamicNodeFillOpacity,
      linkStrokeWidth: 1,
      linkStrokeOpacity: 0.6,
      nodeStrength: dynamicNodeStrength,
      linkStrength: 0.05,
      width: visContainerParent.clientWidth || 600,
      height: visContainerParent.clientHeight || 400,
      labelFontSize: dynamicFontSize,
      labelFillOpacity: dynamicLabelFillOpacity,
      labelColor: "#222",
      labelOffsetX: baseLabelOffset,
      labelOffsetY: 3,
      rootId: allBFSOrderedNodes.length > 0 ? allBFSOrderedNodes[0] : "pop",
    };
    const svgNode = ForceGraph(graphData, graphOptions);
    graphContainer.appendChild(svgNode);
  }

  fetch(jsonFilePath)
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      allBFSOrderedNodes = data.nodes_bfs_order;
      allAdjacencyList = data.adjacency_list;
      allGenreRanks = data.genre_ranks;

      childParentMap = {};
      for (const parent in allAdjacencyList) {
        if (allAdjacencyList[parent]) {
          allAdjacencyList[parent].forEach((child) => {
            if (!childParentMap[child]) {
              childParentMap[child] = parent;
            }
          });
        }
      }

      if (slider) {
        slider.max = allBFSOrderedNodes.length;
        let initialNodeCount = Math.min(30, allBFSOrderedNodes.length);
        if (allBFSOrderedNodes.length === 1) initialNodeCount = 1;
        if (initialNodeCount === 0 && allBFSOrderedNodes.length > 0)
          initialNodeCount = 1;
        slider.value = initialNodeCount;
        if (countValueDisplay) countValueDisplay.textContent = initialNodeCount;
        renderGraph(initialNodeCount);
        slider.addEventListener("input", (event) => {
          const count = parseInt(event.target.value, 10);
          if (countValueDisplay) countValueDisplay.textContent = count;
          renderGraph(count);
        });
      } else {
        renderGraph(Math.min(30, allBFSOrderedNodes.length || 1));
      }

      let resizeTimer;
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          const currentCount = slider
            ? parseInt(slider.value, 10)
            : Math.min(30, allBFSOrderedNodes.length || 1);
          renderGraph(currentCount);
        }, 250);
      });
    });
});
