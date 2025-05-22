<script>
  import { dndzone } from "svelte-dnd-action";
  import { createEventDispatcher } from "svelte";
  import { generate } from "shortid";
  import { writable, get } from "svelte/store";

  export let items = [];
  export let itemsColors = [];
  export let itemsLabels = [];

  export let showColors;
  export let showHandle = true;
  export let listItemKey;
  export const listItemText = "primaryDisplay";  // Changed to const as it was unused
  export let draggable = true;
  export let focus;
  export let editorState;
  export const cellState = undefined;  // Changed to const as it was unused
  export let reorderOnly;
  export let placeholder;
  export let fullSelection;
  export let readonly;

  let zoneType = generate();

  let store = writable({
    selected: null,
    actions: {
      select: (id) => {
        store.update((state) => ({
          ...state,
          selected: id,
        }));
      },
    },
  });

  $: if (focus && store) {
    get(store).actions.select(focus);
  }

  $: inEdit = !readonly;
  $: showHandle = draggable && inEdit;
  $: isEmpty = draggableItems?.length < 1;

  const dispatch = createEventDispatcher();

  let anchors = {};
  let draggableItems = [];

  // Used for controlling cursor behaviour in order to limit drag behaviour
  // to the drag handle
  export let inactive = true;

  const buildDraggable = (items) => {
    return items
      .map((item) => {
        return {
          id: listItemKey ? item[listItemKey] : generate(),
          color: itemsColors[item],
          item,
          type: zoneType,
        };
      })
      .filter((item) => item.id);
  };

  $: draggableItems = buildDraggable(items);

  const updateRowOrder = (e) => {
    draggableItems = e.detail.items;
  };

  const serialiseUpdate = () => {
    return draggableItems.reduce((acc, ele) => {
      acc.push(ele.item);
      return acc;
    }, []);
  };

  const handleFinalize = (e) => {
    inactive = true;
    updateRowOrder(e);
    dispatch("change", serialiseUpdate());
  };

  const onItemChanged = (e) => {
    dispatch("itemChange", e.detail);
  };

  const removeItem = (id) => {
    let index = draggableItems.findIndex((item) => item.id == id);
    if (index > -1) {
      draggableItems.splice(index, 1);
      dispatch("change", serialiseUpdate());
    }
  };
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions-->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<ul
  class="list-wrap"
  class:inEdit
  use:dndzone={{
    items: draggableItems,
    dropTargetStyle: { outline: "none" },
    dragDisabled: !draggable || inactive,
    type: zoneType,
    dropFromOthersDisabled: true,
  }}
  on:finalize={handleFinalize}
  on:consider={updateRowOrder}
>
  {#each draggableItems as draggableItem, idx (draggableItem.id)}
    <li
      on:click={() => {
        get(store).actions.select(draggableItem.id);
      }}
      bind:this={anchors[draggableItem.id]}
    >
      {#if showHandle}
        <div
          class="handle"
          class:inEdit
          aria-label="drag-handle"
          style={!inactive ? "cursor:grabbing" : "cursor:grab"}
          on:mousedown={() => {
            inactive = false;
          }}
          on:mouseup={() => {
            inactive = true;
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="14"
            height="18"
            ><path
              d="M8.5 7C9.32843 7 10 6.32843 10 5.5C10 4.67157 9.32843 4 8.5 4C7.67157 4 7 4.67157 7 5.5C7 6.32843 7.67157 7 8.5 7ZM8.5 13.5C9.32843 13.5 10 12.8284 10 12C10 11.1716 9.32843 10.5 8.5 10.5C7.67157 10.5 7 11.1716 7 12C7 12.8284 7.67157 13.5 8.5 13.5ZM10 18.5C10 19.3284 9.32843 20 8.5 20C7.67157 20 7 19.3284 7 18.5C7 17.6716 7.67157 17 8.5 17C9.32843 17 10 17.6716 10 18.5ZM15.5 7C16.3284 7 17 6.32843 17 5.5C17 4.67157 16.3284 4 15.5 4C14.6716 4 14 4.67157 14 5.5C14 6.32843 14.6716 7 15.5 7ZM17 12C17 12.8284 16.3284 13.5 15.5 13.5C14.6716 13.5 14 12.8284 14 12C14 11.1716 14.6716 10.5 15.5 10.5C16.3284 10.5 17 11.1716 17 12ZM15.5 20C16.3284 20 17 19.3284 17 18.5C17 17.6716 16.3284 17 15.5 17C14.6716 17 14 17.6716 14 18.5C14 19.3284 14.6716 20 15.5 20Z"
            ></path></svg
          >
        </div>
      {/if}
      <div
        class="right-content"
        class:showColors
        style:--option-color={itemsColors[draggableItem.item]}
      >
        <i class="ri-checkbox-blank-fill" />
        {itemsLabels[draggableItem.item] || draggableItem.item}
      </div>
      {#if !reorderOnly && inEdit}
        <i
          class="ri-close-line"
          on:mousedown|preventDefault={() => removeItem(draggableItem.id)}
        />
      {/if}
    </li>
  {/each}

  {#if inEdit && !reorderOnly}
    <li class="buttons" class:inEdit>
      <div
        class="add-button"
        class:disabled={fullSelection}
        on:click|preventDefault={() => dispatch("togglePicker")}
      >
        {$editorState == "Closed"
          ? fullSelection
            ? "All Selected"
            : "Select"
          : "Close"}
      </div>
      {#if draggableItems.length}
        <div
          class="clear-button"
          on:click|preventDefault={() => dispatch("clear")}
        >
          Clear
        </div>
      {/if}
    </li>
  {:else if items.length < 1}
    <li class="buttons">
      <div class="add-button placeholder">{placeholder}</div>
    </li>
  {/if}
</ul>

<style>
  .list-wrap {
    list-style-type: none;
    margin: 0;
    padding: 0;
    width: 100%;
    border-radius: 4px;
  }
  .list-wrap > li:not(.buttons) {
    background-color: transparent;
    transition: background-color ease-in-out 130ms;
    display: flex;
    align-items: center;
    border-bottom: 1px solid var(--spectrum-global-color-gray-200);
  }
  .list-wrap.inEdit > li:hover {
    background-color: var(
      --spectrum-table-row-background-color-hover,
      var(--spectrum-alias-highlight-hover)
    );
    cursor: pointer;
  }
  .list-wrap > li:first-child {
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
  }
  .list-wrap > li:last-child {
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
    border-bottom: 0px;
  }
  .right-content {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    &.showColors {
      & > i {
        display: block;
        color: var(--option-color);
        font-size: 16px;
      }
    }

    & > i {
      display: none;
    }
  }
  li.buttons {
    display: flex;
    padding: unset !important;
    color: var(--spectrum-global-color-gray-500);

    &.inEdit {
      color: var(--spectrum-global-color-gray-700);
    }
  }
  li.buttons:hover {
    background-color: transparent !important;
  }
  i:hover {
    cursor: pointer;
  }
  .add-button {
    flex: 1;
    min-width: 0;
    display: flex;
    justify-content: center;
    align-items: center;

    &.disabled {
      background-color: var(--spectrum-global-color-gray-200);
      color: var(--spectrum-global-color-gray-500);
    }
    &.placeholder {
      font-style: italic;
      color: var(--spectrum-global-color-gray-500);
    }
  }
  .clear-button {
    flex: 1;
    min-width: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    border-left: 1px solid var(--spectrum-global-color-gray-300);
  }
  .clear-button:hover {
    color: var(--spectrum-global-color-red-500);
    cursor: pointer;
  }
  .list-wrap li {
    padding-left: var(--spacing-s);
    padding-right: var(--spacing-s);
    line-height: 1.85rem;

    &:focus {
      outline: none;
    }
  }
  .handle > svg:hover {
    cursor: grab;
  }

  .handle {
    display: flex;
    min-width: 1.5rem;
    align-items: center;
    color: var(--spectrum-global-color-gray-500);
    fill: var(--spectrum-global-color-gray-700);
    font-size: 14px;
  }
</style>
