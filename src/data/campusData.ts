export type LocationType = 'ENTRANCE' | 'PARKING' | 'LIBRARY' | 'ACADEMIC';

export interface Location {
  id: string;
  name: string;
  shortCode: string;
  type: LocationType;
  x: number;
  y: number;
  description?: string;
}

export interface Edge {
  id: string;
  uId: string;
  vId: string;
  distance: number; // in metres
  closed: boolean;
  hasStairs: boolean; // For accessibility mode
  name?: string;
}

export type AlgorithmType = 'DIJKSTRA' | 'A_STAR' | 'BFS';

export interface RouteResult {
  path: Location[];
  totalDistance: number;
  nodesExplored: number;
  executionTimeUs: number; // microseconds
  edgesInPath: Edge[];
  found: boolean;
  algorithm: AlgorithmType;
  alternativeRoute?: RouteResult;
  isAlternative?: boolean;
  explorationSteps?: {
    nodeId: string;
    distance: number;
    queueSnapshot: { id: string; dist: number }[];
  }[];
}

export interface MultiStopResult {
  legs: {
    from: Location;
    to: Location;
    result: RouteResult;
  }[];
  totalDistance: number;
  totalTimeSeconds: number;
  stopsCount: number;
  fullPath: Location[];
}

export interface AlgorithmComparison {
  algorithm: AlgorithmType;
  name: string;
  distance: number;
  stops: number;
  nodesExplored: number;
  timeUs: number;
  pathString: string;
  isOptimal: boolean;
}

export const LOCATION_TYPE_CONFIG: Record<
  LocationType,
  { label: string; primaryColor: string; bgSoft: string; darkPrimaryColor: string }
> = {
  ENTRANCE: {
    label: 'Entrance',
    primaryColor: '#2E7D32', // Green
    bgSoft: '#E8F5E9',
    darkPrimaryColor: '#4ade80',
  },
  PARKING: {
    label: 'Parking',
    primaryColor: '#E65100', // Orange
    bgSoft: '#FFF3E0',
    darkPrimaryColor: '#fb923c',
  },
  LIBRARY: {
    label: 'Library',
    primaryColor: '#6A1B9A', // Purple
    bgSoft: '#F3E5F5',
    darkPrimaryColor: '#c084fc',
  },
  ACADEMIC: {
    label: 'Academic',
    primaryColor: '#1565C0', // Blue
    bgSoft: '#E3F2FD',
    darkPrimaryColor: '#60a5fa',
  },
};

export const INITIAL_LOCATIONS: Location[] = [
  { id: 'MG', name: 'Main Gate', shortCode: 'MG', type: 'ENTRANCE', x: 90, y: 390, description: 'Campus main vehicle & pedestrian checkpoint' },
  { id: 'PK', name: 'Parking', shortCode: 'PK', type: 'PARKING', x: 210, y: 440, description: 'South parking facility with EV charging' },
  { id: 'LB', name: 'Library', shortCode: 'LB', type: 'LIBRARY', x: 160, y: 210, description: 'Central research library & study commons' },
  { id: 'TN', name: 'TAN Block', shortCode: 'TN', type: 'ACADEMIC', x: 280, y: 80, description: 'Technology and applied sciences block' },
  { id: 'CS', name: 'CSE Department', shortCode: 'CS', type: 'ACADEMIC', x: 390, y: 210, description: 'Computer Science and Engineering Labs' },
  { id: 'EB', name: 'E Block', shortCode: 'EB', type: 'ACADEMIC', x: 430, y: 390, description: 'Electronics and robotics research complex' },
  { id: 'FB', name: 'F Block', shortCode: 'FB', type: 'ACADEMIC', x: 580, y: 110, description: 'Civil & mechanical engineering workshops' },
];

export const INITIAL_EDGES: Edge[] = [
  { id: 'e1', uId: 'MG', vId: 'PK', distance: 130, closed: false, hasStairs: false, name: 'Entrance Walkway' },
  { id: 'e2', uId: 'MG', vId: 'LB', distance: 210, closed: false, hasStairs: false, name: 'West Boulevard' },
  { id: 'e3', uId: 'MG', vId: 'CS', distance: 350, closed: false, hasStairs: true,  name: 'Central Diagonal Steps' }, // Has stairs
  { id: 'e4', uId: 'PK', vId: 'EB', distance: 240, closed: false, hasStairs: false, name: 'South Perimeter Path' },
  { id: 'e5', uId: 'LB', vId: 'TN', distance: 170, closed: false, hasStairs: false, name: 'Northwest Garden Lane' },
  { id: 'e6', uId: 'LB', vId: 'CS', distance: 230, closed: false, hasStairs: false, name: 'Academic Quad Path' },
  { id: 'e7', uId: 'TN', vId: 'CS', distance: 160, closed: false, hasStairs: true,  name: 'Terrace Flight Steps' }, // Has stairs
  { id: 'e8', uId: 'TN', vId: 'FB', distance: 310, closed: false, hasStairs: false, name: 'North Academic Ridge' },
  { id: 'e9', uId: 'CS', vId: 'EB', distance: 180, closed: false, hasStairs: false, name: 'Central Science Corridor' },
  { id: 'e10', uId: 'CS', vId: 'FB', distance: 210, closed: false, hasStairs: true,  name: 'Engineering Hill Steps' }, // Has stairs
  { id: 'e11', uId: 'EB', vId: 'FB', distance: 290, closed: false, hasStairs: false, name: 'East Campus Link' },
];

/**
 * Euclidean distance heuristic in scaled campus metres for A*.
 */
function euclideanHeuristic(u: Location, v: Location): number {
  const dx = u.x - v.x;
  const dy = u.y - v.y;
  // Scaled approximate factor (~0.85m per pixel)
  return Math.sqrt(dx * dx + dy * dy) * 0.85;
}

/**
 * Core Pathfinding Runner supporting Dijkstra, A*, and BFS.
 */
export function runPathfinding(
  locations: Location[],
  edges: Edge[],
  startId: string,
  endId: string,
  algorithm: AlgorithmType = 'DIJKSTRA',
  accessibilityMode: boolean = false
): RouteResult {
  const t0 = performance.now();
  const locMap = new Map<string, Location>();
  locations.forEach((l) => locMap.set(l.id, l));

  const startLoc = locMap.get(startId);
  const endLoc = locMap.get(endId);

  if (!startLoc || !endLoc) {
    return {
      path: [],
      totalDistance: 0,
      nodesExplored: 0,
      executionTimeUs: 0,
      edgesInPath: [],
      found: false,
      algorithm,
    };
  }

  if (startId === endId) {
    const elapsed = Math.round((performance.now() - t0) * 1000);
    return {
      path: [startLoc],
      totalDistance: 0,
      nodesExplored: 1,
      executionTimeUs: Math.max(1, elapsed),
      edgesInPath: [],
      found: true,
      algorithm,
    };
  }

  // Filter edges by closed status and accessibility (avoid stairs)
  const validEdges = edges.filter((e) => {
    if (e.closed) return false;
    if (accessibilityMode && e.hasStairs) return false;
    return true;
  });

  const adj = new Map<string, { neighborId: string; edge: Edge }[]>();
  locations.forEach((l) => adj.set(l.id, []));
  validEdges.forEach((edge) => {
    adj.get(edge.uId)?.push({ neighborId: edge.vId, edge });
    adj.get(edge.vId)?.push({ neighborId: edge.uId, edge });
  });

  let nodesExplored = 0;
  const prevNode = new Map<string, string>();
  const prevEdge = new Map<string, Edge>();
  const visited = new Set<string>();

  if (algorithm === 'BFS') {
    // Unweighted BFS (fewest stops/hops)
    const queue: string[] = [startId];
    visited.add(startId);

    while (queue.length > 0) {
      const u = queue.shift()!;
      nodesExplored++;
      if (u === endId) break;

      const neighbors = adj.get(u) || [];
      for (const { neighborId: v, edge } of neighbors) {
        if (!visited.has(v)) {
          visited.add(v);
          prevNode.set(v, u);
          prevEdge.set(v, edge);
          queue.push(v);
        }
      }
    }
  } else {
    // Dijkstra or A*
    const gScore = new Map<string, number>();
    locations.forEach((l) => gScore.set(l.id, Infinity));
    gScore.set(startId, 0);

    interface PQItem {
      id: string;
      priority: number; // gScore for Dijkstra; gScore + h(u, target) for A*
    }

    const pq: PQItem[] = [{ id: startId, priority: 0 }];

    const explorationSteps: RouteResult['explorationSteps'] = [];

    while (pq.length > 0) {
      pq.sort((a, b) => a.priority - b.priority);
      const { id: u, priority: uPrio } = pq.shift()!;

      if (visited.has(u)) continue;
      visited.add(u);
      nodesExplored++;

      explorationSteps.push({
        nodeId: u,
        distance: gScore.get(u) ?? 0,
        queueSnapshot: pq.map((x) => ({ id: x.id, dist: Math.round(x.priority) })),
      });

      if (u === endId) break;

      const currentG = gScore.get(u) ?? Infinity;
      const neighbors = adj.get(u) || [];

      for (const { neighborId: v, edge } of neighbors) {
        if (visited.has(v)) continue;
        const tentativeG = currentG + edge.distance;

        if (tentativeG < (gScore.get(v) ?? Infinity)) {
          gScore.set(v, tentativeG);
          prevNode.set(v, u);
          prevEdge.set(v, edge);

          const hVal =
            algorithm === 'A_STAR'
              ? euclideanHeuristic(locMap.get(v)!, endLoc)
              : 0;

          pq.push({ id: v, priority: tentativeG + hVal });
        }
      }
    }

    const elapsed = Math.round((performance.now() - t0) * 1000);

    if (!visited.has(endId)) {
      return {
        path: [],
        totalDistance: 0,
        nodesExplored,
        executionTimeUs: Math.max(1, elapsed),
        edgesInPath: [],
        found: false,
        algorithm,
        explorationSteps,
      };
    }

    // Reconstruct path
    const path: Location[] = [];
    const edgesInPath: Edge[] = [];
    let curr: string | undefined = endId;
    let totalDistance = 0;

    while (curr) {
      const loc = locMap.get(curr);
      if (loc) path.unshift(loc);
      const edge = prevEdge.get(curr);
      if (edge) {
        edgesInPath.unshift(edge);
        totalDistance += edge.distance;
      }
      curr = prevNode.get(curr);
    }

    return {
      path,
      totalDistance,
      nodesExplored,
      executionTimeUs: Math.max(1, elapsed),
      edgesInPath,
      found: true,
      algorithm,
      explorationSteps,
    };
  }

  // Fallback for BFS reconstruct
  const elapsed = Math.round((performance.now() - t0) * 1000);
  if (!visited.has(endId)) {
    return {
      path: [],
      totalDistance: 0,
      nodesExplored,
      executionTimeUs: Math.max(1, elapsed),
      edgesInPath: [],
      found: false,
      algorithm,
    };
  }

  const path: Location[] = [];
  const edgesInPath: Edge[] = [];
  let curr: string | undefined = endId;
  let totalDistance = 0;

  while (curr) {
    const loc = locMap.get(curr);
    if (loc) path.unshift(loc);
    const edge = prevEdge.get(curr);
    if (edge) {
      edgesInPath.unshift(edge);
      totalDistance += edge.distance;
    }
    curr = prevNode.get(curr);
  }

  return {
    path,
    totalDistance,
    nodesExplored,
    executionTimeUs: Math.max(1, elapsed),
    edgesInPath,
    found: true,
    algorithm,
  };
}

/**
 * Finds alternative (second-shortest) route using edge penalty/Yen variation.
 */
export function findAlternativeRoute(
  locations: Location[],
  edges: Edge[],
  startId: string,
  endId: string,
  primaryResult: RouteResult,
  accessibilityMode: boolean = false
): RouteResult | undefined {
  if (!primaryResult.found || primaryResult.edgesInPath.length === 0) {
    return undefined;
  }

  let bestAlt: RouteResult | undefined = undefined;
  let minAltDist = Infinity;

  // Try temporarily removing each edge from the primary shortest path
  for (const edgeToRemove of primaryResult.edgesInPath) {
    const tempEdges = edges.map((e) =>
      e.id === edgeToRemove.id ? { ...e, closed: true } : e
    );

    const candidate = runPathfinding(
      locations,
      tempEdges,
      startId,
      endId,
      'DIJKSTRA',
      accessibilityMode
    );

    if (candidate.found) {
      // Must not be identical path
      const candidateIds = candidate.path.map((p) => p.id).join('-');
      const primaryIds = primaryResult.path.map((p) => p.id).join('-');

      if (candidateIds !== primaryIds && candidate.totalDistance < minAltDist) {
        minAltDist = candidate.totalDistance;
        bestAlt = { ...candidate, isAlternative: true };
      }
    }
  }

  return bestAlt;
}

/**
 * Multi-stop pathfinder: traverses waypoints [w0, w1, ..., wk] in order.
 */
export function runMultiStopRoute(
  locations: Location[],
  edges: Edge[],
  waypoints: string[],
  algorithm: AlgorithmType = 'DIJKSTRA',
  accessibilityMode: boolean = false
): MultiStopResult {
  const locMap = new Map<string, Location>();
  locations.forEach((l) => locMap.set(l.id, l));

  const legs: MultiStopResult['legs'] = [];
  let totalDistance = 0;
  const fullPath: Location[] = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const fromId = waypoints[i];
    const toId = waypoints[i + 1];
    const fromLoc = locMap.get(fromId)!;
    const toLoc = locMap.get(toId)!;

    const legResult = runPathfinding(
      locations,
      edges,
      fromId,
      toId,
      algorithm,
      accessibilityMode
    );

    legs.push({
      from: fromLoc,
      to: toLoc,
      result: legResult,
    });

    if (legResult.found) {
      totalDistance += legResult.totalDistance;
      if (i === 0) {
        fullPath.push(...legResult.path);
      } else {
        // Skip first node of subsequent leg to avoid duplicate
        fullPath.push(...legResult.path.slice(1));
      }
    }
  }

  return {
    legs,
    totalDistance,
    totalTimeSeconds: Math.round(totalDistance / 1.2),
    stopsCount: Math.max(0, fullPath.length - 2),
    fullPath,
  };
}

/**
 * Find Nearest Facility of a given LocationType from a start node.
 */
export function findNearestFacility(
  locations: Location[],
  edges: Edge[],
  startId: string,
  targetType: LocationType,
  accessibilityMode: boolean = false
): { target: Location; route: RouteResult } | null {
  const candidates = locations.filter(
    (l) => l.type === targetType && l.id !== startId
  );
  if (candidates.length === 0) return null;

  let bestRoute: RouteResult | null = null;
  let bestTarget: Location | null = null;
  let minDistance = Infinity;

  for (const cand of candidates) {
    const res = runPathfinding(
      locations,
      edges,
      startId,
      cand.id,
      'DIJKSTRA',
      accessibilityMode
    );
    if (res.found && res.totalDistance < minDistance) {
      minDistance = res.totalDistance;
      bestRoute = res;
      bestTarget = cand;
    }
  }

  if (bestRoute && bestTarget) {
    return { target: bestTarget, route: bestRoute };
  }
  return null;
}

/**
 * Compare Dijkstra, A*, and BFS side-by-side for the same query.
 */
export function compareAlgorithms(
  locations: Location[],
  edges: Edge[],
  startId: string,
  endId: string,
  accessibilityMode: boolean = false
): AlgorithmComparison[] {
  const dijkstra = runPathfinding(locations, edges, startId, endId, 'DIJKSTRA', accessibilityMode);
  const aStar = runPathfinding(locations, edges, startId, endId, 'A_STAR', accessibilityMode);
  const bfs = runPathfinding(locations, edges, startId, endId, 'BFS', accessibilityMode);

  return [
    {
      algorithm: 'DIJKSTRA',
      name: "Dijkstra's Algorithm",
      distance: dijkstra.totalDistance,
      stops: Math.max(0, dijkstra.path.length - 2),
      nodesExplored: dijkstra.nodesExplored,
      timeUs: dijkstra.executionTimeUs,
      pathString: dijkstra.found ? dijkstra.path.map((p) => p.shortCode).join(' → ') : 'No path',
      isOptimal: dijkstra.found,
    },
    {
      algorithm: 'A_STAR',
      name: 'A* Search (Euclidean Heuristic)',
      distance: aStar.totalDistance,
      stops: Math.max(0, aStar.path.length - 2),
      nodesExplored: aStar.nodesExplored,
      timeUs: aStar.executionTimeUs,
      pathString: aStar.found ? aStar.path.map((p) => p.shortCode).join(' → ') : 'No path',
      isOptimal: aStar.found && aStar.totalDistance === dijkstra.totalDistance,
    },
    {
      algorithm: 'BFS',
      name: 'Breadth-First Search (Fewest Stops)',
      distance: bfs.totalDistance,
      stops: Math.max(0, bfs.path.length - 2),
      nodesExplored: bfs.nodesExplored,
      timeUs: bfs.executionTimeUs,
      pathString: bfs.found ? bfs.path.map((p) => p.shortCode).join(' → ') : 'No path',
      isOptimal: bfs.found && bfs.totalDistance === dijkstra.totalDistance,
    },
  ];
}

/**
 * Format walking time at 1.2 m/s.
 */
export function formatWalkingTime(meters: number): string {
  const seconds = Math.round(meters / 1.2);
  const minutes = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  if (minutes === 0) return `${remainingSecs} sec`;
  return `${minutes} min ${remainingSecs} sec`;
}

/**
 * Export route itinerary as a clean text file.
 */
export function generateRouteTextReport(
  route: RouteResult,
  startName: string,
  endName: string,
  accessibilityMode: boolean
): string {
  const dateStr = new Date().toLocaleString();
  let txt = `======================================================\n`;
  txt += `       CAMPUS WALKING DIRECTIONS REPORT               \n`;
  txt += `======================================================\n`;
  txt += `Date             : ${dateStr}\n`;
  txt += `From             : ${startName}\n`;
  txt += `To               : ${endName}\n`;
  txt += `Accessibility    : ${accessibilityMode ? 'Step-Free (Avoids Stairs)' : 'Standard'}\n`;
  txt += `Total Distance   : ${route.totalDistance} metres\n`;
  txt += `Walking Time     : ${formatWalkingTime(route.totalDistance)}\n`;
  txt += `Stops Count      : ${Math.max(0, route.path.length - 2)}\n`;
  txt += `------------------------------------------------------\n`;
  txt += `STEP-BY-STEP DIRECTIONS:\n`;
  txt += `------------------------------------------------------\n`;

  if (!route.found || route.path.length === 0) {
    txt += `No accessible route found between selected points.\n`;
  } else {
    txt += `1. Start at ${route.path[0].name} (${route.path[0].shortCode})\n`;
    for (let i = 0; i < route.path.length - 1; i++) {
      const u = route.path[i];
      const v = route.path[i + 1];
      const edge = route.edgesInPath[i];
      txt += `${i + 2}. Walk ${edge ? edge.distance : 0}m along ${edge?.name || 'pathway'} to ${v.name} (${v.shortCode})\n`;
    }
    txt += `✓ Destination reached: ${endName} (Total: ${route.totalDistance}m)\n`;
  }

  txt += `======================================================\n`;
  txt += `Campus Walking Navigator\n`;
  return txt;
}
