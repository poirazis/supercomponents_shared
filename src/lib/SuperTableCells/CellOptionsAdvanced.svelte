<script>
  import fsm from "svelte-fsm";
  import { getContext, createEventDispatcher, onMount } from "svelte";
  import SuperPopover from "../SuperPopover/SuperPopover.svelte";
  import SuperList from "../SuperList/SuperList.svelte";
  import CellSkeleton from "./CellSkeleton.svelte";
  import "./CellCommon.css";
  const dispatch = createEventDispatcher();
  const { API, QueryUtils, fetchData, memo, derivedMemo } = getContext("sdk");

  export let cellOptions;
  export let value;
  export let fieldSchema;
  export let multi = true;
  export let autofocus;
  export let label;

  let anchor;
  let editor;
  let options = memo([]);
  let labels = {};
  let optionColors = {};
  let optionIcons = {};
  let filteredOptions = [];
  let focusedOptionIdx = -1;
  let timer;
  let picker;
  let inactive = true;
  let allSelected = false;

  const colors = derivedMemo(options, ($options) => {
    let obj = {};
    if (cellOptions.optionsSource == "custom") return obj;
    $options.forEach(
      (option, index) =>
        (obj[option] = optionColors[option] ?? colorsArray[index % 14])
    );
    return obj;
  });

  const colorsArray = [
    "hsla(0, 90%, 75%, 0.35)",
    "hsla(25, 90%, 75%, 0.35)",
    "hsla(50, 80%, 75%, 0.35)",
    "hsla(75, 80%, 75%, 0.35)",
    "hsla(100, 80%, 75%, 0.35)",
    "hsla(125, 90%, 75%, 0.35)",
    "hsla(150, 90%, 75%, 0.35)",
    "hsla(175, 90%, 75%, 0.35)",
    "hsla(200, 90%, 75%, 0.35)",
    "hsla(225, 90%, 75%, 0.35)",
    "hsla(250, 90%, 75%, 0.35)",
    "hsla(275, 90%, 75%, 0.35)",
    "hsla(300, 90%, 75%, 0.35)",
    "hsla(325, 90%, 75%, 0.35)",
    "hsla(350, 90%, 75%, 0.35)",
  ];

  let originalValue = JSON.stringify(
    Array.isArray(value) ? value : value ? [value] : []
  );

  $: ({
    controlType,
    optionsSource,
    labelColumn,
    valueColumn,
    iconColumn,
    colorColumn,
    customOptions,
    role,
    readonly,
    disabled,
    error,
    color,
    background,
  } = cellOptions);

  // Handle Options from Data Source
  const dataSourceStore = memo(cellOptions?.datasource ?? {});
  $: dataSourceStore.set(cellOptions.datasource);
  $: fetch =
    optionsSource == "data"
      ? createFetch($dataSourceStore)
      : memo({ loaded: true });
  $: fullSelection =
    filteredOptions.length == localValue.length && filteredOptions.length > 0;

  // React to property changes
  $: cellState.refresh(
    fieldSchema,
    optionsSource,
    labelColumn,
    valueColumn,
    iconColumn,
    colorColumn,
    $dataSourceStore
  );

  $: cellState.syncFetch($fetch);

  // We always keep an internal value as an array
  $: localValue = Array.isArray(value) ? value : value ? [value] : [];
  $: isDirty = inEdit && originalValue !== JSON.stringify(localValue);
  $: inEdit = $cellState == "Editing";
  $: radios = controlType == "radio";
  $: isButtons = controlType == "buttons";
  $: allSelected = filteredOptions.length == localValue.length;

  export let cellState = fsm("Loading", {
    "*": {
      goTo(state) {
        return state;
      },
      refresh() {
        $options = [];
        return "Loading";
      },
      loadSchemaOptions() {
        optionColors = fieldSchema?.optionColors || {};
        $options = fieldSchema?.constraints?.inclusion || [];
      },
      loadDataOptions(rows) {
        if (rows && rows.length) {
          rows.forEach((row) => {
            $options.push(row[valueColumn]?.toString());
            labels[row[valueColumn]] =
              row[labelColumn || $fetch.definition.primaryDisplay];
            optionColors[row[valueColumn]] = row[colorColumn];
            optionIcons[row[valueColumn]] = row[iconColumn];
          });
        }
        $options = $options;
      },
      loadCustomOptions() {
        if (customOptions?.length) {
          customOptions.forEach((row) => {
            $options.push(row.value);
            labels[row.value] = row.label;
          });
        }
        $options = $options;
      },
      clearFilters() {
        filteredOptions = $options;
      },
    },
    Loading: {
      _enter() {
        if (cellOptions.optionsSource != "data" || $fetch?.loaded)
          this.goTo.debounce(10, cellOptions.initialState || "View");
      },
      _exit() {
        if (optionsSource == "custom") this.loadCustomOptions();
        else if (optionsSource == "data") this.loadDataOptions($fetch?.rows);
        else this.loadSchemaOptions();

        filteredOptions = $options;
      },
      syncFetch() {
        if ($fetch?.loaded) {
          return cellOptions.initialState || "View";
        }
      },
    },
    View: {
      _enter() {},
      focus(e) {
        if (!cellOptions.readonly && !cellOptions.disabled) {
          return "Editing";
        }
      },
    },
    Editing: {
      _enter() {
        originalValue = JSON.stringify(
          Array.isArray(value) ? value : value ? [value] : []
        );

        dispatch("enteredit");
      },
      _exit() {
        editorState.close();
        dispatch("exitedit");
      },
      handleKeyboard(e) {},
      focusout(e) {
        editorState.close();
        if (anchor?.contains(e.relatedTarget)) return;
        if (!inactive) return;

        this.submit();
        return "View";
      },
      submit() {
        if (isDirty && !cellOptions.debounce) {
          if (multi) dispatch("change", localValue);
          else dispatch("change", localValue[0]);
        }
      },
      cancel() {
        return "View";
      },
    },
  });

  let editorState = fsm("Closed", {
    "*": {
      toggleOption(idx) {
        let option = $options[idx];
        let pos = localValue.indexOf(option);

        if (multi && pos > -1) {
          localValue.splice(pos, 1);
          localValue = [...localValue];
        } else if (multi) {
          localValue = [...localValue, option];
        } else {
          if (localValue[0] == option) localValue.length = 0;
          else localValue[0] = option;
        }

        if (cellOptions.debounce || isButtons) {
          clearTimeout(timer);
          timer = setTimeout(() => {
            dispatch("change", multi ? localValue : localValue[0]);
          }, cellOptions.debounce ?? 0);
        }

        if (!multi || filteredOptions.length == localValue.length) {
          anchor?.focus();
        }
      },
      toggleAll() {
        if (allSelected) localValue = [];
        else localValue = [...filteredOptions];

        if (cellOptions.debounce) {
          clearTimeout(timer);
          timer = setTimeout(() => {
            dispatch("change", multi ? localValue : localValue[0]);
          }, cellOptions.debounce ?? 0);
        }
      },
      handleKeyboard(e) {
        if (e.keyCode == 32) {
          editorState.toggle();
        }

        if (e.key == "Escape") {
          this.cancel();
        }

        if (e.key == "Enter") {
          if (multi) {
            this.toggleOption(focusedOptionIdx, e.preventDefault());
            this.close();
          } else {
            this.toggleOption(focusedOptionIdx);
          }
        }

        if (e.key == "ArrowDown")
          this.highlightNext(e.preventDefault(), e.stopPropagation());
        if (e.key == "ArrowUp")
          this.highlightPrevious(e.preventDefault(), e.stopPropagation());
        if (e.key == "Escape") this.close(e.stopPropagation());
      },
      highlightNext() {
        focusedOptionIdx += 1;
        if (focusedOptionIdx > $options.length - 1) focusedOptionIdx = 0;
      },
      highlightPrevious() {
        focusedOptionIdx -= 1;
        if (focusedOptionIdx < 0) focusedOptionIdx = $options.length - 1;
      },
    },
    Open: {
      _enter() {
        focusedOptionIdx = -1;
        this.refocus.debounce(10);
      },
      _exit() {},
      filterOptions(e) {
        if (e && e.target.value != "") {
          filteredOptions = $options.filter((x) =>
            x?.startsWith(e.target.value)
          );
        } else filteredOptions = $options;
      },
      close() {
        return "Closed";
      },
      toggle() {
        return "Closed";
      },
    },
    Closed: {
      toggle() {
        return "Open";
      },
      open() {
        return "Open";
      },
      filterOptions(e) {
        this.open();
        this.filterOptions(e);
      },
      handleKeyboard(e) {
        if (!cellOptions.autocomplete && controlType == "select") {
          if (e.keyCode == 32) {
            e.preventDefault();
            e.stopPropagation();
            this.toggle();
          }

          if (e.key == "Backspace" || e.key == "Delete") {
            e.stopPropagation();
            localValue = [];
            dispatch("change", localValue);
          }
        } else if (controlType != "select") {
          if (e.keyCode == 32 || e.key == "Enter")
            this.toggleOption(focusedOptionIdx, e.preventDefault());
          if (e.key == "ArrowDown")
            this.highlightNext(e.preventDefault(), e.stopPropagation());
          if (e.key == "ArrowUp")
            this.highlightPrevious(e.preventDefault(), e.stopPropagation());
          if (e.key == "Escape") this.close(e.stopPropagation());
        }
      },
    },
  });

  const createFetch = (datasource) => {
    return fetchData({
      API,
      datasource,
      options: {
        query: QueryUtils.buildQuery(cellOptions.filter),
        sortColumn: cellOptions.sortColumn,
        sortOrder: cellOptions.sortOrder,
        limit: cellOptions.limit || 1000,
      },
    });
  };

  onMount(() => {
    if (autofocus)
      setTimeout(() => {
        cellState.focus();
        editor?.focus();
      }, 30);
  });
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div
  bind:this={anchor}
  class="superCell multirow"
  tabindex={cellOptions?.disabled ? -1 : 0}
  class:inEdit={inEdit && controlType != "buttons"}
  class:isDirty={isDirty && cellOptions.showDirty}
  class:disabled
  class:readonly
  class:error
  style:color
  style:background
  style:font-weight={cellOptions.fontWeight}
  class:inline={role == "inlineInput"}
  class:tableCell={role == "tableCell"}
  class:formInput={role == "formInput"}
  class:naked-field={controlType == "buttons"}
  on:focusin={cellState.focus}
  on:focusout={cellState.focusout}
  on:keydown={editorState.handleKeyboard}
>
  {#if $cellState == "Loading"}
    <CellSkeleton>Initializing ..</CellSkeleton>
  {:else if controlType == "list"}
    <SuperList
      items={localValue}
      itemsColors={$colors}
      itemsLabels={labels}
      showColors={cellOptions.optionsViewMode != "text"}
      reorderOnly={cellOptions.reorderOnly}
      placeholder={cellOptions.placeholder}
      readonly={cellOptions.readonly || cellOptions.disabled}
      {editorState}
      {cellState}
      {fullSelection}
      bind:inactive
      on:togglePicker={editorState.toggle}
      on:clear={() => {
        localValue = [];
        editorState.close();
        anchor.focus();
      }}
      on:change={(e) => {
        localValue = [...e.detail];
        anchor.focus();
      }}
    />
  {:else if controlType == "radio" || controlType == "buttons"}
    {#if isButtons}
      <div class="buttons">
        {#each $options as option, idx (idx)}
          <div
            class="button"
            class:selected={localValue?.includes(option)}
            style:--option-color={$colors[option]}
            on:click={() => editorState.toggleOption(idx)}
          >
            {labels[option] || option}
          </div>
        {/each}
      </div>
    {:else if radios}
      <div
        class="radios"
        class:column={cellOptions.direction == "column"}
        on:mouseleave={() => (focusedOptionIdx = -1)}
      >
        {#each $options as option, idx (idx)}
          <div
            class="radio"
            class:selected={localValue?.includes(option)}
            class:focused={focusedOptionIdx === idx}
            style:--option-color={$colors[option]}
            on:mousedown={(e) => editorState.toggleOption(idx)}
            on:mouseenter={() => (focusedOptionIdx = idx)}
          >
            <i
              style:color={$colors[option]}
              class={radios && localValue.includes(option)
                ? "ph-fill ph-radio-button"
                : radios
                  ? "ph ph-circle"
                  : localValue.includes(option)
                    ? "ph-fill ph-check-square"
                    : "ph ph-square"}
            />
            {labels[option] || option}
          </div>
        {/each}
      </div>
    {/if}
  {:else if controlType == "switch"}
    <div
      class="radios"
      class:formInput={role == "formInput"}
      class:inlineInput={role == "inlineInput"}
      class:column={cellOptions.direction == "column"}
      on:mouseleave={() => (focusedOptionIdx = -1)}
    >
      {#if label || cellOptions.toggleAll}
        <div
          class="switch toggleAll"
          on:click={cellOptions.toggleAll ? editorState.toggleAll : undefined}
          on:mouseenter
        >
          <div class="text title">{label ?? "Toggle All"}</div>
          {#if cellOptions.toggleAll && !(readonly || disabled)}
            <div class="spectrum-Switch spectrum-Switch--emphasized">
              <input
                checked={allSelected}
                type="checkbox"
                class="spectrum-Switch-input"
              />
              <span class="spectrum-Switch-switch" />
            </div>
          {/if}
        </div>
      {/if}
      {#each $options as option, idx (idx)}
        <div
          class="switch"
          class:selected={localValue.includes(option)}
          class:focused={focusedOptionIdx === idx}
          style:--option-color={$colors[option]}
          on:click={(e) => editorState.toggleOption(idx)}
          on:mouseenter={() => (focusedOptionIdx = idx)}
        >
          <i class={optionIcons[option] || "no-icon"} />
          <div class="text">{labels[option] || option}</div>
          <div class="spectrum-Switch spectrum-Switch--emphasized">
            <input
              checked={localValue.includes(option)}
              type="checkbox"
              class="spectrum-Switch-input"
              id={idx}
            />
            <span class="spectrum-Switch-switch small"> </span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- svelte-ignore a11y-no-static-element-interactions -->
{#if inEdit && controlType == "list"}
  <SuperPopover
    {anchor}
    useAnchorWidth
    maxHeight={400}
    open={$editorState == "Open"}
    on:close={cellState.focusout}
  >
    <div
      bind:this={picker}
      class="options"
      on:wheel={(e) => e.stopPropagation()}
      on:mouseleave={() => (focusedOptionIdx = -1)}
    >
      {#if filteredOptions?.length < 1 || filteredOptions.length == localValue.length}
        <div class="option">
          <span>
            <i class="ri-close-line" />
            No Options Found
          </span>
        </div>
      {:else}
        {#each filteredOptions as option, idx (idx)}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div
            class="option"
            class:focused={focusedOptionIdx === idx}
            class:selected={localValue?.includes(option)}
            style:--option-color={$colors[option]}
            on:mousedown|preventDefault={(e) =>
              editorState.toggleOption.debounce(150, idx)}
            on:mouseenter={() => (focusedOptionIdx = idx)}
          >
            <span>
              <i class="ri-checkbox-blank-fill" />
              {labels[option] || option}
            </span>
          </div>
        {/each}
      {/if}
    </div>
  </SuperPopover>
{/if}

<style>
  .options {
    flex: auto;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    overflow-y: auto;
    color: var(--spectrum-global-color-gray-700);
  }

  .option {
    min-height: 1.75rem;
    display: flex;
    gap: 0.5rem;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    padding: 0 0.5rem;

    &.selected {
      display: none;
      color: var(--spectrum-global-color-gray-800);
      background-color: var(--spectrum-global-color-gray-75);
    }

    &.focused {
      background-color: var(--spectrum-global-color-gray-200);
      color: var(--spectrum-global-color-gray-800);
      border-radius: 4px;
    }
  }
  .option > span {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    & > i {
      color: var(--option-color);
      font-size: larger;
    }
  }

  .buttons {
    flex: auto;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-items: flex-start;
  }

  .buttons.vertical {
    flex-direction: column;
    gap: 0.25rem;
  }
  .buttons .button {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem 0.75rem;
    border: 1px solid var(--spectrum-global-color-gray-300);
    border-radius: 4px;
    background-color: var(--spectrum-global-color-gray-75);
    color: var(--spectrum-global-color-gray-600);
    cursor: pointer;
    user-select: none;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.15s ease-in-out;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    max-width: 100%;
    gap: 0.35rem;
  }

  .button:hover {
    background-color: var(--spectrum-global-color-gray-100);
    border-color: var(--spectrum-global-color-gray-300);
    color: var(--spectrum-global-color-gray-700);
    cursor: pointer;
  }
  .button.selected {
    background-color: var(
      --option-color,
      var(--spectrum-global-color-gray-200)
    );
    border-color: var(--spectrum-global-color-gray-400);
    color: var(--spectrum-global-color-gray-800);
    font-weight: 600;
  }

  .radios {
    flex: auto;
    display: flex;
    flex-wrap: wrap;
    justify-items: flex-start;
    color: var(--spectrum-global-color-gray-700);
    font-size: 13px;

    &.formInput {
      & > .switch {
        padding: 0 0.5rem;
      }
    }

    &.inlineInput {
      & > .switch {
        padding: 0rem 0.25rem;
        &.toggleAll {
          margin-bottom: 0.25rem;
          padding-bottom: 0.25rem;
          border-bottom: 1px solid var(--spectrum-global-color-gray-300);
        }
      }
    }
  }
  .radios.column {
    gap: 0rem;
    flex-direction: column;
    min-width: 0;
  }
  .radio {
    height: 1.75rem;
    display: flex;
    gap: 0.55rem;
    align-items: center;
    cursor: pointer;
    padding: 0 0.5rem;
    &.focused {
      background-color: var(--spectrum-global-color-gray-200) !important;
      color: var(--spectrum-global-color-gray-800);
    }

    &.selected {
      color: var(--spectrum-global-color-gray-800);
      background-color: var(--spectrum-global-color-gray-100);
      font-weight: 600;
    }
  }

  .switch {
    width: 100%;
    display: flex;
    gap: 0.35rem;
    align-items: center;
    cursor: pointer;
    height: 1.75rem;

    & > i {
      color: var(--spectrum-global-color-gray-600);
      min-width: 13px;
      font-size: 13px;

      &.no-icon {
        display: none;
      }
    }
    & > .text {
      flex: 1 1 auto;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
      opacity: 0.95;

      &.title {
        font-size: 14px;
        font-weight: 600;
      }
    }

    &.toggleAll {
      border-bottom: 1px solid var(--spectrum-global-color-gray-200);
      height: 2rem;
    }
    &.focused {
      background-color: var(--spectrum-global-color-gray-200) !important;
      color: var(--spectrum-global-color-gray-800);
      border-radius: 4px;
    }

    &.selected {
      color: var(--spectrum-global-color-gray-800);
      & > i {
        color: var(--option-color, var(--spectrum-global-color-gray-700));
      }

      & > .text {
        opacity: 1;
      }
    }
  }

  .switch > .spectrum-Switch {
    margin-right: unset !important;
  }

  .radio > i {
    font-size: 16px;
  }
</style>
