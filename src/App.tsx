/**
 * Campus Navigation System - User-Friendly Edition
 *
 * Clean, simple, and intuitive walking directions across campus.
 * Shows only what end users care about: time to walk, distance, and clear turn-by-turn steps.
 */

import React, { useState, useEffect } from 'react';
import {
  INITIAL_LOCATIONS,
  INITIAL_EDGES,
  Location,
  Edge,
  RouteResult,
  runPathfinding,
  findAlternativeRoute,
  findNearestFacility,
  formatWalkingTime,
  generateRouteTextReport,
} from './data/campusData';
import { MapCanvas } from './components/MapCanvas';
import { JavaCodeViewer } from './components/JavaCodeViewer';
import {
  Compass,
  ArrowLeftRight,
  RotateCcw,
  Footprints,
  Clock,
  MapPin,
  CheckCircle2,
  Download,
  Code2,
  Navigation,
  Accessibility,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function App() {
  const [showCodeModal, setShowCodeModal] = useState<boolean>(false);
  const [locations] = useState<Location[]>(INITIAL_LOCATIONS);
  const [edges, setEdges] = useState<Edge[]>(INITIAL_EDGES);

  // User route selections - initially empty / not preselected
  const [fromId, setFromId] = useState<string>('');
  const [toId, setToId] = useState<string>('');
  const [accessibilityMode, setAccessibilityMode] = useState<boolean>(false);
  const [showAlternative, setShowAlternative] = useState<boolean>(false);

  // Route calculation results
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [alternativeRoute, setAlternativeRoute] = useState<RouteResult | null>(null);
  const [selectedRouteChoice, setSelectedRouteChoice] = useState<'primary' | 'alt'>('primary');

  const [activeStepMessage, setActiveStepMessage] = useState<string>(
    'Select where you are and where you want to go.'
  );
  const [clickCount, setClickCount] = useState<number>(0);

  // Recalculate route whenever selections change
  useEffect(() => {
    calculateRoute(fromId, toId, edges, accessibilityMode);
  }, [fromId, toId, edges, accessibilityMode]);

  const calculateRoute = (
    start: string,
    end: string,
    currentEdges: Edge[],
    accessible: boolean
  ) => {
    if (!start || !end) {
      setRouteResult(null);
      setAlternativeRoute(null);
      if (!start && !end) {
        setActiveStepMessage('Select where you are and where you want to go.');
      } else if (!start) {
        setActiveStepMessage('Please select your starting point.');
      } else {
        setActiveStepMessage('Please select your destination.');
      }
      return;
    }

    if (start === end) {
      setRouteResult(null);
      setAlternativeRoute(null);
      setActiveStepMessage('You are already at this location! Please pick a different destination.');
      return;
    }

    const primary = runPathfinding(locations, currentEdges, start, end, 'DIJKSTRA', accessible);
    setRouteResult(primary);

    if (primary.found) {
      const alt = findAlternativeRoute(locations, currentEdges, start, end, primary, accessible);
      setAlternativeRoute(alt || null);
      setSelectedRouteChoice('primary');

      const startName = locations.find((l) => l.id === start)?.name;
      const endName = locations.find((l) => l.id === end)?.name;
      setActiveStepMessage(`Showing route from ${startName} to ${endName}.`);
    } else {
      setAlternativeRoute(null);
      setActiveStepMessage('No accessible walking path found. Pathways might be temporarily blocked.');
    }
  };

  const handleSwap = () => {
    const nextFrom = toId;
    const nextTo = fromId;
    setFromId(nextFrom);
    setToId(nextTo);
  };

  const handleNodeClick = (loc: Location) => {
    if (!fromId || (fromId && toId)) {
      setFromId(loc.id);
      setToId('');
      setClickCount(1);
      setActiveStepMessage(`Starting from ${loc.name}. Now select your destination on the map.`);
    } else {
      setToId(loc.id);
      setClickCount(0);
    }
  };

  const handleEdgeToggle = (edgeId: string) => {
    const updatedEdges = edges.map((e) =>
      e.id === edgeId ? { ...e, closed: !e.closed } : e
    );
    setEdges(updatedEdges);
    const toggled = updatedEdges.find((e) => e.id === edgeId);
    setActiveStepMessage(
      toggled?.closed
        ? 'Path marked as temporarily closed. Rerouting your walk around it...'
        : 'Path reopened. Route updated.'
    );
  };

  const handleFindNearest = (type: 'PARKING' | 'LIBRARY' | 'ACADEMIC') => {
    const effectiveFrom = fromId || 'MG';
    if (!fromId) {
      setFromId(effectiveFrom);
    }
    const res = findNearestFacility(locations, edges, effectiveFrom, type, accessibilityMode);
    if (res) {
      setToId(res.target.id);
      setActiveStepMessage(`Found nearest ${res.target.type.toLowerCase()}: ${res.target.name}.`);
    }
  };

  const handleReset = () => {
    setEdges(INITIAL_EDGES.map((e) => ({ ...e, closed: false })));
    setFromId('');
    setToId('');
    setAccessibilityMode(false);
    setShowAlternative(false);
    setClickCount(0);
    setRouteResult(null);
    setAlternativeRoute(null);
    setActiveStepMessage('Reset complete. Select your starting point and destination.');
  };

  const handleDownloadDirections = () => {
    const activeRoute = selectedRouteChoice === 'alt' && alternativeRoute ? alternativeRoute : routeResult;
    if (!activeRoute || !activeRoute.found) return;

    const startLoc = locations.find((l) => l.id === fromId)?.name || fromId;
    const endLoc = locations.find((l) => l.id === toId)?.name || toId;
    const textReport = generateRouteTextReport(activeRoute, startLoc, endLoc, accessibilityMode);

    const blob = new Blob([textReport], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Directions_${startLoc}_to_${endLoc}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const activeRoute = selectedRouteChoice === 'alt' && alternativeRoute ? alternativeRoute : routeResult;
  const startLoc = locations.find((l) => l.id === fromId);
  const endLoc = locations.find((l) => l.id === toId);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      {/* Friendly Top Navigation */}
      <header className="bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                Campus Walking Navigator
              </h1>
              <p className="text-xs text-slate-500">
                Find the easiest and fastest walking routes across campus
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Find Helpers */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 text-xs font-medium mr-1">Quick Find:</span>
              <button
                onClick={() => handleFindNearest('PARKING')}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
              >
                🚗 Nearest Parking
              </button>
              <button
                onClick={() => handleFindNearest('LIBRARY')}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
              >
                📚 Nearest Library
              </button>
            </div>

            {/* Java Code & Run Guide Modal Button */}
            <button
              onClick={() => setShowCodeModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Java App Code</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-4">
        {/* Simple & Clean Journey Planner Bar */}
        <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* From & To Selectors */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 flex-1">
              <div className="flex items-center gap-2 min-w-[200px]">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <div className="flex-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Starting Point
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
                title="Swap Start and Destination"
                className="w-8 h-8 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors cursor-pointer shrink-0"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-2 min-w-[200px]">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                <div className="flex-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Destination
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

            {/* Simple User Toggles */}
            <div className="flex items-center gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-between sm:justify-end">
              {/* Wheelchair / Avoid Stairs toggle */}
              <button
                onClick={() => setAccessibilityMode(!accessibilityMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  accessibilityMode
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Accessibility className="w-3.5 h-3.5 text-blue-600" />
                <span>Avoid Stairs (Wheelchair)</span>
              </button>

              {/* Show Alternative Route toggle */}
              {alternativeRoute && (
                <button
                  onClick={() => setShowAlternative(!showAlternative)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    showAlternative
                      ? 'bg-purple-50 border-purple-300 text-purple-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                  <span>Alternative Route</span>
                </button>
              )}

              <button
                onClick={handleReset}
                title="Reset Map and Route"
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Map & Directions Layout */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch">
          {/* Interactive Campus Map Canvas */}
          <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col shadow-xs">
            {/* Friendly Map Banner */}
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span className="font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                {activeStepMessage}
              </span>
              <span className="text-slate-400 hidden sm:inline">
                Click any building to select • Right-click path to close
              </span>
            </div>

            {/* Map Canvas Component */}
            <div className="flex-1 min-h-[460px]">
              <MapCanvas
                locations={locations}
                edges={edges}
                routeResult={selectedRouteChoice === 'primary' ? routeResult : null}
                alternativeRoute={selectedRouteChoice === 'alt' ? alternativeRoute : showAlternative ? alternativeRoute : null}
                selectedFromId={fromId}
                selectedToId={toId}
                onNodeClick={handleNodeClick}
                onEdgeToggle={handleEdgeToggle}
                animating={true}
                darkMode={false}
                showAlternative={showAlternative}
                accessibilityMode={accessibilityMode}
              />
            </div>
          </div>

          {/* Clean Walking Directions Sidebar */}
          <aside className="w-full lg:w-84 bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-4 shadow-xs">
            {/* Primary Travel Metric Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                <div className="flex items-center gap-1.5 text-xs text-blue-700 font-medium">
                  <Clock className="w-4 h-4" />
                  Walking Time
                </div>
                <div className="text-2xl font-bold text-blue-900 mt-1">
                  {activeRoute?.found ? formatWalkingTime(activeRoute.totalDistance) : '—'}
                </div>
                <div className="text-[11px] text-blue-600/80 mt-0.5">at comfortable pace</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                  <Footprints className="w-4 h-4" />
                  Total Distance
                </div>
                <div className="text-2xl font-bold text-slate-800 mt-1">
                  {activeRoute?.found ? `${activeRoute.totalDistance} m` : '—'}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {accessibilityMode ? '100% step-free' : 'walkable route'}
                </div>
              </div>
            </div>

            {/* Route Choice Picker (if alternative exists) */}
            {alternativeRoute && showAlternative && (
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
                <button
                  onClick={() => setSelectedRouteChoice('primary')}
                  className={`flex-1 py-1.5 font-semibold rounded-md transition-colors cursor-pointer ${
                    selectedRouteChoice === 'primary'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Fastest Route ({routeResult?.totalDistance}m)
                </button>
                <button
                  onClick={() => setSelectedRouteChoice('alt')}
                  className={`flex-1 py-1.5 font-semibold rounded-md transition-colors cursor-pointer ${
                    selectedRouteChoice === 'alt'
                      ? 'bg-white text-purple-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Alternative ({alternativeRoute.totalDistance}m)
                </button>
              </div>
            )}

            {/* Simple Step-by-Step Directions */}
            <div className="flex-1 flex flex-col min-h-[220px]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Walking Directions
                </h3>
                {activeRoute?.found && (
                  <button
                    onClick={handleDownloadDirections}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Save
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto max-h-[300px] p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2.5 text-xs">
                {!activeRoute ? (
                  <p className="text-slate-400 italic py-4 text-center">
                    Pick a start and destination above to see step-by-step directions.
                  </p>
                ) : !activeRoute.found ? (
                  <div className="py-4 text-center text-red-600 space-y-1">
                    <p className="font-bold">No walking path available</p>
                    <p className="text-[11px] text-slate-500">
                      All paths between these locations are currently closed or have stairs.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Step 1: Start */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">
                          Start at {activeRoute.path[0].name}
                        </span>
                        <div className="text-slate-500 text-[11px]">Begin your walk here</div>
                      </div>
                    </div>

                    {/* Intermediate Steps */}
                    {activeRoute.path.slice(0, -1).map((curr, idx) => {
                      const next = activeRoute.path[idx + 1];
                      const segEdge = edges.find(
                        (e) =>
                          (e.uId === curr.id && e.vId === next.id) ||
                          (e.uId === next.id && e.vId === curr.id)
                      );
                      const segDist = segEdge?.distance || 0;

                      return (
                        <div key={idx} className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                            {idx + 2}
                          </div>
                          <div>
                            <div>
                              Walk <strong className="text-slate-900">{segDist}m</strong> along{' '}
                              <span className="text-slate-700">{segEdge?.name || 'pathway'}</span>
                            </div>
                            <div className="text-slate-500 text-[11px]">
                              Head towards {next.name}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Final Step: Arrival */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200 text-emerald-800 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Arrived at {endLoc?.name} ({activeRoute.totalDistance}m total)
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Practical Campus Tip */}
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900">
              <span className="font-bold block mb-0.5">💡 Campus Walking Tip</span>
              <span>
                Road construction? Right-click any path on the map to mark it closed and find a detour immediately.
              </span>
            </div>
          </aside>
        </div>
      </main>

      {/* Java Source Code & Run Instructions Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  Java Desktop Application Source Code
                </h3>
                <p className="text-xs text-slate-300">
                  Ready-to-compile single file: <code className="font-mono text-emerald-400">javac CampusNavigator.java && java CampusNavigator</code>
                </p>
              </div>
              <button
                onClick={() => setShowCodeModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <JavaCodeViewer />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
