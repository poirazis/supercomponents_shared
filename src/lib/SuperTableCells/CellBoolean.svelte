<script>
  import { createEventDispatcher } from "svelte";
  import fsm from "svelte-fsm";
  import Switch from "../UI/elements/Switch.svelte";
  import Checkbox from "../UI/elements/Checkbox.svelte";
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
      },
    },
    Editing: {
      _enter() {
        originalValue = value;
        dispatch("enteredit");
      },
      _exit() {
        dispatch("exitedit");
      },
      focus() {},
      toggle() {
        value = !value;
        dispatch("change", value);
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
  $: tableCell = cellOptions.role == "tableCell";
  $: inlineLabel = cellOptions.inlineLabel;
  $: icon = cellOptions.error ? "ri-error-warning-line" : cellOptions.icon;
  $: error = cellOptions.error;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="superCell"
  tabindex={cellOptions.disabled || cellOptions.readonly ? undefined : "1"}
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
  on:keydown={(e) => {
    if (e.code == "Space") cellState.toggle();
  }}
  on:focusin={cellState.focus}
  on:focusout={cellState.submit}
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
      {#if cellOptions.controlType == "switch"}
        <div class="switch-wrapper">
          <Switch
            checked={value}
            disabled={cellOptions.disabled || cellOptions.readonly}
            size="medium"
            on:change={(e) => {
              value = e.detail.checked;
              cellState.change();
            }}
          />
          {#if inlineLabel}
            <span class="switch-label">{inlineLabel}</span>
          {/if}
        </div>
      {:else}
        <div class="checkbox-wrapper">
          <Checkbox
            checked={value}
            size="medium"
            disabled={cellOptions.disabled || cellOptions.readonly}
            on:change={(e) => {
              value = e.detail.checked;
              cellState.change();
            }}
          />
          {#if inlineLabel}
            <span class="checkbox-label">{inlineLabel}</span>
          {/if}
        </div>
      {/if}
    </div>
  {:else}
    <div class="value" style:justify-content={cellOptions.align ?? "center"}>
      {#if value}
        <i class="ri-check-line valueicon"></i>
      {:else if cellOptions.showFalse}
        <i class="ri-close-line valueicon"></i>
      {/if}
    </div>
  {/if}
</div>

<style>
  .switch-wrapper {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .checkbox-wrapper {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .switch-label {
    margin-left: 0.25rem;
  }

  .checkbox-label {
    margin-left: 0.25rem;
  }
</style>
