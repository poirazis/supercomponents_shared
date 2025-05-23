<script>
  import { getContext, createEventDispatcher } from "svelte";

  const stbScrollPos = getContext("stbScrollPos");
  const stbHorizontalScrollPos = getContext("stbHorizontalScrollPos");
  const stbSettings = getContext("stbSettings");

  export let highlighted;
  export let horizontalOffset = "0px";

  export let clientHeight;
  export let scrollHeight;
  export let scrollWidth;

  export let visible;
  export let horizontalVisible;
  export let anchor;

  const dispatch = createEventDispatcher();

  let startPos;
  let startScrollPos;
  let horizontalStartPos;
  let verticalRange;
  let horizontalRange;
  let dragging = false;
  let horizontalDragging = false;
  let mouseoffset = 0;
  let width;
  let left;
  let localWidth;

  // Positioning Offsets
  $: verticalTopOffset = $stbSettings.appearance.headerHeight + 8 + "px";
  $: verticalBottomOffset = $stbSettings.appearance.footerHeight + 16 + "px";
  $: horizontalBotttomOffset = $stbSettings.appearance.footerHeight + 8 + "px";

  // Scrollbar variables
  $: top = ($stbScrollPos / (scrollHeight + 32)) * 100 + "%";
  $: left = ($stbHorizontalScrollPos / scrollWidth) * 100 + "%";
  $: height = (clientHeight / scrollHeight) * 100 + "%";
  $: verticalRange = Math.max(scrollHeight - clientHeight, 0);
  $: calculate(localWidth, $stbScrollPos);

  export const calculate = () => {
    if (!anchor) return;
    horizontalRange = anchor?.scrollWidth - anchor?.clientWidth;
    visible = verticalRange;
    horizontalVisible = horizontalRange;
    scrollWidth = anchor?.scrollWidth;
    width = (anchor?.clientWidth / anchor?.scrollWidth) * 100 + "%";
  };
</script>

<svelte:window
  on:mouseup={() => {
    dragging = false;
    horizontalDragging = false;
    mouseoffset = 0;
    startPos = 0;
    horizontalStartPos = 0;
  }}
  on:mousemove={dragging || horizontalDragging
    ? (e) => {
        if (dragging) {
          e.preventDefault();
          e.stopPropagation();
          mouseoffset =
            (e.clientY - startPos) * (scrollHeight / clientHeight) +
            startScrollPos;
          if (mouseoffset > 0 && mouseoffset <= verticalRange)
            $stbScrollPos = mouseoffset;
          dispatch("positionChange");
        }
        if (horizontalDragging) {
          e.preventDefault();
          e.stopPropagation();
          mouseoffset =
            (e.clientX - horizontalStartPos) *
              (anchor?.clientWidth / anchor?.scrollWidth) +
            startScrollPos;
          if (mouseoffset > 0 && mouseoffset <= horizontalRange)
            $stbHorizontalScrollPos = mouseoffset;
        }
        anchor.scrollLeft = $stbHorizontalScrollPos;
      }
    : () => {}}
  <
/>

{#if verticalRange}
  <div
    class="stb-scrollbar"
    class:highlighted
    style:--offset={verticalTopOffset}
    style:--bottomOffset={verticalBottomOffset}
  >
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="stb-scrollbar-indicator"
      class:dragging
      style:top
      style:height
      on:mousedown|self={(e) => {
        dragging = true;
        startPos = e.clientY;
        startScrollPos = $stbScrollPos;
      }}
    />
  </div>
{/if}

{#if horizontalRange}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    bind:clientWidth={localWidth}
    class="stb-scrollbar horizontal"
    class:highlighted
    style:--horizontalOffset={horizontalOffset}
    style:--horizontalBottomOffset={horizontalBotttomOffset}
  >
    <div
      class="stb-scrollbar-indicator horizontal"
      style:left
      style:width
      class:dragging={horizontalDragging}
      on:mousedown|self={(e) => {
        horizontalDragging = true;
        horizontalStartPos = e.clientX;
        startScrollPos = $stbHorizontalScrollPos;
      }}
    />
  </div>
{/if}

<style>
  .stb-scrollbar {
    position: absolute;
    right: 8px;
    top: var(--offset);
    bottom: var(--bottomOffset);
    width: 8px;
    border-radius: 4px;
    opacity: 0.2;
    z-index: 1;
    transition: 230ms;
    overflow: hidden;
  }

  .stb-scrollbar.horizontal {
    top: unset;
    bottom: var(--horizontalBottomOffset);
    left: calc(var(--horizontalOffset) + 8px);
    width: calc(100% - 32px - var(--horizontalOffset));
    height: 8px;
  }

  .highlighted {
    opacity: 0.55 !important;
  }
  .stb-scrollbar-indicator {
    position: relative;
    width: 100%;
    border-radius: 4px;
    background-color: var(--spectrum-global-color-gray-500);
    min-height: 2rem;
    z-index: 2;
  }
  .stb-scrollbar-indicator:hover {
    cursor: pointer;
    background-color: var(--spectrum-global-color-gray-700);
  }
  .stb-scrollbar-indicator.dragging,
  .stb-scrollbar-indicator.horizontal.dragging {
    cursor: pointer;
    background-color: var(--spectrum-global-color-gray-700) !important;
  }

  .stb-scrollbar-indicator.horizontal {
    min-height: unset;
    min-width: 2rem;
    height: 100%;
  }
</style>
