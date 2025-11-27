<script>
  import SuperPopover from "../SuperPopover/SuperPopover.svelte";
  import { createEventDispatcher, onMount } from "svelte";
  import {
    ALL_ICONS,
    ICON_CATEGORIES,
    ICONS_BY_CATEGORY,
  } from "./phosphorIcons";
  import VirtualList from "svelte-virtual-list";

  // Initialize categories with the correct structure
  $: categories = Object.entries(ICON_CATEGORIES).map(([id, label]) => ({
    id,
    label,
    icons: ICONS_BY_CATEGORY[id] || [],
  }));

  // Set the default selected category
  $: if (categories.length > 0 && !selectedCategory) {
    selectedCategory = "all";
  }

  export let value;
  export let cellOptions = {};
  export let align = "left";

  let open = false;
  let preview;
  let searchQuery = "";
  let selectedCategory = "all";
  let hoveredIcon = "";
  $: readonly = cellOptions?.readonly || cellOptions?.disabled;

  const dispatch = createEventDispatcher();

  // Icon state management
  let iconName = "";

  // Update icon name when value changes
  $: if (value) {
    let cleanValue = value.startsWith("ph-") ? value.slice(3) : value;
    iconName = cleanValue;
  } else {
    iconName = "";
  }

  // Filter icons (no variants in Budibase list)
  function filterIcons(icons) {
    return icons;
  }

  // Grid configuration
  const buttonSize = 32; // Fixed button size in pixels
  const rowsToShow = 8;
  const containerPadding = 8; // pixels for top/bottom padding of container
  const itemHeight = buttonSize; // Fixed height per row for the virtual list
  const iconSize = 24; // Size of the icons in pixels
  const iconPadding = 4; // Padding around icons in pixels
  const rowHeight = buttonSize + iconPadding * 2; // Total height for each row including padding
  let rowData = [];

  $: itemsPerRow = cellOptions?.showCategories ? 9 : 6;
  $: containerHeight = buttonSize * rowsToShow + containerPadding * 2;
  $: rowData = generateRowData(
    value,
    itemsPerRow,
    selectedCategory,
    searchQuery
  );

  function generateRowData(
    currentValue,
    itemsPerRow,
    selectedCategory,
    searchQuery
  ) {
    const currentCategory = categories.find(
      (cat) => cat.id === selectedCategory
    );
    if (!currentCategory) return [];

    // Filter (no variants)
    let icons = [...currentCategory.icons];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      icons = icons.filter((icon) => {
        const baseName = icon.replace(/-line|-fill$/, "");
        return baseName.toLowerCase().includes(query);
      });
    }

    // Group icons into rows for the virtual list
    const rows = [];
    for (let i = 0; i < icons.length; i += itemsPerRow) {
      rows.push(icons.slice(i, i + itemsPerRow));
    }

    return rows;
  }

  // Reactive updates are handled in the reactive block above

  const onChange = (icon) => {
    const newValue = icon;
    const selectedValue = newValue === value ? "" : newValue;
    value = selectedValue;
    dispatch("change", selectedValue);
    open = false;
  };

  // Handle mouse enter on icon button
  function handleMouseEnter(icon) {
    hoveredIcon = `ph ph-${icon}`;
  }

  const handleKeydown = (event, icon) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onChange(icon);
    }
  };

  const clearSelection = () => {
    value = "";
    dispatch("change", null);
    hoveredIcon = null;
  };
</script>

<!-- Main preview button -->
<div
  bind:this={preview}
  class="preview-icon"
  class:readonly
  on:click={!readonly
    ? () => {
        open = !open;
      }
    : null}
  on:keydown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!readonly) {
        open = !open;
      }
    }
  }}
  tabindex={readonly ? -1 : 0}
  role="button"
  aria-haspopup="dialog"
  aria-expanded={open}
  aria-label="Select icon"
>
  {#if value}
    <i class="ph ph-{iconName}" />
  {:else}
    <div class="empty-state">
      <i class="ph ph-image" />
    </div>
  {/if}
</div>

<!-- Icon Picker Popover -->
<SuperPopover {open} on:close={() => (open = false)} anchor={preview} {align}>
  <div
    class="icon-picker"
    class:with-categories={cellOptions.showCategories}
    style="
    --icon-size: {iconSize};
    --icon-padding: {iconPadding};
    --items-per-row: {itemsPerRow};
    --row-height: {rowHeight};
  "
  >
    <div class="header">
      {#if cellOptions.showCategories}
        <div class="category-tabs">
          {#each categories as category}
            <button
              class:selected={selectedCategory === category.id}
              on:click={() => (selectedCategory = category.id)}
              aria-label={`Show ${category.label} icons`}
            >
              {category.label}
            </button>
          {/each}
        </div>
      {/if}
      <div class="search-container">
        <i class="ph ph-magnifying-glass search-icon" />
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search icons..."
          class="search-input"
          aria-label="Search icons"
        />
        {#if searchQuery}
          <button
            class="clear-search"
            on:click={() => (searchQuery = "")}
            aria-label="Clear search"
          >
            <i class="ph ph-x" />
          </button>
        {/if}
      </div>
    </div>

    <div class="icons-grid-container">
      {#if rowData.length > 0}
        <VirtualList
          items={rowData}
          {itemHeight}
          height={containerHeight}
          width="100%"
          let:item={rowIcons}
          let:index={rowIndex}
          let:style
        >
          <div class="icons-row" {style}>
            {#each rowIcons as icon}
              <button
                class="icon-button"
                class:selected={iconName === icon}
                on:click={() => onChange(icon)}
                on:keydown={(e) => handleKeydown(e, icon)}
                on:mouseenter={() => handleMouseEnter(icon)}
                on:mouseleave={() => (hoveredIcon = "")}
                aria-label={`Select ${icon} icon`}
                tabindex="0"
              >
                <i class="ph ph-{icon}" />
              </button>
            {/each}
          </div>
        </VirtualList>
      {:else}
        <div class="no-results">
          <i class="ph ph-magnifying-glass" />
          <p>No icons found</p>
        </div>
      {/if}
    </div>

    <div class="footer">
      {#if value}
        <button class="clear-button" on:click={clearSelection}>
          <i class="ph ph-x" /> Clear
        </button>
      {/if}
    </div>
  </div>
</SuperPopover>

<style lang="scss">
  /* @import "@phosphor-icons/web/src/regular/style.css";
  @import "@phosphor-icons/web/src/fill/style.css";
  @import "@phosphor-icons/web/src/bold/style.css"; */

  .preview-icon {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid var(--spectrum-global-color-gray-300);
    border-radius: 4px;
    background-color: var(--spectrum-global-color-gray-50);
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s ease-in-out;
    padding: 2px;
  }

  .preview-icon:hover:not(.readonly) {
    border-color: var(--spectrum-global-color-gray-400);
    background-color: var(--spectrum-global-color-gray-100);
  }

  .preview-icon:focus {
    outline: none;
  }
  .preview-icon.circle {
    border-radius: 50%;
  }

  .preview-icon.readonly {
    cursor: default;
    opacity: 0.7;
  }

  .empty-state {
    color: var(--spectrum-global-color-gray-500);
  }

  .icon-picker {
    max-height: 400px;
    max-width: 14rem;
    display: flex;
    flex-direction: column;
    background: var(--spectrum-global-color-gray-50);
    border-radius: 4px;
    overflow: hidden;
    gap: 0.5rem;

    &.with-categories {
      max-width: 20rem;
    }
  }

  .header {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .search-container {
    position: relative;
  }

  .search-icon {
    position: absolute;
    left: 8px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--spectrum-global-color-gray-500);
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    padding: 12px 32px;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--spectrum-global-color-gray-300);
    border-radius: 0;
    font-size: 14px;
    color: var(--spectrum-global-color-gray-700);
    outline: none;
    transition: border-color 0.2s ease;
  }

  .search-input:focus {
    outline: none;
  }

  .clear-search {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--spectrum-global-color-gray-500);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .category-tabs {
    display: flex;
    overflow-x: auto;
    gap: 4px;
    scrollbar-width: none;
    padding: 0.5rem;
    padding-bottom: none;
  }

  .category-tabs::-webkit-scrollbar {
    display: none; /* Hide scrollbar for Chrome/Safari */
  }

  .category-tabs button {
    padding: 6px 12px;
    border: none;
    background: none;
    border-bottom: 2px solid transparent;
    font-size: 12px;
    font-weight: 500;
    color: var(--spectrum-global-color-gray-700);
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s ease;
    height: 1.75rem;
  }

  .category-tabs button:hover {
    background-color: var(--spectrum-global-color-gray-200);
  }

  .category-tabs button.selected {
    color: var(--spectrum-global-color-blue-600);
    border-bottom: 2px solid var(--spectrum-global-color-blue-600);
    background: none;
  }

  .icons-grid-container {
    position: relative;
    overflow: hidden;
    width: 100%;
    padding-left: 0.5rem;
  }

  .icons-row {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    width: 100%;
    box-sizing: border-box;
    height: 32px;
    align-items: center;
  }

  .with-categories .icons-row {
    grid-template-columns: repeat(9, 1fr);
  }

  .icon-button {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid transparent;
    background: none;
    border-radius: 4px;
    cursor: pointer;
    color: var(--spectrum-global-color-gray-700);
    border: 1px solid var(--spectrum-global-color-gray-100);
    width: 32px;
    height: 32px;
    box-sizing: border-box;
    font-size: 20px;
    opacity: 0.9;
  }
  .icon-button:hover {
    background-color: var(--spectrum-global-color-gray-100);
    color: var(--spectrum-global-color-gray-800);
    opacity: 1;
  }

  .icon-button:focus {
    outline: none;
  }

  .icon-button.selected {
    color: var(--spectrum-global-color-gray-800);
    border: 1px dotted var(--spectrum-global-color-blue-500);
    background-color: var(--spectrum-global-color-gray-200);
  }

  .no-results {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    color: var(--spectrum-global-color-gray-600);
    text-align: center;
  }

  .no-results i {
    font-size: 24px;
    margin-bottom: 8px;
    color: var(--spectrum-global-color-gray-500);
  }

  .footer {
    padding: 0 0.5rem;
    border-top: 1px solid var(--spectrum-global-color-gray-200);
    height: 2rem;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    font-size: 0.75rem;
  }

  .clear-button {
    display: flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    color: var(--spectrum-global-color-gray-700);
    font-size: 12px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
  }

  .clear-button:hover {
    background-color: var(--spectrum-global-color-gray-200);
  }
</style>
