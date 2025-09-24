<script>
  import { createEventDispatcher, getContext, onMount } from "svelte";
  import SuperPopover from "../SuperPopover/SuperPopover.svelte";
  import { DatePicker } from "date-picker-svelte";
  const dispatch = new createEventDispatcher();
  const { processStringSync } = getContext("sdk");
  import fsm from "svelte-fsm";

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
        const isInPicker = picker?.contains(e.relatedTarget);
        const isInTimePicker = timePicker?.contains(e.relatedTarget);

        if (!isInPicker && !isInTimePicker) {
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
  let timePicker;
  let open;

  // Current date format and showTime - extracted to ensure reactivity
  $: currentDateFormat = cellOptions?.dateFormat;
  $: currentShowTime = cellOptions?.showTime;

  // Time value (format: HH:mm)
  $: timeValue = currentShowTime && value ? getTimeFromValue() : "00:00";
  $: innerDate = value ? new Date(value) : new Date();

  // Extract time from current value if it exists
  function getTimeFromValue() {
    if (!value) return "00:00";
    const date = new Date(value);
    return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  }

  // Date formatting helper function
  function formatDate(date, dateFormat) {
    if (!date) return "";

    if (!dateFormat || dateFormat === "default") {
      return date?.toDateString();
    }

    // Manual formatting for specific formats to ensure exact order
    if (dateFormat === "MM/DD/YYYY") {
      return `${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}/${date.getFullYear()}`;
    }

    if (dateFormat === "DD/MM/YYYY") {
      return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`;
    }

    if (dateFormat === "YYYY-MM-DD") {
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
    }

    // For shorter formats, still use locale-specific formatting
    const options = {
      "MMM DD, YYYY": {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      },
      "DD MMM YYYY": {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      },
    };

    const formatOption = options[dateFormat];
    if (formatOption) {
      return date.toLocaleDateString("en-US", formatOption);
    }

    // Fallback to default
    return date?.toDateString();
  }

  // DateTime formatting helper function
  function formatDateTime(date, dateFormat, showTime) {
    if (!date) return "";

    if (!showTime) {
      return formatDate(date, dateFormat);
    }

    const formattedDate = formatDate(date, dateFormat);
    const timeString = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;

    return `${formattedDate} ${timeString}`;
  }

  $: formattedValue =
    cellOptions.template && value
      ? processStringSync(cellOptions.template, { value })
      : value
        ? formatDate(innerDate, currentDateFormat)
        : "";

  $: placeholder = cellOptions?.placeholder ?? "Select Date";
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

  // Handle time picker changes
  const handleTimeChange = (e) => {
    if (!value || !currentShowTime) return;

    const newTime = e.target.value;
    const currentDate = new Date(value);
    const [hours, minutes] = newTime.split(":").map(Number);

    // Update the date with the new time
    currentDate.setHours(hours, minutes, 0, 0);
    value = currentDate.toISOString();

    // Keep the popover open for time changes
    dispatch("change", value);
  };
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
      class:placeholder={!formattedValue}
      on:click={() => (open = !open)}
    >
      {formattedValue || placeholder}
      <i
        class="ri-calendar-line"
        style="font-size: 16px; justify-self: flex-end"
      ></i>
    </div>
  {:else}
    <div
      class="value"
      class:with-icon={cellOptions.icon}
      class:placeholder={!formattedValue}
      style:justify-content={cellOptions.align}
    >
      <span>
        {formattedValue || placeholder}
      </span>
    </div>
  {/if}
</div>

{#if inEdit}
  <SuperPopover {anchor} dismissible={false} {open} align="right">
    <div
      bind:this={picker}
      class="datetime-picker-container"
      style:--date-picker-background="var(--spectrum-global-color-gray-75)"
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

      {#if currentShowTime}
        <div class="time-section">
          <!-- svelte-ignore a11y-label-has-associated-control -->
          <input
            bind:this={timePicker}
            type="time"
            bind:value={timeValue}
            on:change={handleTimeChange}
            class="time-input"
            step="900"
          />
        </div>
      {/if}
    </div>
  </SuperPopover>
{/if}

<style>
  .datetime-picker-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0.5rem;
    border-radius: 8px;
    z-index: 1000;
  }
  .time-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .time-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--spectrum-global-color-gray-700);
  }

  .time-input {
    padding: 6px 8px;
    border: 1px solid var(--spectrum-global-color-gray-300);
    border-radius: 4px;
    font-size: 14px;
    min-width: 120px;
    background: var(--spectrum-global-color-gray-50);
    color: var(--spectrum-global-color-gray-800);
  }

  .time-input:focus {
    outline: none;
    border-color: var(--spectrum-global-color-blue-500);
    box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.2);
  }
</style>
