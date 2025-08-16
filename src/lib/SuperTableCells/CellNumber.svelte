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
  let inEdit: boolean;
  let localValue: number | null = value;
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
        localValue = value;
        originalValue = value;
        lastEdit = undefined;
      },
      reset() {
        localValue = value;
        originalValue = value;
        lastEdit = undefined;
        formattedValue = cellOptions.template
          ? processStringSync(cellOptions.template, {
              ...$context,
              value: localValue,
            })
          : value || localValue || cellOptions.placeholder;

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
        originalValue = undefined;
        dispatch("exitedit");
        dispatch("focusout");
      },
      clear() {
        if (cellOptions.debounce) dispatch("change", null);
        lastEdit = new Date();
        localValue = null;
      },
      focusout(e: FocusEvent) {
        this.submit();
      },
      submit() {
        localValue = editor.value;
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
      debounce(e: KeyboardEvent) {
        lastEdit = new Date();
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
          ["Enter", "Escape", "ArrowLeft", "ArrowRight", "Tab"].includes(key)
        ) {
          if (key === "Enter") return this.submit();
          if (key === "Escape") return this.cancel();
          return;
        }

        // Prevent non-numeric input, except one decimal point and negative sign at start
        if (
          (key.length === 1 && !/[\d.-]/.test(key)) || // Allow digits, decimal, negative sign
          (key === "." && input.value.includes(".")) || // Prevent multiple decimal points
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

        localValue =
          newValue === "" || newValue === "-" ? null : Number(newValue);
        lastEdit = new Date();
        if (cellOptions?.debounce) {
          clearTimeout(timer);
          timer = setTimeout(() => {
            dispatch("change", localValue);
          }, cellOptions.debounce ?? 0);
        }
      },
    },
  });

  $: inEdit = $cellState == "Editing";
  $: inline = cellOptions.role == "inlineInput";
  $: isDirty = lastEdit && originalValue != localValue;

  $: formattedValue = cellOptions.template
    ? processStringSync(cellOptions.template, {
        ...$context,
        value: localValue,
      })
    : value || localValue || cellOptions.placeholder;

  $: cellState.reset(value);

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
    cellState.reset();
  });

  $: console.log(cellOptions, isDirty);
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
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
  style:background={inEdit
    ? "var(--spectrum-global-color-gray-50)"
    : cellOptions?.background}
  style:font-weight={cellOptions?.fontWeight}
  tabIndex={cellOptions.disabled ? "-1" : 0}
  on:focusin={cellState.focus}
>
  {#if cellOptions?.icon}
    <i class={cellOptions.icon + " icon"}></i>
  {/if}

  {#if $cellState == "Editing"}
    <input
      class="editor"
      bind:this={editor}
      class:placeholder={!localValue}
      style:padding-right={"32px"}
      class:with-icon={cellOptions.icon}
      style:text-align={cellOptions.align == "flex-start"
        ? "left"
        : cellOptions.align == "center"
          ? "center"
          : "right "}
      placeholder={cellOptions?.placeholder}
      value={localValue || null}
      on:keydown={(e) => cellState.handleKeyboard(e)}
      on:input={(e) => cellState.handleInput(e)}
      on:focusout={(e) => cellState.focusout(e)}
      use:focus
    />
    <i class="ri-close-line clearIcon" on:mousedown|self={cellState.clear}> </i>
  {:else}
    <div
      class="value"
      style:padding-right={"12px"}
      class:placeholder={!value}
      class:with-icon={cellOptions.icon}
      style:justify-content={cellOptions.align ?? "flex-end"}
    >
      {formattedValue ?? ""}
    </div>
  {/if}
</div>
