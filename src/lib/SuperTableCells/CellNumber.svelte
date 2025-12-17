<script>
  import {
    createEventDispatcher,
    getContext,
    onDestroy,
    onMount,
  } from "svelte";
  import fsm from "svelte-fsm";

  /**
   * @typedef {import('./types.js').CellNumberOptions} CellNumberOptions
   * @typedef {import('./types.js').CellApi} CellApi
   */

  const { processStringSync } = getContext("sdk");
  const context = getContext("context");
  const dispatch = createEventDispatcher();

  /** @type {number | null} */
  export let value;

  /** @type {string | undefined} */
  export let formattedValue = undefined;

  /** @type {CellNumberOptions} */
  export let cellOptions = {};

  export let autofocus = false;

  // Local state
  let localValue = value ?? 0;
  let editor;
  let lastEdit;
  let timer;
  let state = cellOptions?.initialState ?? "View";

  // Destructure cellOptions for cleaner template
  $: ({
    readonly,
    disabled,
    error: optionError,
    icon: optionIcon,
    color,
    background,
    showDirty,
    template,
    placeholder: placeholderText,
    debounce: debounceDelay,
    stepper,
    step,
    min,
    max,
    precision,
    role,
    thousandsSeparator,
    fontWeight,
  } = cellOptions ?? {});

  // Helper function to format number with thousands separator
  function formatNumber(num, separator, decimals) {
    if (num == null) return "";
    const fixed = num.toFixed(decimals ?? 0);
    if (!separator) return fixed;
    
    const parts = fixed.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    return parts.join(".");
  }

  // Reactive declarations
  $: error = optionError;
  $: icon = error ? "ph ph-warning" : optionIcon;
  $: inEdit = $cellState === "Editing";
  $: inline = role === "inlineInput";
  $: isDirty = !!lastEdit && value !== localValue;
  $: decimalsValue = precision ?? 0;
  $: formattedValue = template
    ? processStringSync(template, {
        ...$context,
        value: formatNumber(localValue, thousandsSeparator, decimalsValue),
      })
    : formatNumber(localValue, thousandsSeparator, decimalsValue);
  $: placeholder = placeholderText ?? "";
  $: stepSize = step ?? 1;

  // Reset when value changes externally
  $: cellState.reset(value);

  export let cellState = fsm(state ?? "View", {
    "*": {
      goTo(state) {
        return state;
      },
    },
    View: {
      _enter() {
        const num = Number(value);
        localValue = isNaN(num) ? null : num;
        lastEdit = undefined;
      },
      reset(newValue) {
        if (newValue == localValue) return;
        const num = Number(value);
        localValue = isNaN(num) ? null : num;
        lastEdit = undefined;
        return state;
      },
      focus() {
        if (!readonly && !disabled) return "Editing";
      },
    },
    Editing: {
      _enter() {
        editor?.focus();
        dispatch("enteredit");
      },
      _exit() {
        lastEdit = undefined;
        dispatch("exitedit");
      },
      clear() {
        if (debounceDelay) dispatch("change", null);
        lastEdit = new Date();
        localValue = null;
      },
      focusout(e) {
        dispatch("focusout", e);
        this.submit();
      },
      submit() {
        if (isDirty) {
          dispatch("change", localValue);
        }
        return state;
      },
      cancel() {
        localValue = value;
        dispatch("cancel");
        return state;
      },
      debouncedDispatch() {
        if (debounceDelay) {
          clearTimeout(timer);
          timer = setTimeout(() => {
            dispatch("change", localValue);
          }, debounceDelay);
        }
      },
      handleKeyboard(e) {
        const input = e.target;
        const key = e.key;

        // Handle control keys
        if (
          [
            "Enter",
            "Escape",
            "ArrowLeft",
            "ArrowRight",
            "Tab",
            "ArrowUp",
            "ArrowDown",
          ].includes(key)
        ) {
          if (key === "Enter") return this.submit();
          if (key === "Escape") return this.cancel();
          if (key === "ArrowUp") {
            e.preventDefault();
            this.increment(e);
            return;
          }
          if (key === "ArrowDown") {
            e.preventDefault();
            this.decrement(e);
            return;
          }
          return;
        }

        // Prevent non-numeric input, except one decimal point and negative sign at start
        if (
          (key.length === 1 && !/[\d.-]/.test(key)) || // Allow digits, decimal, negative sign
          (key === "." && input.value.includes(".")) || // Prevent multiple decimal points
          (key === "." && decimalsValue === 0) || // Prevent decimal point if no decimals allowed
          (key === "-" &&
            (input.value.includes("-") || input.selectionStart !== 0)) // Negative sign only at start
        ) {
          e.preventDefault();
        }
      },
      handleInput(e) {
        const input = e.target;
        const newValue = input.value;

        // Validate full input
        if (
          newValue !== "" &&
          newValue !== "-" &&
          !/^-?\d*\.?\d*$/.test(newValue)
        ) {
          input.value = localValue?.toString() ?? ""; // Revert to last valid value
          return;
        }

        // Check decimal places
        if (
          newValue.includes(".") &&
          newValue.split(".")[1].length > decimalsValue
        ) {
          input.value = localValue?.toString() ?? "";
          return;
        }

        localValue =
          newValue === "" || newValue === "-" ? 0 : Number(newValue) || 0;
        localValue = Number(localValue.toFixed(decimalsValue));
        lastEdit = new Date();
        this.debouncedDispatch();
      },
      increment(e) {
        const multiplier = e.shiftKey ? 10 : 1;
        localValue += stepSize * multiplier;
        lastEdit = new Date();
        this.debouncedDispatch();
      },
      decrement(e) {
        const multiplier = e.shiftKey ? 10 : 1;
        localValue -= stepSize * multiplier;
        lastEdit = new Date();
        this.debouncedDispatch();
      },
      handleWheel(e) {
        e.preventDefault();
        if (e.shiftKey) {
          if (e.deltaX < 0) {
            this.increment(e);
          } else {
            this.decrement(e);
          }
        } else {
          if (e.deltaY < 0) {
            this.increment(e);
          } else {
            this.decrement(e);
          }
        }
      },
    },
  });

  /** @type {CellApi} */
  export const cellApi = {
    focus: () => cellState.focus(),
    reset: () => cellState.reset(value),
    isEditing: () => $cellState === "Editing",
    isDirty: () => isDirty,
    getValue: () => localValue,
    setError: (err) => {},
    clearError: () => {},
    setValue: (val) => {
      value = val;
    },
  };

  function focus(element) {
    setTimeout(() => element?.focus(), 10);
  }

  onMount(() => {
    if (autofocus)
      setTimeout(() => {
        cellState.focus();
        editor?.focus();
      }, 30);
  });

  onDestroy(() => {
    clearTimeout(timer);
  });
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="superCell"
  class:error
  class:readonly
  class:disabled
  class:inEdit
  class:isDirty={isDirty && showDirty}
  class:inline
  class:tableCell={role == "tableCell"}
  class:formInput={role == "formInput"}
  style:color
  style:background
  style:font-weight={fontWeight}
  tabIndex={disabled ? -1 : 0}
  on:focusin={cellState.focus}
>
  {#if icon}
    <i class={icon + " field-icon"} class:with-error={error}></i>
  {/if}

  {#if $cellState == "Editing"}
    <input
      class="editor"
      bind:this={editor}
      class:placeholder={!localValue}
      style:text-align={cellOptions.align == "flex-start"
        ? "left"
        : cellOptions.align == "center"
          ? "center"
          : "right "}
      value={localValue || ""}
      on:keydown={(e) => cellState.handleKeyboard(e)}
      on:input={(e) => cellState.handleInput(e)}
      on:focusout={(e) => cellState.focusout(e)}
      on:wheel={(e) => cellState.handleWheel(e)}
      use:focus
    />
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <i
      class="ri-close-line clear-icon visible"
      on:mousedown|preventDefault|stopPropagation={cellState.clear}
    >
    </i>
    {#if stepper}
      <div class="controls">
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <i
          class="ph ph-minus"
          on:mousedown|preventDefault|stopPropagation={(e) =>
            cellState.decrement(e)}
        ></i>
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <i
          class="ph ph-plus"
          on:mousedown|preventDefault|stopPropagation={(e) =>
            cellState.increment(e)}
        ></i>
      </div>
    {/if}
  {:else}
    <div
      class="value"
      style:padding-right={"12px"}
      class:placeholder={!value && value !== 0}
      style:justify-content={cellOptions.align ?? "flex-end"}
    >
      {value != null ? formattedValue : cellOptions?.placeholder || ""}
    </div>
  {/if}
</div>

<style>
  .controls {
    display: flex;
    flex-direction: row;
    gap: 0.25rem;
    padding-right: 0.5rem;
    margin-left: -0.25rem;
  }

  .controls i {
    cursor: pointer;
    padding: 0.15rem;
    background-color: var(--spectrum-global-color-gray-100);
    border-radius: 0.25rem;
    transition: all 0.2s ease-in-out;
  }

  .controls i:hover {
    background-color: var(--spectrum-global-color-gray-200);
  }
</style>
