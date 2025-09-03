// Common Cell State Machine for SuperTable Cells
// Handles states: Load, View, Edit, Disabled
// Transforms original value tracking and focus logic

import fsm from "svelte-fsm";
import { createEventDispatcher, getContext } from "svelte";

export function createCellStateMachine(cellOptions = {}) {
  const { processStringSync } = getContext("sdk");
  const context = getContext("context");
  const dispatch = createEventDispatcher();

  // Map legacy "Editing" to "Edit", default to "View"
  const initialState =
    cellOptions.initialState === "Editing"
      ? "Edit"
      : cellOptions.initialState || "View";

  return fsm(initialState, {
    "*": {
      goTo(state) {
        return state;
      },
      // Standard value tracking
      setOriginalValue(value) {
        this.originalValue = JSON.stringify(value || null);
      },
      getIsDirty() {
        return JSON.stringify(this.currentValue) !== this.originalValue;
      },
    },
    Load: {
      // Loading state, e.g., for data-dependent cells
      _enter() {
        this.currentValue = cellOptions.value;
        this.setOriginalValue(cellOptions.value);
      },
      loadComplete() {
        return "View";
      },
    },
    View: {
      // Display mode
      _enter() {
        this.currentValue = cellOptions.value;
        this.setOriginalValue(cellOptions.value);
      },
      focus() {
        console.log("FSM focus action triggered", {
          readonly: cellOptions.readonly,
          disabled: cellOptions.disabled,
        });
        // Allow focus if not readonly/disabled
        if (!cellOptions.readonly && !cellOptions.disabled) {
          console.log("FSM returning Edit");
          return "Edit";
        }
        console.log("FSM staying in View");
        return "View";
      },
    },
    Edit: {
      // Editing mode
      _enter() {
        // Enter editing, set edit time
        this.editStartTime = Date.now();
        dispatch("enteredit");
      },
      _exit() {
        dispatch("exitedit");
        this.editStartTime = null;
      },
      focusout() {
        // Handle focus out, will be overridden by CellEditorStateMachine for popup checks
        if (this.getIsDirty()) {
          dispatch("change", this.currentValue);
        }
        return "View";
      },
      submit() {
        if (this.getIsDirty()) {
          dispatch("change", this.currentValue);
        }
        return "View";
      },
      cancel() {
        // Reset to original
        this.currentValue = JSON.parse(this.originalValue);
        dispatch("cancel", this.currentValue);
        return "View";
      },
    },
    Disabled: {
      // Disabled state
      _enter() {
        // Prevent actions
      },
      focus() {
        return "Disabled"; // Stay disabled
      },
    },
  });
}

// Helper for computed formatted value
export function computeFormattedValue(cellOptions, value) {
  const { processStringSync } = getContext("sdk");
  const context = getContext("context");

  if (cellOptions.template) {
    return processStringSync(cellOptions.template, { ...$context, value });
  }
  return value;
}

// Helper for reactive isDirty
export function createIsDirtyReactive(cellState, value) {
  // Call in $: isDirty = cellState.getIsDirty() && value !== undefined;
}
