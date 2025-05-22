<script>
  import { getContext, createEventDispatcher } from "svelte";
  import { fly } from "svelte/transition";

  const { API, fetchData } = getContext("sdk");
  const dispatch = createEventDispatcher();

  export let value = [];
  export let fieldSchema;
  export let filter = [];
  export let wide = false;
  export let singleSelect;

  let schema = fieldSchema;
  let tableId = fieldSchema.tableId;
  let appliedFilter = [];
  let focusIdx = -1;
  let control;
  let filterTerm;

  $: isBBReference = fieldSchema?.type?.includes("bb_reference");
  $: isMultiReference =
    isBBReference && !fieldSchema?.type?.includes("_single");
  $: type = isBBReference ? "user" : "table";
  $: localValue = Array.isArray(value) ? value : [];
  $: fetch = fetchData({
    API,
    datasource: {
      type,
      tableId: tableId,
    },
    options: {
      filter,
      limit: 1000,
    },
  });

  $: primaryDisplay = $fetch?.definition?.primaryDisplay || "email";

  const rowSelected = (val) => {
    if (value) {
      let found = value.find((e) => e._id == val._id);
      return found;
    }
  };

  const selectRow = (val) => {
    if (singleSelect) {
      if (localValue[0]?._id == val._id) {
        localValue = [];
      } else
        localValue = [{ _id: val._id, primaryDisplay: val[primaryDisplay] }];
    } else {
      let pos = localValue.findIndex((v) => v._id == val._id);
      if (pos > -1) {
        localValue.splice(pos, 1);
        localValue = localValue;
      } else {
        localValue.push({ _id: val._id, primaryDisplay: val[primaryDisplay] });
        localValue = localValue;
      }
    }
    dispatch("change", localValue);
  };

  const unselectRow = (val) => {
    localValue.splice(
      localValue.findIndex((e) => e._id === val._id),
      1
    );
    localValue = localValue;
    dispatch("change", localValue);
  };

  const handleSearch = (e) => {
    filterTerm = e.target.value;
    if (e.target.value) {
      appliedFilter = [
        ...filter,
        {
          field: primaryDisplay,
          type: "string",
          operator: "fuzzy",
          value: e.target.value,
          valueType: "Value",
        },
      ];
    } else {
      appliedFilter = filter ?? [];
    }

    fetch?.update({
      filter: appliedFilter,
    });
  };

  const handleNavigation = (e) => {
    if (e.key == "ArrowDown") {
      e.preventDefault();
      focusIdx += 1;
      if (focusIdx > $fetch.rows.length - 1) focusIdx = 0;
    } else if (e.key == "ArrowUp") {
      e.preventDefault();
      focusIdx -= 1;
      if (focusIdx < 0) focusIdx = $fetch.rows.length - 1;
    } else if (e.key == "Enter" && focusIdx > -1)
      selectRow($fetch.rows[focusIdx]);
    if (e.key == "Tab" || e.key == "Escape") dispatch("close");
  };

  export const api = {
    focus: () => {
      control?.focus();
    },
    hasFocus: () => {
      return document.activeElement === control;
    },
  };
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div class="control">
  <div class="searchControl">
    <i
      class={$fetch.loading
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
      placeholder={$fetch.loading ? "Loading..." : "Search"}
      on:input={handleSearch}
      on:keydown={handleNavigation}
      on:blur={() => dispatch("close")}
    />
  </div>

  {#if $fetch?.loaded}
    {#if wide}
      <div class="listWrapper" on:mousedown|preventDefault={() => {}}>
        <div class="list">
          <div class="options">
            {#key localValue}
              {#if $fetch?.rows.length}
                {#each $fetch.rows as row, idx (idx)}
                  {#if !rowSelected(row)}
                    <div
                      class="option wide"
                      class:highlighted={focusIdx == idx}
                      on:mouseenter={() => (focusIdx = idx)}
                      on:mouseleave={() => (focusIdx = -1)}
                      on:mousedown|preventDefault={selectRow(row)}
                    >
                      {row[primaryDisplay]}
                      <i class="ri-add-line" />
                    </div>
                  {/if}
                {/each}
              {:else}
                <div class="option">No Results Found</div>
              {/if}
            {/key}
          </div>
        </div>
        <div class="list listSelected">
          <div class="options">
            {#if localValue.length}
              {#each localValue as val, idx (idx)}
                {#if rowSelected(val)}
                  <div
                    transition:fly={{ x: -20, duration: 130 }}
                    class="option wide selected"
                    on:mousedown|stopPropagation|preventDefault={unselectRow(
                      val
                    )}
                  >
                    {val.primaryDisplay}
                    <i class="ri-close-line" />
                  </div>
                {/if}
              {/each}
            {:else}
              <span>Nothing Selected</span>
            {/if}
          </div>
        </div>
      </div>
    {:else}
      <div class="listWrapper" on:mousedown|preventDefault={() => {}}>
        <div class="list">
          <div class="options">
            {#key localValue}
              {#if $fetch?.rows.length}
                {#each $fetch?.rows as row, idx (idx)}
                  <div
                    class="option"
                    class:selected={rowSelected(row)}
                    class:highlighted={focusIdx == idx}
                    on:mouseenter={() => (focusIdx = idx)}
                    on:mouseleave={() => (focusIdx = -1)}
                    on:mousedown|preventDefault={selectRow(row)}
                  >
                    {row[primaryDisplay]}
                    <i class="ri-checkbox-circle-fill" />
                  </div>
                {/each}
              {:else}
                <div class="option">No Results Found</div>
              {/if}
            {/key}
          </div>
        </div>
      </div>
    {/if}
  {/if}
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
  }

  .listSelected {
    color: var(--spectrum-global-color-gray-800);
    border-left: 1px solid var(--spectrum-global-color-gray-300);
    padding-left: 0.25rem;
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

    &.wide:hover {
      & > i {
        visibility: visible;
        color: var(--spectrum-global-color-green-500);
      }
    }

    &.selected {
      background-color: var(--spectrum-global-color-gray-75);
      color: var(--spectrum-global-color-gray-900);
      & > i {
        visibility: visible;
        color: var(--spectrum-global-color-green-500);
      }
    }

    &.highlighted {
      background-color: var(--spectrum-global-color-gray-200);
    }
  }

  .options > span {
    color: var(--spectrum-global-color-gray-500);
    font-style: italic;
    flex: auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .option:hover {
    background-color: var(--spectrum-global-color-gray-200);
    border-radius: 4px;
    cursor: pointer;
  }
</style>
