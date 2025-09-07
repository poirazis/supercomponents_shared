<script>
  import { getContext, setContext, onMount, onDestroy } from "svelte";
  import fsm from "svelte-fsm";

  const { memo, derivedMemo, processStringSync, builderStore } =
    getContext("sdk");

  import SuperColumnHeader from "./parts/SuperColumnHeader.svelte";
  import SuperColumnBody from "./parts/SuperColumnBody.svelte";
  import SuperColumnFooter from "./parts/SuperColumnFooter.svelte";

  import CellOptions from "../SuperTableCells/CellOptions.svelte";
  import CellString from "../SuperTableCells/CellString.svelte";
  import CellNumber from "../SuperTableCells/CellNumber.svelte";
  import CellBoolean from "../SuperTableCells/CellBoolean.svelte";
  import CellDatetime from "../SuperTableCells/CellDatetime.svelte";
  import CellLink from "../SuperTableCells/CellLink.svelte";
  import CellJSON from "../SuperTableCells/CellJSON.svelte";
  import CellAttachment from "../SuperTableCells/CellAttachment.svelte";

  import CellStringSimple from "../SuperTableCells/CellStringSimple.svelte";
  import CellLinkAdvanced from "../SuperTableCells/CellLinkAdvanced.svelte";

  const stbData = getContext("stbData");
  const stbSettings = getContext("stbSettings");
  const stbSortColumn = getContext("stbSortColumn");
  const stbSortOrder = getContext("stbSortOrder");
  const stbHovered = getContext("stbHovered");
  const stbEditing = getContext("stbEditing");
  const stbState = getContext("stbState");
  const stbAPI = getContext("stbAPI");

  // Cell Components Map
  const cellComponents = {
    string: CellString,
    longform: CellString,
    number: CellNumber,
    bigint: CellNumber,
    options: CellOptions,
    array: CellOptions,
    jsonarray: CellOptions,
    boolean: CellBoolean,
    datetime: CellDatetime,
    link: CellLink,
    json: CellJSON,
    attachment_single: CellAttachment,
    attachment: CellAttachment,
    bb_reference_single: CellLink,
    bb_reference: CellLink,
  };

  const headerComponents = {
    string: CellString,
    number: CellNumber,
    bigint: CellNumber,
    options: CellOptions,
    array: CellOptions,
    jsonarray: CellOptions,
    boolean: CellBoolean,
    datetime: CellDatetime,
    link: CellString,
    json: CellJSON,
    attachment_single: null,
    attachment: null,
    bb_reference_single: CellString,
    bb_reference: CellString,
  };

  // Props
  export let columnOptions;
  export let sticky;
  export let scrollPos;

  // Internal Variables
  let id = Math.random() * 100;
  let resizing;
  let considerResizing;
  let startPoint;
  let startWidth = 0;
  let width;

  let lockWidth = memo(0);

  let sorted;
  let viewport;

  $: inBuilder = $builderStore?.inBuilder;
  $: columnOptionsStore.set({
    ...columnOptions,
    inBuilder,
    cellComponent: getCellComponent(columnOptions.schema),
    headerComponent:
      headerComponents[columnOptions?.schema?.type] ?? CellString,
    background:
      sticky && scrollPos
        ? "var(--spectrum-global-color-gray-75)"
        : columnOptions.quiet
          ? "transparent"
          : columnOptions.background,
  });

  $: maxWidth = getMaxWidth($lockWidth, $columnOptionsStore);
  $: minWidth = getMinWidth($lockWidth, $columnOptionsStore);

  $: footerLabel = $columnOptionsStore.footerTemplate
    ? processStringSync($columnOptionsStore.footerTemplate, {
        values,
      })
    : undefined;

  $: values = $stbData?.rows?.map((row) =>
    deepGet(row, $columnOptionsStore.name)
  );

  $: if ($stbSortColumn == $columnOptionsStore.name) {
    sorted = $stbSortOrder;
  } else if ($stbSortColumn != $columnOptionsStore.name && sorted) {
    sorted = undefined;
  }

  const columnOptionsStore = memo({
    ...columnOptions,
    cellComponent: cellComponents[columnOptions?.schema?.type] ?? CellString,
    headerComponent:
      headerComponents[columnOptions?.schema?.type] ?? CellString,
  });

  const rowCellOptions = derivedMemo(
    columnOptionsStore,
    ($columnOptionsStore) => {
      return {
        role: "tableCell",
        showDirty: true,
        readonly: !$columnOptionsStore.canEdit,
        align: $columnOptionsStore.align,
        template: $columnOptionsStore.template,
        optionsViewMode: $columnOptionsStore.optionsViewMode,
        relViewMode: $columnOptionsStore.relViewMode,
        padding: $columnOptionsStore.isFirst ? "1rem" : "0.5rem",
        background: $columnOptionsStore.background,
        color: $columnOptionsStore.color,
        controlType: "checkbox",
      };
    }
  );

  const headerCellOptions = derivedMemo(
    columnOptionsStore,
    ($columnOptionsStore) => {
      return {
        align: $columnOptionsStore?.align,
        color: $columnOptionsStore?.color,
        background: "var(--spectrum-global-color-gray-50)",
        fontWeight: $columnOptionsStore?.fontWeight,
        padding: $columnOptionsStore?.cellPadding,
        placeholder: $columnOptionsStore.defaultFilteringOperator,
        clearValueIcon: true,
        optionsViewMode: "text",
        optionsSource: "schema",
        debounce: 250,
        controlType: "select",
        initialState: "Editing",
        role: "inlineInput",
      };
    }
  );

  // Allow the Super Table to bind to the Super Column State Machine to control it
  export const columnState = fsm("Idle", {
    "*": {
      reset() {
        return "Idle";
      },
      headerClicked() {
        if ($columnOptionsStore.canFilter) this.filter();
        else this.sort();
      },
      sort() {
        if (columnOptions.canSort) {
          stbState.sortBy(
            columnOptions.name,
            sorted == "ascending" ? "descending" : "ascending"
          );
          sorted = "ascending" ? "descending" : "ascending";
        }
      },
      lockWidth() {
        if (!resizing) $lockWidth = viewport.clientWidth;
      },
      unlockWidth() {
        if (resizing) return;
        $lockWidth = 0;
        if (!columnOptions.asComponent) this.lockWidth.debounce(200);
      },
      startResizing(e) {
        e.stopPropagation();
        e.preventDefault();
        resizing = true;
        startPoint = e.clientX;
        startWidth = viewport.clientWidth;
        $lockWidth = startWidth;
      },
      resize(e) {
        $lockWidth = startWidth + e.clientX - startPoint;
      },
      stopResizing(e) {
        e.preventDefault();
        e.stopPropagation();
        resizing = false;
        startPoint = undefined;
        width = $lockWidth;
      },
      resetSize(e) {
        e.preventDefault();
        e.stopPropagation();
        $lockWidth = 0;
        width = 0;
      },
    },
    Idle: {
      _enter() {
        $lockWidth = 0;
      },
      filter() {
        return columnOptions.canFilter ? "Entering" : "Idle";
      },
      enteredit(index) {
        if (inBuilder) return;
        $stbEditing = index;
        stbState.edit();
        return "EditingCell";
      },
      addRow() {
        return "Inserting";
      },
    },
    Entering: {
      _enter() {
        $lockWidth = viewport.clientWidth;
      },
      filter(filterObj) {
        stbState.addFilter({ ...filterObj, id: id });
        return "Filtered";
      },
      cancel() {
        return "Idle";
      },
      clear() {
        return "Idle";
      },
    },
    Filtered: {
      filter(filterObj) {
        stbState.removeFilter(id);
        stbState.addFilter({ ...filterObj, id: id });
      },
      clear() {
        stbState.clearFilter(id);
        return "Entering";
      },
    },
    EditingCell: {
      _enter() {
        $lockWidth = viewport.clientWidth;
        stbState.edit.debounce(30);
      },
      patchRow(index, id, rev, field, change) {
        stbState.patchRow(index, id, rev, field, change);
      },
      exitedit(index) {
        $stbEditing = -1;
        stbState.endEdit.debounce(50);
        return "Idle";
      },
    },
    Inserting: {
      _enter() {
        $lockWidth = viewport.clientWidth;
      },
      _exit() {
        $lockWidth = 0;
      },
      cancelAddRow() {
        return "Idle";
      },
    },
  });

  const deepGet = (obj, path) => {
    if (obj && path?.includes(".")) {
      for (var i = 0, path = path.split("."), len = path.length; i < len; i++) {
        if (obj[path[i]]) obj = obj[path[i]];
        else {
          obj = null;
          break;
        }
      }
      return obj;
    } else return obj[path] ?? undefined;
  };

  const getMinWidth = (val, options) => {
    if (val > 0) return val;
    if (options.widthOverride) return options.widthOverride;

    return options.sizing == "fixed" ? options.fixedWidth : options.minWidth;
  };

  const getMaxWidth = (val, options) => {
    if (val > 0) return val;
    if (options.widthOverride) return options.widthOverride;

    return options.sizing == "fixed" ? options.fixedWidth : "unset";
  };

  const getCellComponent = (columnSchema) => {
    let comp;
    let editable = columnOptions.canEdit;

    if (columnSchema?.type == "json") {
      comp = cellComponents[columnSchema?.type] || CellString;
    } else {
      comp = cellComponents[columnSchema?.type] || CellString;
    }

    if (comp == CellString && !editable) comp = CellStringSimple;

    return comp;
  };

  setContext("stColumnOptions", columnOptionsStore);
  setContext("stRowCellOptions", rowCellOptions);
  setContext("stHeaderCellOptions", headerCellOptions);
  setContext("stColumnState", columnState);

  onMount(() => {
    stbAPI?.registerSuperColumn(id, columnState);

    // Auto-lock width after initial render for flexible columns only
    if (
      ($columnOptionsStore.sizing === "flexible" ||
        $columnOptionsStore.sizing === "flex") &&
      $columnOptionsStore.sizing !== "fixed"
    ) {
      // Use a timeout to ensure the DOM has rendered
      setTimeout(() => {
        if (viewport && $lockWidth === 0 && !columnOptions.asComponent) {
          $lockWidth = viewport.clientWidth;
        }
      }, 0);
    }
  });

  onDestroy(() => {
    stbAPI?.unregisterSuperColumn(id);
  });
</script>

<svelte:window
  on:mouseup={(e) => {
    if (resizing) columnState.stopResizing(e);
  }}
  on:mousemove={(e) => {
    if (resizing) columnState.resize(e);
  }}
/>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  bind:this={viewport}
  class="super-column"
  class:sticky={sticky && scrollPos}
  class:resizing
  class:considerResizing={considerResizing && !resizing}
  class:isLast={$columnOptionsStore.isLast}
  style:max-width={maxWidth}
  style:min-width={minWidth}
  on:mouseleave={() => ($stbHovered = null)}
>
  {#if $columnOptionsStore.showHeader && $columnOptionsStore.canResize}
    <div
      class="grabber"
      style:height={$columnOptionsStore.headerHeight - 16}
      on:mousedown={columnState.startResizing}
      on:dblclick={columnState.resetSize}
      on:mouseenter={() => (considerResizing = true)}
      on:mouseleave={() => (considerResizing = false)}
    />
  {/if}

  {#if $columnOptionsStore.showHeader}
    <SuperColumnHeader {sorted} />
  {/if}

  <SuperColumnBody
    rows={$stbData.rows}
    rowHeight={$stbSettings.appearance.rowHeight}
    field={$columnOptionsStore.name}
    idField={$stbSettings.data.idColumn}
    zebra={$stbSettings.appearance.zebraColors}
    isLast={$columnOptionsStore.isLast}
    isFirst={$columnOptionsStore.isFirst}
    canInsert={$stbSettings.features.canInsert}
  >
    <slot />
  </SuperColumnBody>

  {#if $columnOptionsStore.showFooter}
    <SuperColumnFooter {footerLabel} />
  {/if}
</div>

<style>
  .super-column {
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
    user-select: none;
    /* Touch devices */
    touch-action: manipulation;
  }

  .grabber {
    position: absolute;
    top: 0;
    right: 0;
    width: 8px;
    cursor: ew-resize;
    z-index: 1;
  }

  .grabber:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }

  .super-column.sticky {
    position: sticky;
    left: 0;
    z-index: 10;
  }

  .super-column.resizing {
    cursor: ew-resize;
  }
</style>
