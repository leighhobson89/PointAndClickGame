export function bindSemanticControls(root, actionController) {
    if (!root?.querySelectorAll || !actionController) throw new TypeError('A DOM root and action controller are required');
    const disposers = [];
    for (const element of root.querySelectorAll('[data-verb-id]')) {
        const listener = () => actionController.chooseVerb(element.dataset.verbId);
        element.addEventListener('click', listener);
        disposers.push(() => element.removeEventListener('click', listener));
    }
    for (const element of root.querySelectorAll('[data-target-id]')) {
        const listener = () => actionController.chooseTarget(element.dataset.targetId);
        element.addEventListener('click', listener);
        disposers.push(() => element.removeEventListener('click', listener));
    }
    return () => disposers.splice(0).forEach((dispose) => dispose());
}

