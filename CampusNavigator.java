/**
 * CampusNavigator.java
 * 
 * Simple, clean, single-file Java Swing application for campus navigation.
 * Uses Dijkstra's Algorithm with a PriorityQueue to find the shortest walking route.
 * 
 * How to compile and run:
 *   javac CampusNavigator.java
 *   java CampusNavigator
 */

import java.awt.*;
import java.awt.event.*;
import java.awt.geom.*;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.PriorityQueue;
import java.util.Set;
import java.util.Vector;
import javax.swing.*;
import javax.swing.Timer;
import javax.swing.border.EmptyBorder;

// ============================================================================
// 1. LOCATION (Node in the campus graph)
// ============================================================================
class Location {
    String id;
    String name;
    String code;
    String type; // "ENTRANCE", "PARKING", "LIBRARY", "ACADEMIC"
    int x, y;

    public Location(String id, String name, String code, String type, int x, int y) {
        this.id = id;
        this.name = name;
        this.code = code;
        this.type = type;
        this.x = x;
        this.y = y;
    }

    public Color getColor() {
        switch (type) {
            case "ENTRANCE": return new Color(46, 125, 50);  // Green
            case "PARKING":  return new Color(230, 81, 0);   // Orange
            case "LIBRARY":  return new Color(106, 27, 154); // Purple
            default:         return new Color(21, 101, 192); // Blue (Academic)
        }
    }

    @Override
    public String toString() {
        if ("".equals(id)) return name;
        return name + " (" + code + ")";
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        return Objects.equals(id, ((Location) o).id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}

// ============================================================================
// 2. EDGE (Walkable path between two locations)
// ============================================================================
class Edge {
    Location u, v;
    int distance; // in metres
    boolean closed = false; // true if path is blocked / under construction

    public Edge(Location u, Location v, int distance) {
        this.u = u;
        this.v = v;
        this.distance = distance;
    }

    public Location getOther(Location from) {
        if (from.equals(u)) return v;
        if (from.equals(v)) return u;
        return null;
    }

    public boolean connects(Location a, Location b) {
        return (u.equals(a) && v.equals(b)) || (u.equals(b) && v.equals(a));
    }
}

// ============================================================================
// 3. ROUTE RESULT
// ============================================================================
class RouteResult {
    List<Location> path;
    int totalDistance;
    boolean found;

    public RouteResult(List<Location> path, int totalDistance, boolean found) {
        this.path = path != null ? path : new ArrayList<>();
        this.totalDistance = totalDistance;
        this.found = found;
    }

    // Walking speed: 1.2 m/s
    public String getWalkingTime() {
        int seconds = (int) Math.round(totalDistance / 1.2);
        int mins = seconds / 60;
        int secs = seconds % 60;
        if (mins == 0) return secs + " sec";
        return mins + " min " + secs + " sec";
    }
}

// ============================================================================
// 4. CAMPUS GRAPH & DIJKSTRA ALGORITHM
// ============================================================================
class CampusGraph {
    List<Location> locations = new ArrayList<>();
    List<Edge> edges = new ArrayList<>();
    Map<Location, List<Edge>> adj = new HashMap<>();

    public CampusGraph() {
        buildCampus();
    }

    // All campus data kept in this single method for easy editing
    public void buildCampus() {
        locations.clear();
        edges.clear();
        adj.clear();

        // 7 Campus Locations (Coordinates fit ~740x500 map)
        Location mg = new Location("MG", "Main Gate", "MG", "ENTRANCE", 90, 380);
        Location pk = new Location("PK", "Parking", "PK", "PARKING", 200, 430);
        Location lb = new Location("LB", "Library", "LB", "LIBRARY", 160, 200);
        Location tn = new Location("TN", "TAN Block", "TN", "ACADEMIC", 280, 80);
        Location cs = new Location("CS", "CSE Department", "CS", "ACADEMIC", 390, 200);
        Location eb = new Location("EB", "E Block", "EB", "ACADEMIC", 430, 380);
        Location fb = new Location("FB", "F Block", "FB", "ACADEMIC", 580, 110);

        locations.addAll(Arrays.asList(mg, pk, lb, tn, cs, eb, fb));
        for (Location loc : locations) adj.put(loc, new ArrayList<>());

        // Realistic Walkable Connections (distances in metres)
        addEdge(mg, pk, 130);
        addEdge(mg, lb, 210);
        addEdge(mg, cs, 350);
        addEdge(pk, eb, 240);
        addEdge(lb, tn, 170);
        addEdge(lb, cs, 230);
        addEdge(tn, cs, 160);
        addEdge(tn, fb, 310);
        addEdge(cs, eb, 180);
        addEdge(cs, fb, 210);
        addEdge(eb, fb, 290);
    }

    public void addEdge(Location u, Location v, int dist) {
        Edge edge = new Edge(u, v, dist);
        edges.add(edge);
        adj.get(u).add(edge);
        adj.get(v).add(edge);
    }

    // Dijkstra's Shortest Path Algorithm using a PriorityQueue: O((V + E) log V)
    public RouteResult findShortestPath(Location start, Location end) {
        if (start == null || end == null) return new RouteResult(null, 0, false);
        if (start.equals(end)) return new RouteResult(Collections.singletonList(start), 0, true);

        Map<Location, Integer> dist = new HashMap<>();
        Map<Location, Location> prev = new HashMap<>();
        Set<Location> visited = new HashSet<>();

        for (Location loc : locations) dist.put(loc, Integer.MAX_VALUE);
        dist.put(start, 0);

        PriorityQueue<Location> pq = new PriorityQueue<>(Comparator.comparingInt(dist::get));
        pq.add(start);

        while (!pq.isEmpty()) {
            Location curr = pq.poll();
            if (visited.contains(curr)) continue;
            visited.add(curr);

            if (curr.equals(end)) break;

            for (Edge edge : adj.getOrDefault(curr, Collections.emptyList())) {
                if (edge.closed) continue; // Skip blocked paths

                Location neighbor = edge.getOther(curr);
                if (neighbor == null || visited.contains(neighbor)) continue;

                int newDist = dist.get(curr) + edge.distance;
                if (newDist < dist.get(neighbor)) {
                    dist.put(neighbor, newDist);
                    prev.put(neighbor, curr);
                    pq.add(neighbor);
                }
            }
        }

        if (!visited.contains(end) || dist.get(end) == Integer.MAX_VALUE) {
            return new RouteResult(null, 0, false);
        }

        // Reconstruct path
        LinkedList<Location> path = new LinkedList<>();
        Location step = end;
        while (step != null) {
            path.addFirst(step);
            step = prev.get(step);
        }

        return new RouteResult(path, dist.get(end), true);
    }

    // Helper to find edge near a clicked mouse point (for right-click to close/open)
    public Edge findEdgeNear(int px, int py) {
        for (Edge e : edges) {
            double d = Line2D.ptSegDist(e.u.x, e.u.y, e.v.x, e.v.y, px, py);
            if (d < 16.0) return e;
        }
        return null;
    }

    // Helper to find location near a clicked mouse point
    public Location findLocationNear(int px, int py) {
        for (Location loc : locations) {
            if (Point2D.distance(loc.x, loc.y, px, py) <= 24) return loc;
        }
        return null;
    }
}

// ============================================================================
// 5. MAP PANEL (Custom canvas showing grid, nodes, edges, and shortest path)
// ============================================================================
class MapPanel extends JPanel {
    CampusGraph graph;
    MainFrame mainFrame;
    RouteResult result;
    Location hovered = null;
    float animProgress = 1.0f;
    javax.swing.Timer animTimer;

    public MapPanel(CampusGraph graph, MainFrame mainFrame) {
        this.graph = graph;
        this.mainFrame = mainFrame;
        setBackground(new Color(248, 250, 252));
        setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));

        MouseAdapter ma = new MouseAdapter() {
            @Override
            public void mouseClicked(MouseEvent e) {
                if (SwingUtilities.isRightMouseButton(e)) {
                    // Right-click: toggle road closure
                    Edge edge = graph.findEdgeNear(e.getX(), e.getY());
                    if (edge != null) {
                        edge.closed = !edge.closed;
                        mainFrame.findRoute();
                        repaint();
                    }
                } else if (SwingUtilities.isLeftMouseButton(e)) {
                    // Left-click: select node
                    Location clicked = graph.findLocationNear(e.getX(), e.getY());
                    if (clicked != null) {
                        mainFrame.onNodeSelected(clicked);
                    }
                }
            }

            @Override
            public void mouseMoved(MouseEvent e) {
                Location loc = graph.findLocationNear(e.getX(), e.getY());
                if (!Objects.equals(hovered, loc)) {
                    hovered = loc;
                    repaint();
                }
            }
        };
        addMouseListener(ma);
        addMouseMotionListener(ma);
    }

    public void setRoute(RouteResult result) {
        this.result = result;
        if (animTimer != null && animTimer.isRunning()) animTimer.stop();
        animProgress = 0.0f;
        animTimer = new javax.swing.Timer(25, e -> {
            animProgress += 0.08f;
            if (animProgress >= 1.0f) {
                animProgress = 1.0f;
                animTimer.stop();
            }
            repaint();
        });
        animTimer.start();
    }

    @Override
    protected void paintComponent(Graphics g) {
        super.paintComponent(g);
        Graphics2D g2 = (Graphics2D) g.create();
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        // 1. Faint Background Grid
        g2.setColor(new Color(226, 232, 240));
        for (int x = 0; x < getWidth(); x += 35) g2.drawLine(x, 0, x, getHeight());
        for (int y = 0; y < getHeight(); y += 35) g2.drawLine(0, y, getWidth(), y);

        // 2. Draw Walkable Pathways (Edges)
        for (Edge edge : graph.edges) {
            int x1 = edge.u.x, y1 = edge.u.y, x2 = edge.v.x, y2 = edge.v.y;
            if (edge.closed) {
                // Dashed red line for closed paths
                g2.setStroke(new BasicStroke(3.0f, BasicStroke.CAP_BUTT, BasicStroke.JOIN_MITER, 10.0f, new float[]{6.0f, 5.0f}, 0.0f));
                g2.setColor(new Color(239, 68, 68));
                g2.drawLine(x1, y1, x2, y2);
            } else {
                g2.setStroke(new BasicStroke(3.0f));
                g2.setColor(new Color(148, 163, 184));
                g2.drawLine(x1, y1, x2, y2);
            }

            // Distance label
            int mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
            g2.setFont(new Font("Segoe UI", Font.BOLD, 10));
            String lbl = edge.closed ? "CLOSED" : edge.distance + "m";
            g2.setColor(edge.closed ? new Color(239, 68, 68) : new Color(71, 85, 105));
            g2.drawString(lbl, mx - 12, my + 4);
        }

        // 3. Highlight Shortest Path in Animated Red
        if (result != null && result.found && result.path.size() >= 2) {
            g2.setStroke(new BasicStroke(5.0f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
            g2.setColor(new Color(239, 68, 68));

            int totalSegs = result.path.size() - 1;
            float currentProg = animProgress * totalSegs;

            for (int i = 0; i < totalSegs; i++) {
                Location a = result.path.get(i);
                Location b = result.path.get(i + 1);
                if (currentProg >= i + 1) {
                    g2.drawLine(a.x, a.y, b.x, b.y);
                } else if (currentProg > i) {
                    float sub = currentProg - i;
                    int curX = (int) (a.x + (b.x - a.x) * sub);
                    int curY = (int) (a.y + (b.y - a.y) * sub);
                    g2.drawLine(a.x, a.y, curX, curY);
                }
            }

            // Draw START and END tags
            Location start = result.path.get(0);
            Location end = result.path.get(result.path.size() - 1);
            drawTag(g2, start.x, start.y - 30, "START", new Color(22, 163, 74));
            drawTag(g2, end.x, end.y - 30, "END", new Color(220, 38, 38));
        }

        // 4. Draw Location Nodes
        for (Location loc : graph.locations) {
            boolean isHovered = loc.equals(hovered);
            boolean inPath = result != null && result.path.contains(loc);

            if (isHovered || inPath) {
                g2.setColor(new Color(loc.getColor().getRed(), loc.getColor().getGreen(), loc.getColor().getBlue(), 60));
                g2.fillOval(loc.x - 28, loc.y - 28, 56, 56);
            }

            // Node Circle
            g2.setColor(loc.getColor());
            g2.fillOval(loc.x - 20, loc.y - 20, 40, 40);
            g2.setColor(Color.WHITE);
            g2.setStroke(new BasicStroke(inPath ? 3.0f : 2.0f));
            g2.drawOval(loc.x - 20, loc.y - 20, 40, 40);

            // Short Code inside circle
            g2.setFont(new Font("Segoe UI", Font.BOLD, 11));
            FontMetrics fm = g2.getFontMetrics();
            g2.drawString(loc.code, loc.x - fm.stringWidth(loc.code) / 2, loc.y + 4);

            // Name Label below
            g2.setColor(new Color(30, 41, 59));
            g2.setFont(new Font("Segoe UI", Font.BOLD, 11));
            fm = g2.getFontMetrics();
            g2.drawString(loc.name, loc.x - fm.stringWidth(loc.name) / 2, loc.y + 34);
        }

        // 5. Simple Legend
        drawLegend(g2);
        g2.dispose();
    }

    private void drawTag(Graphics2D g2, int x, int y, String text, Color bg) {
        g2.setColor(bg);
        g2.fillRoundRect(x - 22, y, 44, 18, 6, 6);
        g2.setColor(Color.WHITE);
        g2.setFont(new Font("Segoe UI", Font.BOLD, 10));
        g2.drawString(text, x - 15, y + 13);
    }

    private void drawLegend(Graphics2D g2) {
        g2.setColor(new Color(255, 255, 255, 220));
        g2.fillRoundRect(12, 12, 140, 110, 8, 8);
        g2.setColor(new Color(226, 232, 240));
        g2.drawRoundRect(12, 12, 140, 110, 8, 8);

        g2.setFont(new Font("Segoe UI", Font.PLAIN, 10));
        g2.setColor(new Color(71, 85, 105));

        int y = 28;
        drawLegendDot(g2, 20, y, new Color(46, 125, 50), "Entrance"); y += 18;
        drawLegendDot(g2, 20, y, new Color(230, 81, 0), "Parking"); y += 18;
        drawLegendDot(g2, 20, y, new Color(106, 27, 154), "Library"); y += 18;
        drawLegendDot(g2, 20, y, new Color(21, 101, 192), "Academic"); y += 18;
        g2.setColor(new Color(239, 68, 68));
        g2.drawString("— Shortest Route", 20, y);
    }

    private void drawLegendDot(Graphics2D g2, int x, int y, Color color, String name) {
        g2.setColor(color);
        g2.fillOval(x, y - 8, 8, 8);
        g2.setColor(new Color(71, 85, 105));
        g2.drawString(name, x + 14, y);
    }
}

// ============================================================================
// 6. MAIN FRAME (Main Window and Controls)
// ============================================================================
class MainFrame extends JFrame {
    CampusGraph graph = new CampusGraph();
    MapPanel mapPanel;

    JComboBox<Location> fromCombo;
    JComboBox<Location> toCombo;
    JLabel timeLabel = new JLabel("—", SwingConstants.CENTER);
    JLabel distLabel = new JLabel("—", SwingConstants.CENTER);
    DefaultListModel<String> stepsModel = new DefaultListModel<>();
    JLabel statusLabel = new JLabel("Ready.");
    boolean selectFrom = true;

    public MainFrame() {
        setTitle("Campus Navigation System");
        setSize(1100, 720);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setLocationRelativeTo(null);
        initUI();
        // Do not preselect options; show clean ready state
        stepsModel.addElement("Select a starting point and destination above, or click on the map.");
        statusLabel.setText("Ready. Choose starting point and destination to find walking route.");
    }

    private void initUI() {
        setLayout(new BorderLayout());

        // Header
        JPanel header = new JPanel(new BorderLayout());
        header.setBackground(new Color(15, 23, 42)); // Navy
        header.setBorder(new EmptyBorder(12, 20, 12, 20));

        JLabel title = new JLabel("Campus Walking Navigator");
        title.setFont(new Font("Segoe UI", Font.BOLD, 18));
        title.setForeground(Color.WHITE);

        JLabel sub = new JLabel("Find the shortest walking route between campus locations");
        sub.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        sub.setForeground(new Color(191, 219, 254));

        JPanel titleBox = new JPanel(new GridLayout(2, 1));
        titleBox.setOpaque(false);
        titleBox.add(title);
        titleBox.add(sub);
        header.add(titleBox, BorderLayout.WEST);

        // Control Toolbar
        JPanel toolbar = new JPanel(new FlowLayout(FlowLayout.LEFT, 10, 8));
        toolbar.setBackground(new Color(241, 245, 249));

        Vector<Location> fromOptions = new Vector<>();
        fromOptions.add(new Location("", "-- Select Starting Point --", "--", "PROMPT", 0, 0));
        fromOptions.addAll(graph.locations);

        Vector<Location> toOptions = new Vector<>();
        toOptions.add(new Location("", "-- Select Destination --", "--", "PROMPT", 0, 0));
        toOptions.addAll(graph.locations);

        fromCombo = new JComboBox<>(fromOptions);
        toCombo = new JComboBox<>(toOptions);
        fromCombo.setSelectedIndex(0);
        toCombo.setSelectedIndex(0);

        JButton swapBtn = new JButton("⇄");
        swapBtn.setToolTipText("Swap From and To");
        swapBtn.addActionListener(e -> {
            Location selFrom = (Location) fromCombo.getSelectedItem();
            Location selTo = (Location) toCombo.getSelectedItem();
            if (selTo != null && !"".equals(selTo.id)) {
                fromCombo.setSelectedItem(selTo);
            } else {
                fromCombo.setSelectedIndex(0);
            }
            if (selFrom != null && !"".equals(selFrom.id)) {
                toCombo.setSelectedItem(selFrom);
            } else {
                toCombo.setSelectedIndex(0);
            }
            if (fromCombo.getSelectedIndex() > 0 && toCombo.getSelectedIndex() > 0) {
                findRoute();
            }
        });

        JButton findBtn = new JButton("Find Route");
        findBtn.setBackground(new Color(37, 99, 235));
        findBtn.setForeground(Color.WHITE);
        findBtn.addActionListener(e -> findRoute());

        JButton resetBtn = new JButton("Reset");
        resetBtn.addActionListener(e -> reset());

        toolbar.add(new JLabel("From:"));
        toolbar.add(fromCombo);
        toolbar.add(swapBtn);
        toolbar.add(new JLabel("To:"));
        toolbar.add(toCombo);
        toolbar.add(findBtn);
        toolbar.add(resetBtn);

        JPanel topPanel = new JPanel(new BorderLayout());
        topPanel.add(header, BorderLayout.NORTH);
        topPanel.add(toolbar, BorderLayout.SOUTH);
        add(topPanel, BorderLayout.NORTH);

        // Map Canvas in Center
        mapPanel = new MapPanel(graph, this);
        add(mapPanel, BorderLayout.CENTER);

        // Sidebar on Right
        JPanel sidebar = new JPanel(new BorderLayout(0, 10));
        sidebar.setPreferredSize(new Dimension(320, 0));
        sidebar.setBackground(Color.WHITE);
        sidebar.setBorder(new EmptyBorder(14, 14, 14, 14));

        // Metric summary
        JPanel metrics = new JPanel(new GridLayout(1, 2, 8, 0));
        metrics.setOpaque(false);
        metrics.add(createCard("Walking Time", timeLabel, new Color(16, 185, 129)));
        metrics.add(createCard("Total Distance", distLabel, new Color(37, 99, 235)));
        sidebar.add(metrics, BorderLayout.NORTH);

        // Directions list
        JPanel listPanel = new JPanel(new BorderLayout(0, 6));
        listPanel.setOpaque(false);
        JLabel listTitle = new JLabel("Turn-by-Turn Directions:");
        listTitle.setFont(new Font("Segoe UI", Font.BOLD, 12));
        listPanel.add(listTitle, BorderLayout.NORTH);

        JList<String> list = new JList<>(stepsModel);
        list.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        list.setBackground(new Color(248, 250, 252));
        listPanel.add(new JScrollPane(list), BorderLayout.CENTER);
        sidebar.add(listPanel, BorderLayout.CENTER);

        add(sidebar, BorderLayout.EAST);

        // Bottom Status Bar
        JPanel statusBar = new JPanel(new BorderLayout());
        statusBar.setBackground(new Color(241, 245, 249));
        statusBar.setBorder(new EmptyBorder(5, 14, 5, 14));
        statusLabel.setFont(new Font("Segoe UI", Font.PLAIN, 11));
        statusBar.add(statusLabel, BorderLayout.WEST);
        JLabel hint = new JLabel("Tip: Click nodes to pick route • Right-click path to close/open");
        hint.setFont(new Font("Segoe UI", Font.ITALIC, 11));
        hint.setForeground(Color.GRAY);
        statusBar.add(hint, BorderLayout.EAST);
        add(statusBar, BorderLayout.SOUTH);
    }

    private JPanel createCard(String title, JLabel val, Color col) {
        JPanel p = new JPanel(new BorderLayout(0, 2));
        p.setBackground(new Color(248, 250, 252));
        p.setBorder(BorderFactory.createLineBorder(new Color(226, 232, 240)));
        JLabel t = new JLabel(title, SwingConstants.CENTER);
        t.setFont(new Font("Segoe UI", Font.PLAIN, 10));
        t.setForeground(Color.GRAY);
        val.setFont(new Font("Segoe UI", Font.BOLD, 15));
        val.setForeground(col);
        p.add(t, BorderLayout.NORTH);
        p.add(val, BorderLayout.CENTER);
        return p;
    }

    public void onNodeSelected(Location loc) {
        Location start = (Location) fromCombo.getSelectedItem();
        Location end = (Location) toCombo.getSelectedItem();

        if (start == null || "".equals(start.id) || (end != null && !"".equals(end.id))) {
            fromCombo.setSelectedItem(loc);
            toCombo.setSelectedIndex(0);
            mapPanel.setRoute(null);
            stepsModel.clear();
            stepsModel.addElement("Starting at " + loc.name + ". Select destination to compute route.");
            timeLabel.setText("—");
            distLabel.setText("—");
            statusLabel.setText("Selected Start: " + loc.name + ". Now click destination on map or choose from dropdown.");
        } else {
            toCombo.setSelectedItem(loc);
            findRoute();
        }
    }

    public void findRoute() {
        Location start = (Location) fromCombo.getSelectedItem();
        Location end = (Location) toCombo.getSelectedItem();

        if (start == null || "".equals(start.id) || end == null || "".equals(end.id)) {
            JOptionPane.showMessageDialog(this, "Please select both a starting point and destination from the dropdowns.", "Selection Required", JOptionPane.INFORMATION_MESSAGE);
            statusLabel.setText("Please select both From and To locations.");
            return;
        }

        if (start.equals(end)) {
            JOptionPane.showMessageDialog(this, "Source and destination are the same (" + start.name + ")!", "Notice", JOptionPane.WARNING_MESSAGE);
            statusLabel.setText("Select two different locations.");
            return;
        }

        RouteResult res = graph.findShortestPath(start, end);
        mapPanel.setRoute(res);
        stepsModel.clear();

        if (!res.found) {
            timeLabel.setText("—");
            distLabel.setText("—");
            stepsModel.addElement("No walking path found.");
            stepsModel.addElement("Connecting paths are currently closed.");
            statusLabel.setText("No path found. Right-click closed paths to reopen them.");
            return;
        }

        timeLabel.setText(res.getWalkingTime());
        distLabel.setText(res.totalDistance + " m");

        stepsModel.addElement("1. Start at " + res.path.get(0).name);
        for (int i = 0; i < res.path.size() - 1; i++) {
            Location curr = res.path.get(i);
            Location next = res.path.get(i + 1);
            int d = 0;
            for (Edge e : graph.edges) {
                if (e.connects(curr, next)) { d = e.distance; break; }
            }
            stepsModel.addElement((i + 2) + ". Walk " + d + "m to " + next.name);
        }
        stepsModel.addElement("✓ Arrive at " + end.name + " (" + res.totalDistance + "m total)");
        statusLabel.setText("Route found: " + res.totalDistance + "m in " + res.getWalkingTime() + ".");
    }

    private void reset() {
        for (Edge e : graph.edges) e.closed = false;
        fromCombo.setSelectedIndex(0);
        toCombo.setSelectedIndex(0);
        mapPanel.setRoute(null);
        stepsModel.clear();
        stepsModel.addElement("Select a starting point and destination above, or click on the map.");
        timeLabel.setText("—");
        distLabel.setText("—");
        statusLabel.setText("Reset complete. Select start and destination to navigate.");
    }
}

// ============================================================================
// 7. MAIN ENTRY POINT
// ============================================================================
public class CampusNavigator {
    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            try {
                // Use standard Nimbus Look and Feel for clean look
                for (UIManager.LookAndFeelInfo info : UIManager.getInstalledLookAndFeels()) {
                    if ("Nimbus".equals(info.getName())) {
                        UIManager.setLookAndFeel(info.getClassName());
                        break;
                    }
                }
            } catch (Exception ignored) {}
            new MainFrame().setVisible(true);
        });
    }
}
