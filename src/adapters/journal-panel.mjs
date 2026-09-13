// The player-facing journal.
//
// This adapter renders what src/domain/progress/journal.mjs derives and adds
// nothing of its own except the number of hint tiers the player has asked to
// see, which is deliberately per-session and never saved: a hint is a thing
// you asked for once, not progress you earned.
//
// Every entry carries stable data-* IDs so tests and assistive technology
// address objectives by ID rather than by translated text.

import {
    OBJECTIVE_STATUS,
    chapterSummary,
    deriveJournal,
    objectiveHintKey,
    objectiveTitleKey,
    revealedHintKeys,
} from '../domain/progress/journal.mjs';

const revealedTiers = new Map();

export function resetRevealedHints() {
    revealedTiers.clear();
}

export function revealedTierCount(objectiveId) {
    return revealedTiers.get(objectiveId) ?? 0;
}

export function revealNextHint(objectiveId, hintTiers) {
    const next = Math.min(revealedTierCount(objectiveId) + 1, hintTiers);
    revealedTiers.set(objectiveId, next);
    return next;
}

/**
 * Create the journal presenter. `translate(key)` resolves a key in the journal
 * localisation section; keeping it injected is what lets the panel be rendered
 * and asserted without a running localisation stack.
 */
export function createJournalPanel({ elements, translate, getContract, getFacts, onOpenChange = () => {} }) {
    const { panel, body, title, progress, openButton, closeButton } = elements;
    let open = false;
    let lastFocused = null;

    function render() {
        const contract = getContract();
        const facts = getFacts();
        const journal = deriveJournal(contract, facts);

        title.textContent = translate('panelTitle');
        closeButton.textContent = translate('closeButton');
        progress.textContent = translate('progressCounter', {
            reached: String(journal.milestonesReachedCount),
            total: String(journal.milestoneCount),
        });
        progress.dataset.milestonesReached = String(journal.milestonesReachedCount);
        progress.dataset.milestonesTotal = String(journal.milestoneCount);

        body.replaceChildren();
        if (journal.chapterComplete) body.append(renderSummary(contract, facts));

        if (journal.active.length === 0 && journal.completed.length === 0) {
            body.append(paragraph('journalEmpty', translate('emptyState')));
            return;
        }

        if (journal.active.length) body.append(section('active', translate('activeHeading'), journal.active.map(renderActive)));
        if (journal.completed.length) body.append(section('completed', translate('completedHeading'), journal.completed.map(renderCompleted)));
    }

    function renderActive(objective) {
        const item = document.createElement('li');
        item.className = 'journal-objective journal-objective-active';
        item.dataset.objectiveId = objective.id;
        item.dataset.objectiveStatus = objective.status;
        item.dataset.chainId = objective.chain;

        const name = document.createElement('span');
        name.className = 'journal-objective-title';
        name.textContent = translate(objectiveTitleKey(objective.id));
        item.append(name);

        const hints = document.createElement('ol');
        hints.className = 'journal-hints';
        hints.dataset.objectiveId = objective.id;
        const shown = revealedHintKeys(objective, revealedTierCount(objective.id));
        shown.forEach((key, index) => {
            const hint = document.createElement('li');
            hint.className = 'journal-hint';
            hint.dataset.hintTier = String(index + 1);
            hint.textContent = translate(key);
            hints.append(hint);
        });
        item.append(hints);

        const exhausted = revealedTierCount(objective.id) >= objective.hintTiers;
        const hintButton = document.createElement('button');
        hintButton.type = 'button';
        hintButton.className = 'btn btn-sm btn-outline-light journal-hint-button';
        hintButton.dataset.objectiveId = objective.id;
        hintButton.textContent = exhausted
            ? translate('hintExhausted')
            : translate(revealedTierCount(objective.id) === 0 ? 'hintButton' : 'hintMoreButton');
        hintButton.disabled = exhausted;
        hintButton.addEventListener('click', () => {
            revealNextHint(objective.id, objective.hintTiers);
            render();
            panel.querySelector(`.journal-hint-button[data-objective-id="${objective.id}"]`)?.focus();
        });
        item.append(hintButton);
        return item;
    }

    function renderCompleted(objective) {
        const item = document.createElement('li');
        item.className = 'journal-objective journal-objective-done';
        item.dataset.objectiveId = objective.id;
        item.dataset.objectiveStatus = objective.status;
        item.dataset.chainId = objective.chain;
        item.textContent = translate(objectiveTitleKey(objective.id));
        return item;
    }

    function renderSummary(contract, facts) {
        const summary = chapterSummary(contract, facts);
        const container = document.createElement('section');
        container.className = 'journal-summary';
        container.dataset.chapterComplete = 'true';
        container.dataset.objectivesCompleted = String(summary.objectivesCompleted);
        container.dataset.objectiveCount = String(summary.objectiveCount);
        container.dataset.optionalCount = String(summary.optionalFactIds.length);
        container.dataset.choiceCount = String(summary.choiceIds.length);

        const heading = document.createElement('h3');
        heading.textContent = translate('summaryTitle');
        container.append(heading);
        container.append(paragraph('journalSummaryProgress', translate('summaryProgress', {
            objectives: String(summary.objectivesCompleted),
            total: String(summary.objectiveCount),
        })));

        container.append(paragraph('journalSummaryOptional', summary.optionalFactIds.length
            ? `${translate('summaryOptionalHeading')}: ${summary.optionalFactIds.length}`
            : translate('summaryOptionalNone')));
        container.append(paragraph('journalSummaryChoices', summary.choiceIds.length
            ? `${translate('summaryChoicesHeading')}: ${summary.choiceIds.length}`
            : translate('summaryChoicesNone')));
        return container;
    }

    function section(id, headingText, items) {
        const container = document.createElement('section');
        container.className = `journal-section journal-section-${id}`;
        container.dataset.sectionId = id;
        const heading = document.createElement('h3');
        heading.className = 'journal-section-heading';
        heading.textContent = headingText;
        const list = document.createElement('ul');
        list.className = 'journal-list';
        list.append(...items);
        container.append(heading, list);
        return container;
    }

    function paragraph(id, text) {
        const element = document.createElement('p');
        element.className = 'journal-paragraph';
        element.dataset.paragraphId = id;
        element.textContent = text;
        return element;
    }

    function setOpen(next) {
        if (open === next) return;
        open = next;
        panel.classList.toggle('d-none', !open);
        openButton.setAttribute('aria-expanded', String(open));
        if (open) {
            lastFocused = document.activeElement;
            render();
            panel.focus();
        } else if (lastFocused instanceof HTMLElement) {
            lastFocused.focus();
        }
        onOpenChange(open);
    }

    function onKeyDown(event) {
        if (event.key === 'Escape' && open) {
            event.preventDefault();
            setOpen(false);
        }
    }

    openButton.addEventListener('click', () => setOpen(!open));
    closeButton.addEventListener('click', () => setOpen(false));
    panel.addEventListener('keydown', onKeyDown);

    return {
        render,
        isOpen: () => open,
        open: () => setOpen(true),
        close: () => setOpen(false),
        refreshIfOpen: () => { if (open) render(); },
        dispose: () => {
            panel.removeEventListener('keydown', onKeyDown);
            setOpen(false);
            resetRevealedHints();
        },
    };
}

export { OBJECTIVE_STATUS, objectiveHintKey, objectiveTitleKey };
