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

{#if isOpen && rowContextMenuItems?.length}
  <SuperPopover
    open
    anchor={$stbMenuAnchor}
    align={right ? "right" : "left"}
    ignoreAnchor={false}
    on:close={() => {
      $stbMenuID = -1;
      $stbMenuAnchor = -1;
    }}
  >
    <div class="action-menu">
      {#each rowContextMenuItems as { text, icon, disabled, onClick, size, type }}
        <SuperButton
          {size}
          {type}
          {icon}
          {text}
          {disabled}
          quiet={true}
          menuItem
          menuAlign={right ? "right" : "left"}
          onClick={() => {
            stbAPI.executeRowContextMenuAction($stbMenuID, onClick);
          }}
        />
      {/each}
    </div>
  </SuperPopover>
{/if}

<style>
  .action-menu {
    min-width: 160px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    padding: 0.25rem;
  }
</style>
