<script>
  import { getContext } from "svelte";
  import SuperPopover from "../../SuperPopover/SuperPopover.svelte";
  import SuperButton from "../../SuperButton/SuperButton.svelte";

  const stbAPI = getContext("stbAPI");
  const stbMenuID = getContext("stbMenuID");
  const stbMenuAnchor = getContext("stbMenuAnchor");

  export let rowContextMenuItems;
  export let right = true;

  $: isOpen = $stbMenuAnchor != -1;
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->

{#if isOpen && rowContextMenuItems.length}
  <SuperPopover
    open
    anchor={$stbMenuAnchor}
    align={right ? "right" : "left"}
    on:close={() => ($stbMenuAnchor = -1)}
  >
    <div class="action-menu">
      {#each rowContextMenuItems as { text, icon, disabled, onClick, size, type }}
        <SuperButton
          {size}
          {type}
          {icon}
          fillOnHover="true"
          {text}
          disabled={disabled || !onClick}
          quiet={true}
          menuItem
          menuAlign={right ? "right" : "left"}
          on:click={() => {
            stbAPI.executeRowContextMenuAction($stbMenuID, onClick);
            $stbMenuID = -1;
            $stbMenuAnchor = -1;
          }}
        />
      {/each}
    </div>
  </SuperPopover>
{/if}

<style>
  .action-menu {
    min-width: 120px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    border: 1px solid var(--spectrum-global-color-gray-100);
  }
</style>
