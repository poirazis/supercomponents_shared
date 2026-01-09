<script>
  import SuperPopover from "../../SuperPopover/SuperPopover.svelte";
  import { onDestroy } from "svelte";

  export let anchor;
  export let content;
  export let show = false;
  export let delay = 750;
  export let align = "top";

  let timer;
  let isHovered = false;

  const startTimer = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      show = true;
    }, delay);
  };

  const clearTimer = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    show = false;
  };

  const handleMouseEnter = () => {
    isHovered = true;
    startTimer();
  };

  const handleMouseLeave = () => {
    isHovered = false;
    clearTimer();
  };

  onDestroy(() => {
    clearTimer();
  });
</script>

{#if show}
  <SuperPopover {anchor} {align} open={show} dismissible={false} animate={true}>
    <div class="tooltip-content">
      {content}
    </div>
  </SuperPopover>
{/if}

<style>
  .tooltip-content {
    padding: 8px 12px;
    font-size: 12px;
    line-height: 1.4;
    color: var(--spectrum-global-color-gray-900);
    background-color: var(--spectrum-global-color-gray-50);
    border: 1px solid var(--spectrum-global-color-gray-300);
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    max-width: 200px;
    word-wrap: break-word;
  }
</style>
