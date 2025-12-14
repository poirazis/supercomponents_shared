<script lang="ts">
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let checked: boolean = false;
  export let partial: boolean = false;
  export let disabled: boolean = false;

  function toggle() {
    if (disabled) return;
    checked = !checked;
    dispatch("change", { checked });
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<button class:checked on:click={toggle}>
  {#if checked}
    <i class="ph ph-check" />
  {:else if partial}
    <i class="ph ph-minus" />
  {/if}
</button>

<style>
  button {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1rem;
    height: 1rem;
    border-radius: 0.25rem;
    border: 1px solid var(--spectrum-global-color-gray-500);
    background-color: var(--spectrum-global-color-gray-50);
  }

  button.checked {
    border-color: var(--spectrum-global-color-gray-700);
  }

  i {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--spectrum-global-color-gray-700);
  }
</style>
