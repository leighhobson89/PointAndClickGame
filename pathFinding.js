import { getObjectData, getCanvasCellHeight, getCanvasCellWidth, getGridData, getGridSizeX, getGridSizeY, getLookingForAlternativePathToNearestWalkable, getNpcData, getPlayerObject, setLookingForAlternativePathToNearestWalkable } from "./constantsAndGlobalVars.js";

export function aStarPathfinding(start, target, action, subject, waypoints = [], overrideCellCost) {
    const player = getPlayerObject();

    const cellWidth = getCanvasCellWidth();
    const cellHeight = getCanvasCellHeight();

    let entity;
    let entityDrawWidth;
    let entityDrawHeight;

    if (subject !== 'player') {
        if (subject.startsWith('n')) {
            entity = getNpcData().npcs[subject];
        } else {
            entity = getObjectData().objects[subject];
        }

        entityDrawWidth = (entity.dimensions.width);
        entityDrawHeight = (entity.dimensions.height);
    }

    if (subject === 'player') {
        start.x = Math.floor(start.x + ((player.width / 2) / getCanvasCellWidth()));
        start.y = Math.floor(start.y + (player.height / getCanvasCellHeight()));
    } else {
        start.x = Math.floor(start.x + ((entityDrawWidth / 2) / getCanvasCellWidth()));
        start.y = Math.floor(start.y + (entityDrawHeight / getCanvasCellHeight()));
    }

    let fullPath = [];

    // Helper function to run pathfinding between points
    function findPathBetweenPoints(startPoint, endPoint, overrideCellCost, finalTarget) {
        // This will be the existing A* logic that finds the path between two points.
        const path = aStarSinglePathfinding(startPoint, endPoint, action, subject, waypoints, overrideCellCost, finalTarget);
        return path;
    }

    // Iterate through waypoints, if any
    let currentStart = start;
    for (const waypoint of waypoints) {
        const partialPath = findPathBetweenPoints(currentStart, waypoint, overrideCellCost, target);
        if (!partialPath || partialPath.length === 0) {
            //console.log(`No path found between ${JSON.stringify(currentStart)} and ${JSON.stringify(waypoint)}`);
            return [];
        }
        //console.log(`Partial path found: ${JSON.stringify(partialPath)}`); // Log the partial path
        fullPath = fullPath.concat(partialPath);  // Concatenate partial path
        currentStart = waypoint; // Move start to the last waypoint
    }

    //console.log(`Full path after waypoints: ${JSON.stringify(fullPath)}`); // Log fullPath after waypoints

    // Finally, path from the last waypoint (or start) to the final target
    const finalPath = findPathBetweenPoints(currentStart, target, overrideCellCost, target);
    //console.log(`Final path found: ${JSON.stringify(finalPath)}`); // Log finalPath
    
    if (!finalPath || finalPath.length === 0) {
        //console.log(`No path found between ${JSON.stringify(currentStart)} and ${JSON.stringify(target)}`);
        return [];
    }

    // Concatenate fullPath and finalPath
    fullPath = fullPath.concat(finalPath);

    return fullPath;
}

function aStarSinglePathfinding(start, target, action, subject, waypoints, overrideCellCost, finalTarget) {
    if (target.x === null || target.y === null) {
        return;
    }
    
    let npcResizedYet = false;
    const gridData = getGridData();
    const player = getPlayerObject();
    const gridSizeX = getGridSizeX();
    const gridSizeY = getGridSizeY();

    const openList = [];
    const closedList = [];
    const path = [];

    if (subject === 'player') {
        const redirectedTarget = checkAndRedirectToDoor(target);
        if (redirectedTarget) {
            target = redirectedTarget;
        }
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
        const cellType = gridData.gridData[target.y][target.x];

        if (action === "Talk To" || action === "Give" || cellType === "oobjectStackOfWood" || cellType === "oobjectRopeAndHookWithStackOfWood" || cellType === "oobjectRopeAndHookWithStackOfWoodOnPulley") { //only player //oobjectStacOfWood is a workarond to stop the plater crossing the uncompleted bridge, change in future with better logic
            if(!npcResizedYet && cellType.startsWith('c')) {
                const npc = cellType.slice(1);
                const npcGridPositionY = getNpcData().npcs[npc].gridPosition.y;
                const npcHeight = getNpcData().npcs[npc].dimensions.height;
                const cellsHeight = npcHeight;

                target.y = npcGridPositionY + cellsHeight;
                npcResizedYet = true;
            }

            if (distanceToTarget <= 13 && (cellType !== "oobjectStackOfWood" && cellType !== "oobjectRopeAndHookWithStackOfWood" && cellType !== "oobjectRopeAndHookWithStackOfWoodOnPulley") || distanceToTarget <= 18 && cellType === "oobjectStackOfWood" || distanceToTarget <= 18 && cellType === "oobjectRopeAndHookWithStackOfWood" || distanceToTarget <= 18 && cellType === "oobjectRopeAndHookWithStackOfWoodOnPulley") {
                let temp = currentNode;
                while (temp) {
                    path.push({ x: temp.x, y: temp.y });
                    temp = temp.parent;
                }
                const finalPath = removeNValuesFromPathEnd(path, finalTarget);
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

            if (subject === 'player') {
                const finalPath = removeNValuesFromPathEnd(path, finalTarget);
                if (finalPath) {
                    return finalPath.reverse();
                }
            } else {
                return path.reverse();
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
            if ((cellType.startsWith('c') && subject === 'player') || closedList.some(node => node.x === neighborX && node.y === neighborY)) {
                continue;
            }

            let cellCost = dir.cost;

            if (cellType === 'n') {
                cellCost *= 10000;
            } else if (cellType.startsWith('o')) {
                if (!getObjectData().objects[cellType.slice(1)].interactable.canHover) {
                    cellCost *= 20000
                }
            }

            if (overrideCellCost) {
                cellCost = 1;
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
    const nearestWalkableCell = findAndMoveToNearestWalkable({ x: start.x, y: start.y }, { x: target.x, y: target.y });
    if (nearestWalkableCell === null || gridData.gridData[nearestWalkableCell.y][nearestWalkableCell.x] === 'n') {
        setLookingForAlternativePathToNearestWalkable(false);
    } else {
        console.log("Found walkable cell nearby, so will go there...");
    }

    if (getLookingForAlternativePathToNearestWalkable()) {
        const nearestPath = aStarPathfinding(
            { x: Math.floor(player.xPos / getCanvasCellWidth()), y: Math.floor(player.yPos / getCanvasCellHeight()) },
            { x: nearestWalkableCell.x, y: nearestWalkableCell.y },
            action, 
            subject,
            waypoints,
            overrideCellCost
        );
        console.log("No path found, so walking to " + nearestWalkableCell.x + ", " + nearestWalkableCell.y);
        setLookingForAlternativePathToNearestWalkable(false);
        return nearestPath;
    }

    return [];
}

export function findAndMoveToNearestWalkable(start, target) {
    const gridData = getGridData();
    const gridSizeX = getGridSizeX();
    const gridSizeY = getGridSizeY();

    let targetX = Math.floor(target.x);
    let targetY = Math.floor(target.y);

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
            // Found a walkable cell, return entity
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

    if (cellValue) {
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
    }

    return null;
}

function removeNValuesFromPathEnd(path, finalTarget) {
    const gridData = getGridData();
    const finalX = finalTarget.x;
    const finalY = finalTarget.y;
    const finalTargetCellValue = gridData.gridData[finalY][finalX];
    
    while (path.length > 0) {
        const { y, x } = path[0];
        const cellType = gridData.gridData[y][x];
        console.log(cellType);
        
        if (cellType.startsWith('w') || finalTargetCellValue !== 'n') {
            return path;
        } else {
            path.shift();
        }
    }
    return [];
    
}
