import { getCanvasCellHeight, getCanvasCellWidth, getCurrentScreenId, getGridData, getGridSizeX, getGridSizeY, getLookingForAlternativePathToNearestWalkable, getNextScreenId, getPlayerObject, getTransitioningNow, setLookingForAlternativePathToNearestWalkable, setPlayerObject } from "./constantsAndGlobalVars.js";

export function aStarPathfinding(start, target, action) {
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

    const redirectedTarget = checkAndRedirectToDoor(target);
    if (redirectedTarget) {
        target = redirectedTarget;
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

        const distanceToTarget = heuristic(currentNode, target);

        if (action === "Talk To" || action === "Give") { //special cases where npc inaccesible due to scenery not being walkable
            if (distanceToTarget <= 13) {
                let temp = currentNode;
                while (temp) {
                    path.push({ x: temp.x, y: temp.y });
                    temp = temp.parent;
                }
                const finalPath = removeNValuesFromPathEnd(path);
                if (finalPath) {
                    return finalPath.reverse();
                }
            }
        }

        if (currentNode.x === target.x && currentNode.y === target.y) {
            let temp = currentNode;
            while (temp) {
                path.push({ x: temp.x, y: temp.y });
                temp = temp.parent;
            }
            const finalPath = removeNValuesFromPathEnd(path);
            if (finalPath) {
                return finalPath.reverse();
            }
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
            if (cellType.startsWith('c') || closedList.some(node => node.x === neighborX && node.y === neighborY)) {
                continue;
            }

            let cellCost = dir.cost;

            // Adjust cost for 'w' cells near 'b' cells within 3 cells vertically
            if (cellType.startsWith('w')) {
                // Check for 'b' cells within 3 cells in the Y direction
                for (let i = -3; i <= 3; i++) {
                    const checkY = neighborY + i;
                    if (checkY >= 0 && checkY < gridSizeY) {
                        const nearbyCell = gridData.gridData[checkY][neighborX];
                        if (nearbyCell && nearbyCell.startsWith('b')) {
                            cellCost *= 2;  // Increase cost if near 'b' cells
                            break;  // No need to check further
                        }
                    }
                }
            } else if (cellType.startsWith('b')) {
                cellCost *= 2;  // Higher cost for 'b' cells directly
            } else if (cellType === 'n') {
                cellCost *= 10000;
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
            { x: nearestWalkableCell.x, y: nearestWalkableCell.y },
            action
        );
        console.log("No path found, so walking to " + nearestWalkableCell.x + ", " + nearestWalkableCell.y);
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

    // Calculate midpoint between start and target
    let midX = Math.floor((start.x + targetX) / 2);
    let midY = Math.floor((start.y + targetY) / 2);

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
    const queue = [{ x: midX, y: midY }];

    let iterations = 0;
    const maxIterations = 5000;

    while (queue.length > 0) {
        if (iterations >= maxIterations) {
            console.error("Search timed out after checking " + maxIterations + " cells.");
            return null;
        }

        const current = queue.shift();
        const { x, y } = current;

        iterations++;
        visited.add(`${x},${y}`);

        // Skip out-of-bounds cells
        if (x < 0 || x >= gridSizeX || y < 0 || y >= gridSizeY) {
            continue;
        }

        const cellType = gridData.gridData[y][x];

        // Skip non-walkable cells (anything marked as 'n')
        if (cellType.startsWith('w')) {
            // Found a walkable cell, return or teleport player
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

        // Add priority directions to the queue first
        for (const dir of priorityDirections) {
            const neighborX = x + dir.x;
            const neighborY = y + dir.y;
            const key = `${neighborX},${neighborY}`;

            if (!visited.has(key)) {
                queue.push({ x: neighborX, y: neighborY });
                visited.add(key); // Mark neighbor as visited right away
            }
        }

        // Add fallback directions to the queue
        for (const dir of fallbackDirections) {
            const neighborX = x + dir.x;
            const neighborY = y + dir.y;
            const key = `${neighborX},${neighborY}`;

            if (!visited.has(key)) {
                queue.push({ x: neighborX, y: neighborY });
                visited.add(key); // Mark neighbor as visited right away
            }
        }
    }

    return null; // No walkable square found
}

function checkAndRedirectToDoor(target) {
    const gridData = getGridData();
    const cellValue = gridData.gridData[target.y][target.x];

    if (cellValue.startsWith('o') && cellValue.includes('objectDoor')) {

        let highestY = -1;
        let candidates = [];

        for (let y = 0; y < gridData.gridData.length; y++) {
            for (let x = 0; x < gridData.gridData[y].length; x++) {
                if (gridData.gridData[y][x] === cellValue) {

                    if (y > highestY) {
                        highestY = y;
                        candidates = [{ x, y }];
                    } else if (y === highestY) {
                        candidates.push({ x, y });
                    }
                }
            }
        }

        if (candidates.length > 0) {
            let middleX = Math.floor(gridData.gridData[0].length / 2);
            let bestCandidate = candidates[0];
            let closestDistance = Math.abs(bestCandidate.x - middleX);

            for (const candidate of candidates) {
                let distance = Math.abs(candidate.x - middleX);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    bestCandidate = candidate;
                }
            }

            console.log(`Setting new target to (${bestCandidate.x}, ${bestCandidate.y})`);
            return bestCandidate;
        }
    }

    return null;
}

function removeNValuesFromPathEnd(path) {
    const gridData = getGridData();  // Fetch grid data directly for cell lookups
    
    while (path.length > 0) {
        const { y, x } = path[0];  // Check the first element
        const cellType = gridData.gridData[y][x];
        console.log(cellType);
        
        if (cellType.startsWith('w')) {
            return path;  // Stop and return the remaining path
        } else {
            path.shift();  // Remove the first element
        }
    }
    return [];  // Return an empty array if no 'w' cell is found
    
}
