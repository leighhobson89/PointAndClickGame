function cloneInventory(inventory = {}) {
    return Object.fromEntries(Object.entries(inventory).map(([slot, item]) => [slot, { ...item }]));
}

function orderedItems(inventory) {
    return Object.entries(inventory)
        .sort(([left], [right]) => Number(left.slice(4)) - Number(right.slice(4)))
        .map(([, item]) => ({ ...item }));
}

function toSlots(items) {
    return Object.fromEntries(items.map((item, index) => [`slot${index + 1}`, item]));
}

export function inventoryQuantity(inventory, objectId) {
    return orderedItems(inventory).filter((item) => item.object === objectId).reduce((total, item) => total + item.quantity, 0);
}

export function addInventoryItem(inventory, { objectId, quantity = 1, stackable = false, operationId = null } = {}) {
    if (!objectId || !Number.isInteger(quantity) || quantity < 1) throw new TypeError('A stable objectId and positive integer quantity are required');
    const next = cloneInventory(inventory);
    if (operationId && Object.values(next).some((item) => item.operationIds?.includes(operationId))) return next;
    const items = orderedItems(next);
    const existing = stackable ? items.find((item) => item.object === objectId) : null;
    if (existing) existing.quantity += quantity;
    else items.unshift({ object: objectId, quantity: stackable ? quantity : 1, stackable: Boolean(stackable) });
    if (operationId) {
        const changed = existing ?? items[0];
        changed.operationIds = [...(changed.operationIds ?? []), operationId];
    }
    return toSlots(items);
}

export function removeInventoryItem(inventory, { objectId, quantity = 1, operationId = null } = {}) {
    if (!objectId || !Number.isInteger(quantity) || quantity < 1) throw new TypeError('A stable objectId and positive integer quantity are required');
    const next = cloneInventory(inventory);
    if (operationId && Object.values(next).some((item) => item.removalOperationIds?.includes(operationId))) return next;
    const items = orderedItems(next);
    const index = items.findIndex((item) => item.object === objectId);
    if (index === -1 || items[index].quantity < quantity) return next;
    items[index].quantity -= quantity;
    if (operationId) items[index].removalOperationIds = [...(items[index].removalOperationIds ?? []), operationId];
    if (items[index].quantity === 0) items.splice(index, 1);
    return toSlots(items);
}

export function combineInventoryItems(inventory, recipe, operationId = null) {
    if (!recipe?.id || !Array.isArray(recipe.ingredients) || !recipe.result?.objectId) throw new TypeError('Invalid inventory recipe');
    let next = cloneInventory(inventory);
    const marker = operationId ?? `combine:${recipe.id}`;
    if (Object.values(next).some((item) => item.operationIds?.includes(marker))) return next;
    if (recipe.ingredients.some((ingredient) => inventoryQuantity(next, ingredient.objectId) < (ingredient.quantity ?? 1))) return next;
    for (const ingredient of recipe.ingredients) {
        next = removeInventoryItem(next, { objectId: ingredient.objectId, quantity: ingredient.quantity ?? 1 });
    }
    return addInventoryItem(next, { ...recipe.result, operationId: marker });
}

export function useInventoryItem(inventory, objectId, { quantity = 1, consume = false, operationId = null } = {}) {
    if (!consume) return cloneInventory(inventory);
    return removeInventoryItem(inventory, { objectId, quantity, operationId });
}

