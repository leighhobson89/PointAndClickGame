// Idle detection for deterministic tests.
//
// A test that arranges state and then clicks needs a single, honest answer to
// "has the game finished reacting?". `createIdleTracker` composes named probes
// so a timeout can report exactly which subsystem is still busy instead of
// failing with an opaque timeout.

export const DEFAULT_IDLE_TIMEOUT_MS = 10_000;

/**
 * @param {Object} options
 * @param {Record<string, () => boolean>} options.probes named "is this busy?" predicates
 * @param {() => number} options.now monotonic clock
 * @param {(callback: Function) => void} options.schedule one-tick scheduler, normally requestAnimationFrame
 * @param {number} options.stableTicks consecutive quiet ticks required before reporting idle
 */
export function createIdleTracker({ probes = {}, now = () => Date.now(), schedule = (callback) => setTimeout(callback, 16), stableTicks = 2 } = {}) {
    const probeNames = Object.keys(probes);

    function busyProbeNames() {
        return probeNames.filter((name) => {
            try {
                return probes[name]() === true;
            } catch (error) {
                return true;
            }
        });
    }

    return Object.freeze({
        probeNames: Object.freeze([...probeNames]),
        pending: busyProbeNames,
        isIdle: () => busyProbeNames().length === 0,
        waitForIdle({ timeoutMs = DEFAULT_IDLE_TIMEOUT_MS } = {}) {
            const startedAt = now();
            let quietTicks = 0;
            return new Promise((resolve) => {
                const tick = () => {
                    const pending = busyProbeNames();
                    quietTicks = pending.length === 0 ? quietTicks + 1 : 0;
                    const waitedMs = now() - startedAt;
                    if (quietTicks >= stableTicks) return resolve({ idle: true, pending: [], waitedMs, timedOut: false });
                    if (waitedMs >= timeoutMs) return resolve({ idle: false, pending, waitedMs, timedOut: true });
                    schedule(tick);
                };
                schedule(tick);
            });
        },
    });
}
