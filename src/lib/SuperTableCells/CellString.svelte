<script lang="ts">
  import {
    createEventDispatcher,
    getContext,
    onMount,
    onDestroy,
  } from "svelte";
  import fsm from "svelte-fsm";
  import type { CellStringOptions, CellApi, CellEvents } from "./types";

  const dispatch = createEventDispatcher<CellEvents<string | null>>();
  const { processStringSync } = getContext("sdk") as any;

  // Props
  export let value: string | null;
  export let formattedValue: string | undefined = undefined;
  export let cellOptions: CellStringOptions = {
    role: "formInput",
    initialState: "Editing",
    debounce: 250,
  };
  export let autofocus: boolean = false;

  // Local state
  let timer: ReturnType<typeof setTimeout> | undefined;
  let originalValue: string | null | undefined;
  let editor: HTMLInputElement | HTMLTextAreaElement | undefined;
  let lastEdit: Date | undefined;
  let localValue: string | null = value;
  let state: "View" | "Editing" =
    (cellOptions?.initialState === "Loading"
      ? "View"
      : cellOptions?.initialState) ?? "View";
  let errors: string[] = [];

  // Reactive declarations
  $: error = cellOptions?.error || errors.length > 0;
  $: icon = error ? "ph ph-warning" : cellOptions?.icon;
  $: inEdit = $cellState === "Editing";
  $: isDirty = !!lastEdit && originalValue !== localValue;
  $: formattedValue = cellOptions?.template
    ? processStringSync(cellOptions.template, { value })
    : (value ?? undefined);
  $: placeholder = cellOptions?.placeholder ?? "";
  $: textarea = cellOptions?.controlType === "textarea";

  // Reset when value changes externally
  // Reset when value changes externally
  $: cellState.reset(value);

  // FSM - Finite State Machine
  export const cellState = fsm(state ?? "View", {
    "*": {
      goTo(state: string) {
        return state;
      },
      reset(newValue: string | null) {
        if (newValue === localValue) return;
        localValue = value;
        lastEdit = undefined;
        originalValue = undefined;
        isDirty = false;
        errors = [];
        return state;
      },
    },
    View: {
      _enter() {
        localValue = value;
      },
      focus() {
        if (!cellOptions.readonly && !cellOptions.disabled) {
          return "Editing";
        }
      },
    },
    Editing: {
      _enter() {
        originalValue = value;
        setTimeout(() => {
          editor?.focus();
        }, 50);
        dispatch("enteredit");
      },
      _exit() {
        originalValue = undefined;
        lastEdit = undefined;
        dispatch("exitedit");
      },
      focus() {
        editor?.focus();
      },
      clear() {
        if (cellOptions.debounce) {
          dispatch("change", null);
        }
        lastEdit = new Date();
        localValue = null;
        editor?.focus();
        dispatch("clear", null);
      },
      focusout(e: FocusEvent) {
        dispatch("focusout");
        this.submit();
      },
      submit() {
        if (isDirty) {
          dispatch("change", localValue);
        }
        return state;
      },
      cancel() {
        value = originalValue ?? null;
        dispatch("cancel");
        return state;
      },
      debounce(e: Event) {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement;
        localValue = target.value;
        lastEdit = new Date();
        if (cellOptions?.debounce) {
          clearTimeout(timer);
          timer = setTimeout(() => {
            dispatch("change", localValue);
          }, cellOptions.debounce ?? 0);
        }
      },
      handleKeyboard(e: KeyboardEvent) {
        if (e.key === "Enter" && !e.shiftKey) {
          this.submit();
        }
        if (e.key === "Escape") {
          this.cancel();
        }
      },
    },
  });

  // Public API
  export const cellApi: CellApi = {
    focus: () => cellState.focus(),
    reset: () => cellState.reset(value),
    isEditing: () => $cellState === "Editing",
    isDirty: () => isDirty,
    getValue: () => localValue,
    setError: (err: string) => {
      errors = [...errors, err];
    },
    clearError: () => {
      errors = [];
    },
    setValue: (val: string | null) => {
      localValue = val;
      if ($cellState !== "Editing") {
        value = val;
      }
    },
  };

  // Helper functions
  const focus = (node: HTMLElement | undefined) => {
    node?.focus();
  };

  // Lifecycle
  onMount(() => {
    if (autofocus) {
      setTimeout(() => {
        cellState.focus();
      }, 50);
    }
  });

  onDestroy(() => {
    if (timer) {
      clearTimeout(timer);
    }
    cellState.reset(value);
  });
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="superCell"
  class:multirow={cellOptions.controlType == "textarea"}
  class:textarea={cellOptions.controlType == "textarea"}
  class:inEdit
  class:isDirty={isDirty && cellOptions.showDirty}
  class:inline={cellOptions.role == "inlineInput"}
  class:tableCell={cellOptions.role == "tableCell"}
  class:formInput={cellOptions.role == "formInput"}
  class:disabled={cellOptions.disabled}
  class:readonly={cellOptions.readonly}
  class:error={cellOptions.error}
  style:color={cellOptions.color}
  style:background={$cellState == "Editing" && cellOptions.role != "inlineInput"
    ? "var(--spectrum-global-color-gray-50)"
    : cellOptions.background}
  style:font-weight={cellOptions.fontWeight}
>
  {#if icon}
    <i class={icon + " field-icon"} class:with-error={error}></i>
  {/if}

  {#if inEdit}
    {#if textarea}
      <textarea
        bind:this={editor}
        tabindex="0"
        class="editor textarea"
        class:placeholder={!value && !formattedValue && !localValue}
        placeholder={cellOptions?.placeholder ?? ""}
        style:text-align={cellOptions.align == "center"
          ? "center"
          : cellOptions.align == "flex-end"
            ? "right"
            : "left"}
        on:input={cellState.debounce}
        on:focusout={cellState.focusout}
        on:keydown={cellState.handleKeyboard}
        use:focus>{localValue ?? ""}</textarea
      >
    {:else}
      <input
        bind:this={editor}
        tabindex="0"
        class="editor"
        class:placeholder={!value && !formattedValue && !localValue}
        value={localValue ?? ""}
        placeholder={cellOptions?.placeholder ?? ""}
        style:text-align={cellOptions.align == "center"
          ? "center"
          : cellOptions.align == "flex-end"
            ? "right"
            : "left"}
        style:padding-right={cellOptions.align != "flex-start"
          ? "2rem"
          : "0.75rem"}
        on:input={cellState.debounce}
        on:focusout={cellState.focusout}
        on:keydown={cellState.handleKeyboard}
        use:focus
      />
      {#if localValue && cellOptions?.clearIcon !== false}
        <i
          class="ri-close-line clearIcon"
          on:mousedown|self|preventDefault={cellState.clear}
        />
      {/if}
    {/if}
  {:else if textarea}
    <div
      class="value textarea"
      tabindex={cellOptions.readonly || cellOptions.disabled ? -1 : 0}
      class:with-icon={cellOptions.icon || error}
      class:placeholder={!value && !formattedValue}
      style:justify-content={cellOptions.align}
      on:focusin={cellState.focus}
    >
      {formattedValue || value || placeholder}
    </div>
  {:else}
    <div
      class="value"
      tabindex={cellOptions.readonly || cellOptions.disabled ? -1 : 0}
      class:placeholder={!value}
      style:justify-content={cellOptions.align}
      on:focusin={cellState.focus}
    >
      <span>
        {formattedValue || value || placeholder}
      </span>
    </div>
  {/if}
</div>

<style>
  .editor.textarea {
    flex: 1 1 auto;
    all: inherit;
    height: 100%;
    overflow: auto;
    padding: 0.5rem;
  }
  .superCell.textarea {
    height: 100%;
  }

  .value.textarea {
    flex: 1 1 auto;
    display: flex;
    align-items: flex-start;
    white-space: pre-wrap;
    padding: 0.5rem;
    height: 100%;
    overflow-y: auto;
  }

  .textarea.placeholder {
    color: var(--spectrum-global-color-gray-500);
    font-style: italic;
  }
</style>
