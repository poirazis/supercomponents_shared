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
      reset() {
        localValue = value;
        lastEdit = undefined;
        return "View";
      },
    },
    View: {
      _enter() {
        localValue = value;
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
        if ((e.key.length === 1 && e.key !== "." && isNaN(Number(e.key)) && !e.ctrlKey) ||
            e.keyCode == 32 ||
            (e.key === "." && e.target.value.toString().indexOf(".") > -1)) {
          e.preventDefault();
          return;
        }
        localValue = Number(e.target.value);
        lastEdit = new Date();
        if (cellOptions?.debounce) {
          clearTimeout(timer);
          timer = setTimeout(() => {
            dispatch("change", localValue);
          }, cellOptions.debounce ?? 0);
        }
      },
      handleKeyboard(e: KeyboardEvent) {
        if (e.key == "Enter") this.submit();
        if (e.key == "Escape") this.cancel();
      },
    },
  });

  $: inEdit = $cellState == "Editing";
  $: inline = cellOptions.role == "inlineInput";
  $: isDirty = inEdit && originalValue != localValue;
  $: formattedValue = cellOptions.template
    ? processStringSync(cellOptions.template, {
        ...$context,
        value: localValue,
      })
    : undefined;

  $: placeholder =
    cellOptions.readonly || cellOptions.disabled
      ? ""
      : cellOptions.placeholder || "";

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
  class:isDirty
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
      class:placeholder={!localValue}
      type="text"
      style:padding-right={"32px"}
      style:text-align={cellOptions.align == "flex-start"
        ? "left"
        : cellOptions.align == "center"
          ? "center"
          : "right "}
      placeholder={cellOptions?.placeholder}
      bind:value={localValue}
      on:keydown={(e) => cellState.debounce(e)}
      on:focusout={(e) => cellState.focusout(e)}
      on:keyup={(e) => cellState.handleKeyboard(e)}
      use:focus
    />
    <i class="ri-close-line clearIcon" on:mousedown|self={cellState.clear}> </i>
  {:else}
    <div
      class="value"
      style:padding-right={"12px"}
      class:placeholder={!value && !formattedValue}
      style:justify-content={cellOptions.align}
    >
      {formattedValue || value || placeholder}
    </div>
  {/if}
</div>

<style>
  .value {
    flex: auto;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    box-sizing: border-box;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }
</style>
