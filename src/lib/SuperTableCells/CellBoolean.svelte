<script>
  import { createEventDispatcher, getContext } from "svelte";
  import fsm from "svelte-fsm";
  import "./CellCommon.css";

  export let value;
  export let formattedValue;
  export let cellOptions;

  let originalValue = value;
  let editor;

  const dispatch = createEventDispatcher();

  export let cellState = fsm(cellOptions.initialState ?? "View", {
    "*": {
      goTo(state) {
        return state;
      },
    },
    View: {
      focus() {
        if (!cellOptions.readonly && !cellOptions.disabled) return "Editing";
        editor?.focus();
      },
    },
    Editing: {
      _enter() {
        originalValue = value;
        editor?.focus();
        dispatch("enteredit");
      },
      _exit() {
        dispatch("exitedit");
      },
      focus() {
        editor?.focus();
      },
      change(e) {
        if (cellOptions.debounce) dispatch("change", value);
      },
      submit() {
        if (value !== originalValue) {
          dispatch("change", value);
        }
        dispatch("focusout");
        return "View";
      },
      cancel() {
        value = originalValue;
        return "View";
      },
    },
  });

  $: inline = cellOptions.role == "inlineInput";
  $: inEdit = $cellState == "Editing";
  $: isDirty = inEdit && originalValue !== value;
  $: checkbox = cellOptions?.controlType == "checkbox";
  $: tableCell = cellOptions.role == "tableCell";
  $: inlineLabel = cellOptions.inlineLabel;
  $: icon = cellOptions.error ? "ri-error-warning-line" : cellOptions.icon;
  $: error = cellOptions.error;

  const focus = (node) => {
    if (cellOptions.role == "tableCell") node.focus();
  };
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="superCell"
  class:inEdit
  class:isDirty={isDirty && cellOptions.showDirty}
  class:inline
  class:tableCell
  class:disabled={cellOptions.disabled}
  class:readonly={cellOptions.readonly}
  class:naked-field={!tableCell}
  style:color={cellOptions.color}
  style:background={$cellState == "Editing" && cellOptions.role != "inline"
    ? "var(--spectrum-global-color-gray-50)"
    : cellOptions.background}
  style:font-weight={cellOptions.fontWeight}
>
  {#if icon}
    <i class={icon + " field-icon"} class:with-error={error}></i>
  {/if}

  {#if $cellState == "Editing" || (cellOptions.role != "tableCell" && !formattedValue)}
    <div
      class="editor"
      class:naked-field={!tableCell}
      style:justify-content={cellOptions.align ?? "center"}
    >
      {#if !checkbox}
        <div class="spectrum-Switch spectrum-Switch--emphasized">
          <input
            class="spectrum-Switch-input"
            bind:checked={value}
            bind:this={editor}
            type="checkbox"
            disabled={cellOptions.disabled || cellOptions.readonly}
            on:focusin={cellState.focus}
            on:focusout={cellState.submit}
            on:change={cellState.change}
            use:focus
          />
          <span class="spectrum-Switch-switch"></span>
          {#if inlineLabel}
            <span class="spectrum-Switch-label">{inlineLabel}</span>
          {/if}
        </div>
      {:else}
        <input
          class="checkbox"
          bind:checked={value}
          bind:this={editor}
          type="checkbox"
          disabled={cellOptions.disabled || cellOptions.readonly}
          on:focusin={cellState.focus}
          on:focusout={cellState.submit}
          on:change={cellState.change}
          use:focus
        />
        {#if inlineLabel}
          <span class="checkbox-label">{inlineLabel}</span>
        {/if}
      {/if}
    </div>
  {:else}
    <div
      class="value"
      tabIndex="0"
      style:justify-content={cellOptions.align ?? "center"}
      class:with-icon={cellOptions.icon}
      on:focusin={cellState.focus}
    >
      {#if value}
        <i class="ri-check-line valueicon"></i>
      {:else if cellOptions.showFalse}
        <i class="ri-close-line valueicon"></i>
      {/if}
    </div>
  {/if}
</div>

<style>
  .spectrum-Switch {
    margin-left: 0.25rem !important;
  }

  .checkbox-label {
    margin-left: 0.25rem;
  }
</style>
