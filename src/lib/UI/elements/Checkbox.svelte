<script lang="ts">
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let checked: boolean = false;
  export let partial: boolean = false;
  export let disabled: boolean = false;
  export let hovered: boolean = false;

  function toggle() {
    if (disabled) return;
    checked = !checked;
    dispatch("change", { checked });
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<button class:checked class:disabled class:hovered on:click={toggle}>
  {#if checked}
    <i class="ph ph-check"></i>
  {:else if partial}
    <i class="ph ph-minus"></i>
  {/if}
</button>

<style>
  button {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 0.85rem;
    height: 0.85rem;
    border-radius: 0.25rem;
    border: 1px solid var(--spectrum-global-color-gray-500);
    background-color: var(--spectrum-global-color-gray-50);
    transition: all 0.1s ease-in-out;
  }

  button.checked {
    border-color: var(--spectrum-global-color-gray-700);
  }

  button.disabled {
    cursor: not-allowed;
    background-color: var(--spectrum-global-color-gray-200);
    border-color: var(--spectrum-global-color-gray-300);
  }

  button:hover:not(.disabled),
  button.hovered:not(.disabled) {
    border: 1px solid var(--spectrum-global-color-gray-600);
  }

  button:active {
    background-color: var(--spectrum-global-color-blue-100);
  }
  button:focus {
    border: 1px solid var(--spectrum-global-color-gray-700);
  }

  i {
    font-size: 0.65rem;
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
