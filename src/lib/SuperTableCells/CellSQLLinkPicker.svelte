<script>
  import { getContext, createEventDispatcher, tick } from "svelte";
  import { LogicalOperator, EmptyFilterOption } from "@budibase/types";

  const { API, fetchData, QueryUtils } = getContext("sdk");
  const dispatch = createEventDispatcher();

  export let value = [];
  export let fieldSchema;
  export let filter = [];
  export let relatedColumns = fieldSchema?.relatedColumns || [];
  export let multi = false;

  let tableId = fieldSchema.tableId;
  let relatedField = fieldSchema?.relatedField || "id";

  let focusIdx = -1;
  let control;
  let filterTerm;
  let initLimit = 15;
  let listElement;
  let isInitialLoad = true;
  let hasMoreData = true;
  let optionRefs = [];

  let optionsFetch;
  let searchFilter;
  let currentLimit = initLimit;

  $: localValue = Array.isArray(value) ? value : [];
  $: defaultQuery = QueryUtils.buildQuery(filter);
  $: searchExtensions = searchFilter
    ? { search: QueryUtils.buildQuery(searchFilter) }
    : {};

  $: query = extendQuery(defaultQuery, searchExtensions);

  $: optionsFetch = fetchData({
    API,
    datasource: {
      type: "table",
      tableId: tableId,
    },
    options: {
      query: defaultQuery,
      limit: initLimit,
    },
  });

  $: optionsFetch?.update({ query: query, limit: currentLimit });

  $: primaryDisplay = $optionsFetch?.definition?.primaryDisplay || "id";

  $: if ($optionsFetch?.loaded) {
    hasMoreData = $optionsFetch.rows.length >= currentLimit;
  }

  $: totalRows = localValue.length + ($optionsFetch?.rows?.length || 0);

  $: focusIdx = Math.min(focusIdx, totalRows - 1);

  // Auto Scroll focused option into view
  $: if (focusIdx >= 0 && optionRefs[focusIdx]) {
    tick().then(() => {
      optionRefs[focusIdx].scrollIntoView({ block: "nearest" });
    });
  }

  const extendQuery = (defaultQuery, extensions) => {
    if (!Object.keys(extensions).length) {
      return defaultQuery;
    }
    const extended = {
      [LogicalOperator.AND]: {
        conditions: [
          ...(defaultQuery ? [defaultQuery] : []),
          ...Object.values(extensions || {}),
        ],
      },
      onEmptyFilter: EmptyFilterOption.RETURN_NONE,
    };
    return (extended[LogicalOperator.AND]?.conditions?.length ?? 0) > 0
      ? extended
      : {};
  };

  const rowSelected = (val) => {
    if (value) {
      let found = value.find((e) => e[relatedField] == val[relatedField]);
      return found;
    }
  };

  const selectRow = (val) => {
    const displayValue =
      relatedColumns && relatedColumns.length > 0
        ? val[relatedColumns[0].name]
        : val[primaryDisplay];

    // Include all related column values for multi-column mode
    const relatedColumnData = relatedColumns && relatedColumns.length > 0 
      ? relatedColumns.reduce((acc, col) => {
          acc[col.name] = val[col.name];
          return acc;
        }, {})
      : {};

    const selectedItem = {
      [relatedField]: val[relatedField],
      primaryDisplay: displayValue,
      ...relatedColumnData
    };

    if (!multi) {
      if (localValue[0]?.[relatedField] == val[relatedField]) {
        localValue = [];
      } else localValue = [selectedItem];
    } else {
      let pos = localValue.findIndex(
        (v) => v[relatedField] == val[relatedField]
      );
      if (pos > -1) {
        localValue.splice(pos, 1);
        localValue = localValue;
      } else {
        localValue.push(selectedItem);
        localValue = localValue;
      }
    }
    dispatch("change", localValue);
  };

  const handleSearch = (e) => {
    filterTerm = e.target.value;
    if (e.target.value) {
      searchFilter = [
        {
          field: primaryDisplay,
          type: "string",
          operator: "fuzzy",
          value: e.target.value,
          valueType: "Value",
        },
      ];
    } else {
      searchFilter = undefined;
    }
    currentLimit = initLimit; // Reset limit when searching
  };

  const fetchMore = () => {
    if ($optionsFetch?.loading || !hasMoreData) return;
    currentLimit += 100;
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

  const handleNavigation = (e) => {
    if (e.key == "ArrowDown") {
      e.preventDefault();
      focusIdx += 1;
      if (focusIdx > totalRows - 1) focusIdx = 0;
    } else if (e.key == "ArrowUp") {
      e.preventDefault();
      focusIdx -= 1;
      if (focusIdx < 0) focusIdx = totalRows - 1;
    } else if (e.key == "Enter" && focusIdx > -1) {
      const row =
        focusIdx < localValue.length
          ? localValue[focusIdx]
          : $optionsFetch.rows[focusIdx - localValue.length];
      selectRow(row);
    }
    if (e.key == "Tab" || e.key == "Escape") dispatch("close");
  };

  export const api = {
    focus: () => {
      control?.focus();
    },
    hasFocus: () => {
      return document.activeElement === control;
    },
    setSearch: (char) => {
      filterTerm = char;
      control?.focus();
    },
    focusList: () => {
      listElement?.focus();
    },
  };

  $: numCols = relatedColumns.length;
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div class="control">
  <div class="searchControl">
    <i
      class={$optionsFetch?.loading && isInitialLoad
        ? "ri-loader-2-line"
        : control?.value
          ? "ri-filter-fill"
          : "ri-search-line"}
      style:color={filterTerm
        ? "var(--spectrum-global-color-blue-400)"
        : "var(--spectrum-global-color-gray-700)"}
    />
    <input
      bind:this={control}
      class="search"
      class:placeholder={!filterTerm}
      type="text"
      placeholder={$optionsFetch?.loading &&
      !$optionsFetch?.rows?.length &&
      isInitialLoad
        ? "Loading..."
        : "Search"}
      on:input={handleSearch}
      on:keydown={handleNavigation}
      on:blur={() => dispatch("close")}
    />
  </div>

  <div class="listWrapper" on:mousedown|preventDefault={() => {}}>
    <div
      class="list"
      class:table-mode={relatedColumns && relatedColumns.length > 0}
      bind:this={listElement}
      on:scroll={handleScroll}
    >
      {#if relatedColumns && relatedColumns.length > 1}
        <div
          class="grid-container"
          style="--num-cols: {numCols}"
          on:scroll={handleScroll}
        >
          <div class="header-row">
            {#each relatedColumns as col}
              <div class="header-cell">{col.displayName}</div>
            {/each}
            <div class="header-cell check"></div>
          </div>
          {#each localValue as row, idx (row[relatedField])}
            <div
              class="data-row"
              class:selected={rowSelected(row)}
              class:highlighted={focusIdx == idx}
              bind:this={optionRefs[idx]}
              on:mouseenter={() => (focusIdx = idx)}
              on:mouseleave={() => (focusIdx = -1)}
              on:mousedown|preventDefault={() => selectRow(row)}
            >
              {#each relatedColumns as col}
                <div class="data-cell">{row[col.name] || ""}</div>
              {/each}
              <div class="data-cell check"><i class="ri-check-line" /></div>
            </div>
          {/each}

          {#if $optionsFetch && $optionsFetch.loaded}
            <!-- Unselected rows -->
            {#key localValue.length}
              {#each $optionsFetch.rows as row, idx (row[relatedField])}
                {#if !rowSelected(row)}
                  <div
                    class="data-row"
                    class:highlighted={focusIdx == idx + localValue.length}
                    bind:this={optionRefs[idx + localValue.length]}
                    on:mouseenter={() => (focusIdx = idx + localValue.length)}
                    on:mouseleave={() => (focusIdx = -1)}
                    on:mousedown|preventDefault={() => selectRow(row)}
                  >
                    {#each relatedColumns as col}
                      <div class="data-cell">{row[col.name] || ""}</div>
                    {/each}
                    <div class="data-cell check">
                      <i class="ri-check-line" />
                    </div>
                  </div>
                {/if}
              {/each}
            {/key}
          {/if}

          {#if $optionsFetch?.loading}
            <div class="data-row loading">
              <div class="data-cell" style="grid-column: 1 / -1;">
                <i class="ri-loader-2-line rotating" /> Loading more...
              </div>
            </div>
          {:else if $optionsFetch?.loading && !$optionsFetch.loaded}
            <div class="data-row loading">
              <div class="data-cell" style="grid-column: 1 / -1;">
                <i class="ri-loader-2-line rotating" /> Loading...
              </div>
            </div>
          {:else if !$optionsFetch?.loading && $optionsFetch?.loaded && !$optionsFetch.rows?.length}
            <div class="data-row">
              <div class="data-cell" style="grid-column: 1 / -1;">
                No Results Found
              </div>
            </div>
          {/if}
        </div>
      {:else}
        <div class="options">
          {#each localValue as row, idx (row[relatedField])}
            <div
              class="option"
              class:selected={rowSelected(row)}
              class:highlighted={focusIdx == idx}
              bind:this={optionRefs[idx]}
              on:mouseenter={() => (focusIdx = idx)}
              on:mouseleave={() => (focusIdx = -1)}
              on:mousedown|preventDefault|stopPropagation={() => selectRow(row)}
            >
              {row.primaryDisplay || row[primaryDisplay]}
              <i class="ri-check-line" />
            </div>
          {/each}

          {#if $optionsFetch && $optionsFetch.loaded}
            <!-- Unselected rows -->
            {#key localValue.length}
              {#each $optionsFetch.rows as row, idx (row[relatedField])}
                {#if !rowSelected(row)}
                  <div
                    class="option"
                    class:highlighted={focusIdx == idx + localValue.length}
                    bind:this={optionRefs[idx + localValue.length]}
                    on:mouseenter={() => (focusIdx = idx + localValue.length)}
                    on:mouseleave={() => (focusIdx = -1)}
                    on:mousedown|preventDefault={() => selectRow(row)}
                  >
                    {row.primaryDisplay || row[primaryDisplay]}
                    <i class="ri-check-line" />
                  </div>
                {/if}
              {/each}
            {/key}
            {#if $optionsFetch?.loading}
              <div class="option loading">
                <i class="ri-loader-2-line rotating" />
                Loading more...
              </div>
            {/if}
          {:else if $optionsFetch?.loading && !$optionsFetch.loaded}
            <div class="option loading">
              <i class="ri-loader-2-line rotating" />
              Loading...
            </div>
          {:else}
            <div class="option">No Results Found</div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .control {
    flex: auto;
    flex-direction: column;
    display: flex;
    align-items: stretch;
    justify-content: space-around;
    gap: 0.25rem;
    padding: 0.25rem;
    padding-top: 0rem;
    overflow-x: hidden;

    &:focus {
      border: 1px solid white;
    }
  }

  .searchControl {
    height: 2rem;
    border-bottom: 1px solid var(--spectrum-global-color-gray-300);
    display: flex;
    align-items: center;
    padding-left: 0.5rem;
    gap: 0.25rem;

    & > i {
      font-size: 14px;
      transition: all 230ms;
    }

    & > input {
      height: 100%;
      width: 100%;
      outline: none;
      background: none;
      border: none;
      color: inherit;
      padding-left: 0.5rem;
      font-family: inherit;
      font-size: inherit;

      &.placeholder {
        font-style: italic;
        color: var(--spectrum-global-color-gray-600);
      }
    }
  }

  .listWrapper {
    flex: auto;
    display: flex;
    justify-content: stretch;
    align-content: stretch;
    gap: 0.25rem;
    overflow: hidden;
  }

  .list {
    flex: 1 1 50%;
    height: 200px;
    overflow-y: auto;
    overflow-x: hidden;
    color: var(--spectrum-global-color-gray-800);

    &.table-mode {
      overflow: visible;
      height: auto;
    }
  }
  .options {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
    overflow-y: auto;
    gap: 0rem;
    min-width: 0;
  }
  .option {
    line-height: 1.5rem;
    padding: 0.15rem 0.5rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: flex;
    justify-content: space-between;

    & > i {
      visibility: hidden;
    }

    &.selected {
      & > i {
        visibility: visible;
        color: var(--spectrum-global-color-green-500);
      }
    }

    &.highlighted {
      background-color: var(--spectrum-global-color-gray-75);
    }
  }

  .option:hover {
    background-color: var(--spectrum-global-color-gray-75);
    border-radius: 4px;
    cursor: pointer;
  }

  .option.loading {
    justify-content: center;
    color: var(--spectrum-global-color-gray-500);
    font-style: italic;

    & > i.rotating {
      animation: rotate 1s linear infinite;
    }
  }

  .grid-container {
    height: 200px;
    overflow-y: auto;
  }

  .header-row {
    position: sticky;
    top: 0;
    background-color: var(--spectrum-global-color-gray-100);
    z-index: 1;
    display: grid;
    grid-template-columns: repeat(var(--num-cols), 1fr) 32px;
    height: 1.75rem;
  }

  .data-row {
    display: grid;
    grid-template-columns: repeat(var(--num-cols), 1fr) 32px;
    cursor: pointer;
  }

  .header-cell {
    padding: 0.15rem 0.5rem;
    text-align: left;
    border-bottom: 1px solid var(--spectrum-global-color-gray-300);
    font-weight: bold;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    align-items: center;
  }

  .header-cell.check {
    text-align: center;
  }

  .data-cell {
    padding: 0.25rem 0.5rem;
    border-bottom: 1px solid var(--spectrum-global-color-gray-200);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .data-cell.check {
    text-align: center;
  }

  .data-row:hover,
  .data-row.highlighted {
    background-color: var(--spectrum-global-color-gray-75);
  }

  .data-row.selected .data-cell.check i {
    visibility: visible;
    color: var(--spectrum-global-color-green-500);
  }

  .data-cell.check i {
    visibility: hidden;
  }

  .data-row.loading {
    color: var(--spectrum-global-color-gray-500);
    font-style: italic;
  }

  .data-row.loading .data-cell {
    text-align: center;
    border-bottom: none;
  }

  .data-row.loading .data-cell i.rotating {
    animation: rotate 1s linear infinite;
  }

  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
