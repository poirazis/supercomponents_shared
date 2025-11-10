<script>
  import { getContext } from "svelte";
  import SuperPopover from "../../SuperPopover/SuperPopover.svelte";
  import SuperButton from "../../SuperButton/SuperButton.svelte";

  const stbSettings = getContext("stbSettings");
  const stbState = getContext("stbState");
  const stbData = getContext("stbData");
  const stbHorizontalScrollPos = getContext("stbHorizontalScrollPos");
  const stbHovered = getContext("stbHovered");
  const stbSelected = getContext("stbSelected");
  const stbEditing = getContext("stbEditing");
  const stbMenuID = getContext("stbMenuID");
  const rowMetadata = getContext("stbRowMetadata");
  const stbVisibleRows = getContext("stbVisibleRows");

  const stbAPI = getContext("stbAPI");

  const { processStringSync } = getContext("sdk");

  export let right;
  export let rowMenu;
  export let rowMenuItems;
  export let menuItemsVisible = 0;
  export let canScroll;

  let menuAnchor;
  let openMenu;

  $: quiet = $stbSettings.appearance.quiet;
  $: menuIcon = $stbSettings.rowMenuIcon;
  $: idColumn = $stbSettings.data.idColumn;
  $: sticky = $stbHorizontalScrollPos > 0 && !right;
  $: inInsert = $stbState == "Inserting";

  $: inlineButtons =
    menuItemsVisible < rowMenuItems?.length
      ? rowMenuItems.slice(0, menuItemsVisible)
      : rowMenuItems;

  $: menuItems =
    menuItemsVisible < rowMenuItems?.length
      ? rowMenuItems.slice(menuItemsVisible, rowMenuItems.length)
      : [];

  const handleMenu = (e, index) => {
    menuAnchor = e.target;
    openMenu = !openMenu;
    $stbMenuID = openMenu ? index : -1;
  };
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="super-column" class:right class:sticky style:flex="none">
  {#if $stbSettings.showHeader}
    <div class="super-column-header"><span> </span></div>
  {/if}

  <div
    class="super-column-body"
    style:margin-top={"var(--super-column-top-offset)"}
    class:quiet
    class:sticky
    class:zebra={$stbSettings.appearance.zebraColors}
  >
    {#each $stbVisibleRows as visibleRow}
      {@const row = $stbData?.rows?.[visibleRow]}
      <div
        class="super-row"
        on:mouseenter={() => ($stbHovered = visibleRow)}
        on:mouseleave={() => ($stbHovered = null)}
        class:is-selected={$stbSelected?.includes(row[idColumn] ?? visibleRow)}
        class:is-hovered={$stbHovered == visibleRow || $stbMenuID == visibleRow}
        class:is-editing={$stbEditing == visibleRow}
        class:is-disabled={$rowMetadata[visibleRow].disabled}
        style:min-height={$rowMetadata[visibleRow].height}
        style:padding-right={canScroll && right ? "1.5rem" : "0.5rem"}
      >
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          class="row-buttons"
          style:gap={inlineButtons.length > 1 ? "0.5rem" : "0rem"}
        >
          {#if rowMenu && inlineButtons?.length}
            {#each inlineButtons as { text, icon, disabled, onClick, quiet, type, conditions }}
              {#if stbAPI.shouldShowButton(conditions || [], stbAPI.enrichContext(row))}
                <SuperButton
                  size="S"
                  {icon}
                  {text}
                  disabled={disabled ||
                    $stbEditing == visibleRow ||
                    $rowMetadata[visibleRow].disabled}
                  {quiet}
                  type={type == "primary" ? "ink" : type}
                  onClick={() => {
                    stbAPI.executeRowButtonAction(visibleRow, onClick);
                  }}
                />
              {/if}
            {/each}
          {/if}
          {#if rowMenu && menuItems?.length}
            <SuperButton
              size="S"
              icon={menuIcon}
              fillOnHover="true"
              text=""
              quiet="true"
              type="secondary"
              onClick={(e) => handleMenu(e, visibleRow)}
            />
          {/if}
        </div>
      </div>
    {/each}
  </div>
  {#if inInsert}
    <div class="add-row" style="padding: unset;"></div>
  {/if}

  {#if $stbSettings.showFooter}
    <div class="super-column-footer"></div>
  {/if}
</div>

{#if openMenu}
  <SuperPopover
    open
    anchor={menuAnchor}
    minWidth={150}
    align={right ? "right" : "left"}
    on:close={() => {
      openMenu = false;
      $stbMenuID = undefined;
    }}
  >
    {#if menuItems?.length}
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="action-menu">
        {#each menuItems as { text, icon, disabled, onClick, size }}
          <SuperButton
            {size}
            {icon}
            {text}
            {disabled}
            menuItem
            menuAlign={right ? "right" : "left"}
            onClick={() => {
              stbAPI.executeRowButtonAction($stbMenuID, onClick);
              openMenu = false;
              $stbMenuID = undefined;
            }}
          />
        {/each}
      </div>
    {/if}
  </SuperPopover>
{/if}

<style>
  .row-buttons {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding-left: 0.5rem;
    background: transparent;
  }

  .action-menu {
    min-width: 160px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    padding: 0.25rem;
  }
</style>
