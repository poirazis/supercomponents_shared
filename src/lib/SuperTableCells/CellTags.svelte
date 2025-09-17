<script>
  import {
    getContext,
    createEventDispatcher,
    onMount,
    onDestroy,
  } from "svelte";
  import SuperPopover from "../SuperPopover/SuperPopover.svelte";
  import fsm from "svelte-fsm";

  const dispatch = createEventDispatcher();
  const { API, QueryUtils, fetchData, memo, derivedMemo } = getContext("sdk");

  export let cellOptions;
  export let value;
  export let fieldSchema;
  export let autofocus;

  let anchor;
  let editor;
  let options = memo([]);
  let optionColors = {};
  let filteredOptions = [];
  let focusedOptionIdx = -1;
  let timer;
  let picker;
  let search;
  let initLimit = 30; // Fixed batch size for each API call
  let isInitialLoad = true;
  let localValue = value ? [...value] : []; // Track if this is the first load

  let newTag;

  let searchTerm = "";

  let searchInput;

  const colors = derivedMemo(options, ($options) => {
    let obj = {};
    $options.forEach(
      (option, index) =>
        (obj[option] = optionColors[option] ?? colorsArray[index % 14])
    );
    return obj;
  });

  const colorsArray = [
    "hsla(358, 95%, 80%, 0.35)",
    "hsla(22, 90%, 78%, 0.35)",
    "hsla(45, 85%, 76%, 0.35)",
    "hsla(110, 90%, 75%, 0.35)",
    "hsla(175, 95%, 70%, 0.35)",
    "hsla(205, 100%, 65%, 0.35)",
    "hsla(245, 95%, 75%, 0.35)",
    "hsla(310, 90%, 80%, 0.35)",
    "hsla(15, 80%, 75%, 0.35)",
    "hsla(60, 85%, 72%, 0.35)",
    "hsla(135, 95%, 70%, 0.35)",
    "hsla(190, 90%, 75%, 0.35)",
    "hsla(260, 85%, 78%, 0.35)",
    "hsla(330, 95%, 76%, 0.35)",
  ];

  let originalValue = JSON.stringify(
    Array.isArray(value) ? value : value ? [value] : []
  );

  // Expand cell options for easier access
  $: ({
    controlType,
    suggestions,
    valueColumn,
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

  $: if (cellOptions.suggestions) {
    initLimit = 15;
    isInitialLoad = true;
    isFetchMore = false; // Reset for new datasource
  }
  $: query = QueryUtils.buildQuery(cellOptions.filter);
  $: fetch?.update({
    query,
    limit: initLimit,
  });

  $: cellState.syncFetch($fetch);
  $: cellState.loadDataOptions($fetch?.rows);
  $: cellState.reset(value);

  $: isEmpty = localValue.length < 1;

  $: isDirty = inEdit && originalValue !== JSON.stringify(localValue);
  $: inEdit = $cellState == "Editing";

  export let cellState = fsm("Loading", {
    "*": {
      goTo(state) {
        return state;
      },
      refresh() {
        $options = [];
        return "Loading";
      },
      loadDataOptions(rows) {
        if (isFetchMore) {
          // Append new data for fetch more operations
          if (rows && rows.length) {
            const newOptions = rows.map((row) => row[valueColumn]);
            $options = [...$options, ...newOptions];
          }
          isFetchMore = false;
        } else {
          // Replace data for initial load or search
          $options = [];
          if (rows && rows.length) {
            rows.forEach((row) => {
              $options.push(row[valueColumn]);
            });
          }
        }
        $options = $options;
        filteredOptions = $options;
        if (isInitialLoad) isInitialLoad = false;
      },
      loadCustomOptions() {
        if (customOptions?.length) {
          customOptions.forEach((row) => {
            $options.push(row.value || row);
          });
        }
        $options = $options;
      },
      clearFilters() {
        filteredOptions = $options;
      },
      reset(newValue) {
        localValue = [...newValue] || [];
        originalValue = JSON.stringify(localValue);
      },
    },
    Loading: {
      _enter() {
        if (!suggestions || $fetch?.loaded)
          this.goTo.debounce(5, cellOptions.initialState || "View");
      },
      _exit() {
        if (cellOptions.suggestions) this.loadDataOptions($fetch?.rows);
        else if (cellOptions.optionsSource == "custom")
          this.loadCustomOptions();

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
        originalValue = JSON.stringify(value);
        this.clearFilters();
        dispatch("enteredit");
      },
      _exit() {
        editorState.close();
        dispatch("exitedit");
      },
      focusout(e) {
        if ($editorState == "Open" || anchor?.contains(e.relatedTarget)) {
          return;
        } else {
          this.submit();
        }
      },
      change() {
        if (cellOptions.debounce) {
          clearTimeout(timer);
          timer = setTimeout(() => {
            dispatch("change", localValue);
          }, cellOptions.debounce);
        }
      },
      submit() {
        if (isDirty) {
          dispatch("change", localValue);
          return "View";
        } else {
          this.cancel();
        }
      },
      clear() {
        localValue = [];
        this.submit();
      },
      cancel() {
        anchor?.blur();
        return "View";
      },
    },
  });

  let editorState = fsm("Closed", {
    "*": {
      close() {
        return "Closed";
      },
      toggleOption(idx) {
        if (cellOptions.disabled || cellOptions.readonly) return;

        if (typeof idx === "string") {
          // idx is the tag value
          let option = idx;
          let pos = localValue.indexOf(option);
          if (pos > -1) {
            // Remove if already selected
            localValue.splice(pos, 1);
            localValue = [...localValue];
          } else {
            // Add if not selected
            localValue = [...localValue, option];
          }
          cellState.change();
          // Check if we need to fetch more options
          fetchMoreIfNeeded();
        } else {
          // idx is the index in filteredOptions
          if (idx < 0) return;
          let option = filteredOptions[idx];
          let pos = localValue.indexOf(option);
          if (pos > -1) {
            // Remove if already selected
            localValue.splice(pos, 1);
            localValue = [...localValue];
          } else {
            // Add if not selected
            localValue = [...localValue, option];
          }
          cellState.change();
          // Check if we need to fetch more options
          fetchMoreIfNeeded();
        }
      },
    },
    Open: {
      _enter() {
        focusedOptionIdx = -1;
        // Focus the search input when popup opens
        setTimeout(() => searchInput?.focus(), 0);
        // Ensure filteredOptions are reset based on current searchTerm
        editorState.filterOptions(searchTerm);
      },
      _exit() {
        if (newTag?.trim() && filteredOptions.length == 0) {
          const tags = newTag
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag);
          localValue = [...localValue, ...tags];
          cellState.change();
        }
        searchTerm = "";
        newTag = null;
      },
      filterOptions(term) {
        if (term) newTag = term.trim();
        else newTag = null;

        if (cellOptions.suggestions) {
          // For datasource, update the fetch with filter
          let appliedFilter = [];
          if (term) {
            appliedFilter = [
              ...(cellOptions.filter || []),
              {
                field: valueColumn,
                type: "string",
                operator: "fuzzy",
                value: term,
                valueType: "Value",
              },
            ];
          } else {
            appliedFilter = cellOptions.filter || [];
          }
          isFetchMore = false; // Reset flag for new search
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
            search = false;
          }
        }
      },
      toggle() {
        return "Closed";
      },
      handleInputKeyboard(e) {
        if (e.key == "Enter") {
          // Add new tag if exists
          if (newTag?.trim()) {
            localValue = [
              ...localValue,
              ...newTag
                .split(",")
                .map((tag) => tag.trim())
                .filter((tag) => tag),
            ];
            cellState.change();
            newTag = null;
            searchTerm = "";
            // Refocus input
            setTimeout(() => searchInput?.focus(), 0);
          }
          e.preventDefault();
          return;
        }
        if (e.key == " ") {
          if (focusedOptionIdx > -1) {
            this.toggleOption(focusedOptionIdx);
            e.preventDefault();
          }
          // If no focused option, allow space to be input into the search box
        }
        if (e.key == "Tab") {
          if (focusedOptionIdx > -1 && filteredOptions[focusedOptionIdx])
            this.toggleOption(focusedOptionIdx);

          // Keep popup open - no submit/close
        }

        if (e.key == "ArrowDown") this.highlightNext(e.stopPropagation());
        if (e.key == "ArrowUp")
          this.highlightPrevious(e.preventDefault(), e.stopPropagation());
        if (e.key == "Escape") this.close();
      },

      handleKeyboard(e) {
        if (e.keyCode == 32) {
          if (focusedOptionIdx > -1) {
            this.toggleOption(focusedOptionIdx);
            // Keep popup open
          } else if (!cellOptions.autocomplete) {
            this.close(e.preventDefault());
          }
        }

        if (e.key == "Escape") {
          cellState.cancel();
        }

        if (e.key == "Enter" || e.key == "Tab") {
          if (focusedOptionIdx > -1 && filteredOptions[focusedOptionIdx])
            this.toggleOption(focusedOptionIdx);

          // Keep popup open - no submit/close
        }

        if (e.key == "ArrowDown") this.highlightNext();
        if (e.key == "ArrowUp") this.highlightPrevious(e.preventDefault());

        if (e.key == "Escape") this.close();

        if (controlType != "inputSelect") search = true;
      },
      highlightNext() {
        focusedOptionIdx += 1;
        if (focusedOptionIdx > filteredOptions.length - 1) focusedOptionIdx = 0;
      },
      highlightPrevious() {
        focusedOptionIdx -= 1;
        if (focusedOptionIdx < 0) focusedOptionIdx = filteredOptions.length - 1;
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
            cellState.change();
          }
        }
      },
    },
  });

  let isFetchMore = false;

  const fetchMore = () => {
    if ($fetch?.loading) return;
    if ($fetch?.rows?.length < initLimit) {
      return;
    } // No more data to fetch
    else {
      isFetchMore = true;
      initLimit += 100;
      fetch?.update({
        limit: initLimit,
      });
    }
  };

  const fetchMoreIfNeeded = () => {
    // Count visible options (not selected)
    const visibleOptions = filteredOptions.filter(
      (option) => !localValue?.includes(option)
    );
    const minVisibleThreshold = 10; // Minimum number of visible options before fetching more

    if (
      visibleOptions.length < minVisibleThreshold &&
      !$fetch?.loading &&
      $fetch?.rows?.length >= initLimit
    ) {
      fetchMore();
    }
  };

  const handleScroll = (e) => {
    const element = e.target;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;

    // Fetch more when user scrolls near the bottom (within 50px)
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      fetchMore();
    }
  };

  const focus = (node) => {
    node?.focus();
  };

  const createFetch = (datasource) => {
    if (!suggestions) return;

    return fetchData({
      API,
      datasource,
      options: {
        limit: initLimit,
      },
    });
  };

  onMount(() => {
    if (autofocus)
      setTimeout(() => {
        cellState.focus();
      }, 30);
  });

  onDestroy(() => {
    clearTimeout(timer);
  });

  $: if (filteredOptions && suggestions && !$fetch?.loading) {
    // Use setTimeout to avoid reactive loop
    setTimeout(() => fetchMoreIfNeeded(), 0);
  }
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
  class:multirow={true}
  style:color
  style:background
  style:font-weight={cellOptions.fontWeight}
  class:inline={role == "inlineInput"}
  class:tableCell={role == "tableCell"}
  class:formInput={role == "formInput"}
  on:focusin={cellState.focus}
  on:focusout={(e) => {
    setTimeout(() => cellState.focusout(e), 50);
  }}
  on:keydown={editorState.handleKeyboard}
>
  <div class="value" class:placeholder={isEmpty} tabindex="-1">
    {#if isEmpty && !inEdit}
      <span>{cellOptions.placeholder || "No Tags"}</span>
    {/if}

    <div
      class="tags"
      style:justify-content={cellOptions.align ?? "flex-start"}
      style:flex-wrap={"wrap"}
      tabindex="-1"
    >
      {#if localValue.length}
        {#each localValue as tag, idx}
          <div
            class="tag"
            style:--option-color={$colors[tag] ||
              colorsArray[idx % colorsArray.length]}
            tabindex="-1"
          >
            <span class="tag-wrap">
              <span> {tag} </span>
            </span>
            {#if inEdit}
              <i
                class="ph ph-x"
                style:font-size={"12px"}
                style:z-index={2}
                on:mousedown|preventDefault|stopPropagation={() =>
                  editorState.toggleOption(tag)}
              />
            {/if}
          </div>
        {/each}
      {/if}

      {#if inEdit}
        <i
          class="ph ph-plus-circle actionIcon"
          on:mousedown|preventDefault|stopPropagation={editorState.toggle}
        ></i>
      {/if}
    </div>
  </div>
</div>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
{#if inEdit}
  <SuperPopover
    {anchor}
    useAnchorWidth
    maxHeight={250}
    open={$editorState == "Open"}
    on:close={(e) => {
      editorState.close();
      cellState.focusout({});
    }}
  >
    <div class="searchControl" on:keydown={editorState.handleInputKeyboard}>
      <i
        class={suggestions ? "ph ph-magnifying-glass" : "ph ph-pencil-simple"}
        class:actionIcon={true}
      ></i>
      <input
        type="text"
        placeholder={suggestions ? "Search or Add" : "Enter tag..."}
        class="searchInput"
        bind:value={searchTerm}
        bind:this={searchInput}
        on:input={(e) => editorState.filterOptions(e.target.value)}
        on:focusout={(e) => {
          editorState.close();
          anchor?.focus();
        }}
        use:focus
      />
    </div>

    {#if suggestions}
      <div
        bind:this={picker}
        class="options"
        on:wheel={(e) => e.stopPropagation()}
        on:mouseleave={() => (focusedOptionIdx = -1)}
        on:scroll={suggestions ? handleScroll : null}
      >
        {#if suggestions}
          {#if $fetch?.loading && !$fetch?.rows?.length}
            <div class="option loading">
              <i class="ri-loader-2-line rotating" />
              Loading...
            </div>
          {:else if filteredOptions?.length}
            {#each filteredOptions as option, idx (idx)}
              {#if !localValue?.includes(option)}
                <div
                  class="option"
                  class:text={optionsViewMode == "text"}
                  class:focused={focusedOptionIdx === idx}
                  style:--option-color={$colors[option]}
                  on:mousedown|preventDefault={(e) =>
                    editorState.toggleOption(idx)}
                  on:mouseenter={() => (focusedOptionIdx = idx)}
                >
                  <span>
                    {#if cellOptions.optionsViewMode !== "text"}
                      <i class="ri-checkbox-blank-fill" />
                    {/if}
                    {option}
                  </span>
                </div>
              {/if}
            {/each}
            {#if $fetch?.loading}
              <div class="option loading">
                <i class="ri-loader-2-line rotating" />
                Loading more...
              </div>
            {/if}
          {:else}
            <div class="option not-found">
              <span>
                <i class="ri-close-line" />
                No matches found, Tag will be added as new
              </span>
            </div>
          {/if}
        {/if}
      </div>
    {/if}
  </SuperPopover>
{/if}

<style>
  .tags {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    max-height: 6rem;
    overflow-y: auto;
    box-sizing: border-box;
    flex-wrap: wrap;
  }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0rem 0.5rem;
    border-radius: 0.5rem;
    background-color: var(
      --option-color,
      var(--spectrum-global-color-gray-300)
    );
    border: 1px solid var(--option-color, var(--spectrum-global-color-gray-400));
    box-sizing: border-box;
    font-size: 11px;
    font-weight: bold;
    text-transform: uppercase;
    outline: none;
    max-width: 7rem;

    &:hover {
      filter: brightness(0.9);
    }

    & > span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .searchControl {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0rem 0.5rem;

    &:focus-within {
      & > .actionIcon {
        color: var(--spectrum-global-color-blue-600);
        font-weight: 800;
      }
    }
  }

  .options {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    overflow-y: auto;
    color: var(--spectrum-global-color-gray-700);
    border-top: 1px solid var(--spectrum-global-color-gray-200);
  }

  .option {
    min-height: 1.75rem;
    display: flex;
    gap: 0.5rem;
    align-items: center;
    justify-content: space-between;
    padding: 0 0.5rem;

    &:hover {
      background-color: var(--spectrum-global-color-gray-75);
      cursor: pointer;
    }

    &.selected {
      color: var(--spectrum-global-color-gray-800);
      font-weight: 600;
    }

    &.focused {
      background-color: var(--spectrum-global-color-gray-75);
      color: var(--spectrum-global-color-gray-800);
    }

    &.not-found {
      justify-content: center;
      color: var(--spectrum-global-color-gray-500);
      font-style: italic;
      height: 2rem;
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
        color: var(--option-color, var(--spectrum-global-color-gray-300));
      }
    }
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

  .actionIcon {
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 1rem;
    color: var(--spectrum-global-color-gray-600);
  }
  .actionIcon:hover {
    cursor: pointer;
    color: var(--spectrum-global-color-blue-600);
    font-weight: 800;
  }

  .searchInput {
    width: 100%;
    background: inherit;
    font: inherit;
    color: inherit;
    border: none;
    outline: none;
    padding: 0.5rem;
    box-sizing: border-box;
  }

  .value {
    outline: none;
  }
</style>
