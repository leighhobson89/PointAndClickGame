import { getPathsData, getCurrentScreenId } from './constantsAndGlobalVars.js';

// Priority Queue class
class PriorityQueue {
    constructor() {
        this.queue = [];
    }

    enqueue(node, priority) {
        this.queue.push({ node, priority });
        this.queue.sort((a, b) => a.priority - b.priority);
    }

    dequeue() {
        return this.queue.shift().node;
    }

    isEmpty() {
        return this.queue.length === 0;
    }
}

// Utility function to calculate the distance between two points
function calculateDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// Convert percentage coordinates to absolute coordinates based on canvas size
function convertPercentageToAbsolute(x, y, canvasWidth, canvasHeight) {
    return {
        x: (x / 100) * canvasWidth,
        y: (y / 100) * canvasHeight
    };
}

// Check if a point is on a line segment
function isPointOnSegment(point, segStart, segEnd) {
    const crossProduct = (point.y - segStart.y) * (segEnd.x - segStart.x) - (point.x - segStart.x) * (segEnd.y - segStart.y);
    const isCollinear = Math.abs(crossProduct) < 1e-6;

    if (!isCollinear) {
        return false;
    }

    const minX = Math.min(segStart.x, segEnd.x);
    const maxX = Math.max(segStart.x, segEnd.x);
    const minY = Math.min(segStart.y, segEnd.y);
    const maxY = Math.max(segStart.y, segEnd.y);

    return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
}

// Helper function to find junction nodes between paths
function findJunctionNodes(startPath, goalPath, allPaths) {
    let junctionNodes = [];
    let junctionsByCoords = {}; // Object to store junctions by their coordinates as keys

    // Loop through all paths to find matching junctions with segment nodes
    for (const path of allPaths) {
        // Check each path's segments for potential junctions
        for (const segment of path.segments) {
            const { start, end } = segment;

            // Loop through junctions of the current path to compare their coordinates with segment nodes
            for (const junction of path.junctions) {
                // Check if the start or end node of a segment matches the junction coordinates
                if ((junction.x === start.x && junction.y === start.y) || (junction.x === end.x && junction.y === end.y)) {
                    // Store the junction by coordinates as a key (e.g., "x-y")
                    const coordKey = `${junction.x}-${junction.y}`;
                    
                    // Check if this coordinate already has a junction (could be on another path)
                    if (junctionsByCoords[coordKey]) {
                        console.log(`Junctions ${junction.nodeId} (path ${path.pathId}) and ${junctionsByCoords[coordKey].nodeId} are the same junction at coordinates (${junction.x}, ${junction.y}).`);
                    } else {
                        // If this coordinate hasn't been seen yet, store it
                        junctionsByCoords[coordKey] = junction;
                    }

                    // Add this node as a junction
                    junctionNodes.push(junction.nodeId);

                    console.log(`Found junction at node ${junction.nodeId} on path ${path.pathId} at (${junction.x}, ${junction.y}).`);
                }
            }
        }
    }

    return junctionNodes;
}

// Function to find and return the route from start to goal
export function traversePath(playerObject, targetPathId, closestPoint) {
    const canvas = document.getElementById('canvas');
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Start node
    const startNode = {
        x: parseFloat(playerObject.xPos + playerObject.width / 2),
        y: parseFloat(playerObject.yPos + playerObject.height)
    };

    // Goal node
    const goalNode = {
        x: closestPoint.x,
        y: closestPoint.y
    };

    const data = getPathsData();
    const screen = data.screens.find(screen => screen.screenId === getCurrentScreenId());

    if (!screen) {
        console.error('Screen not found');
        return;
    }

    let startPath = null, startSegment = null, goalPath = null, goalSegment = null;
    let startNodeId = null, goalNodeId = null;
    let junctionNodes = [];
    let routeDescription = [];

    // Locate start and goal paths/segments
    for (const path of screen.paths) {
        for (const segment of path.segments) {
            const absoluteStart = convertPercentageToAbsolute(segment.start.x, segment.start.y, canvasWidth, canvasHeight);
            const absoluteEnd = convertPercentageToAbsolute(segment.end.x, segment.end.y, canvasWidth, canvasHeight);

            // Check start node on segment
            if (isPointOnSegment(startNode, absoluteStart, absoluteEnd)) {
                startPath = path;
                startSegment = segment;
                startNodeId = segment.start.nodeId; // Assuming nodeId is the identifier for the node
                routeDescription.push(`Start at (${startNode.x}, ${startNode.y})`);
            }

            // Check goal node on segment
            if (isPointOnSegment(goalNode, absoluteStart, absoluteEnd)) {
                goalPath = path;
                goalSegment = segment;
                goalNodeId = segment.end.nodeId; // Assuming nodeId is the identifier for the node
            }
        }
    }

    // If start and goal are on the same path, just log the path nodes
    if (startPath && goalPath && startPath.pathId === goalPath.pathId) {
        routeDescription.push(`Stay on path ${startPath.pathId}, traversing from node ${startNodeId}`);
        logPathTraversal(routeDescription, startSegment, goalSegment, startPath);
        routeDescription.push(`Destination reached at (${goalNode.x}, ${goalNode.y})`);
        return routeDescription;
    }

    // If start and goal are on different paths, we need to traverse junctions
    if (startPath && goalPath && startPath.pathId !== goalPath.pathId) {
        routeDescription.push(`Start on path ${startPath.pathId} at node ${startNodeId}`);
        junctionNodes = findJunctionNodes(startPath, goalPath, screen.paths);
        logJunctionTraversal(routeDescription, junctionNodes, goalNodeId);
        routeDescription.push(`Destination reached at (${goalNode.x}, ${goalNode.y})`);
        return routeDescription;
    }

    return 'No valid path found.';
}

// Helper function to log direct path traversal
function logPathTraversal(routeDescription, startSegment, goalSegment, path) {
    const pathNodes = path.segments.map(segment => ({
        start: segment.start.nodeId,
        end: segment.end.nodeId,
        isJunction: segment.start.isJunction || segment.end.isJunction
    }));

    for (const node of pathNodes) {
        const junctionStatus = node.isJunction ? 'junction' : 'not a junction';
        routeDescription.push(`Traverse to node ${node.start} (${junctionStatus}), stay on path ${path.pathId}`);
        if (node.end === goalSegment.end.nodeId) break;
    }
}

// Helper function to log junction traversal
function logJunctionTraversal(routeDescription, junctionNodes, goalNodeId) {
    for (const junction of junctionNodes) {
        routeDescription.push(`Traverse junction: ${junction}`);
    }
    routeDescription.push(`Traverse to goal node ${goalNodeId}`);
}

