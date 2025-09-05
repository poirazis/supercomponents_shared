<script>
  import { getContext } from "svelte";
  import CellString from "../../SuperTableCells/CellString.svelte";
  import CellStringSimple from "../../SuperTableCells/CellStringSimple.svelte";
  const columnSettings = getContext("stColumnOptions");
  const rowCellOptions = getContext("stRowCellOptions");
  const stbState = getContext("stbState");
  const stbSettings = getContext("stbSettings");

  export let row = {};
  export let isFirst;
  export let isLast;
  export let color;

  $: cellComponent =
    $columnSettings.cellComponent === CellStringSimple &&
    $stbSettings.features.canInsert
      ? CellString
      : $columnSettings.cellComponent;
</script>

<div
  class="super-row new-row"
  style:min-height={"2rem"}
  style:color
  class:isLast
>
  <svelte:component
    this={cellComponent}
    cellOptions={{
      ...$rowCellOptions,
      readonly: false,
    }}
    autofocus={isFirst}
    fieldSchema={$columnSettings.schema}
    value={row.value}
    multi={$columnSettings.schema.type == "array"}
    on:change={(e) => {
      stbState.setValue($columnSettings.name, e.detail);
      row.value = e.detail;
    }}
  />
</div>
