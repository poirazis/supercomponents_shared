<script>
  import { createEventDispatcher, onDestroy } from "svelte";
  import Tooltip from "../UI/elements/Tooltip.svelte";
  const dispatch = createEventDispatcher();

  export let tree;
  export let open = false;
  export let nodeSelection;
  export let selectedNodes;
  export let selectedGroups;

  $: if (tree.disabled) open = false;
  $: selected = tree.isGroup
    ? $selectedGroups.includes(tree.id)
    : !!$selectedNodes.find((x) => x.id == tree.id);

  $: if (hasSelectedDescendant(tree.children || [])) open = true;

  let labelElement;
  let tooltipShow = false;
  let tooltipTimer;

  $: isOverflowing =
    labelElement && labelElement.scrollWidth > labelElement.clientWidth;

  $: tooltip = isOverflowing ? tree.label || "Not Set" : null;

  const showTooltip = () => {
    if (!tooltip) return;
    if (tooltipTimer) clearTimeout(tooltipTimer);
    tooltipTimer = setTimeout(() => {
      tooltipShow = true;
    }, 750);
  };

  const hideTooltip = () => {
    if (tooltipTimer) {
      clearTimeout(tooltipTimer);
      tooltipTimer = null;
    }
    tooltipShow = false;
  };

  const toggleOpen = (e) => {
    if (tree.disabled) return;
    if (open && hasSelectedDescendant(tree.children || [])) return;
    open = !open;
    dispatch("nodeClick", { id: tree.id, label: tree.label });
  };

  // Recursion
  const hasSelectedDescendant = (children) => {
    if (!children || !children.length) return false;
    for (let child of children) {
      if (
        child.isGroup
          ? $selectedGroups.includes(child.id)
          : $selectedNodes.some((node) => node.id === child.id)
      ) {
        return true;
      }
      if (hasSelectedDescendant(child.children)) {
        return true;
      }
    }
    return false;
  };

  const toggleNode = (e) => {
    dispatch("nodeSelect", {
      id: tree.id,
      label: tree.label,
      row: tree.row,
      group: tree.group,
    });
  };

  onDestroy(() => {
    if (tooltipTimer) clearTimeout(tooltipTimer);
  });
</script>

<!-- svelte-ignore a11y-missing-attribute -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<li
  class="spectrum-TreeView-item"
  class:is-disabled={tree.disabled}
  class:is-open={open}
>
  <div class="spectrum-TreeView-itemLink" style:padding-right={"0.5rem"}>
    <i
      class={"ri-arrow-right-s-line"}
      class:open
      class:is-disabled={tree.children.length == 0 || tree.disabled}
      style:font-size={"16px"}
      style:z-index={"1"}
      on:mousedown|stopPropagation={toggleOpen}
    ></i>
    <div
      style:width={"100%"}
      style:z-index={"1"}
      on:mousedown|stopPropagation|preventDefault={toggleNode}
    >
      <div
        class="spectrum-TreeView-itemLabel"
        style:padding-left={"0.25rem"}
        style:z-index={"10"}
        style:text-overflow={"ellipsis"}
        style:overflow={"hidden"}
        style:white-space={"nowrap"}
        bind:this={labelElement}
        on:mouseenter={showTooltip}
        on:mouseleave={hideTooltip}
      >
        {tree.label || "Not Set"}
      </div>
    </div>

    {#if selected}
      <i
        class={"ri-checkbox-circle-fill"}
        style:color={"var(--spectrum-global-color-green-500)"}
        style:font-size={"16px"}
      ></i>
    {/if}
  </div>

  {#if tooltip}
    <Tooltip anchor={labelElement} content={tooltip} show={tooltipShow} />
  {/if}

  {#if tree.children?.length}
    <ul class="spectrum-TreeView">
      {#each tree.children as node, idx}
        <svelte:self
          tree={node}
          {nodeSelection}
          {selectedNodes}
          {selectedGroups}
          open={node.open}
          on:nodeSelect
          on:nodeClick
        ></svelte:self>
      {/each}
    </ul>
  {/if}
</li>

<style>
  .spectrum-TreeView-item {
    transition: all 130ms;
  }

  .spectrum-TreeView-itemLink {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.25rem;
    max-height: 1.75rem;
    padding: 0.25rem 0.5rem;
  }

  i {
    transition: all 130ms;
  }

  i.is-disabled {
    opacity: 0.3;
    pointer-events: none;
  }
  .open {
    transform: rotate(90deg);
  }
</style>
