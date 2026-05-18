<script lang="ts">
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let checked: boolean | null = false;
  export let disabled: boolean = false;
  export let hovered: boolean = false;
  export let size: "small" | "medium" | "large" = "medium";
  export let tristate: boolean = false;

  function toggle() {
    if (disabled) return;

    if (tristate) {
      // Three-state cycle: off -> on -> null -> off
      if (checked === false) {
        checked = true;
      } else if (checked === true) {
        checked = null;
      } else {
        checked = false;
      }
    } else {
      // Two-state toggle: off -> on -> off
      checked = !checked;
    }

    dispatch("change", { checked });
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="switch-container {size}"
  class:checked={checked === true}
  class:indeterminate={checked === null}
  class:disabled
  class:hovered
  on:click|stopPropagation={toggle}
>
  <div class="switch-track">
    <div class="switch-thumb"></div>
  </div>
</div>

<style>
  .switch-container {
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    user-select: none;
  }

  .switch-container.disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .switch-track {
    position: relative;
    background-color: var(--spectrum-global-color-gray-400);
    border-radius: 1rem;
  }

  .switch-thumb {
    position: absolute;
    background-color: var(--spectrum-global-color-gray-50);
    border-radius: 50%;
    transition: transform 0.2s ease-in-out;
  }

  /* Small size */
  .switch-container.small .switch-track {
    width: 2rem;
    height: 1rem;
  }

  .switch-container.small .switch-thumb {
    width: 0.7rem;
    height: 0.7rem;
    top: 0.15rem;
    left: 0.15rem;
  }

  .switch-container.small.checked .switch-thumb {
    transform: translateX(1rem);
  }

  .switch-container.small.checked .switch-track {
    justify-content: flex-end;
  }

  .switch-container.small.indeterminate .switch-thumb {
    transform: translateX(0.45rem);
  }

  /* Medium size */
  .switch-container.medium .switch-track {
    width: 2.5rem;
    height: 1.25rem;
  }

  .switch-container.medium .switch-thumb {
    width: 1rem;
    height: 1rem;
    top: 0.125rem;
    left: 0.125rem;
  }

  .switch-container.medium.checked .switch-thumb {
    transform: translateX(1.25rem);
  }

  .switch-container.medium.indeterminate .switch-thumb {
    transform: translateX(0.625rem);
  }

  /* Large size */
  .switch-container.large .switch-track {
    width: 3rem;
    height: 1.5rem;
  }

  .switch-container.large .switch-thumb {
    width: 1.25rem;
    height: 1.25rem;
    top: 0.125rem;
    left: 0.125rem;
  }

  .switch-container.large.checked .switch-thumb {
    transform: translateX(1.5rem);
  }

  .switch-container.large.indeterminate .switch-thumb {
    transform: translateX(0.75rem);
  }

  /* Checked state */
  .switch-container.checked .switch-track {
    background-color: var(--spectrum-global-color-blue-500);
  }

  /* Indeterminate state */
  .switch-container.indeterminate .switch-track {
    background-color: var(--spectrum-global-color-orange-500);
  }

  /* Hover state */
  .switch-container:hover:not(.disabled),
  .switch-container.hovered:not(.disabled) {
    filter: brightness(1.1);
  }

  /* Focus state */
  .switch-container:focus-visible {
    outline: 2px solid var(--spectrum-global-color-blue-600);
    outline-offset: 2px;
    border-radius: 0.5rem;
  }
</style>
