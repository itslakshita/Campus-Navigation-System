import React, { useState } from 'react';
import {
  Location,
  Edge,
  RouteResult,
  LOCATION_TYPE_CONFIG,
  MultiStopResult,
} from '../data/campusData';

interface MapCanvasProps {
  locations: Location[];
  edges: Edge[];
  routeResult: RouteResult | null;
  alternativeRoute?: RouteResult | null;
  multiStopResult?: MultiStopResult | null;
  selectedFromId: string;
  selectedToId: string;
  onNodeClick: (location: Location) => void;
  onEdgeToggle: (edgeId: string) => void;
  animating: boolean;
  darkMode: boolean;
  showAlternative: boolean;
  accessibilityMode: boolean;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
  locations,
  edges,
  routeResult,
  alternativeRoute,
  multiStopResult,
  selectedFromId,
  selectedToId,
  onNodeClick,
  onEdgeToggle,
  animating,
  darkMode,
  showAlternative,
  accessibilityMode,
}) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  const locMap = new Map<string, Location>();
  locations.forEach((l) => locMap.set(l.id, l));

  // Determine active path nodes
  const pathNodeIds = new Set(
    multiStopResult
      ? multiStopResult.fullPath.map((p) => p.id)
      : routeResult?.path.map((n) => n.id) || []
  );

  const pathEdgeIds = new Set(routeResult?.edgesInPath.map((e) => e.id) || []);
  const altEdgeIds = new Set(alternativeRoute?.edgesInPath.map((e) => e.id) || []);

  const startLoc =
    multiStopResult && multiStopResult.fullPath.length > 0
      ? multiStopResult.fullPath[0]
      : routeResult?.path && routeResult.path.length > 0
      ? routeResult.path[0]
      : null;

  const endLoc =
    multiStopResult && multiStopResult.fullPath.length > 1
      ? multiStopResult.fullPath[multiStopResult.fullPath.length - 1]
      : routeResult?.path && routeResult.path.length > 1
      ? routeResult.path[routeResult.path.length - 1]
      : null;

  return (
    <div
      className={`relative w-full h-[540px] select-none overflow-hidden transition-colors duration-300 border ${
        darkMode
          ? 'bg-slate-950 border-slate-800'
          : 'bg-slate-50 border-slate-200'
      }`}
    >
      <svg
        viewBox="0 0 760 520"
        className="w-full h-full"
        onContextMenu={(e) => e.preventDefault()}
      >
        <defs>
          {/* Faint Grid Pattern */}
          <pattern
            id="campus-grid"
            width="35"
            height="35"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 35 0 L 0 0 0 35"
              fill="none"
              stroke={darkMode ? '#1e293b' : '#e2e8f0'}
              strokeWidth="0.8"
            />
          </pattern>

          {/* Node glow filter */}
          <filter id="node-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Background Grid */}
        <rect width="760" height="520" fill="url(#campus-grid)" />

        {/* 2. Walkable Pathways (Edges) */}
        <g id="campus-edges">
          {edges.map((edge) => {
            const u = locMap.get(edge.uId);
            const v = locMap.get(edge.vId);
            if (!u || !v) return null;

            const isHovered = hoveredEdgeId === edge.id;
            const midX = (u.x + v.x) / 2;
            const midY = (u.y + v.y) / 2;
            const isRestrictedByAccessibility = accessibilityMode && edge.hasStairs;

            return (
              <g
                key={edge.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredEdgeId(edge.id)}
                onMouseLeave={() => setHoveredEdgeId(null)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onEdgeToggle(edge.id);
                }}
                onClick={(e) => {
                  if (e.button === 2 || e.shiftKey) {
                    onEdgeToggle(edge.id);
                  }
                }}
              >
                {/* Wide invisible line for comfortable clicking */}
                <line
                  x1={u.x}
                  y1={u.y}
                  x2={v.x}
                  y2={v.y}
                  stroke="transparent"
                  strokeWidth="24"
                />

                {/* Edge line rendering */}
                {edge.closed ? (
                  <line
                    x1={u.x}
                    y1={u.y}
                    x2={v.x}
                    y2={v.y}
                    stroke="#dc2626"
                    strokeWidth="3.5"
                    strokeDasharray="8 6"
                    className="opacity-90"
                  />
                ) : isRestrictedByAccessibility ? (
                  <line
                    x1={u.x}
                    y1={u.y}
                    x2={v.x}
                    y2={v.y}
                    stroke="#f59e0b"
                    strokeWidth="3"
                    strokeDasharray="5 4"
                    className="opacity-75"
                  />
                ) : (
                  <>
                    {isHovered && (
                      <line
                        x1={u.x}
                        y1={u.y}
                        x2={v.x}
                        y2={v.y}
                        stroke="#3b82f6"
                        strokeWidth="7"
                        strokeOpacity="0.4"
                        strokeLinecap="round"
                      />
                    )}
                    <line
                      x1={u.x}
                      y1={u.y}
                      x2={v.x}
                      y2={v.y}
                      stroke={
                        pathEdgeIds.has(edge.id)
                          ? '#ef4444'
                          : altEdgeIds.has(edge.id) && showAlternative
                          ? '#3b82f6'
                          : darkMode
                          ? '#475569'
                          : '#94a3b8'
                      }
                      strokeWidth={pathEdgeIds.has(edge.id) ? '4.5' : '3'}
                      strokeLinecap="round"
                    />
                  </>
                )}

                {/* Distance and Stair Badge */}
                <g transform={`translate(${midX}, ${midY})`}>
                  {edge.closed ? (
                    <g>
                      <rect
                        x="-48"
                        y="-10"
                        width="96"
                        height="20"
                        rx="6"
                        fill={darkMode ? '#450a0a' : '#fef2f2'}
                        stroke="#ef4444"
                        strokeWidth="1.2"
                      />
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fill="#ef4444"
                        fontSize="10"
                        fontWeight="700"
                        fontFamily="Segoe UI, sans-serif"
                      >
                        CLOSED ({edge.distance}m)
                      </text>
                    </g>
                  ) : isRestrictedByAccessibility ? (
                    <g>
                      <rect
                        x="-44"
                        y="-9"
                        width="88"
                        height="18"
                        rx="5"
                        fill={darkMode ? '#451a03' : '#fffbeb'}
                        stroke="#f59e0b"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fill="#d97706"
                        fontSize="9"
                        fontWeight="700"
                        fontFamily="Segoe UI, sans-serif"
                      >
                        STAIRS ({edge.distance}m)
                      </text>
                    </g>
                  ) : (
                    <g>
                      <rect
                        x="-22"
                        y="-9"
                        width={edge.hasStairs ? '56' : '44'}
                        height="18"
                        rx="5"
                        fill={
                          pathEdgeIds.has(edge.id)
                            ? darkMode
                              ? '#7f1d1d'
                              : '#fee2e2'
                            : altEdgeIds.has(edge.id) && showAlternative
                            ? darkMode
                              ? '#1e3a8a'
                              : '#dbeafe'
                            : darkMode
                            ? '#1e293b'
                            : '#ffffff'
                        }
                        stroke={
                          pathEdgeIds.has(edge.id)
                            ? '#ef4444'
                            : altEdgeIds.has(edge.id) && showAlternative
                            ? '#3b82f6'
                            : darkMode
                            ? '#475569'
                            : '#cbd5e1'
                        }
                        strokeWidth="1"
                      />
                      <text
                        x={edge.hasStairs ? '6' : '0'}
                        y="4"
                        textAnchor="middle"
                        fill={
                          pathEdgeIds.has(edge.id)
                            ? '#ef4444'
                            : altEdgeIds.has(edge.id) && showAlternative
                            ? '#3b82f6'
                            : darkMode
                            ? '#cbd5e1'
                            : '#475569'
                        }
                        fontSize="10"
                        fontWeight="700"
                        fontFamily="Segoe UI, sans-serif"
                      >
                        {edge.hasStairs ? `${edge.distance}m 🪜` : `${edge.distance}m`}
                      </text>
                    </g>
                  )}
                </g>
              </g>
            );
          })}
        </g>

        {/* 3. Alternative Route (2nd Shortest Path - Cyan/Blue dashed) */}
        {showAlternative && alternativeRoute?.found && alternativeRoute.path.length >= 2 && (
          <g id="alternative-path">
            {alternativeRoute.path.slice(0, -1).map((loc, idx) => {
              const nextLoc = alternativeRoute.path[idx + 1];
              return (
                <line
                  key={`alt-${loc.id}-${nextLoc.id}`}
                  x1={loc.x}
                  y1={loc.y}
                  x2={nextLoc.x}
                  y2={nextLoc.y}
                  stroke="#3b82f6"
                  strokeWidth="4.5"
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                />
              );
            })}
          </g>
        )}

        {/* 4. Primary Shortest Route (Red Animated Path) */}
        {routeResult?.found && routeResult.path.length >= 2 && (
          <g id="shortest-path-highlight">
            {routeResult.path.slice(0, -1).map((loc, idx) => {
              const nextLoc = routeResult.path[idx + 1];
              return (
                <line
                  key={`path-${loc.id}-${nextLoc.id}`}
                  x1={loc.x}
                  y1={loc.y}
                  x2={nextLoc.x}
                  y2={nextLoc.y}
                  stroke="#ef4444"
                  strokeWidth="5.5"
                  strokeLinecap="round"
                  className={animating ? 'animate-pulse' : ''}
                />
              );
            })}
          </g>
        )}

        {/* Multi-Stop Combined Route (if active) */}
        {multiStopResult && multiStopResult.fullPath.length >= 2 && (
          <g id="multi-stop-path">
            {multiStopResult.fullPath.slice(0, -1).map((loc, idx) => {
              const nextLoc = multiStopResult.fullPath[idx + 1];
              return (
                <line
                  key={`multi-${loc.id}-${nextLoc.id}-${idx}`}
                  x1={loc.x}
                  y1={loc.y}
                  x2={nextLoc.x}
                  y2={nextLoc.y}
                  stroke="#8b5cf6"
                  strokeWidth="5.5"
                  strokeLinecap="round"
                  className={animating ? 'animate-pulse' : ''}
                />
              );
            })}
          </g>
        )}

        {/* 5. Location Nodes */}
        <g id="campus-nodes">
          {locations.map((loc) => {
            const config = LOCATION_TYPE_CONFIG[loc.type];
            const isHovered = hoveredNodeId === loc.id;
            const isSelectedFrom = selectedFromId === loc.id;
            const isSelectedTo = selectedToId === loc.id;
            const isInPath = pathNodeIds.has(loc.id);

            const nodeColor = darkMode ? config.darkPrimaryColor : config.primaryColor;

            return (
              <g
                key={loc.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredNodeId(loc.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onClick={() => onNodeClick(loc)}
              >
                {/* Glow ring */}
                {(isHovered || isSelectedFrom || isSelectedTo) && (
                  <circle
                    cx={loc.x}
                    cy={loc.y}
                    r="29"
                    fill={nodeColor}
                    fillOpacity="0.3"
                  />
                )}

                {/* Main Circle */}
                <circle
                  cx={loc.x}
                  cy={loc.y}
                  r="22"
                  fill={nodeColor}
                  stroke="#ffffff"
                  strokeWidth={isInPath ? '3.5' : '2'}
                  filter={isHovered ? 'url(#node-glow)' : undefined}
                />

                {/* Short Code */}
                <text
                  x={loc.x}
                  y={loc.y + 4}
                  textAnchor="middle"
                  fill={darkMode ? '#0f172a' : '#ffffff'}
                  fontSize="12"
                  fontWeight="800"
                  fontFamily="Segoe UI, sans-serif"
                >
                  {loc.shortCode}
                </text>

                {/* Name Label */}
                <g transform={`translate(${loc.x}, ${loc.y + 26})`}>
                  <rect
                    x="-55"
                    y="4"
                    width="110"
                    height="18"
                    rx="4"
                    fill={darkMode ? '#1e293b' : '#ffffff'}
                    fillOpacity="0.95"
                    stroke={darkMode ? '#475569' : '#cbd5e1'}
                    strokeWidth="0.8"
                  />
                  <text
                    x="0"
                    y="17"
                    textAnchor="middle"
                    fill={darkMode ? '#f8fafc' : '#1e293b'}
                    fontSize="11"
                    fontWeight="600"
                    fontFamily="Segoe UI, sans-serif"
                  >
                    {loc.name}
                  </text>
                </g>
              </g>
            );
          })}
        </g>

        {/* 6. START and END Badges */}
        {startLoc && (
          <g transform={`translate(${startLoc.x}, ${startLoc.y - 32})`}>
            <rect
              x="-24"
              y="-10"
              width="48"
              height="20"
              rx="6"
              fill="#16a34a"
              className="drop-shadow-sm"
            />
            <text
              x="0"
              y="4"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="10"
              fontWeight="800"
              fontFamily="Segoe UI, sans-serif"
            >
              START
            </text>
          </g>
        )}

        {endLoc && (
          <g transform={`translate(${endLoc.x}, ${endLoc.y - 32})`}>
            <rect
              x="-20"
              y="-10"
              width="40"
              height="20"
              rx="6"
              fill="#dc2626"
              className="drop-shadow-sm"
            />
            <text
              x="0"
              y="4"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="10"
              fontWeight="800"
              fontFamily="Segoe UI, sans-serif"
            >
              END
            </text>
          </g>
        )}

        {/* 7. Map Legend */}
        <g transform="translate(16, 16)">
          <rect
            width="180"
            height="180"
            rx="8"
            fill={darkMode ? '#1e293b' : '#ffffff'}
            fillOpacity="0.95"
            stroke={darkMode ? '#334155' : '#e2e8f0'}
            strokeWidth="1"
          />
          <text
            x="12"
            y="20"
            fill={darkMode ? '#f8fafc' : '#0f172a'}
            fontSize="11"
            fontWeight="700"
            fontFamily="Segoe UI, sans-serif"
          >
            CAMPUS MAP LEGEND
          </text>

          <circle cx="18" cy="40" r="5" fill="#2E7D32" />
          <text x="30" y="44" fill={darkMode ? '#cbd5e1' : '#475569'} fontSize="10" fontFamily="Segoe UI, sans-serif">
            Entrance (Green)
          </text>

          <circle cx="18" cy="60" r="5" fill="#E65100" />
          <text x="30" y="64" fill={darkMode ? '#cbd5e1' : '#475569'} fontSize="10" fontFamily="Segoe UI, sans-serif">
            Parking (Orange)
          </text>

          <circle cx="18" cy="80" r="5" fill="#6A1B9A" />
          <text x="30" y="84" fill={darkMode ? '#cbd5e1' : '#475569'} fontSize="10" fontFamily="Segoe UI, sans-serif">
            Library (Purple)
          </text>

          <circle cx="18" cy="100" r="5" fill="#1565C0" />
          <text x="30" y="104" fill={darkMode ? '#cbd5e1' : '#475569'} fontSize="10" fontFamily="Segoe UI, sans-serif">
            Academic (Blue)
          </text>

          <line x1="12" y1="120" x2="24" y2="120" stroke="#dc2626" strokeWidth="2.5" />
          <text x="30" y="124" fill={darkMode ? '#cbd5e1' : '#475569'} fontSize="10" fontFamily="Segoe UI, sans-serif">
            Primary Shortest (Red)
          </text>

          <line x1="12" y1="140" x2="24" y2="140" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 2" />
          <text x="30" y="144" fill={darkMode ? '#cbd5e1' : '#475569'} fontSize="10" fontFamily="Segoe UI, sans-serif">
            Alternative Route (Blue)
          </text>

          <line x1="12" y1="160" x2="24" y2="160" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 2" />
          <text x="30" y="164" fill={darkMode ? '#cbd5e1' : '#475569'} fontSize="10" fontFamily="Segoe UI, sans-serif">
            Closed Path (Dashed)
          </text>
        </g>
      </svg>

      {/* Floating Action Tip */}
      <div
        className={`absolute bottom-2 right-3 pointer-events-none text-xs px-2.5 py-1 rounded border shadow-xs ${
          darkMode
            ? 'bg-slate-900/90 text-slate-300 border-slate-700'
            : 'bg-white/90 text-slate-600 border-slate-200'
        }`}
      >
        Left-click 2 nodes to route • Right-click pathway to close/reopen
      </div>
    </div>
  );
};
