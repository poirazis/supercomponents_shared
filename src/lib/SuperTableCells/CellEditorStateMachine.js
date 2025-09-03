// Common Editor State Machine for SuperTable Cells
// Handles editing logic: debounce, keyboard handling, focus in/out, popups

import fsm from "svelte-fsm";

export function createCellEditorStateMachine(cellOptions = {}, cellStateRef) {
  let timer;
  let originalValue = null;
  let lastEdit = null;

  // For popup focus checks
  let popupElements = cellOptions.popupElements || [];

  const editorFSM = fsm(cellOptions.editorInitialState || "Hidden", {
    "*": {
      goTo(state) {
        return state;
      },
      // Standardized debounce
      debounceDispatch(newValue, property = "change") {
        if (cellStateRef && cellOptions.debounce) {
          clearTimeout(timer);
          timer = setTimeout(() => {
            const event = new CustomEvent(property, { detail: newValue });
            // Dispatch via cellState or directly
            // Since no dispatch here, use cellState to dispatch
          }, cellOptions.debounce ?? 0);
        }
      },
      // Standardized keyboard handling
      handleKeyboard(e, cellStateRef) {
        if (!cellStateRef) return;
        if (e.key === "Enter" && !cellOptions.multiline) {
          cellStateRef.submit();
        } else if (e.key === "Escape") {
          cellStateRef.cancel();
        } else if (e.key === "Tab") {
          e.preventDefault();
          // Handle tab shift if needed
          if (e.shiftKey) {
            // Handle shift-tab
          } else {
            // Handle tab
          }
        }
      },
      // Standardized focus handling
      handleFocusIn(cellStateRef) {
        if (cellStateRef) cellStateRef.focus();
      },
      // Standardized focus out with popup checks
      handleFocusOut(e, cellStateRef) {
        if (!cellStateRef) return;

        // Check if focus is leaving to popup elements
        const isLeavingToPopup = popupElements.some(
          (element) => element && element.contains(e.relatedTarget)
        );

        if (isLeavingToPopup) return; // Don't exit edit

        cellStateRef.focusout(); // Exit edit
      },
      // Number-specific validations (can be extended)
      validateNumericInput(e) {
        // Allow numbers, decimal, negative
        if (!/[\d.-]/.test(e.key) && e.key.length === 1) {
          e.preventDefault();
        }
        // Prevent multiple decimals
        if (e.key === "." && e.target.value.includes(".")) {
          e.preventDefault();
        }
        // Handle negative at start
        if (e.key === "-" && e.target.selectionStart !== 0) {
          e.preventDefault();
        }
      },
      clearTimer() {
        clearTimeout(timer);
      },
    },
    Hidden: {
      // Not in edit, no editor shown
      open() {
        return "Visible";
      },
    },
    Visible: {
      // Editor is visible, handle events
      _enter() {},
      _exit() {},
      close() {
        return "Hidden";
      },
    },
  });

  return {
    editorFSM,
    // Methods for integration
    setPopupElements(elements) {
      popupElements = elements;
    },
    getTimer() {
      return timer;
    },
    setOriginalValue(val) {
      originalValue = val;
    },
    setLastEdit(time) {
      lastEdit = time;
    },
    getIsDirty(currentValue) {
      return (
        JSON.stringify(currentValue) !== JSON.stringify(originalValue) ||
        lastEdit
      );
    },
    cleanup() {
      editorFSM.clearTimer();
      editorFSM.reset();
    },
  };
}

// Utility for extracting value from event
export function extractValue(e) {
  return e.target.value !== undefined ? e.target.value : e.detail;
}
