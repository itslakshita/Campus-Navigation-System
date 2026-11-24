/**
 * Campus Navigation System - Clean User-Friendly UI
 */

import React, { useState, useEffect } from 'react';
import {
  INITIAL_LOCATIONS,
  INITIAL_EDGES,
  Location,
  Edge,
  RouteResult,
  runPathfinding,
  formatWalkingTime,
} from './data/campusData';
import { MapCanvas } from './components/MapCanvas';
import {
  Compass,
  ArrowLeftRight,
  RotateCcw,
  Footprints,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export default function App() {
  const [locations] = useState<Location[]>(INITIAL_LOCATIONS);
  const [edges, setEdges] = useState<Edge[]>(INITIAL_EDGES);

  const [fromId, setFromId] = useState<string>('');
  const [toId, setToId] = useState<string>('');
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);

  useEffect(() => {
    if (!fromId || !toId || fromId === toId) {
      setRouteResult(null);
      return;
    }
    const primary = runPathfinding(locations, edges, fromId, toId, 'DIJKSTRA', false);
    setRouteResult(primary);
  }, [fromId, toId, edges, locations]);

  const handleSwap = () => {
    setFromId(toId);
    setToId(fromId);
  };

  const handleNodeClick = (loc: Location) => {
    if (!fromId || (fromId && toId)) {
      setFromId(loc.id);
      setToId('');
    } else {
      setToId(loc.id);
    }
  };

  const handleEdgeToggle = (edgeId: string) => {
    setEdges((prev) =>
      prev.map((e) => (e.id === edgeId ? { ...e, closed: !e.closed } : e))
    );
  };

  const handleReset = () => {
    setEdges(INITIAL_EDGES.map((e) => ({ ...e, closed: false })));
    setFromId('');
    setToId('');
    setRouteResult(null);
  };

  const endLoc = locations.find((l) => l.id === toId);
  const sameLocation = Boolean(fromId && toId && fromId === toId);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      {/* Clean Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <Compass className="w-5 h-5" />
            </div>
            <h1 className="text-base font-bold text-slate-900">
              Campus Navigator
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-5 flex flex-col gap-4">
        {/* Route Selection Bar */}
        <section className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 flex-1">
              <div className="flex items-center gap-2 min-w-[200px]">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <div className="flex-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    From
                  </span>
                  <select
                    value={fromId}
                    onChange={(e) => setFromId(e.target.value)}
                    className="w-full font-semibold text-slate-900 text-sm bg-transparent focus:outline-none cursor-pointer py-0.5"
                  >
                    <option value="">-- Select Starting Point --</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleSwap}
                title="Swap locations"
                className="w-8 h-8 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors cursor-pointer shrink-0"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-2 min-w-[200px]">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                <div className="flex-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    To
                  </span>
                  <select
                    value={toId}
                    onChange={(e) => setToId(e.target.value)}
                    className="w-full font-semibold text-slate-900 text-sm bg-transparent focus:outline-none cursor-pointer py-0.5"
                  >
                    <option value="">-- Select Destination --</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                title="Reset"
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Map & Directions */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch">
          <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs min-h-[500px]">
            <MapCanvas
              locations={locations}
              edges={edges}
              routeResult={routeResult}
              selectedFromId={fromId}
              selectedToId={toId}
              onNodeClick={handleNodeClick}
              onEdgeToggle={handleEdgeToggle}
              animating={true}
              darkMode={false}
              showAlternative={false}
              accessibilityMode={false}
            />
          </div>

          <aside className="w-full lg:w-80 bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-4 shadow-xs">
            {/* Key Travel Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                <div className="flex items-center gap-1.5 text-xs text-blue-700 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  Walking Time
                </div>
                <div className="text-xl font-bold text-blue-900 mt-1">
                  {routeResult?.found ? formatWalkingTime(routeResult.totalDistance) : '—'}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                  <Footprints className="w-3.5 h-3.5" />
                  Distance
                </div>
                <div className="text-xl font-bold text-slate-800 mt-1">
                  {routeResult?.found ? `${routeResult.totalDistance} m` : '—'}
                </div>
              </div>
            </div>

            {/* Step-by-Step Directions */}
            <div className="flex-1 flex flex-col">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Directions
              </h3>

              <div className="flex-1 overflow-y-auto p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2.5 text-xs">
                {sameLocation ? (
                  <p className="text-amber-700 font-medium py-4 text-center">
                    Start and destination are the same. Pick a different destination.
                  </p>
                ) : !routeResult ? (
                  <p className="text-slate-400 py-4 text-center">
                    Select a starting point and destination to view directions.
                  </p>
                ) : !routeResult.found ? (
                  <p className="text-red-600 font-medium py-4 text-center">
                    No walking path available.
                  </p>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                        1
                      </div>
                      <span className="font-semibold text-slate-900">
                        Start at {routeResult.path[0].name}
                      </span>
                    </div>

                    {routeResult.path.slice(0, -1).map((curr, idx) => {
                      const next = routeResult.path[idx + 1];
                      const segEdge = edges.find(
                        (e) =>
                          (e.uId === curr.id && e.vId === next.id) ||
                          (e.uId === next.id && e.vId === curr.id)
                      );
                      const segDist = segEdge?.distance || 0;

                      return (
                        <div key={idx} className="flex items-center gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                            {idx + 2}
                          </div>
                          <span className="text-slate-700">
                            Walk <strong className="text-slate-900">{segDist}m</strong> to{' '}
                            <strong className="text-slate-900">{next.name}</strong>
                          </span>
                        </div>
                      );
                    })}

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200 text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Arrived at {endLoc?.name}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
