import {
    cancelCommand,
    contextualVerbForTarget,
    createCommandSelection,
    selectTarget,
    selectVerb,
} from '../domain/commands/commands.mjs';

export function createActionController({ execute = () => {}, onChange = () => {} } = {}) {
    let selection = createCommandSelection();
    const publish = () => onChange(selection);
    return Object.freeze({
        getSelection: () => selection,
        chooseVerb(verbId) {
            selection = selectVerb(selection, verbId);
            publish();
            return selection;
        },
        chooseTarget(targetId) {
            const result = selectTarget(selection, targetId);
            selection = result.selection;
            publish();
            if (result.status === 'ready') execute(result.intent);
            return result;
        },
        chooseContextualTarget(target) {
            selection = selectVerb(selection, contextualVerbForTarget(target));
            return this.chooseTarget(target?.id);
        },
        cancel() {
            selection = cancelCommand();
            publish();
            return selection;
        },
    });
}

