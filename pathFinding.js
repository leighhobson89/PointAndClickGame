import { getCanvasCellHeight, getCanvasCellWidth, getCurrentScreenId, getGridData, getGridSizeX, getGridSizeY, getLookingForAlternativePathToNearestWalkable, getNextScreenId, getPlayerObject, getTransitioningNow, setLookingForAlternativePathToNearestWalkable, setPlayerObject } from "./constantsAndGlobalVars.js";

export function aStarPathfinding(start, target) {
    console.log("transitioning now: " + getTransitioningNow());

    const gridData = getGridData();  // Fetch grid data directly
    
    if (gridData.idType === "next") {
        console.log("Finding a path based on " + gridData.idType + " screen id = " + getNextScreenId());
    } else if (gridData.idType === "current") {
        console.log("Finding a path based on " + gridData.idType + " screen id = " + getCurrentScreenId());
    }

    const player = getPlayerObject();
    const gridSizeX = getGridSizeX();
    const gridSizeY = getGridSizeY();

    start.x = Math.floor(start.x + ((player.width / 2) / getCanvasCellWidth()));
    start.y = Math.floor(start.y + (player.height / getCanvasCellHeight()));
 
    const openList = [];
    const closedList = [];
    const path = [];

    console.log("Start position:", start);
    console.log("Target position:", target);

    // ** Call the Helper Function to check for objectDoor **
    const redirectedTarget = checkAndRedirectToDoor(target);
    if (redirectedTarget) {
        target = redirectedTarget;  // Return the new path if redirected
    }

    function heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    class Node {
        constructor(x, y, g, h, parent) {
            this.x = x;
            this.y = y;
            this.g = g;
            this.h = h;
            this.f = g + h;
            this.parent = parent;
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

            if (neighborX < 0 || neighborX >= gridSizeX || neighborY < 0 || neighborY >= gridSizeY) {
                continue;
            }

            const cellType = gridData.gridData[neighborY][neighborX];
            if (cellType === 'n' || closedList.some(node => node.x === neighborX && node.y === neighborY)) {
                continue;
            }

            let cellCost = dir.cost;

            if (cellType.startsWith('w')) {
                cellCost *= 1;
            } else if (cellType.startsWith('e')) {
                cellCost *= 5;
            } else if (cellType.startsWith('b')) {
                cellCost *= 10;
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
                    openNode.parent = currentNode;
                }
            }
        }
    }

    setLookingForAlternativePathToNearestWalkable(true);
    const nearestWalkableCell = findAndMoveToNearestWalkable({ x: start.x, y: start.y }, { x: target.x, y: target.y }, false);
    if (nearestWalkableCell === null || gridData.gridData[nearestWalkableCell.y][nearestWalkableCell.x] === 'n') {
        setLookingForAlternativePathToNearestWalkable(false);
    } else {
        console.log("Found walkable cell nearby, so will go there...");
    }

    if (getLookingForAlternativePathToNearestWalkable()) {
        const nearestPath = aStarPathfinding(
            { x: Math.floor(player.xPos / getCanvasCellWidth()), y: Math.floor(player.yPos / getCanvasCellHeight()) },
            { x: nearestWalkableCell.x, y: nearestWalkableCell.y }
        );
        console.log("No path found, so walking to " + nearestWalkableCell);
        setLookingForAlternativePathToNearestWalkable(false);
        return nearestPath;
    }

    return [];
}


export function findAndMoveToNearestWalkable(start, target, teleport) {
    const gridData = getGridData();
    const player = getPlayerObject();
    const gridSizeX = getGridSizeX();
    const gridSizeY = getGridSizeY();

    let targetX = Math.floor(target.x);
    let targetY = Math.floor(target.y);

    if (teleport) {
        targetX = Math.floor(target.x + ((player.width / 2) / getCanvasCellWidth()));
        targetY = Math.floor(target.y + (player.height / getCanvasCellHeight()));
    }

    const directionX = Math.sign(start.x - target.x);
    const directionY = Math.sign(start.y - target.y);

    const priorityDirections = [
        { x: directionX, y: directionY },
        { x: directionX, y: 0 },
        { x: 0, y: directionY },
    ];

    const fallbackDirections = [
        { x: -directionX, y: 0 },
        { x: 0, y: -directionY },
        { x: -directionX, y: -directionY },
    ];

    const visited = new Set();
    const queue = [{ x: targetX, y: targetY }];
    
    let iterations = 0;
    const maxIterations = 1000;

    while (queue.length > 0) {
        if (iterations >= maxIterations) {
            console.error("Search timed out after checking 1000 cells.");
            return null;
        }
        
        const current = queue.shift();
        const { x, y } = current;

        iterations++;

        visited.add(`${x},${y}`);

        if (x < 0 || x >= gridSizeX || y < 0 || y >= gridSizeY) {
            continue;
        }

        const cellType = gridData.gridData[y][x];

        if (cellType.startsWith('w')) {
            const newPosX = Math.floor(x * getCanvasCellWidth() - player.width / 2);
            const newPosY = Math.floor(y * getCanvasCellHeight() - player.height);

            if (teleport) {
                setPlayerObject('xPos', newPosX);
                setPlayerObject('yPos', newPosY);
                console.log(`Player teleported to (${Math.floor(newPosX / getCanvasCellWidth())}, ${Math.floor(newPosY / getCanvasCellHeight())})`);
                return;
            }

            return { x: x, y: y };
        }

        for (const dir of priorityDirections) {
            const neighborX = x + dir.x;
            const neighborY = y + dir.y;
            const key = `${neighborX},${neighborY}`;

            if (!visited.has(key)) {
                queue.push({ x: neighborX, y: neighborY });
            }
        }

        for (const dir of fallbackDirections) {
            const neighborX = x + dir.x;
            const neighborY = y + dir.y;
            const key = `${neighborX},${neighborY}`;

            if (!visited.has(key)) {
                queue.push({ x: neighborX, y: neighborY });
            }
        }
    }

    //console.error("No walkable square found");
    return null;
}

function checkAndRedirectToDoor(target) {
    const gridData = getGridData();  // Fetch grid data directly
    const cellValue = gridData.gridData[target.y][target.x];  // Access the target cell value directly

    // Check if the current target cell value starts with 'o' and includes 'objectDoor'
    if (cellValue.startsWith('o') && cellValue.includes('objectDoor')) {
        console.log("Found 'objectDoor' at the target location:", target);

        let highestY = -1;  // Initialize the highest Y value found
        let candidates = [];  // Array to hold candidates with the highest Y

        // Search for all grid references with the same value across the entire grid
        for (let y = 0; y < gridData.gridData.length; y++) {
            for (let x = 0; x < gridData.gridData[y].length; x++) {
                if (gridData.gridData[y][x] === cellValue) {
                    console.log(`Found matching 'objectDoor' at (${x}, ${y}).`);

                    // Check if this cell has the highest Y value found
                    if (y > highestY) {
                        highestY = y;  // Update highest Y
                        candidates = [{ x, y }];  // Start a new candidates list
                    } else if (y === highestY) {
                        // If Y value matches, add to candidates
                        candidates.push({ x, y });
                    }
                }
            }
        }

        // If we found candidates with the highest Y value, select one
        if (candidates.length > 0) {
            // If there's more than one candidate, find the one closest to the middle X
            let middleX = Math.floor(gridData.gridData[0].length / 2);
            let bestCandidate = candidates[0];
            let closestDistance = Math.abs(bestCandidate.x - middleX);

            for (const candidate of candidates) {
                let distance = Math.abs(candidate.x - middleX);
                if (distance < closestDistance) {
                    closestDistance = distance;  // Update the closest distance
                    bestCandidate = candidate;    // Update best candidate
                }
            }

            console.log(`Setting new target to (${bestCandidate.x}, ${bestCandidate.y})`);
            return bestCandidate;  // Return the best candidate's coordinates
        }
    }

    // If no matching door found or condition not met, return null to continue with the original target
    return null;
}

