function describeResource(response, label) {
    return `${label} (${response?.url || 'unknown URL'})`;
}

export async function loadJsonResource(fetchImpl, url, label, validate) {
    const response = await fetchImpl(url);
    if (!response.ok) {
        throw new Error(`${label} request failed with HTTP ${response.status} ${response.statusText || ''}`.trim());
    }

    let data;
    try {
        data = await response.json();
    } catch (error) {
        throw new Error(`${describeResource(response, label)} returned malformed JSON: ${error.message}`);
    }

    const validationError = validate?.(data);
    if (validationError) throw new Error(`${label} is invalid: ${validationError}`);
    return data;
}

export function validateObjectRoot(data) {
    return data && typeof data === 'object' && !Array.isArray(data) ? null : 'expected an object at the document root';
}

export function validateGridData(data) {
    const rootError = validateObjectRoot(data);
    if (rootError) return rootError;
    const rooms = Object.entries(data);
    if (rooms.length === 0) return 'no room grids were defined';
    for (const [roomId, grid] of rooms) {
        if (!Array.isArray(grid) || grid.length !== 60 || grid.some((row) => !Array.isArray(row) || row.length !== 80)) {
            return `room '${roomId}' must contain an 80 x 60 grid`;
        }
    }
    return null;
}

export function validateNavigationData(data) {
    const rootError = validateObjectRoot(data);
    if (rootError) return rootError;
    if (!data.libraryFoyer || typeof data.libraryFoyer.exits !== 'object') return "missing required room 'libraryFoyer' or its exits";
    return null;
}

export function validatePropertyRoot(property) {
    return (data) => {
        const rootError = validateObjectRoot(data);
        if (rootError) return rootError;
        return data[property] && typeof data[property] === 'object' ? null : `missing object property '${property}'`;
    };
}

export function hasExplicitCoordinates(x, y) {
    return x !== undefined && x !== null && y !== undefined && y !== null;
}

export function waitForTransition(element, timeoutMs = 1500) {
    if (!element) return Promise.reject(new TypeError('transition element is required'));
    const reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = typeof getComputedStyle === 'function'
        ? getComputedStyle(element).transitionDuration.split(',').some((value) => Number.parseFloat(value) > 0)
        : true;
    if (reducedMotion || !duration) return Promise.resolve('skipped');

    return new Promise((resolve) => {
        let timeoutId;
        const finish = (result) => {
            element.removeEventListener('transitionend', onTransitionEnd);
            clearTimeout(timeoutId);
            resolve(result);
        };
        const onTransitionEnd = (event) => {
            if (event.target === element) finish('transitionend');
        };
        element.addEventListener('transitionend', onTransitionEnd);
        timeoutId = setTimeout(() => finish('timeout'), timeoutMs);
    });
}
