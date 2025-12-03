<script lang="ts">
  import {
    createEventDispatcher,
    getContext,
    onDestroy,
    onMount,
  } from "svelte";
  import fsm from "svelte-fsm";

  const { processStringSync } = getContext("sdk");
  const context = getContext("context");
  const dispatch = createEventDispatcher();

  export let value: number | null;
  export let formattedValue: string | undefined;
  export let cellOptions: any;
  export let autofocus: boolean;

  let originalValue: number | null = value;
  let localValue: number = value ?? 0;
  let inEdit: boolean;
  let editor: HTMLInputElement;
  let lastEdit: Date | undefined;
  let timer: ReturnType<typeof setTimeout>;

  export let cellState = fsm(cellOptions.initialState ?? "View", {
    "*": {
      goTo(state: string) {
        return state;
      },
    },
    View: {
      _enter() {
        const num = Number(value);
        localValue = isNaN(num) ? null : num;
        originalValue = value;
        lastEdit = undefined;
      },
      reset(value: number | null) {
        const num = Number(value);
        localValue = isNaN(num) ? null : num;
        originalValue = value;
        lastEdit = undefined;

        return cellOptions.initialState ?? "View";
      },
      focus() {
        if (!cellOptions.readonly && !cellOptions.disabled) return "Editing";
      },
    },
    Editing: {
      _enter() {
        originalValue = value;
        editor?.focus();
        dispatch("enteredit");
      },
      _exit() {
        originalValue = null;
        dispatch("exitedit");
      },
      clear() {
        if (cellOptions.debounce) dispatch("change", null);
        lastEdit = new Date();
        localValue = null;
      },
      focusout(e: FocusEvent) {
        dispatch("focusout", e);
        this.submit();
      },
      submit() {
        if (isDirty) {
          dispatch("change", localValue);
        }
        return "View";
      },
      cancel() {
        value = originalValue;
        dispatch("cancel");
        return "View";
      },
      debouncedDispatch() {
        if (cellOptions?.debounce) {
          clearTimeout(timer);
          timer = setTimeout(() => {
            dispatch("change", localValue);
          }, cellOptions.debounce ?? 0);
        }
      },
      handleKeyboard(e: KeyboardEvent) {
        const input = e.target as HTMLInputElement;
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
          (key === "." && decimals === 0) || // Prevent decimal point if no decimals allowed
          (key === "-" &&
            (input.value.includes("-") || input.selectionStart !== 0)) // Negative sign only at start
        ) {
          e.preventDefault();
        }
      },
      handleInput(e: Event) {
        const input = e.target as HTMLInputElement;
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
          newValue.split(".")[1].length > decimals
        ) {
          input.value = localValue?.toString() ?? "";
          return;
        }

        localValue =
          newValue === "" || newValue === "-" ? 0 : Number(newValue) || 0;
        localValue = Number(localValue.toFixed(decimals));
        lastEdit = new Date();
        this.debouncedDispatch();
      },
      increment(e: Event) {
        const multiplier = (e as any).shiftKey ? 10 : 1;
        localValue += stepSize * multiplier;
        lastEdit = new Date();
        this.debouncedDispatch();
      },
      decrement(e: Event) {
        const multiplier = (e as any).shiftKey ? 10 : 1;
        localValue -= stepSize * multiplier;
        lastEdit = new Date();
        this.debouncedDispatch();
      },
      handleWheel(e: WheelEvent) {
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

  $: inEdit = $cellState == "Editing";
  $: inline = cellOptions.role == "inlineInput";
  $: isDirty = lastEdit && originalValue != localValue;
  $: error = cellOptions?.error;
  $: icon = error ? "ph ph-warning" : "ph ph-" + cellOptions?.icon;
  $: stepper = cellOptions?.showStepper;
  $: stepSize = cellOptions?.stepSize ?? 1;
  $: decimals = cellOptions?.decimals ?? 0;

  $: cellState.reset(value);

  $: formattedValue = cellOptions.template
    ? processStringSync(cellOptions.template, {
        ...$context,
        value: localValue?.toFixed(decimals),
      })
    : localValue?.toFixed(decimals);

  function focus(element: HTMLElement) {
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
  class:error={cellOptions.error}
  class:readonly={cellOptions.readonly}
  class:disabled={cellOptions.disabled}
  class:inEdit
  class:isDirty={isDirty && cellOptions?.showDirty}
  class:inline
  class:tableCell={cellOptions?.role == "tableCell"}
  class:formInput={cellOptions?.role == "formInput"}
  style:color={cellOptions?.color}
  style:background={cellOptions?.background}
  style:font-weight={cellOptions?.fontWeight}
  tabIndex={cellOptions.disabled ? -1 : 0}
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
      class:placeholder={!(typeof value === "number" && !isNaN(value))}
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
