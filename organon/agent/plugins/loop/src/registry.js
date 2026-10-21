/**
 * The `evolve` service: the strategies registered by the enabled strategy
 * plugins of `agent/evolve/`. Each plugin registers one strategy for one slot
 * (Loop, Sel, Var, Eval, Surv, or a slot the agent adds) and its registration
 * goes when the plugin stops, so the strategies of a slot are exactly the
 * enabled plugins of that slot.
 *
 * @module @organon/loop/registry
 */

/**
 * @typedef {object} Strategy
 * @property {string} slot
 * @property {string} name
 * @property {Function} run - the strategy function, called with `core` first.
 * @property {object} settings - what `core.settings` holds for it.
 * @property {boolean} batch - for a Sel: it receives `{ n }` and picks a whole batch.
 */

export class Strategies {
  /** @type {Strategy[]} */
  #registered = []

  /**
   * Register one strategy. A strategy plugin calls this inside `ctx.effect`,
   * so the registration ends with the plugin.
   * @param {string} slot
   * @param {string} name
   * @param {Function} run
   * @param {{ settings?: object, batch?: boolean }} [options]
   * @returns {() => void} removes the registration.
   */
  strategy(slot, name, run, { settings = {}, batch = false } = {}) {
    for (const [key, value] of [['slot', slot], ['name', name]]) {
      if (typeof value !== 'string' || value === '') throw new Error(`a strategy needs a non-empty ${key}`)
    }
    if (typeof run !== 'function') throw new Error(`${slot}/${name}: the strategy must be a function`)
    if (settings === null || typeof settings !== 'object' || Array.isArray(settings)) {
      throw new Error(`${slot}/${name}: settings must be an object`)
    }
    const entry = Object.freeze({ slot, name, run, settings: { ...settings }, batch: batch === true })
    this.#registered.push(entry)
    return () => {
      const index = this.#registered.indexOf(entry)
      if (index !== -1) this.#registered.splice(index, 1)
    }
  }

  /**
   * Every registered strategy, by slot.
   * @returns {Record<string, Strategy[]>}
   */
  bySlot() {
    const slots = {}
    for (const entry of this.#registered) (slots[entry.slot] ??= []).push(entry)
    return slots
  }

  /**
   * The strategy of each slot, for one chunk. A slot with two enabled
   * strategies has no single strategy to run.
   * @returns {Record<string, Strategy>}
   */
  active() {
    const active = {}
    for (const [slot, entries] of Object.entries(this.bySlot())) {
      if (entries.length > 1) {
        throw new Error(`slot "${slot}" has ${entries.length} enabled strategies (${entries.map(entry => entry.name).join(', ')}): `
          + 'disable all but one with plugin_manager set_plugin')
      }
      active[slot] = entries[0]
    }
    return active
  }
}
