<script>
  import { getContext, createEventDispatcher, onMount, tick } from "svelte";
  import SuperPopover from "../SuperPopover/SuperPopover.svelte";
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
  let localValue = [];

  let searchTerm = "";
  let inputValue = "";
  let isInitialLoad = false;
  let initLimit = 15;

  const createFetch = (datasource) => {
    if (optionsSource != "data") return memo({});
    return fetchData({
      API,
      datasource,
      options: {
        sortColumn: cellOptions.sortColumn,
        sortOrder: cellOptions.sortOrder,
        limit: initLimit,
      },
    });
  };

  export const cellState = fsm("Loading", {
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
        labels = {};
        filteredOptions = $options;
      },
      loadDataOptions(rows) {
        $options = [];
        labels = {};
        if (rows && rows.length) {
          rows.forEach((row) => {
            $options.push(row[valueColumn]?.toString());
            labels[row[valueColumn]] = row[labelColumn || valueColumn];
            if (colorColumn) optionColors[row[valueColumn]] = row[colorColumn];
          });
        }
        $options = $options;
        filteredOptions = $options;
        if (isInitialLoad) isInitialLoad = false;
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
      focus(e) {
        if (!cellOptions.readonly && !cellOptions.disabled) {
          return "Editing";
        }
      },
    },
    View: {
      _enter() {
        searchTerm = null;
      },
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
        inputValue = multi ? "" : labels[localValue[0]] || localValue[0] || "";
        // Open the popup if the focus in came from a TAB
        editorState.open();
        dispatch("enteredit");
      },
      _exit() {
        editorState.close();
        editorState.filterOptions();
        dispatch("exitedit");
      },
      focusout(e) {
        // If the focus is moving to the search input inside the popup, ignore
        if (anchor.contains(e.relatedTarget)) return;

        dispatch("focusout");

        // For debounced inputs, dispatch the current value immediately on focusout
        if (cellOptions.debounce && isDirty) {
          clearTimeout(timer);
          dispatch("change", multi ? localValue : localValue[0]);
        } else {
          this.submit();
        }

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
        anchor?.focus();
        if (cellOptions.debounce) dispatch("change", null);
      },
      cancel() {
        searchTerm = null;
        anchor?.blur();
        return "View";
      },
    },
  });

  const editorState = fsm("Closed", {
    "*": {
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

          inputValue = labels[localValue[0]] || localValue[0] || "";
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
          if (cellOptions.controlType != "inputSelect") anchor?.focus();
          else editor?.focus();
        }
      },
    },
    Open: {
      _enter() {
        searchTerm = "";
        this.filterOptions();
        focusedOptionIdx = -1;
      },
      filterOptions(term) {
        if (cellOptions.optionsSource == "data") {
          // For datasource, update the fetch with filter
          let appliedFilter = [];
          if (term) {
            appliedFilter = [
              ...(cellOptions.filter || []),
              {
                field: labelColumn || valueColumn,
                type: "string",
                operator: "fuzzy",
                value: term,
                valueType: "Value",
              },
            ];
          } else {
            appliedFilter = cellOptions.filter || [];
          }
          fetch?.update({
            query: QueryUtils.buildQuery(appliedFilter),
          });
          // Keep filteredOptions in sync
          filteredOptions = $options;
        } else {
          // Client-side filtering for non-datasource
          if (term) {
            filteredOptions = $options.filter((x) =>
              x?.toLocaleLowerCase().startsWith(term.toLocaleLowerCase())
            );
          } else {
            filteredOptions = $options;
          }
        }
      },
      toggle() {
        return "Closed";
      },
      close() {
        return "Closed";
      },
      handleKeyboard(e) {
        if (e.key === "Backspace" || e.key === "Delete") {
          searchTerm = searchTerm.slice(0, -1);
          this.filterOptions(searchTerm);
        } else if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
          searchTerm = searchTerm + e.key;
          this.filterOptions(searchTerm);
          if (searchTerm?.length && $editorState == "Closed") this.toggle();
        }

        if (e.keyCode == 32) {
          if (focusedOptionIdx > -1) {
            this.toggleOption(focusedOptionIdx, e.preventDefault());
            if (!multi) this.close(e.preventDefault());
          } else if (!inputSelect) {
            this.close();
          }
        }

        if (e.key == "Escape") {
          searchTerm = null;
          anchor?.focus();
          return "Closed";
        }

        if (e.key == "Enter") {
          if (focusedOptionIdx > -1 && filteredOptions[focusedOptionIdx])
            if (!multi) this.toggleOption(focusedOptionIdx);

          cellState.submit();
          editorState.close();
        }

        if (e.key == "ArrowDown") this.highlightNext();
        if (e.key == "ArrowUp") this.highlightPrevious();
      },
      highlightNext() {
        focusedOptionIdx += 1;
        if (focusedOptionIdx > filteredOptions.length - 1) focusedOptionIdx = 0;
        tick().then(() => {
          const focusedElement = optionsList.querySelector(".option.focused");
          if (focusedElement) {
            focusedElement.scrollIntoView({
              behavior: "smooth",
              block: "nearest",
            });
          }
        });
      },
      highlightPrevious() {
        focusedOptionIdx -= 1;
        if (focusedOptionIdx < 0) focusedOptionIdx = filteredOptions.length - 1;
        tick().then(() => {
          const focusedElement = optionsList.querySelector(".option.focused");
          if (focusedElement) {
            focusedElement.scrollIntoView({
              behavior: "smooth",
              block: "nearest",
            });
          }
        });
      },
      fetchMore() {
        if ($fetch?.loading) return;
        if ($fetch?.rows?.length < initLimit) {
          return;
        } // No more data to fetch
        else {
          initLimit += 100;

          fetch?.update({
            limit: initLimit,
          });
        }
      },
      handleScroll(e) {
        const element = e.target;
        const scrollTop = element.scrollTop;
        const scrollHeight = element.scrollHeight;
        const clientHeight = element.clientHeight;

        // Fetch more when user scrolls near the bottom (within 50px)
        if (scrollTop + clientHeight >= scrollHeight - 50) {
          this.fetchMore();
        }
      },
    },
    Closed: {
      _enter() {
        searchTerm = null;
        focusedOptionIdx = -1;
      },
      toggle() {
        return "Open";
      },
      open() {
        return "Open";
      },
      highlightNext() {
        this.open();
        focusedOptionIdx = 0;
        tick().then(() => {
          const focusedElement = optionsList.querySelector(".option.focused");
          if (focusedElement) {
            focusedElement.scrollIntoView({
              behavior: "smooth",
              block: "nearest",
            });
          }
        });
      },
      handleKeyboard(e) {
        if (e.key == "Escape") {
          cellState.cancel();
          return;
        }

        if (e.key == "Enter") {
          if (inputValue?.trim()) {
            if (multi) {
              localValue = [...localValue, inputValue.trim()];
            } else {
              localValue = [inputValue.trim()];
            }
            inputValue = "";
          }
        }

        if (controlType == "select") {
          this.open();
          this.handleKeyboard(e);
          if (e.key == "ArrowDown" || e.keyCode == 32) this.toggle();
          if (e.key == "Backspace" || e.key == "Delete") {
            localValue = [];
            dispatch("change", localValue);
          }
        }
      },
    },
  });

  const colors = derivedMemo(options, ($options) => {
    let obj = {};
    $options.forEach(
      (option, index) =>
        (obj[option] =
          optionColors[option] ?? colorsArray[index % colorsArray.length])
    );
    return obj;
  });

  const colorsArray = [
    "hsla(175, 90%, 75%, 0.35)",
    "hsla(25, 90%, 75%, 0.35)",
    "hsla(340, 85%, 72%, 0.35)",
    "hsla(75, 80%, 75%, 0.35)",
    "hsla(265, 85%, 70%, 0.35)",
    "hsla(125, 90%, 75%, 0.35)",
    "hsla(0, 90%, 75%, 0.35)",
    "hsla(225, 90%, 75%, 0.35)",
    "hsla(100, 80%, 75%, 0.35)",
    "hsla(315, 85%, 70%, 0.35)",
    "hsla(50, 80%, 75%, 0.35)",
    "hsla(165, 85%, 70%, 0.35)",
    "hsla(200, 90%, 75%, 0.35)",
    "hsla(290, 85%, 72%, 0.35)",
    "hsla(85, 85%, 72%, 0.35)",
    "hsla(140, 85%, 72%, 0.35)",
    "hsla(250, 90%, 75%, 0.35)",
    "hsla(35, 85%, 72%, 0.35)",
    "hsla(190, 85%, 72%, 0.35)",
    "hsla(350, 90%, 75%, 0.35)",
    "hsla(60, 85%, 70%, 0.35)",
    "hsla(150, 90%, 75%, 0.35)",
    "hsla(300, 90%, 75%, 0.35)",
    "hsla(10, 85%, 70%, 0.35)",
    "hsla(215, 85%, 70%, 0.35)",
    "hsla(325, 90%, 75%, 0.35)",
    "hsla(115, 85%, 70%, 0.35)",
    "hsla(240, 85%, 72%, 0.35)",
    "hsla(275, 90%, 75%, 0.35)",
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
  $: fetch = createFetch($dataSourceStore);
  $: if (optionsSource == "data") {
    initLimit = 15;
    isInitialLoad = true;
  }
  $: query = QueryUtils.buildQuery(cellOptions.filter);
  $: inputSelect = controlType == "inputSelect";

  $: if (cellOptions.optionsSource == "data")
    fetch.update({
      query,
      sortColumn: cellOptions.sortColumn,
      sortOrder: cellOptions.sortOrder,
      limit: initLimit,
    });

  $: cellState.syncFetch($fetch);
  $: cellState.loadDataOptions($fetch?.rows);

  // React to property changes
  $: cellState.refresh(
    fieldSchema,
    optionsSource,
    labelColumn,
    valueColumn,
    iconColumn,
    colorColumn,
    $dataSourceStore,
    customOptions
  );

  // We always keep an internal value as an array
  $: localValue = Array.isArray(value) ? value : value ? [value] : [];
  $: isObjects =
    localValue.length && typeof localValue[0] == "object" ? true : false;

  $: isEmpty = localValue.length < 1;

  $: isDirty = inEdit && originalValue !== JSON.stringify(localValue);
  $: inEdit = $cellState == "Editing";
  $: pills = optionsViewMode == "pills";
  $: multi =
    fieldSchema && fieldSchema.type ? fieldSchema.type == "array" : multi;

  $: placeholder = disabled || readonly ? "" : cellOptions.placeholder || "";
  $: icon = searchTerm && isEmpty ? "ph ph-magnifying-glass" : cellOptions.icon;
  $: open = $editorState == "Open";

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
  tabindex={cellOptions?.disabled ? -1 : 0}
  class:isDirty={isDirty && cellOptions.showDirty}
  class:inEdit
  class:disabled
  class:readonly
  class:error
  style:color
  style:background
  class:inline={role == "inlineInput"}
  class:tableCell={role == "tableCell"}
  class:formInput={role == "formInput"}
  on:focusin={cellState.focus}
  on:focusout={cellState.focusout}
  on:keydown={editorState.handleKeyboard}
>
  {#if icon}
    <i class={icon + " field-icon"} class:active={searchTerm} />
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
              <div
                class="item"
                style:--option-color={$colors[val]}
                style:min-width={"4rem"}
              >
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
      class="editor"
      bind:value={inputValue}
      on:input={(e) => {
        if (!multi) localValue[0] = e.target.value?.trim();
        editorState.filterOptions(e.target.value);
      }}
      use:focus
      {placeholder}
    />
    <div class="action-icon" on:click={editorState.toggle}>
      <i class="ph ph-caret-down"></i>
    </div>
  {:else}
    <div
      class="value"
      class:placeholder={isEmpty && !searchTerm}
      on:mousedown={inEdit ? editorState.toggle : null}
    >
      {#if isEmpty && !open}
        <span>{searchTerm || placeholder}</span>
      {:else if isEmpty && open}
        <span>{searchTerm || "Type to search..."}</span>
      {:else if optionsViewMode == "text"}
        <span>
          {multi || localValue.length > 1
            ? localValue.join(", ")
            : labels[localValue[0]] || localValue[0]}
        </span>
      {:else}
        <div
          class="items"
          class:pills
          class:colorText={optionsViewMode == "colorText"}
          style:justify-content={cellOptions.align ?? "flex-start"}
        >
          {#each localValue as val, idx (val)}
            <div
              class="item"
              style:--option-color={$colors[val] ||
                colorsArray[idx % colorsArray.length]}
            >
              <i class={"ph-fill ph-square"} />
              <span> {isObjects ? "JSON" : labels[val] || val} </span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
    {#if !readonly && (role == "formInput" || inEdit)}
      <i
        class="ph ph-caret-down control-icon"
        on:mousedown={inEdit ? editorState.toggle : null}
      />
    {/if}
  {/if}
</div>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
{#if inEdit}
  <SuperPopover
    {anchor}
    useAnchorWidth
    maxHeight={250}
    {open}
    on:close={editorState.close}
  >
    <div class="picker" on:mousedown|stopPropagation|preventDefault>
      {#if searchTerm && !isEmpty}
        <div class="searchControl">
          <i
            class="search-icon ph ph-magnifying-glass"
            class:active={searchTerm}
          />
          <span class="search-term">{searchTerm}</span>
        </div>
      {/if}
      <div
        class="options"
        on:wheel={(e) => e.stopPropagation()}
        on:mouseleave={() => (focusedOptionIdx = -1)}
        on:scroll={optionsSource == "data" ? editorState.handleScroll : null}
      >
        {#if optionsSource == "data" && $fetch?.loading && !$fetch?.rows?.length}
          <div class="option loading">
            <i class="ph ph-spinner spin" />
            Loading...
          </div>
        {:else if filteredOptions?.length}
          {#each filteredOptions as option, idx (idx)}
            <div
              class="option"
              class:text={optionsViewMode == "text"}
              class:focused={focusedOptionIdx === idx}
              class:selected={localValue?.includes(option)}
              style:--option-color={$colors[option]}
              on:mousedown|preventDefault|stopPropagation={(e) =>
                editorState.toggleOption(idx)}
              on:mouseenter={() => (focusedOptionIdx = idx)}
            >
              <span>
                <i
                  class={iconColumn
                    ? "ph ph-" + $fetch?.rows?.[idx]?.[iconColumn]
                    : "ph-fill ph-square"}
                  style:color={$colors[option]}
                />
                {labels[option] || option}
              </span>
              <i class="ph ph-check" />
            </div>
          {/each}
          {#if optionsSource == "data" && $fetch?.loading}
            <div class="option loading">
              <i class="ph ph-spinner spin" />
              Loading more...
            </div>
          {/if}
        {:else}
          <div class="option">
            <span>
              <i class="ri-close-line" />
              No Options Found
            </span>
          </div>
        {/if}
      </div>
    </div>
  </SuperPopover>
{/if}

<style>
  .searchControl {
    display: flex;
    align-items: center;
    height: 2rem;
    border-bottom: 1px solid var(--spectrum-global-color-gray-300);
  }
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
      color: var(--spectrum-global-color-gray-800);
      background-color: var(--spectrum-global-color-gray-75);
      font-weight: 600;
    }

    &.focused {
      background-color: var(--spectrum-global-color-gray-100);
      color: var(--spectrum-global-color-gray-800);
    }

    & > span {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .option > span > .ph-square {
    font-size: 16px;
    color: var(--option-color, var(--spectrum-global-color-gray-300));
  }
  .option.text > span > .ph-square {
    display: none;
  }

  .option .ph-check {
    display: none;
    font-size: 16px;
    color: var(--spectrum-global-color-green-400);
  }

  .option.selected .ph-check {
    display: inline-block;
  }
  .option.loading {
    justify-content: center;
    color: var(--spectrum-global-color-gray-500);
    font-style: italic;

    & > i.rotating {
      animation: rotate 1s linear infinite;
    }
  }

  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .action-icon {
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    border-left: 1px solid var(--spectrum-global-color-blue-500);
    min-width: 2rem;
    font-size: 16px;
  }
  .action-icon:hover {
    cursor: pointer;
    background-color: var(--spectrum-global-color-gray-75);
    font-weight: 800;
  }

  .search-icon {
    font-size: 16px;
    color: var(--spectrum-global-color-gray-500);
    display: flex;
    align-items: center;
    padding-left: 0.5rem;
  }

  .search-icon.active {
    color: var(--spectrum-global-color-blue-700);
  }

  .search-term {
    flex: auto;
    padding-left: 0.5rem;
    color: var(--spectrum-global-color-gray-700);
    font-style: italic;
    font-weight: 500;
  }
  .picker {
    display: flex;
    flex-direction: column;
    max-height: 248px;
    width: 100%;
    overflow: hidden;
  }
</style>
