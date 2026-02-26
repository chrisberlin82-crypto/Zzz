'use strict';

const { point, featureCollection, polygon: turfPolygon } = require('@turf/helpers');
const turfDistance = require('@turf/distance').default;
const turfCenter = require('@turf/center').default;
const turfBuffer = require('@turf/buffer').default;
const turfBbox = require('@turf/bbox').default;
const turfBooleanPointInPolygon = require('@turf/boolean-point-in-polygon').default;

/**
 * Convex hull using Andrew's monotone chain algorithm.
 * Returns a GeoJSON Polygon Feature or null if fewer than 3 unique points.
 */
const convexHull = (fc) => {
  const coords = fc.features.map(f => f.geometry.coordinates);
  const pts = coords.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return null;

  const cross = (O, A, B) => (A[0] - O[0]) * (B[1] - O[1]) - (A[1] - O[1]) * (B[0] - O[0]);

  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pts[i]) <= 0) upper.pop();
    upper.push(pts[i]);
  }
  lower.pop();
  upper.pop();
  const hull = lower.concat(upper);

  if (hull.length < 3) return null;
  // Close the ring
  hull.push(hull[0]);
  return turfPolygon([hull]);
};

const NEIGHBOR_THRESHOLD_M = 200;

/**
 * Berechnet Distanz zwischen zwei Koordinaten in Metern
 */
const distanceM = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  return turfDistance(
    point([parseFloat(lon1), parseFloat(lat1)]),
    point([parseFloat(lon2), parseFloat(lat2)]),
    { units: 'meters' }
  );
};

/**
 * Baut Nachbarschafts-Graph aus StreetUnits
 * Zwei Units sind Nachbarn wenn Centroid-Distanz < threshold
 *
 * @param {Array} units - [{id, centroid_lat, centroid_lon, weight, ...}]
 * @param {number} thresholdM - Schwellwert in Metern
 * @returns {Map<number, Set<number>>} adjacency - unitId -> Set von Nachbar-unitIds
 */
const buildAdjacencyGraph = (units, thresholdM = NEIGHBOR_THRESHOLD_M) => {
  const adjacency = new Map();
  units.forEach(u => adjacency.set(u.id, new Set()));

  for (let i = 0; i < units.length; i++) {
    for (let j = i + 1; j < units.length; j++) {
      const d = distanceM(
        units[i].centroid_lat, units[i].centroid_lon,
        units[j].centroid_lat, units[j].centroid_lon
      );
      if (d <= thresholdM) {
        adjacency.get(units[i].id).add(units[j].id);
        adjacency.get(units[j].id).add(units[i].id);
      }
    }
  }

  return adjacency;
};

/**
 * Waehlt Seeds mit Max-Spread-Strategie (aehnlich K-Means++)
 * Wählt die K am weitesten voneinander entfernten Units
 */
const selectSeeds = (units, k) => {
  if (units.length <= k) return units.map(u => u.id);
  if (k === 1) return [units[0].id];

  const seeds = [];
  // Erste Seed: zufaellig oder erste Unit
  seeds.push(units[0].id);
  const unitMap = new Map(units.map(u => [u.id, u]));

  for (let s = 1; s < k; s++) {
    let bestId = null;
    let bestMinDist = -1;

    for (const u of units) {
      if (seeds.includes(u.id)) continue;

      // Minimale Distanz zu allen bisherigen Seeds
      let minDist = Infinity;
      for (const seedId of seeds) {
        const seed = unitMap.get(seedId);
        const d = distanceM(u.centroid_lat, u.centroid_lon, seed.centroid_lat, seed.centroid_lon);
        if (d < minDist) minDist = d;
      }

      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        bestId = u.id;
      }
    }

    if (bestId !== null) seeds.push(bestId);
  }

  return seeds;
};

/**
 * Prueft ob ein Subgraph zusammenhaengend ist (BFS)
 */
const isConnected = (nodeIds, adjacency) => {
  if (nodeIds.length <= 1) return true;

  const nodeSet = new Set(nodeIds);
  const visited = new Set();
  const queue = [nodeIds[0]];
  visited.add(nodeIds[0]);

  while (queue.length > 0) {
    const current = queue.shift();
    const neighbors = adjacency.get(current) || new Set();
    for (const n of neighbors) {
      if (nodeSet.has(n) && !visited.has(n)) {
        visited.add(n);
        queue.push(n);
      }
    }
  }

  return visited.size === nodeSet.length;
};

/**
 * Region Growing Algorithmus
 *
 * @param {Array} units - StreetUnits mit id, centroid_lat, centroid_lon, weight
 * @param {number} numReps - Anzahl Vertriebler
 * @param {Object} options - { seedStrategy: 'spread'|'random', thresholdM }
 * @returns {{ assignments: Map<number, number[]>, weights: Map<number, number> }}
 */
const regionGrowing = (units, numReps, options = {}) => {
  const thresholdM = options.thresholdM || NEIGHBOR_THRESHOLD_M;
  const adjacency = buildAdjacencyGraph(units, thresholdM);
  const unitMap = new Map(units.map(u => [u.id, u]));

  // Seeds waehlen
  const seedIds = selectSeeds(units, numReps);

  // Initialisiere Territories: repIndex -> Set<unitId>
  const territories = new Map();
  const territoryWeights = new Map();
  const assigned = new Set();

  // Priority Queues pro Territory: [{unitId, dist}] sortiert nach dist
  const queues = new Map();

  for (let i = 0; i < numReps; i++) {
    const repIdx = i;
    territories.set(repIdx, new Set());
    territoryWeights.set(repIdx, 0);
    queues.set(repIdx, []);

    if (i < seedIds.length) {
      const seedId = seedIds[i];
      territories.get(repIdx).add(seedId);
      territoryWeights.set(repIdx, parseFloat(unitMap.get(seedId).weight) || 1);
      assigned.add(seedId);

      // Nachbarn des Seeds in Queue
      const neighbors = adjacency.get(seedId) || new Set();
      for (const n of neighbors) {
        if (!assigned.has(n)) {
          const seed = unitMap.get(seedId);
          const neighbor = unitMap.get(n);
          const d = distanceM(seed.centroid_lat, seed.centroid_lon, neighbor.centroid_lat, neighbor.centroid_lon);
          queues.get(repIdx).push({ unitId: n, dist: d });
        }
      }
      queues.get(repIdx).sort((a, b) => a.dist - b.dist);
    }
  }

  // Growing: Immer das Territory mit kleinstem Gewicht bekommt naechste Unit
  let maxIterations = units.length * 2;
  while (assigned.size < units.length && maxIterations-- > 0) {
    // Finde Territory mit kleinstem Gewicht das noch Kandidaten hat
    let bestRep = -1;
    let bestWeight = Infinity;

    for (let i = 0; i < numReps; i++) {
      // Queue aufraeumen: bereits zugewiesene entfernen
      const q = queues.get(i);
      while (q.length > 0 && assigned.has(q[0].unitId)) {
        q.shift();
      }
      if (q.length > 0 && territoryWeights.get(i) < bestWeight) {
        bestWeight = territoryWeights.get(i);
        bestRep = i;
      }
    }

    if (bestRep === -1) {
      // Keine Queues mehr haben Kandidaten -> isolierte Units zuweisen
      for (const u of units) {
        if (!assigned.has(u.id)) {
          // Finde naechstes Territory per Distanz
          let closestRep = 0;
          let closestDist = Infinity;
          for (let i = 0; i < numReps; i++) {
            for (const tid of territories.get(i)) {
              const tu = unitMap.get(tid);
              const d = distanceM(u.centroid_lat, u.centroid_lon, tu.centroid_lat, tu.centroid_lon);
              if (d < closestDist) {
                closestDist = d;
                closestRep = i;
              }
            }
          }
          territories.get(closestRep).add(u.id);
          territoryWeights.set(closestRep, territoryWeights.get(closestRep) + (parseFloat(u.weight) || 1));
          assigned.add(u.id);
        }
      }
      break;
    }

    // Naechste Unit aus Queue des bestRep nehmen
    const q = queues.get(bestRep);
    const next = q.shift();
    if (!next || assigned.has(next.unitId)) continue;

    territories.get(bestRep).add(next.unitId);
    const w = parseFloat(unitMap.get(next.unitId).weight) || 1;
    territoryWeights.set(bestRep, territoryWeights.get(bestRep) + w);
    assigned.add(next.unitId);

    // Nachbarn in Queue
    const neighbors = adjacency.get(next.unitId) || new Set();
    for (const n of neighbors) {
      if (!assigned.has(n)) {
        const nu = unitMap.get(n);
        const cu = unitMap.get(next.unitId);
        const d = distanceM(cu.centroid_lat, cu.centroid_lon, nu.centroid_lat, nu.centroid_lon);
        q.push({ unitId: n, dist: d });
      }
    }
    q.sort((a, b) => a.dist - b.dist);
  }

  return { territories, weights: territoryWeights, adjacency };
};

/**
 * Local Improvement: Boundary Swaps fuer bessere Balance
 */
const localImprovement = (territories, weights, adjacency, unitMap, maxIter = 50) => {
  const numReps = territories.size;

  // unitId -> repIdx Lookup
  const unitToRep = new Map();
  for (const [rep, unitIds] of territories) {
    for (const uid of unitIds) {
      unitToRep.set(uid, rep);
    }
  }

  const totalWeight = Array.from(weights.values()).reduce((a, b) => a + b, 0);
  const targetWeight = totalWeight / numReps;

  for (let iter = 0; iter < maxIter; iter++) {
    let improved = false;

    // Finde Grenz-Units (haben Nachbar in anderem Territory)
    const borderUnits = [];
    for (const [uid, rep] of unitToRep) {
      const neighbors = adjacency.get(uid) || new Set();
      for (const n of neighbors) {
        if (unitToRep.get(n) !== rep) {
          borderUnits.push(uid);
          break;
        }
      }
    }

    for (const uid of borderUnits) {
      const currentRep = unitToRep.get(uid);
      const currentWeight = weights.get(currentRep);
      const unit = unitMap.get(uid);
      const w = parseFloat(unit.weight) || 1;

      // Finde Nachbar-Territory
      const neighbors = adjacency.get(uid) || new Set();
      for (const n of neighbors) {
        const otherRep = unitToRep.get(n);
        if (otherRep === currentRep) continue;

        const otherWeight = weights.get(otherRep);

        // Wuerde Swap die Balance verbessern?
        const currentImbalance = Math.abs(currentWeight - targetWeight) + Math.abs(otherWeight - targetWeight);
        const newImbalance = Math.abs(currentWeight - w - targetWeight) + Math.abs(otherWeight + w - targetWeight);

        if (newImbalance >= currentImbalance) continue;

        // Contiguity-Check: Bleibt currentRep zusammenhaengend ohne uid?
        const remainingIds = [...territories.get(currentRep)].filter(id => id !== uid);
        if (remainingIds.length > 0 && !isConnected(remainingIds, adjacency)) continue;

        // Swap durchfuehren
        territories.get(currentRep).delete(uid);
        territories.get(otherRep).add(uid);
        weights.set(currentRep, currentWeight - w);
        weights.set(otherRep, otherWeight + w);
        unitToRep.set(uid, otherRep);
        improved = true;
        break;
      }
    }

    if (!improved) break;
  }
};

/**
 * Berechnet GeoJSON Polygon (ConvexHull) fuer eine Menge von Punkten
 */
const computePolygon = (points) => {
  if (!points || points.length === 0) return null;

  const features = points
    .filter(p => p.lat && p.lon)
    .map(p => point([parseFloat(p.lon), parseFloat(p.lat)]));

  if (features.length === 0) return null;

  const fc = featureCollection(features);

  if (features.length < 3) {
    // Zu wenige Punkte fuer ConvexHull -> Buffer um Centroid
    const center = turfCenter(fc);
    return turfBuffer(center, 0.05, { units: 'kilometers' });
  }

  const hull = convexHull(fc);
  if (!hull) {
    // Kollineare Punkte -> Buffer
    const center = turfCenter(fc);
    return turfBuffer(center, 0.05, { units: 'kilometers' });
  }

  // Leichten Buffer hinzufuegen damit Polygon die Punkte etwas umschliesst
  return turfBuffer(hull, 0.02, { units: 'kilometers' });
};

/**
 * Berechnet Bounds aus GeoJSON Feature
 */
const computeBounds = (polygon) => {
  if (!polygon) return null;
  const bbox = turfBbox(polygon);
  return {
    west: bbox[0],
    south: bbox[1],
    east: bbox[2],
    north: bbox[3]
  };
};

/**
 * Prueft ob ein Punkt innerhalb eines GeoJSON Polygons liegt
 */
const isPointInPolygon = (lat, lon, polygonGeoJSON) => {
  if (!lat || !lon || !polygonGeoJSON) return false;
  try {
    const pt = point([parseFloat(lon), parseFloat(lat)]);
    const poly = typeof polygonGeoJSON === 'string' ? JSON.parse(polygonGeoJSON) : polygonGeoJSON;
    return turfBooleanPointInPolygon(pt, poly);
  } catch {
    return false;
  }
};

/**
 * Grid-basierte Gebietszuteilung: Teilt das PLZ-Gebiet in gleichgrosse Quadrate.
 * Jeder Vertriebler erhaelt ein gleich grosses Rechteck/Quadrat.
 *
 * @param {Array} streetUnits - [{id, plz, street, centroid_lat, centroid_lon, weight}]
 * @param {number[]} repIds - User-IDs der Vertriebler
 * @param {Object} options - { thresholdM, doImprovement } (thresholdM/doImprovement werden hier nicht benoetigt)
 * @returns {{ territories: Array, balanceScore: number, totalWeight: number }}
 */
const assignTerritories = (streetUnits, repIds, options = {}) => {
  const numReps = repIds.length;

  if (streetUnits.length === 0) {
    return { territories: [], balanceScore: 1, totalWeight: 0 };
  }

  if (numReps === 0) {
    return { territories: [], balanceScore: 0, totalWeight: 0 };
  }

  // Einheiten mit gueltigen Koordinaten filtern
  const validUnits = streetUnits.filter(u => u.centroid_lat && u.centroid_lon);
  const noCoordUnits = streetUnits.filter(u => !u.centroid_lat || !u.centroid_lon);

  if (validUnits.length === 0) {
    // Alle Units gleichmaessig verteilen wenn keine Koordinaten
    const totalWeight = streetUnits.reduce((sum, u) => sum + (parseFloat(u.weight) || 1), 0);
    const perRep = Math.ceil(streetUnits.length / numReps);
    const result = repIds.map((repId, i) => {
      const slice = streetUnits.slice(i * perRep, (i + 1) * perRep);
      return {
        repUserId: repId,
        streetUnitIds: slice.map(u => u.id),
        weight: slice.reduce((s, u) => s + (parseFloat(u.weight) || 1), 0),
        polygon: null,
        bounds: null
      };
    });
    return { territories: result, balanceScore: 1, totalWeight };
  }

  // Bounding Box berechnen
  const lats = validUnits.map(u => parseFloat(u.centroid_lat));
  const lons = validUnits.map(u => parseFloat(u.centroid_lon));
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  // Kleines Padding hinzufuegen
  const padLat = Math.max((maxLat - minLat) * 0.02, 0.0005);
  const padLon = Math.max((maxLon - minLon) * 0.02, 0.0005);
  const south = minLat - padLat;
  const north = maxLat + padLat;
  const west = minLon - padLon;
  const east = maxLon + padLon;

  const height = north - south;
  const width = east - west;

  // Breitengrad-Korrektur (Laengengrade sind bei hoeheren Breiten kuerzer)
  const latMid = (south + north) / 2;
  const lonScale = Math.cos(latMid * Math.PI / 180);
  const effectiveWidth = width * lonScale;

  // Optimale Grid-Dimensionen finden: moeglichst quadratische Zellen
  let bestCols = 1, bestRows = numReps;
  let bestAspect = Infinity;

  for (let cols = 1; cols <= numReps; cols++) {
    const rows = Math.ceil(numReps / cols);
    const cellW = effectiveWidth / cols;
    const cellH = height / rows;
    const aspect = Math.max(cellW, cellH) / (Math.min(cellW, cellH) || 0.0001);
    if (aspect < bestAspect) {
      bestAspect = aspect;
      bestCols = cols;
      bestRows = rows;
    }
  }

  const cols = bestCols;
  const rows = bestRows;
  const cellWidth = width / cols;
  const cellHeight = height / rows;

  // Grid-Zellen erstellen (maximal numReps)
  const cells = [];
  for (let r = 0; r < rows && cells.length < numReps; r++) {
    for (let c = 0; c < cols && cells.length < numReps; c++) {
      cells.push({
        row: r, col: c,
        south: south + r * cellHeight,
        north: south + (r + 1) * cellHeight,
        west: west + c * cellWidth,
        east: west + (c + 1) * cellWidth,
        unitIds: [],
        weight: 0
      });
    }
  }

  // StreetUnits den Grid-Zellen zuweisen
  for (const unit of validUnits) {
    const lat = parseFloat(unit.centroid_lat);
    const lon = parseFloat(unit.centroid_lon);

    let col = Math.floor((lon - west) / cellWidth);
    let row = Math.floor((lat - south) / cellHeight);

    // Auf Grid begrenzen
    col = Math.max(0, Math.min(cols - 1, col));
    row = Math.max(0, Math.min(rows - 1, row));

    let cellIdx = row * cols + col;
    // Wenn Zelle ausserhalb numReps liegt, naechste gueltige Zelle finden
    if (cellIdx >= cells.length) {
      // Naechste Zelle per Distanz finden
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < cells.length; i++) {
        const cLat = (cells[i].south + cells[i].north) / 2;
        const cLon = (cells[i].west + cells[i].east) / 2;
        const d = Math.sqrt(Math.pow(lat - cLat, 2) + Math.pow((lon - cLon) * lonScale, 2));
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      }
      cellIdx = bestIdx;
    }

    cells[cellIdx].unitIds.push(unit.id);
    cells[cellIdx].weight += parseFloat(unit.weight) || 1;
  }

  // Units ohne Koordinaten der Zelle mit dem wenigsten Gewicht zuweisen
  for (const unit of noCoordUnits) {
    const minCell = cells.reduce((a, b) => a.weight <= b.weight ? a : b);
    minCell.unitIds.push(unit.id);
    minCell.weight += parseFloat(unit.weight) || 1;
  }

  // Ergebnis aufbauen: Jede Zelle = ein Quadrat-Territory
  const totalWeight = cells.reduce((sum, c) => sum + c.weight, 0);
  const targetWeight = numReps > 0 ? totalWeight / numReps : 0;

  const result = cells.map((cell, i) => {
    // Rechteck als GeoJSON Polygon
    const polygon = turfPolygon([[
      [cell.west, cell.south],
      [cell.east, cell.south],
      [cell.east, cell.north],
      [cell.west, cell.north],
      [cell.west, cell.south]
    ]]);

    const bounds = {
      west: cell.west,
      south: cell.south,
      east: cell.east,
      north: cell.north
    };

    return {
      repUserId: repIds[i],
      streetUnitIds: cell.unitIds,
      weight: cell.weight,
      polygon,
      bounds
    };
  });

  // Balance Score: 1 = perfekt, 0 = schlecht
  const maxDeviation = targetWeight > 0
    ? Math.max(...cells.map(c => Math.abs(c.weight - targetWeight) / targetWeight))
    : 0;
  const balanceScore = Math.max(0, 1 - maxDeviation);

  return { territories: result, balanceScore, totalWeight };
};

module.exports = {
  assignTerritories,
  buildAdjacencyGraph,
  selectSeeds,
  regionGrowing,
  localImprovement,
  computePolygon,
  computeBounds,
  isPointInPolygon,
  distanceM,
  NEIGHBOR_THRESHOLD_M
};
