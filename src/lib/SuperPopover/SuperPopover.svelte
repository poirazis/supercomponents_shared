<script>
  import { Portal } from "@jsrob/svelte-portal";
  import { createEventDispatcher } from "svelte";
  import positionDropdown from "../Actions/position_dropdown";
  import clickOutside from "../Actions/click_outside";
  import { fly } from "svelte/transition";

  const dispatch = createEventDispatcher();

  export let anchor;
  export let align = "right";
  export let portalTarget;
  export let minWidth;
  export let maxWidth;
  export let maxHeight;
  export let open = false;
  export let useAnchorWidth = false;
  export let dismissible = true;
  export let offset = 5;
  export let offsetBelow;
  export let customHeight;
  export let animate = true;
  export let customZindex;

  export let handlePositionUpdate;
  export let showPopover = true;
  export let clickOutsideOverride = false;

  export let ignoreAnchor = true;

  export let popup;

  export let className;

  $: target = portalTarget || ".spectrum";

  export const show = () => {
    dispatch("open");
    open = true;
  };

  export const hide = () => {
    dispatch("close");
    open = false;
  };

  export const toggle = () => {
    if (!open) {
      show();
    } else {
      hide();
    }
  };

  export const hasFocus = () => {
    return viewport?.matches(":focus-within");
  };

  const handleOutsideClick = (e) => {
    if (clickOutsideOverride) {
      return;
    }
    if (open) {
      // Stop propagation if the source is the anchor
      let node = e.target;
      let fromAnchor = false;
      while (!fromAnchor && node && node.parentNode) {
        fromAnchor = node === anchor;
        node = node.parentNode;
      }
      // Hide the popover
      if (!fromAnchor || (fromAnchor && !ignoreAnchor)) hide();
    }
  };

  function handleEscape(e) {
    if (!clickOutsideOverride) {
      return;
    }
    if (open && e.key === "Escape") {
      hide();
    }
  }
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
{#if open}
  <Portal {target}>
    <div
      tabindex="0"
      bind:this={popup}
      use:positionDropdown={{
        anchor,
        align,
        maxHeight,
        maxWidth,
        minWidth,
        useAnchorWidth,
        offset,
        offsetBelow,
        customUpdate: handlePositionUpdate,
      }}
      use:clickOutside={{
        callback: dismissible ? handleOutsideClick : () => {},
        anchor,
      }}
      on:keydown={handleEscape}
      class={"spectrum-Popover is-open " + className}
      class:customZindex
      class:hide-popover={open && !showPopover}
      role="presentation"
      style="height: {customHeight}; --customZindex: {customZindex};"
      transition:fly|local={{ y: -20, duration: animate ? 350 : 0 }}
    >
      <slot />
    </div>
  </Portal>
{/if}

<style>
  .hide-popover {
    display: contents;
  }

  .spectrum-Popover {
    border-color: var(--spectrum-global-color-gray-300);
    background-color: var(--spectrum-global-color-gray-50);
    overflow: auto;
  }

  .customZindex {
    z-index: var(--customZindex) !important;
  }
</style>
