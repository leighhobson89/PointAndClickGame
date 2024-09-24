import { getCanvasCellHeight, getCanvasCellWidth, getCurrentScreenId, getGridData, getGridSizeX, getGridSizeY, getNextScreenId, getPlayerObject, getTransitioningNow, setPlayerObject } from "./constantsAndGlobalVars.js";

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

    while (openList.length > 0) {
        openList.sort((a, b) => a.f - b.f);
        const currentNode = openList.shift();

        if (currentNode.x === target.x && currentNode.y === target.y) {
            let temp = currentNode;
            while (temp) {
                path.push({ x: temp.x, y: temp.y });
                temp = temp.parent;
            }
            return path.reverse();
        }

        closedList.push(currentNode);

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
                continue;
            }            

            const cellType = gridData.gridData[neighborY][neighborX];
            if (cellType === 'n' || closedList.some(node => node.x === neighborX && node.y === neighborY)) {
                continue;
            }

            // Add different costs based on cell type
            let cellCost = dir.cost;

            if (cellType.includes('w')) {
                cellCost *= 1;
            } else if (cellType.includes('e')) {
                cellCost *= 5;
            }

            const gScore = currentNode.g + cellCost;
            const hScore = heuristic({ x: neighborX, y: neighborY }, target);
            const neighborNode = new Node(neighborX, neighborY, gScore, hScore, currentNode);

            const openNode = openList.find(node => node.x === neighborX && node.y === neighborY);
            if (!openNode || gScore < openNode.g) {
                if (!openNode) {
                    openList.push(neighborNode);
                } else {
                    openNode.g = gScore;
                    openNode.f = gScore + openNode.h;
                    openNode.parent = currentNode; // Update parent
                }
            }
        }
    }

    console.log("No path found");
    return []; // No path found
}

export function teleportToNearestWalkable(start) {
    const gridData = getGridData();
    const player = getPlayerObject();
    const gridSizeX = getGridSizeX();
    const gridSizeY = getGridSizeY();

    // Add offset to measure from bottom center of player object
    let startX = Math.floor(start.x + ((player.width / 2) / getCanvasCellWidth()));
    let startY = Math.floor(start.y + (player.height / getCanvasCellHeight()));

    // Get the player's current cell type
    let currentCellType = gridData.gridData[startY + 1][startX];

    // Check if the player is on a non-walkable square ("n")
    if (currentCellType === 'n') {
        console.log(`Player is on a non-walkable square at (${startX}, ${startY})`);

        // Perform BFS to find the nearest walkable square ("w")
        const directions = [
            { x: 0, y: -1 },  // Up
            { x: 1, y: 0 },   // Right
            { x: 0, y: 1 },   // Down
            { x: -1, y: 0 }   // Left
        ];

        const visited = new Set();
        const queue = [{ x: startX, y: startY }];

        while (queue.length > 0) {
            const current = queue.shift();
            const { x, y } = current;

            // Mark the current cell as visited
            visited.add(`${x},${y}`);

            // Check bounds
            if (x < 0 || x >= gridSizeX || y < 0 || y >= gridSizeY) {
                continue;
            }

            // Get the cell type of the current position
            const cellType = gridData.gridData[y][x];

            // If we find a walkable square, teleport the player there
            if (cellType.includes('w')) {
                const newPosX = Math.floor(x * getCanvasCellWidth() - player.width / 2);
                const newPosY = Math.floor(y * getCanvasCellHeight() - player.height);
                //console.log(`Nearest walkable square found at (${x}, ${y})`);

                // Teleport the player to this location (update player position)
                setPlayerObject('xPos', newPosX);
                setPlayerObject('yPos', newPosY);

                console.log(`Player teleported to (${Math.floor(newPosX / getCanvasCellWidth())}, ${Math.floor(newPosY / getCanvasCellHeight())})`);
                return;
            }

            // Add neighbors to the queue
            for (const dir of directions) {
                const neighborX = x + dir.x;
                const neighborY = y + dir.y;
                const key = `${neighborX},${neighborY}`;

                if (!visited.has(key)) {
                    queue.push({ x: neighborX, y: neighborY });
                }
            }
        }

        //console.log("No walkable square found, unable to teleport.");
    } else {
        //console.log(`Player is already on a walkable square at (${startX}, ${startY})`);
    }
}
