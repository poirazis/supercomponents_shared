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
  let anchor;
  let picker;
  let timePicker;
  let open;
  let selection = false;

  export let cellState = fsm("View", {
    "*": {
      goTo(state) {
        return state;
      },
    },
    View: {
      _enter() {
        open = false;
        selection = false;
      },
      focus() {
        if (!cellOptions.readonly) return "Editing";
      },
    },
    Editing: {
      _enter() {
        originalValue = value;
        open = true;
        dispatch("enteredit");
      },
      _exit() {
        dispatch("exitedit");
      },
      toggle(e) {
        open = !open;
      },
      handleKeyboard(e) {
        if (e.keyCode == 32) {
          e.stopPropagation();
          e.preventDefault();
          open = !open;
        }

        if (e.code == "Delete" || e.code == "Backspace") {
          e.stopPropagation();
          e.preventDefault();
          value = null;
          dispatch("change", value);
        }
      },
      focusout(e) {
        const isInPicker = picker?.contains(e.relatedTarget);
        const isInTimePicker = timePicker?.contains(e.relatedTarget);

        if (isInPicker || isInTimePicker) return;

        if (!isInPicker && !isInTimePicker) {
          open = false;
          let outputValue = innerDate.toISOString();
          if (!currentShowTime) {
            outputValue = innerDate.toLocaleDateString("en-CA"); // YYYY-MM-DD format without time
          }

          if (ignoreTimeZone) {
            outputValue = innerDate.toISOString().slice(0, -1);
          }

          if (selection) dispatch("change", outputValue);
          return "View";
        }
      },
      submit() {
        dispatch("change", innerDate.toISOString());
        return "View";
      },
      cancel() {
        value = originalValue;
        return "View";
      },
    },
  });

  // Current date format and showTime - extracted to ensure reactivity
  $: currentDateFormat = cellOptions?.dateFormat;
  $: currentShowTime = cellOptions?.showTime;
  $: ignoreTimeZone = cellOptions?.ignoreTimezone;
  $: show24HTime = cellOptions?.show24HTime;
  $: innerDate = parseValueToDate(value);
  $: timeValue = innerDate.toLocaleTimeString("en-US", {
    hour12: !show24HTime,
    hour: "2-digit",
    minute: "2-digit",
  });

  // Helper function to create a Date object that properly handles UTC when ignoreTimezone is true
  function parseValueToDate(valueStr) {
    if (!valueStr) return new Date();
    if (valueStr instanceof Date) {
      valueStr = valueStr;
    }

    return new Date(valueStr);
  }

  // Parse 12-hour time format to 24-hour format
  function parse12HourTime(timeStr) {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return null;
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const ampm = match[3].toUpperCase();

    if (ampm === "PM" && hours !== 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  }

  // Format date/datetime helper function
  // Only applies formatting - timezone handling is done in parseValueToDate
  // If showTime is false (default), returns formatted date only
  // If showTime is true, returns formatted date + time
  function formatDateTime(date, dateFormat, showTime = false) {
    if (!date) return "";

    // Format the date part
    let dateResult = "";

    if (!dateFormat || dateFormat === "default") {
      dateResult = date?.toDateString();
    } else {
      // Use local methods to format - timezone is already handled by parseValueToDate
      const month = date.getMonth();
      const dayOfMonth = date.getDate();
      const year = date.getFullYear();

      // Manual formatting for specific formats to ensure exact order
      if (dateFormat === "MM/DD/YYYY") {
        dateResult = `${(month + 1).toString().padStart(2, "0")}/${dayOfMonth.toString().padStart(2, "0")}/${year}`;
      } else if (dateFormat === "DD/MM/YYYY") {
        dateResult = `${dayOfMonth.toString().padStart(2, "0")}/${(month + 1).toString().padStart(2, "0")}/${year}`;
      } else if (dateFormat === "YYYY-MM-DD") {
        dateResult = `${year}-${(month + 1).toString().padStart(2, "0")}-${dayOfMonth.toString().padStart(2, "0")}`;
      } else {
        // For shorter formats, use locale-specific formatting
        const options = {
          "MMM DD, YYYY": {
            month: "short",
            day: "numeric",
            year: "numeric",
          },
          "DD MMM YYYY": {
            day: "numeric",
            month: "short",
            year: "numeric",
          },
        };

        const formatOption = options[dateFormat];
        if (formatOption) {
          dateResult = date.toLocaleDateString("en-US", formatOption);
        } else {
          // Fallback to default
          dateResult = date?.toDateString();
        }
      }
    }

    // If not showing time, return just the formatted date
    if (!showTime) {
      return dateResult;
    }

    // Format the time part when showTime is true (using local time)
    let hours = date.getHours();
    let minutes = date.getMinutes();

    // Format based on show24HTime
    let timeString;
    if (show24HTime) {
      timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    } else {
      const ampm = hours >= 12 ? "PM" : "AM";
      const display12h = hours % 12 || 12;
      timeString = `${display12h.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ${ampm}`;
    }

    return `${dateResult} ${timeString}`;
  }

  $: formattedValue =
    cellOptions.template && value && value != "" && value != null
      ? processStringSync(cellOptions.template, {
          value: innerDate,
        })
      : (value && value != "" && value != null) || selection
        ? formatDateTime(innerDate, currentDateFormat, currentShowTime)
        : "";

  $: placeholder = cellOptions?.placeholder || "";
  $: inEdit = $cellState == "Editing";
  $: inline = cellOptions.role == "inlineInpur";
  $: isDirty = inEdit && true;

  onMount(() => {
    if (autofocus)
      setTimeout(() => {
        cellState.focus();
        editor?.focus();
      }, 30);
  });

  // Handle Start button - set time to beginning of day (00:00 or 12:00 AM)
  const handleStartTime = () => {
    const startTime = show24HTime ? "00:00" : "12:00 AM";
    timeValue = startTime;

    innerDate.setHours(0, 0, 0, 0);
    innerDate = innerDate;
    selection = true;
    anchor?.focus();
  };

  // Handle End button - set time to end of day (23:59 or 11:59 PM)
  const handleEndTime = () => {
    const endTime = show24HTime ? "23:59" : "11:59 PM";
    timeValue = endTime;

    innerDate.setHours(23, 59, 0, 0);
    innerDate = innerDate;
    selection = true;
    anchor?.focus();
  };

  // Handle Now button - set both date and time to current date/time
  const handleNowTime = () => {
    innerDate = new Date();
    selection = true;
    anchor?.focus();
  };

  // Handle Clear button - clear the value
  const handleClearValue = () => {
    cellState.submit();
  };

  // Handle time picker changes - only affects the time, not timezone
  const handleTimeChange = (e) => {
    if (!currentShowTime) return;
    selection = true;

    const newTime = e.target.value;
    // Convert 12-hour format to 24-hour if needed
    const time24h = show24HTime ? newTime : parse12HourTime(newTime);
    if (!time24h) return;

    const [hours, minutes] = time24h.split(":").map(Number);

    innerDate.setHours(hours, minutes, 0, 0);
  };

  const handleDateChange = (e) => {
    const newDate = e.detail;
    selection = true;

    if (currentShowTime) {
      // Preserve the time from the current innerDate when appending to the selected date
      newDate.setHours(
        innerDate.getHours(),
        innerDate.getMinutes(),
        innerDate.getSeconds(),
        innerDate.getMilliseconds(),
      );
    }

    innerDate = newDate;
    anchor?.focus();
    open = false;
  };
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  bind:this={anchor}
  class="superCell has-popup"
  tabindex={cellOptions.readonly || cellOptions.disabled ? "-1" : "0"}
  class:inEdit
  class:isDirty={isDirty && cellOptions.showDirty}
  class:inline
  class:tableCell={cellOptions.role == "tableCell"}
  class:formInput={cellOptions.role == "formInput"}
  class:disabled={cellOptions.disabled}
  class:readonly={cellOptions.readonly}
  class:error={cellOptions.error}
  class:open-popup={open}
  style:color={cellOptions.color}
  style:background={cellOptions.background}
  on:focus={cellState.focus}
  on:keydown={cellState.handleKeyboard}
  on:focusout={cellState.focusout}
  on:mousedown={cellState.toggle}
>
  {#key $cellState}
    {#if cellOptions.icon}
      <i class={cellOptions.icon + " field-icon"}></i>
    {/if}

    {#if inEdit}
      <div class="editor" class:placeholder={!formattedValue}>
        <span>{formattedValue || placeholder}</span>
        <i
          class="ri-calendar-line"
          style="font-size: 16px; justify-self: flex-end"
        ></i>
      </div>
    {:else}
      <div
        class="value"
        class:placeholder={!formattedValue}
        style:justify-content={cellOptions.align}
      >
        <span>
          {value ? formattedValue : placeholder}
        </span>
      </div>
    {/if}
  {/key}
</div>

{#if inEdit}
  <SuperPopover
    {anchor}
    {open}
    ignoreAnchor
    align="right"
    maxHeight={400}
    on:close={cellState.focusout}
  >
    <div
      bind:this={picker}
      class="datetime-picker-container"
      style:--date-picker-background="var(--spectrum-global-color-gray-75)"
      style:--date-picker-foreground="var(--spectrum-global-color-gray-800)"
      style:--date-picker-selected-background="var(--accent-color)"
    >
      <DatePicker value={innerDate} on:select={handleDateChange} />

      {#if currentShowTime}
        <div class="time-section">
          <!-- svelte-ignore a11y-label-has-associated-control -->
          <input
            bind:this={timePicker}
            type="text"
            placeholder={show24HTime ? "HH:MM" : "HH:MM AM/PM"}
            bind:value={timeValue}
            on:change={handleTimeChange}
            on:focusout={cellState.focusout}
            class="time-input"
          />
          <div class="time-buttons">
            <button class="time-button start-button" on:click={handleStartTime}
              >Start</button
            >
            <button class="time-button end-button" on:click={handleEndTime}
              >End</button
            >
            <button class="time-button now-button" on:click={handleNowTime}
              >Now</button
            >
            <button class="time-button clear-button" on:click={handleClearValue}
              >Select</button
            >
          </div>
        </div>
      {/if}
    </div>
  </SuperPopover>
{/if}

<style>
  .datetime-picker-container {
    display: contents;
    flex-direction: column;
    gap: 8px;
    padding: 0.5rem;
    border-radius: 8px;
    min-height: fit-content;
    z-index: 1000;
  }
  .time-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .time-buttons {
    display: flex;
    gap: 6px;
  }

  .time-button {
    flex: 1;
    padding: 6px 12px;
    border: 1px solid var(--spectrum-global-color-gray-300);
    border-radius: 4px;
    background: var(--spectrum-global-color-gray-50);
    color: var(--spectrum-global-color-gray-800);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .time-button:hover {
    background: var(--spectrum-global-color-gray-100);
    border-color: var(--spectrum-global-color-gray-400);
  }

  .time-button:active {
    background: var(--spectrum-global-color-gray-200);
    border-color: var(--spectrum-global-color-gray-500);
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
