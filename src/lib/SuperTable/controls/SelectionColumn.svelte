<script>
  import { getContext } from "svelte";

  import Checkbox from "../../UI/elements/Checkbox.svelte";
  import IconButton from "../..//UI/elements/IconButton.svelte";

  const stbState = getContext("stbState");
  const stbSettings = getContext("stbSettings");
  const stbHorizontalScrollPos = getContext("stbHorizontalScrollPos");
  const stbHovered = getContext("stbHovered");
  const stbMenuID = getContext("stbMenuID");
  const stbSelected = getContext("stbSelected");
  const stbAPI = getContext("stbAPI");
  const stbVisibleRows = getContext("stbVisibleRows");
  const stbRowMetadata = getContext("stbRowMetadata");

  export let sticky;
  export let hideSelectionColumn;
  export let stbData;

  $: partialSelection =
    $stbSelected.length && $stbSelected.length != $stbData?.rows?.length;

  $: fullSelection =
    $stbSelected.length == $stbData?.rows?.length && $stbData?.rows?.length > 0;

  $: numbering = $stbSettings.appearance.numberingColumn;
  $: checkBoxes = $stbSettings.features.canSelect && !hideSelectionColumn;
  $: canDelete = $stbSettings.features.canDelete;
  $: sticky = $stbHorizontalScrollPos > 0;
  $: visible = numbering || checkBoxes || canDelete;
  $: zebra = $stbSettings.appearance.zebraColors;
  $: quiet = $stbSettings.appearance.quiet;
  $: headerCheckbox =
    checkBoxes &&
    $stbSettings.features.maxSelected != 1 &&
    $stbVisibleRows.length > 0;
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
{#if visible}
  <div class="super-column control-column" class:sticky>
    {#if $stbSettings?.showHeader}
      <div class="control-column-header" style:gap={"1rem"}>
        {#if numbering}
          <span class="row-number"></span>
        {/if}

        {#if headerCheckbox}
          <Checkbox
            checked={fullSelection}
            partial={partialSelection}
            on:change={stbAPI.selectAllRows}
          />
        {/if}

        {#if canDelete && $stbSelected.length > 1}
          <IconButton
            icon="trash"
            size="small"
            variant="warning"
            disabled={$stbSelected.length == 0}
            tooltip="Delete Selected Rows"
            on:click={stbAPI.deleteSelectedRows}
          />
        {/if}
      </div>
    {/if}

    <div
      class="super-column-body"
      class:zebra
      class:quiet
      class:sticky
      style:margin-top={"var(--super-column-top-offset)"}
    >
      {#each $stbVisibleRows as visibleRow (visibleRow)}
        {@const selected = $stbRowMetadata[visibleRow]?.selected}
        <div
          class="super-row selection"
          class:is-selected={selected}
          class:is-hovered={$stbHovered == visibleRow ||
            $stbMenuID == visibleRow}
          class:is-disabled={$stbRowMetadata[visibleRow]?.disabled}
          style:min-height={$stbRowMetadata[visibleRow]?.height}
          on:mouseenter={() => ($stbHovered = visibleRow)}
          on:mouseleave={() => ($stbHovered = null)}
        >
          {#if numbering}
            <div class="row-number">
              {visibleRow + 1}
            </div>
          {/if}

          {#if $stbSettings.features.canSelect && !hideSelectionColumn}
            <Checkbox
              checked={selected}
              disabled={$stbRowMetadata[visibleRow]?.disabled}
              hovered={$stbHovered == visibleRow}
              on:change={() => stbAPI.selectRow(visibleRow)}
            />
          {/if}

          {#if canDelete}
            <IconButton
              icon="trash"
              size="small"
              variant="warning"
              disabled={$stbRowMetadata[visibleRow]?.disabled}
              tooltip="Delete Row"
              on:click={() => stbAPI.deleteRow(visibleRow)}
            />
          {/if}
        </div>
      {/each}

      {#if $stbState == "Inserting"}
        <div class="add-row" style="padding: unset;"></div>
      {/if}
    </div>

    {#if $stbSettings.showFooter}
      <div class="super-column-footer" style:padding={"unset"}></div>
    {/if}
  </div>
{/if}

<style>
  .selection {
    flex: auto;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    gap: 1rem;
    font-size: 13px;
    font-weight: 500;
    align-items: center;
  }
</style>
