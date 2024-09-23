import { getCanvasCellHeight, getCanvasCellWidth, getCurrentScreenId, getGridSizeX, getGridSizeY, getNextScreenId, getPlayerObject, getTransitioningNow } from "./constantsAndGlobalVars.js";

export function aStarPathfinding(start, target, gridData) {
    
    console.log("transitioning now: " + getTransitioningNow());

    if (gridData.idType === "next") {
        console.log("Finding a path based on " +  gridData.idType + " screen id = " + getNextScreenId());
    } else if (gridData.idType === "current") {
        console.log("Finding a path based on " +  gridData.idType + " screen id = " + getCurrentScreenId());
    }

    const player = getPlayerObject();
    const gridSizeX = getGridSizeX();
    const gridSizeY = getGridSizeY();

    // add offset to measure from bottom center of player object
    start.x = Math.floor(start.x + ((player.width / 2) / getCanvasCellWidth()));
    start.y = Math.floor(start.y + (player.height / getCanvasCellHeight()));

    const cellValue = gridData.gridData[start.y][start.x];
    const isWalkable = cellValue !== 'n';
    
    console.log(`Start value is (${start.x}, ${start.y}) and this is ${isWalkable ? 'walkable' : 'not walkable'} (${cellValue})`);
    

    const openList = [];
    const closedList = [];
    const path = [];

    console.log("Start position:", start);
    console.log("Target position:", target);

    function heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    class Node {
        constructor(x, y, g, h, parent) {
            this.x = x;
            this.y = y;
            this.g = g; // Cost from start
            this.h = h; // Heuristic cost
            this.f = g + h; // Total cost
            this.parent = parent; // Parent node
        }
    }

    const startNode = new Node(start.x, start.y, 0, heuristic(start, target), null);
    openList.push(startNode);

    //console.log("Initial openList:", openList);

    while (openList.length > 0) {
        openList.sort((a, b) => a.f - b.f); // Sort by f-value (lowest first)
        const currentNode = openList.shift();

        //console.log("Processing node:", currentNode);

        if (currentNode.x === target.x && currentNode.y === target.y) {
            let temp = currentNode;
            while (temp) {
                path.push({ x: temp.x, y: temp.y });
                temp = temp.parent;
            }
            //console.log("Path found:", path.reverse());
            return path.reverse(); // Return reversed path
        }

        closedList.push(currentNode);
        //console.log("Closed list updated:", closedList);

        // Directions for neighbors (4 cardinal + 4 diagonal)
        const directions = [
            { x: 0, y: -1, cost: 1 },   // Up
            { x: 1, y: 0, cost: 1 },    // Right
            { x: 0, y: 1, cost: 1 },    // Down
            { x: -1, y: 0, cost: 1 },   // Left
            { x: 1, y: -1, cost: 1.4 },  // Up-Right
            { x: 1, y: 1, cost: 1.4 },   // Down-Right
            { x: -1, y: -1, cost: 1.4 }, // Up-Left
            { x: -1, y: 1, cost: 1.4 }   // Down-Left
        ];

        for (const dir of directions) {
            const neighborX = currentNode.x + dir.x;
            const neighborY = currentNode.y + dir.y;

            // Check bounds
            if (neighborX < 0 || neighborX >= gridSizeX || neighborY < 0 || neighborY >= gridSizeY) {
                //console.log(`Skipping neighbor (${neighborX}, ${neighborY}) - Out of bounds`);
                continue;
            }            

            if ((gridData.gridData[neighborY][neighborX] !== 'w' && !gridData.gridData[neighborY][neighborX].includes('e')) || closedList.some(node => node.x === neighborX && node.y === neighborY)) {
                continue;
            }            

            const gScore = currentNode.g + dir.cost; // Update cost based on direction
            const hScore = heuristic({ x: neighborX, y: neighborY }, target);
            const neighborNode = new Node(neighborX, neighborY, gScore, hScore, currentNode);

            const openNode = openList.find(node => node.x === neighborX && node.y === neighborY);
            if (!openNode || gScore < openNode.g) {
                if (!openNode) {
                    openList.push(neighborNode);
                    //console.log("Added new neighbor to openList:", neighborNode);
                } else {
                    openNode.g = gScore;
                    openNode.f = gScore + openNode.h;
                    openNode.parent = currentNode; // Update parent
                    //console.log("Updated existing node in openList:", openNode);
                }
            }
        }

        //console.log("End of iteration, openList:", openList);
    }

    console.log("No path found");
    return []; // No path found
}
