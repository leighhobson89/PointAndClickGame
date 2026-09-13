const line = (id, textKey, nextNodeId, speaker = 'npcLibrarian', actions = []) => ({ id, type: 'line', textKey, speaker, nextNodeId, actions });
const response = (id, textKey, nextNodeId) => line(id, textKey, nextNodeId);

export const libraryDialogueGraph = Object.freeze({
    id: 'library.librarianTutorial',
    startNodeId: 'library.librarian.q0.intro',
    nodes: Object.freeze({
        'library.librarian.q0.intro': line('library.librarian.q0.intro', 'library.librarian.q0.intro', 'library.librarian.q0.opening0', 'player'),
        'library.librarian.q0.opening0': line('library.librarian.q0.opening0', 'library.librarian.q0.opening0', 'library.librarian.q0.opening1'),
        'library.librarian.q0.opening1': line('library.librarian.q0.opening1', 'library.librarian.q0.opening1', 'library.librarian.q0.choices'),
        'library.librarian.q0.choices': {
            id: 'library.librarian.q0.choices', type: 'choice', choices: [
                { id: 'library.librarian.askResearchKey', textKey: 'library.librarian.q0.choice0', nextNodeId: 'library.librarian.q0.keyResponse0', recordsChoice: true },
                ...[1, 2, 3, 4, 5].map((choice) => ({ id: `library.librarian.q0.aside${choice}`, textKey: `library.librarian.q0.choice${choice}`, nextNodeId: `library.librarian.q0.asideResponse${choice}` })),
                { id: 'library.librarian.q0.exit', textKey: 'library.librarian.q0.exit0', nextNodeId: 'library.librarian.q0.exitResponse' },
            ],
        },
        'library.librarian.q0.keyResponse0': response('library.librarian.q0.keyResponse0', 'library.librarian.q0.response0.0', 'library.librarian.q0.keyResponse1'),
        'library.librarian.q0.keyResponse1': response('library.librarian.q0.keyResponse1', 'library.librarian.q0.response0.1', 'library.librarian.q1.intro'),
        ...Object.fromEntries([1, 2, 3, 4, 5].map((choice) => [`library.librarian.q0.asideResponse${choice}`, response(`library.librarian.q0.asideResponse${choice}`, `library.librarian.q0.response${choice}.0`, 'library.librarian.q0.choices')])),
        'library.librarian.q0.exitResponse': line('library.librarian.q0.exitResponse', 'library.librarian.q0.exit1', 'library.librarian.end.noConsequence'),
        'library.librarian.q1.intro': line('library.librarian.q1.intro', 'library.librarian.q1.intro', 'library.librarian.q1.opening0', 'player'),
        'library.librarian.q1.opening0': line('library.librarian.q1.opening0', 'library.librarian.q1.opening0', 'library.librarian.q1.opening1'),
        'library.librarian.q1.opening1': line('library.librarian.q1.opening1', 'library.librarian.q1.opening1', 'library.librarian.q1.choices'),
        'library.librarian.q1.choices': {
            id: 'library.librarian.q1.choices', type: 'choice', choices: [
                { id: 'library.librarian.pressForResearchKey', textKey: 'library.librarian.q1.choice0', nextNodeId: 'library.librarian.q1.keyResponse0', recordsChoice: true },
                ...[1, 2, 3].map((choice) => ({ id: `library.librarian.q1.aside${choice}`, textKey: `library.librarian.q1.choice${choice}`, nextNodeId: `library.librarian.q1.asideResponse${choice}` })),
                { id: 'library.librarian.q1.exit', textKey: 'library.librarian.q1.exit0', nextNodeId: 'library.librarian.q1.exitResponse' },
            ],
        },
        'library.librarian.q1.keyResponse0': response('library.librarian.q1.keyResponse0', 'library.librarian.q1.response0.0', 'library.librarian.q1.keyResponse1'),
        'library.librarian.q1.keyResponse1': response('library.librarian.q1.keyResponse1', 'library.librarian.q1.response0.1', 'library.librarian.q2.playerExit'),
        ...Object.fromEntries([1, 2, 3].map((choice) => [`library.librarian.q1.asideResponse${choice}`, response(`library.librarian.q1.asideResponse${choice}`, `library.librarian.q1.response${choice}.0`, 'library.librarian.q1.choices')])),
        'library.librarian.q1.exitResponse': line('library.librarian.q1.exitResponse', 'library.librarian.q1.exit1', 'library.librarian.end.noConsequence'),
        'library.librarian.q2.playerExit': line('library.librarian.q2.playerExit', 'library.librarian.q2.exit0', 'library.librarian.q2.librarianExit', 'player'),
        'library.librarian.q2.librarianExit': line('library.librarian.q2.librarianExit', 'library.librarian.q2.exit1', 'library.librarian.end.riddleKnown'),
        'library.librarian.end.riddleKnown': { id: 'library.librarian.end.riddleKnown', type: 'end', actions: [{ id: 'library.learnRiddle' }] },
        'library.librarian.end.noConsequence': { id: 'library.librarian.end.noConsequence', type: 'end', actions: [] },
    }),
});

export function resolveLibraryDialogueText(dialogueRoot, textKey, locale) {
    const match = /^library\.librarian\.q(\d+)\.(intro|opening\d+|choice\d+|response\d+\.\d+|exit\d+)$/.exec(textKey);
    if (!match) return textKey;
    const [, questId, kind] = match;
    const quest = dialogueRoot?.dialogue?.npcInteractions?.verbTalkTo?.npcLibrarian?.quest?.[questId];
    if (kind === 'intro') return quest?.introDialogue?.[locale] ?? quest?.introDialogue?.en ?? textKey;
    if (kind.startsWith('opening')) return quest?.phase?.[kind.slice(7)]?.[locale] ?? quest?.phase?.[kind.slice(7)]?.en ?? textKey;
    if (kind.startsWith('choice')) return quest?.dialogueOptions?.[kind.slice(6)]?.[locale] ?? quest?.dialogueOptions?.[kind.slice(6)]?.en ?? textKey;
    if (kind.startsWith('response')) {
        const [, choiceId, lineId] = /^response(\d+)\.(\d+)$/.exec(kind);
        return quest?.responses?.[choiceId]?.phase?.[lineId]?.[locale] ?? quest?.responses?.[choiceId]?.phase?.[lineId]?.en ?? textKey;
    }
    const exit = quest?.exitOption ?? quest?.autoExitOption;
    return exit?.phase?.[kind.slice(4)]?.[locale] ?? exit?.phase?.[kind.slice(4)]?.en ?? textKey;
}

