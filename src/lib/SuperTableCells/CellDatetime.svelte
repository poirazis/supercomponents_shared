<script>
  import { createEventDispatcher, getContext, onMount } from "svelte";
  import SuperPopover from "../SuperPopover/SuperPopover.svelte";
  import { DatePicker } from "date-picker-svelte";
  const dispatch = new createEventDispatcher();
  const { processStringSync } = getContext("sdk");
  import fsm from "svelte-fsm";

  const context = getContext("context");

  export let value;
  export let formattedValue;
  export let cellOptions;
  export let autofocus;

  let originalValue;

  export let cellState = fsm("View", {
    "*": {
      goTo(state) {
        return state;
      },
    },
    View: {
      focus() {
        if (!cellOptions.readonly) return "Editing";
      },
    },
    Hovered: {
      cancel: () => {
        return "View";
      },
    },
    Focused: {
      unfocus() {
        return "View";
      },
    },
    Error: { check: "View" },
    Editing: {
      _enter() {
        originalValue = value;
        open = true;
        dispatch("enteredit");
      },
      _exit() {
        dispatch("exitedit");
      },
      handleKeyboard(e) {
        if (e.keyCode == 32) {
          e.stopPropagation();
          e.preventDefault();
          open = !open;
        }
      },
      focusout(e) {
        if (!picker?.contains(e.relatedTarget)) {
          open = false;
          if (value != originalValue) {
            dispatch("change", value);
          }
          return "View";
        }
      },
      cancel() {
        value = Array.isArray(originalValue)
          ? [...originalValue]
          : originalValue;
        return "View";
      },
    },
  });

  let anchor;
  let picker;
  let open;

  $: innerDate = value ? new Date(value) : new Date();

  $: formattedValue =
    cellOptions.template && value
      ? processStringSync(cellOptions.template, { value })
      : undefined;

  $: placeholder =
    cellOptions.readonly || cellOptions.disabled
      ? ""
      : cellOptions.placeholder || "";

  $: inEdit = $cellState == "Editing";
  $: inline = cellOptions.role == "inlineInpur";
  $: isDirty = inEdit && originalValue != value;

  onMount(() => {
    if (autofocus)
      setTimeout(() => {
        cellState.focus();
        editor?.focus();
      }, 30);
  });
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  bind:this={anchor}
  class="superCell"
  tabindex={cellOptions.readonly || cellOptions.disabled ? "-1" : "0"}
  class:inEdit
  class:isDirty={isDirty && cellOptions.showDirty}
  class:inline
  class:tableCell={cellOptions.role == "tableCell"}
  class:formInput={cellOptions.role == "formInput"}
  class:disabled={cellOptions.disabled}
  class:readonly={cellOptions.readonly}
  class:error={cellOptions.error}
  style:color={cellOptions.color}
  style:background={cellOptions.background}
  style:font-weight={cellOptions.fontWeight}
  on:focus={cellState.focus}
  on:keypress={cellState.handleKeyboard}
  on:focusout={cellState.focusout}
>
  {#if cellOptions.icon}
    <i class={cellOptions.icon + " icon"}></i>
  {/if}

  {#if inEdit}
    <div
      class="editor"
      class:with-icon={cellOptions.icon}
      class:placeholder={!value && !formattedValue}
      {value}
      placeholder={cellOptions?.placeholder ?? ""}
      on:click={() => (open = !open)}
    >
      {formattedValue || innerDate?.toDateString() || cellOptions?.placeholder}
      <i
        class="ri-calendar-line"
        style="font-size: 16px; justify-self: flex-end"
      ></i>
    </div>
  {:else}
    <div
      class="value"
      class:with-icon={cellOptions.icon}
      class:placeholder={!value}
      style:justify-content={cellOptions.align}
    >
      <span>
        {formattedValue
          ? formattedValue
          : value
            ? innerDate?.toDateString()
            : placeholder}
      </span>
    </div>
  {/if}
</div>

{#if inEdit}
  <SuperPopover {anchor} dismissible={false} {open} align="right">
    <div
      bind:this={picker}
      style:--date-picker-background="var(--spectrum-alias-background-color-default)"
      style:--date-picker-foreground="var(--spectrum-global-color-gray-800)"
      style:--date-picker-selected-background="var(--accent-color)"
    >
      <DatePicker
        bind:value={innerDate}
        on:select={(e) => {
          value = e.detail;
          anchor?.focus();
          open = false;
        }}
      />
    </div>
  </SuperPopover>
{/if}
