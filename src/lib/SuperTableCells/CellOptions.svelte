<script>
  import { getContext, createEventDispatcher, onMount } from "svelte";
  import SuperPopover from "../SuperPopover/SuperPopover.svelte";
  import CellString from "./CellString.svelte";
  import fsm from "svelte-fsm";

  const dispatch = createEventDispatcher();
  const { API, QueryUtils, fetchData, memo, derivedMemo } = getContext("sdk");

  export let cellOptions;
  export let value;
  export let fieldSchema;
  export let multi = false;
  export let autofocus;

  let anchor;
  let editor;
  let options = memo([]);
  let labels = {};
  let optionColors = {};
  let filteredOptions = [];
  let focusedOptionIdx = -1;
  let timer;
  let picker;
  let search;
  let value_dom;

  const colors = derivedMemo(options, ($options) => {
    let obj = {};
    $options.forEach(
      (option, index) =>
        (obj[option] = optionColors[option] || colorsArray[index % 14])
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
    valueColumn,
    labelColumn,
    iconColumn,
    colorColumn,
    customOptions,
    optionsViewMode,
    icon,
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
  $: fetch = optionsSource == "data" ? createFetch($dataSourceStore) : memo({});
  $: cellState.syncFetch($fetch);

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

  // We always keep an internal value as an array
  $: localValue = Array.isArray(value) ? value : value ? [value] : [];
  $: isObjects =
    localValue.length && typeof localValue[0] == "object" ? true : false;

  $: isEmpty = localValue.length < 1;

  $: isDirty = inEdit && originalValue !== JSON.stringify(localValue);
  $: inEdit = $cellState == "Editing";
  $: pills = optionsViewMode == "pills";
  $: multi = fieldSchema ? fieldSchema?.type == "array" && multi : multi;
  $: placeholder = disabled || readonly ? "" : cellOptions.placeholder || "";

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
            $options.push(row[valueColumn]);
            labels[row[valueColumn]] = row[labelColumn || valueColumn];
          });
        }
        $options = $options;
      },
      loadCustomOptions() {
        if (customOptions?.length) {
          customOptions.forEach((row) => {
            $options.push(row.value || row);
            labels[row.value] = row.label || row;
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
          this.goTo.debounce(5, cellOptions.initialState || "View");
      },
      _exit() {
        if (cellOptions.optionsSource == "custom") this.loadCustomOptions();
        else if (optionsSource == "data") this.loadDataOptions($fetch?.rows);
        else this.loadSchemaOptions();

        filteredOptions = $options;
      },
      syncFetch(fetch) {
        if (fetch?.loaded) {
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
        if (controlType != "inputSelect") editorState.open();
        dispatch("enteredit");
      },
      _exit() {
        editorState.close();
        this.clearFilters();
        dispatch("exitedit");
      },
      focusout(e) {
        // If the focus is moving to the search input inside the popup, ignore
        if (picker?.contains(e?.relatedTarget)) return;

        dispatch("focusout");
        this.submit();
        return "View";
      },
      submit() {
        if (isDirty && !cellOptions.debounce) {
          if (multi) dispatch("change", localValue);
          else dispatch("change", localValue[0]);
        }
      },
      clear() {
        localValue = [];
        if (cellOptions.debounce) dispatch("change", localValue[0]);
      },
      cancel() {
        return "View";
      },
    },
  });

  let editorState = fsm("Closed", {
    "*": {
      close() {
        value_dom?.focus();
        return "Closed";
      },
      toggleOption(idx) {
        if (idx < 0) return;

        if (cellOptions.disabled || cellOptions.readonly) return;
        let option = filteredOptions[idx];
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

        if (cellOptions.debounce) {
          clearTimeout(timer);
          timer = setTimeout(() => {
            dispatch("change", multi ? localValue : localValue[0]);
          }, cellOptions.debounce ?? 0);
        }

        if (cellOptions.autocomplete) {
          if (multi) {
            this.filterOptions();
          }
        }
        if (!multi) {
          this.close.debounce(10);
          anchor?.focus();
        }
      },
    },
    Open: {
      _enter() {
        focusedOptionIdx = -1;
      },
      _exit() {
        search = false;
      },
      filterOptions(term) {
        if (term) {
          filteredOptions = $options.filter((x) =>
            x?.toLowerCase().startsWith(term.toLowerCase())
          );
        } else {
          filteredOptions = $options;
          search = false;
          value_dom.focus();
        }
      },
      toggle() {
        value_dom?.focus();
        return "Closed";
      },
      handleInputKeyboard(e) {
        if (e.key == "Enter" || e.key == "Tab") {
          if (focusedOptionIdx > -1 && filteredOptions[focusedOptionIdx])
            if (!multi) this.toggleOption(focusedOptionIdx);

          cellState.submit();
          editorState.close();
        }

        if (e.key == "ArrowDown") this.highlightNext(e.stopPropagation());
        if (e.key == "ArrowUp")
          this.highlightPrevious(e.preventDefault(), e.stopPropagation());
        if (e.key == "Escape") this.close();
      },

      handleKeyboard(e) {
        if (e.keyCode == 32) {
          if (focusedOptionIdx > -1) {
            this.toggleOption(focusedOptionIdx, e.preventDefault());
            if (!multi) this.close(e.preventDefault());
          } else if (!cellOptions.autocomplete) {
            this.close(e.preventDefault());
          }
        }

        if (e.key == "Escape") {
          this.cancel();
        }

        if (e.key == "Enter" || e.key == "Tab") {
          if (focusedOptionIdx > -1 && filteredOptions[focusedOptionIdx])
            if (!multi) this.toggleOption(focusedOptionIdx);

          cellState.submit();
          editorState.close();
        }

        if (e.key == "ArrowDown") this.highlightNext();
        if (e.key == "ArrowUp") this.highlightPrevious(e.preventDefault());

        if (e.key == "Escape") this.close();

        if (controlType != "inputSelect") search = true;
      },
      highlightNext() {
        focusedOptionIdx += 1;
        if (focusedOptionIdx > filteredOptions.length - 1) focusedOptionIdx = 0;

        if (editor) editor.value = filteredOptions[focusedOptionIdx];
      },
      highlightPrevious() {
        focusedOptionIdx -= 1;
        if (focusedOptionIdx < 0) focusedOptionIdx = filteredOptions.length - 1;

        if (editor) editor.value = filteredOptions[focusedOptionIdx];
      },
    },
    Closed: {
      toggle() {
        return "Open";
      },
      open() {
        return "Open";
      },
      highlightNext() {
        this.open();
        focusedOptionIdx = 0;
      },
      handleInputKeyboard(e) {
        if (e.key == "Escape") cellState.cancel();
        if (e.key != "Tab") {
          this.open();
          focusedOptionIdx = 0;
        }
      },
      handleKeyboard(e) {
        if (e.key == "Escape") cellState.cancel();
        if (controlType == "select" && e.key != "Tab") {
          search = true;
          if (e.key == "ArrowDown" || e.keyCode == 32) this.toggle();
          if (e.key == "Backspace" || e.key == "Delete") {
            localValue = [];
            dispatch("change", localValue);
          }
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
        limit: cellOptions.limit,
      },
    });
  };

  const focus = (node) => {
    node?.focus();
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
  class="superCell"
  class:isDirty={isDirty && cellOptions.showDirty}
  class:inEdit
  class:disabled
  class:readonly
  class:error
  style:color
  style:background
  style:font-weight={cellOptions.fontWeight}
  class:inline={role == "inlineInput"}
  class:tableCell={role == "tableCell"}
  class:formInput={role == "formInput"}
>
  {#if icon}
    <i class={icon + " icon"} />
  {/if}

  {#if inEdit && controlType == "inputSelect"}
    {#if multi}
      {#if localValue.length > 0}
        <div
          class="value"
          style:width={"auto"}
          style:padding-left={cellOptions.icon ? "32px" : cellOptions.padding}
        >
          <div
            class="items"
            class:pills
            style:justify-content={cellOptions.align ?? "flex-start"}
          >
            {#each localValue as val (val)}
              <div class="item" style:--option-color={$colors[val]}>
                {#if pills}
                  <div class="loope" />
                {/if}
                <span> {labels[val] || val} </span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/if}

    <input
      bind:this={editor}
      tabindex="0"
      class="editor"
      class:with-icon={cellOptions.icon}
      on:input={(e) => editorState.filterOptions(e.target.value)}
      on:keydown={editorState.handleInputKeyboard}
      on:focusout={cellState.focusout}
      use:focus
      {placeholder}
    />
    <div
      class="actionIcon"
      on:mousedown|preventDefault|stopPropagation={editorState.toggle}
    >
      <i class="ri-arrow-down-s-line"></i>
    </div>
  {:else}
    <div
      class="value"
      class:with-icon={icon}
      class:placeholder={isEmpty}
      tabindex={cellOptions?.disabled ? "-1" : "0"}
      bind:this={value_dom}
      on:focusin={cellState.focus}
      on:focusout={cellState.focusout}
      on:keydown={editorState.handleKeyboard}
      on:mousedown={inEdit ? editorState.toggle : () => {}}
    >
      {#if isEmpty}
        <span>{placeholder}</span>
      {:else if optionsViewMode == "text"}
        <div style:flex={"auto"}>
          <span>
            {localValue.join(", ")}
          </span>
        </div>
      {:else}
        <div
          class="items"
          class:pills
          class:colorText={optionsViewMode == "colorText"}
          style:justify-content={cellOptions.align ?? "flex-start"}
        >
          {#each localValue as val (val)}
            <div class="item" style:--option-color={$colors[val]}>
              <i class="ri-checkbox-blank-fill" />
              <span> {isObjects ? "JSON" : labels[val] || val} </span>
            </div>
          {/each}
        </div>
      {/if}

      {#if inEdit && !isEmpty}
        <i
          class="ri-close-line clearIcon"
          style:right={"28px"}
          on:mousedown|self|preventDefault={cellState.clear}
        ></i>
      {/if}

      {#if !cellOptions.readonly && (role == "formInput" || inEdit)}
        <i class="ri-arrow-down-s-line controlIcon" />
      {/if}
    </div>
  {/if}
</div>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
{#if inEdit}
  <SuperPopover
    {anchor}
    useAnchorWidth
    maxHeight={400}
    open={$editorState == "Open"}
  >
    <div
      bind:this={picker}
      class="options"
      on:wheel={(e) => e.stopPropagation()}
      on:mouseleave={() => (focusedOptionIdx = -1)}
    >
      {#if search}
        <div
          class="searchControl"
          style="min-height: 2rem;"
          on:keydown={editorState.handleInputKeyboard}
        >
          <CellString
            autofocus
            on:change={(e) => editorState.filterOptions(e.detail)}
            cellOptions={{
              icon: "ri-search-line",
              initialState: "Editing",
              role: "inlineInput",
              debounce: 25,
              placeholder: "Search",
            }}
            value=""
          />
        </div>
      {/if}
      {#if filteredOptions?.length < 1}
        <div class="option">
          <span>
            <i class="ri-close-line" />
            No Options Found
          </span>
        </div>
      {:else}
        {#each filteredOptions as option, idx (idx)}
          <div
            class="option"
            class:text={optionsViewMode == "text"}
            class:focused={focusedOptionIdx === idx}
            class:selected={localValue?.includes(option)}
            style:--option-color={$colors[option]}
            on:mousedown|preventDefault={(e) => editorState.toggleOption(idx)}
            on:mouseenter={() => (focusedOptionIdx = idx)}
          >
            <span>
              <i class="ri-checkbox-blank-fill" />
              {labels[option] || option}
            </span>
            {#if localValue?.includes(option)}
              <i class="ri-check-fill" />
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  </SuperPopover>
{/if}

<style>
  .searchControl {
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid var(--spectrum-global-color-gray-300);
  }
  .options {
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
      color: var(--spectrum-global-color-gray-800);
      font-weight: 600;
    }

    &.focused {
      background-color: var(--spectrum-global-color-gray-200);
      color: var(--spectrum-global-color-gray-800);
    }

    & > i {
      font-size: 14px;
      color: var(--spectrum-global-color-green-400);
    }
    & > span {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

      & > i {
        font-size: 16px;
        color: var(--option-color);
      }
    }
  }
  .actionIcon {
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    border-left: 1px solid var(--spectrum-global-color-blue-500);
    min-width: 2rem;
    font-size: 16px;
  }
  .actionIcon:hover {
    cursor: pointer;
    background-color: var(--spectrum-global-color-gray-75);
    font-weight: 800;
  }
</style>
