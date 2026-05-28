<script lang="ts">
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let checked: boolean = false;
  export let partial: boolean = false;
  export let disabled: boolean = false;
  export let hovered: boolean = false;
  export let locked: boolean = false;
  export let size: "small" | "medium" | "large" = "small";

  function toggle() {
    if (disabled || locked) return;
    checked = !checked;
    dispatch("change", { checked });
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<button
  class:checked
  class:disabled
  class:hovered
  class:locked
  class={size}
  on:click={toggle}
>
  {#if checked}
    <i class="ph ph-bold ph-check"></i>
  {:else if partial}
    <i class="ph ph-minus"></i>
  {:else if locked}
    <i class="ph ph-lock"></i>
  {/if}
</button>

<style>
  button {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.25rem;
    border: 1px solid var(--spectrum-global-color-gray-500);
    background-color: var(--spectrum-global-color-gray-50);
    transition: all 0.1s ease-in-out;
  }

  /* Small size */
  button.small {
    width: 0.85rem;
    height: 0.85rem;
  }

  button.small i {
    font-size: 0.65rem;
  }

  /* Medium size */
  button.medium {
    width: 1rem;
    height: 1rem;
  }

  button.medium i {
    font-size: 0.75rem;
  }

  /* Large size */
  button.large {
    width: 1.25rem;
    height: 1.25rem;
  }

  button.large i {
    font-size: 0.9rem;
  }

  button.checked {
    border-color: var(--spectrum-global-color-blue-600) !important;
    background-color: var(--spectrum-global-color-blue-600);

    & i {
      color: white;
      font-weight: 900;
    }
  }

  button.disabled {
    cursor: not-allowed;
    background-color: var(--spectrum-global-color-gray-200);
    border-color: var(--spectrum-global-color-gray-300);
  }

  button.locked {
    border-color: transparent;
  }

  button.locked i {
    font-size: 1rem !important;
    font-weight: 400 !important;
    color: var(--spectrum-global-color-gray-500) !important;
  }

  button:hover:not(.disabled):not(.locked):not(.checked) {
    background-color: var(--spectrum-global-color-gray-100);
    border-color: var(--spectrum-global-color-gray-600);
  }

  button.hovered:not(.disabled):not(.locked):not(.checked) {
    border: 1px solid var(--spectrum-global-color-gray-600);
  }

  button:active:not(.disabled):not(.locked):not(.checked) {
    background-color: var(--spectrum-global-color-blue-100);
  }
  button:focus:not(.disabled):not(.locked) {
    border: 1px solid var(--spectrum-global-color-gray-700);
  }

  i {
    font-weight: 700;
    color: var(--spectrum-global-color-gray-700);
    animation: scaleIn 0.13s ease-out;
  }

  @keyframes scaleIn {
    from {
      transform: scale(0);
    }
    to {
      transform: scale(1);
    }
  }
</style>
