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
    Editing: {
      _enter() {
        originalValue = value ? { ...value } : null;
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
        const isInFromTime = fromTimePicker?.contains
          ? fromTimePicker?.contains(e.relatedTarget)
          : false;
        const isInToTime = toTimePicker?.contains
          ? toTimePicker?.contains(e.relatedTarget)
          : false;

        if (!isInPicker && !isInFromTime && !isInToTime) {
          open = false;
          if (JSON.stringify(value) != JSON.stringify(originalValue)) {
            dispatch("change", value);
          }
          return "View";
        }
      },
      cancel() {
        value = originalValue ? { ...originalValue } : null;
        return "View";
      },
    },
  });

  let anchor;
  let picker;
  let popup;
  let open = false;
  let fromPicker;
  let toPicker;
  let fromTimePicker;
  let toTimePicker;

  // Current date format and showTime - extracted to ensure reactivity
  $: currentDateFormat = cellOptions?.dateFormat;
  $: currentShowTime = cellOptions?.showTime;

  // Time values (format: HH:mm)
  $: fromTime = currentShowTime && value?.fromTime ? value.fromTime : "00:00";
  $: toTime = currentShowTime && value?.toTime ? value.toTime : "00:00";

  $: fromDate = value?.from ? new Date(value.from) : new Date();
  $: toDate = value?.to ? new Date(value.to) : new Date();

  // Combine date and time for validation
  $: fromDateTime =
    currentShowTime && value?.from
      ? new Date(`${fromDate.toISOString().split("T")[0]}T${fromTime}`)
      : fromDate;
  $: toDateTime =
    currentShowTime && value?.to
      ? new Date(`${toDate.toISOString().split("T")[0]}T${toTime}`)
      : toDate;

  // DateTime formatting helper function
  function formatDateRangeWithTime(
    fromDate,
    toDate,
    dateFormat,
    fromTime,
    toTime,
    showTime,
  ) {
    if (!showTime) {
      return {
        from: formatDateRange(fromDate, fromDate, dateFormat).from,
        to: formatDateRange(toDate, toDate, dateFormat).to,
      };
    }

    const fromFormatted =
      formatDateRange(fromDate, fromDate, dateFormat).from + " " + fromTime;
    const toFormatted =
      formatDateRange(toDate, toDate, dateFormat).to + " " + toTime;

    return { from: fromFormatted, to: toFormatted };
  }

  // Date formatting helper function
  function formatDateRange(fromDate, toDate, dateFormat) {
    if (!dateFormat || dateFormat === "default") {
      return {
        from: fromDate.toDateString(),
        to: toDate.toDateString(),
      };
    }

    // Manual formatting for specific formats to ensure exact order
    if (dateFormat === "MM/DD/YYYY") {
      const fromFormatted = `${(fromDate.getMonth() + 1).toString().padStart(2, "0")}/${fromDate.getDate().toString().padStart(2, "0")}/${fromDate.getFullYear()}`;
      const toFormatted = `${(toDate.getMonth() + 1).toString().padStart(2, "0")}/${toDate.getDate().toString().padStart(2, "0")}/${toDate.getFullYear()}`;
      return { from: fromFormatted, to: toFormatted };
    }

    if (dateFormat === "DD/MM/YYYY") {
      const fromFormatted = `${fromDate.getDate().toString().padStart(2, "0")}/${(fromDate.getMonth() + 1).toString().padStart(2, "0")}/${fromDate.getFullYear()}`;
      const toFormatted = `${toDate.getDate().toString().padStart(2, "0")}/${(toDate.getMonth() + 1).toString().padStart(2, "0")}/${toDate.getFullYear()}`;
      return { from: fromFormatted, to: toFormatted };
    }

    if (dateFormat === "YYYY-MM-DD") {
      const fromFormatted = `${fromDate.getFullYear()}-${(fromDate.getMonth() + 1).toString().padStart(2, "0")}-${fromDate.getDate().toString().padStart(2, "0")}`;
      const toFormatted = `${toDate.getFullYear()}-${(toDate.getMonth() + 1).toString().padStart(2, "0")}-${toDate.getDate().toString().padStart(2, "0")}`;
      return { from: fromFormatted, to: toFormatted };
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

    const format = options[dateFormat];

    if (format) {
      const fromFormatted = fromDate.toLocaleDateString("en-US", format);
      const toFormatted = toDate.toLocaleDateString("en-US", format);
      return {
        from: fromFormatted,
        to: toFormatted,
      };
    }

    // Fallback to default
    return {
      from: fromDate.toDateString(),
      to: toDate.toDateString(),
    };
  }

  // Ensure range is valid (from date shouldn't be after to date)
  $: isValidRange = (() => {
    if (!value?.from || !value?.to) return true;
    if (currentShowTime) {
      return fromDateTime <= toDateTime;
    }
    return fromDate <= toDate;
  })();

  $: formattedValue =
    cellOptions.template && value
      ? processStringSync(cellOptions.template, { value })
      : undefined;

  $: rangeDisplay = (() => {
    if (formattedValue) return formattedValue;
    if (!value?.from && !value?.to) return placeholder;

    const dateFormat = currentDateFormat; // Use the extracted reactive format
    let fromFormatted = placeholder;
    let toFormatted = placeholder;

    if (value?.from) {
      if (dateFormat === "default" || !dateFormat) {
        fromFormatted = currentShowTime
          ? fromDate.toDateString() + " " + fromTime
          : fromDate.toDateString();
      } else {
        if (currentShowTime) {
          const formatted = formatDateRangeWithTime(
            fromDate,
            fromDate,
            dateFormat,
            fromTime,
            fromTime,
            true,
          );
          fromFormatted = formatted.from;
        } else {
          const formatted = formatDateRange(fromDate, fromDate, dateFormat);
          fromFormatted = formatted.from;
        }
      }
    }

    if (value?.to) {
      if (dateFormat === "default" || !dateFormat) {
        toFormatted = currentShowTime
          ? toDate.toDateString() + " " + toTime
          : toDate.toDateString();
      } else {
        if (currentShowTime) {
          const formatted = formatDateRangeWithTime(
            toDate,
            toDate,
            dateFormat,
            toTime,
            toTime,
            true,
          );
          toFormatted = formatted.to;
        } else {
          const formatted = formatDateRange(toDate, toDate, dateFormat);
          toFormatted = formatted.to;
        }
      }
    }

    if (value?.from && value?.to) {
      return `${fromFormatted} - ${toFormatted}`;
    } else if (value?.from) {
      return `${fromFormatted} - [Select end date]`;
    } else if (value?.to) {
      return `[Select start date] - ${toFormatted}`;
    }

    return placeholder;
  })();

  $: placeholder =
    cellOptions.readonly || cellOptions.disabled
      ? ""
      : cellOptions.placeholder || "Select date range";

  $: inEdit = $cellState == "Editing";
  $: inline = cellOptions.role == "inlineInput";
  $: isDirty = inEdit && JSON.stringify(value) != JSON.stringify(originalValue);

  onMount(() => {
    if (autofocus)
      setTimeout(() => {
        cellState.focus();
      }, 30);
  });

  const handleFromDateChange = (e) => {
    const newFromDate = e.detail;
    value = {
      ...value,
      from: newFromDate,
    };

    // If to date exists and is before from date, clear it
    if (value.to && new Date(value.to) < newFromDate) {
      value = {
        ...value,
        to: null,
      };
    }

    dispatch("change", value);
  };

  const handleToDateChange = (e) => {
    const newToDate = e.detail;
    value = {
      ...value,
      to: newToDate,
    };

    dispatch("change", value);
  };

  const handleFromTimeChange = (e) => {
    const newFromTime = e.target.value;
    value = {
      ...value,
      fromTime: newFromTime,
    };

    dispatch("change", value);
  };

  const handleToTimeChange = (e) => {
    const newToTime = e.target.value;
    value = {
      ...value,
      toTime: newToTime,
    };

    dispatch("change", value);
  };

  const clearRange = () => {
    value = null;
    dispatch("change", null);
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
      class:placeholder={!value}
      on:click={() => (open = !open)}
    >
      <span>{rangeDisplay}</span>
      <i
        class="ri-calendar-line"
        style="font-size: 16px; justify-self: flex-end"
      ></i>

      {#if value && cellOptions.showDirty != false}
        <button
          class="clear-button ri-close-line"
          style="font-size: 14px; color: var(--spectrum-global-color-gray-500);"
          on:click|stopPropagation={clearRange}
          aria-label="Clear date range"
        ></button>
      {/if}
    </div>
  {:else}
    <div
      class="value"
      class:with-icon={cellOptions.icon}
      class:placeholder={!value}
      style:justify-content={cellOptions.align}
    >
      <span>
        {#if rangeDisplay}
          {rangeDisplay}
        {:else}
          {placeholder}
        {/if}
      </span>
    </div>
  {/if}
</div>

{#if inEdit}
  <SuperPopover {anchor} dismissible={false} {open} align="right">
    <div
      bind:this={picker}
      class="range-picker-container"
      style:--date-picker-background="var(--spectrum-global-color-gray-75)"
      style:--date-picker-foreground="var(--spectrum-global-color-gray-800)"
      style:--date-picker-selected-background="var(--accent-color)"
    >
      <div class="datepickers-container">
        <div class="range-section">
          <!-- svelte-ignore a11y-label-has-associated-control -->
          <label class="range-label">From:</label>
          <div bind:this={fromPicker}>
            <DatePicker value={fromDate} on:select={handleFromDateChange} />
          </div>

          {#if currentShowTime}
            <div class="time-section">
              <!-- svelte-ignore a11y-label-has-associated-control -->
              <input
                bind:this={fromTimePicker}
                type="time"
                bind:value={fromTime}
                on:change={handleFromTimeChange}
                class="time-input"
                step="900"
              />
            </div>
          {/if}
        </div>

        <div class="range-section">
          <!-- svelte-ignore a11y-label-has-associated-control -->
          <label class="range-label">To:</label>
          <div bind:this={toPicker}>
            <DatePicker
              value={toDate}
              on:select={handleToDateChange}
              min={fromDate}
            />
          </div>

          {#if currentShowTime}
            <div class="time-section">
              <!-- svelte-ignore a11y-label-has-associated-control -->
              <input
                bind:this={toTimePicker}
                type="time"
                bind:value={toTime}
                on:change={handleToTimeChange}
                class="time-input"
                step="900"
              />
            </div>
          {/if}
        </div>
      </div>

      {#if !isValidRange}
        <div class="range-error">
          <i
            class="ri-error-warning-line"
            style="color: var(--spectrum-global-color-red-500);"
          ></i>
          <span
            style="color: var(--spectrum-global-color-red-500); font-size: 12px;"
          >
            End date cannot be before start date
          </span>
        </div>
      {/if}
    </div>
  </SuperPopover>
{/if}

<style>
  .range-picker-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0.5rem;
    min-width: 300px;
  }

  .datepickers-container {
    display: flex;
    flex-direction: row;
    gap: 1rem;
  }

  .range-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .range-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--spectrum-global-color-gray-800);
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

  .range-error {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px;
    background: var(--spectrum-global-color-red-200);
    border-radius: 4px;
  }

  .clear-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 2px;
    transition: all 0.2s ease;
    margin-left: 8px;
  }

  .clear-button:hover {
    background-color: var(--spectrum-global-color-gray-200);
  }

  .editor {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    padding: 8px 4px;
  }
</style>
