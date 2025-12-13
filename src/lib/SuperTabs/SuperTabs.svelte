<script>
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  export let containers;
  export let direction;
  export let selectedTab;
  export let hAlign;
  export let vAlign;
  export let theme = "buttons";
  export let tabsPosition = "top";
  export let tabsAlignment;
  export let buttonsAlignment = "flex-start";
  export let tabsIconsOnly;
  export let list_icon;
  export let list_title;
  export let wide = true;

  export let quietTabs;

  // Computed for repeated logic
  $: isVertical = tabsPosition == "left" || theme === "list";
  $: justify = direction === "row" ? hAlign : vAlign;
  $: button = theme === "buttons" || theme === "wideButtons";
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
{#if containers?.length}
  <div
    class="outer-tabs"
    class:quietTabs
    class:list={theme === "list"}
    class:vertical={isVertical}
    class:wide={theme === "wideButtons" && wide}
    style:justify-content={justify}
  >
    <div
      class="tabs"
      class:vertical={isVertical}
      class:buttons={button}
      class:list={theme === "list"}
      class:wide={theme === "wideButtons" && wide}
      style:justify-content={buttonsAlignment}
      style:--tab-alignment={tabsAlignment}
      style:--tab-track-thickness="1px"
    >
      {#if theme === "list" && list_title}
        <div class="tab list-title">
          {#if list_icon}
            <i class={list_icon} />
          {/if}
          {list_title}
        </div>
      {/if}
      {#each containers as container, idx (idx)}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <button
          class="tab"
          class:vertical={isVertical}
          class:button
          style:flex={buttonsAlignment == "stretch" ? "1" : null}
          class:list={theme === "list"}
          class:selected={container.id === selectedTab}
          class:disabled={container.disabled}
          class:list-section={container.isTabSection}
          on:click={() => {
            if (!container.disabled && !container.isTabSection)
              dispatch("change", container);
          }}
        >
          {#if container.icon}
            <i
              class={container.icon}
              style:font-size={tabsIconsOnly ? "20px" : null}
              style:color={container.color}
            />
          {/if}

          {#if !tabsIconsOnly || !container.icon}
            <span class="tab-text">
              {container.title || "Tab " + idx}
            </span>
          {/if}
        </button>
      {/each}
    </div>
  </div>
{/if}

<style>
  .outer-tabs {
    flex: none;
    display: flex;
    flex-direction: row;
    width: 100%;
    overflow: hidden;
    position: relative;
    justify-content: stretch;
    margin-bottom: 0.5rem;
    --selected-tab: var(--spectrum-global-color-gray-100);
  }

  .outer-tabs.vertical {
    flex-direction: column;
    align-items: stretch;
    margin-right: 0.75rem;
    margin-bottom: unset;
    width: 10rem;
    background-color: var(--spectrum-global-color-gray-100);
    --selected-tab: var(--spectrum-global-color-gray-200);
  }

  .outer-tabs.vertical.wide {
    width: 14rem;
  }

  .tabs {
    flex: auto;
    display: flex;
    gap: 1rem;
    padding: 0.35rem 0.5rem;
    border-bottom: 1px solid var(--spectrum-global-color-gray-200);
    border-top: 1px solid var(--spectrum-global-color-gray-200);
  }

  .tabs.buttons {
    gap: 0.5rem;
  }

  .tabs.list {
    gap: 0;
    background-color: var(--spectrum-global-color-gray-50);
    border: unset;
    padding: unset;
  }

  .tabs.vertical {
    flex-direction: column;
    border-bottom: unset;
    border-top: unset;
    gap: 0.25rem;
  }

  .tabs.vertical.list {
    border-right: unset;
  }

  .tab {
    position: relative;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: var(--tab-alignment);
    color: var(--spectrum-global-color-gray-600);
    font-size: 13px;
    background: transparent;
    border: none;
  }

  .tab.disabled {
    color: var(--spectrum-global-color-gray-400);
  }

  .tab.disabled:hover {
    cursor: not-allowed;
  }

  .tab.button {
    border-radius: 4px;
    padding: 0.35rem 1rem;
  }

  .tab.button.vertical {
    width: 100%;
  }

  .tab.button:active:not(.disabled):not(.list-section) {
    background-color: var(--spectrum-global-color-gray-200);
  }

  .tab.button.selected {
    color: var(--spectrum-global-color-gray-800);
    background-color: var(--spectrum-global-color-gray-300);
  }

  .tab.list {
    padding: 0.5rem 1rem;
    max-width: 100%;
    color: var(--spectrum-global-color-gray-700);
    font-weight: 400;
  }

  .tab.list.selected {
    color: var(--tab-selected-color);
    background-color: var(--selected-tab);
    font-weight: 500;
  }

  .tab.list:hover:not(.disabled):not(.list-section) {
    background-color: var(--spectrum-global-color-gray-75);
  }

  .tab.list-title {
    padding: 0.75rem 1rem;
    max-width: 100%;
    font-size: 12px;
    color: var(--spectrum-global-color-gray-800);
    text-transform: uppercase;
    letter-spacing: 1.2px;
    font-weight: 500;
    border-bottom: 1px solid var(--spectrum-global-color-gray-300);
    height: 3rem;
  }

  .tab.list-section {
    text-transform: uppercase;
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 1.2px;
    background-color: transparent;
  }

  .tab.list-section.vertical {
    margin-top: 12px;
  }

  .tab.list-section:hover {
    cursor: default;
  }

  .tab:hover:not(.disabled):not(.list-title):not(.list-section) {
    cursor: pointer;
    color: var(--spectrum-global-color-gray-800);
  }

  .tab.button:hover:not(.selected) {
    background-color: var(--spectrum-global-color-gray-200);
  }

  .tab.selected {
    color: var(--tab-selected-color);
  }

  .tab.selected:hover {
    cursor: default;
  }

  .tab-text {
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }
</style>
