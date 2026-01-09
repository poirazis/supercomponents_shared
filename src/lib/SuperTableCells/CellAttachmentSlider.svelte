<script lang="ts">
  // @ts-ignore
  import Carousel from "svelte-carousel";
  import { createEventDispatcher, tick } from "svelte";
  import fsm from "svelte-fsm";
  import "./CellCommon.css";
  import SuperLightbox from "../SuperLightbox/SuperLightbox.svelte";

  export let value: any;
  export let cellOptions: any;
  export let fieldSchema: any;
  export let tableid: string;
  export let API;
  export let inBuilder;

  const dispatch = createEventDispatcher();

  let originalValue: any = value;
  let anchor: any;
  let picker: any;
  let open: any;
  let fileInput: any; // Reference to hidden file input
  let selectedIndices: Set<number> = new Set(); // Track selected item indices

  $: multi = fieldSchema?.type?.includes("single") !== true;
  $: localvalue = value && multi ? value : value ? [value] : [];
  $: canAdd = !cellOptions.readonly && !cellOptions.disabled;
  $: isGallery = cellOptions.isGallery;
  $: disabled = cellOptions.disabled;
  $: readonly = cellOptions.readonly;
  $: canSelect = !readonly && !disabled && !isGallery;
  $: canDelete = !readonly && !disabled && !isGallery;
  $: slotted = cellOptions.slotted;

  // Carousel configuration
  let currentIndex = 0;
  $: dots =
    cellOptions.carouselDots !== undefined
      ? cellOptions.carouselDots
      : localvalue?.length > 1;
  $: arrows =
    cellOptions.carouselArrows !== undefined
      ? cellOptions.carouselArrows
      : localvalue?.length > 1;
  $: infinite =
    cellOptions.carouselInfinite !== undefined
      ? cellOptions.carouselInfinite
      : localvalue?.length > 1;
  $: autoplay =
    cellOptions.carouselAutoplay !== undefined
      ? cellOptions.carouselAutoplay
      : false;
  $: duration =
    cellOptions.carouselAutoplaySpeed !== undefined
      ? cellOptions.carouselAutoplaySpeed
      : 1000;
  $: particlesToShow =
    cellOptions.carouselItemsToShow !== undefined
      ? cellOptions.carouselItemsToShow
      : 3;
  $: particlesToScroll =
    cellOptions.carouselItemsToScroll !== undefined
      ? cellOptions.carouselItemsToScroll
      : 1;

  $: marquee = cellOptions.carouselMode === "marquee";
  $: onClickAction = cellOptions.onClickAction;

  // Handle slide change

  export let cellState = fsm(cellOptions.initialState ?? "View", {
    "*": {
      goTo(state) {
        return state;
      },
    },
    View: {
      _enter() {
        open = false;
      },
      focus() {
        if (!cellOptions.readonly) return "Editing";
      },
    },
    Editing: {
      _enter() {
        originalValue = value;
        anchor?.focus();
        dispatch("enteredit");
      },
      _exit() {
        dispatch("exitedit");
      },
      focousout(e) {
        if (!anchor?.contains(e.relatedTarget)) {
          return "View";
        }
      },
      change(e) {
        if (cellOptions.debounce) dispatch("change", value);
      },
      submit(e) {
        if (!picker?.contains(e.relatedTarget)) {
          if (value !== originalValue) {
            dispatch("change", value);
          }
          dispatch("focusout");
          return "View";
        }
      },
      cancel() {
        value = originalValue;
        return "View";
      },
    },
  });

  // Process files using FormData, consistent with stock implementation
  const processFiles = async (fileList: File[]) => {
    let data = new FormData();
    for (let i = 0; i < fileList.length; i++) {
      data.append("file", fileList[i]);
    }

    try {
      // @ts-ignore - API is a global in Budibase
      let res = await API.uploadAttachment(tableid, data);
      dispatch("change", [...localvalue, ...res]);
      return res;
    } catch (error) {
      console.error("Upload failed:", error);
      return [];
    }
  };

  // Handle delete
  function handleDelete(key: number) {
    localvalue.splice(key, 1);
    localvalue = [...localvalue];
    dispatch("change", localvalue);
  }

  // Selection functions
  function toggleSelection(index: number) {
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    selectedIndices = newSet;
  }

  // Upload new attachments
  function uploadNewAttachment() {
    if (fileInput) {
      fileInput.click();
    }
  }

  // Handle file upload for carousel
  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = Array.from(target.files || []);

    processFiles(files);
  }

  // Modal state - now using SuperLightbox
  let showModal = false;
  let modalImageIndex = 0;

  // Unified click handler for items in carousel and grid modes
  function onItemClick(index: number) {
    if (!onClickAction || onClickAction === "none") {
      return;
    } else if (onClickAction === "view") {
      openModal(index);
    } else if (onClickAction === "select") {
      toggleSelection(index);
    } else if (onClickAction === "custom") {
      let item = localvalue[index];
      cellOptions.onItemClick?.({ item, index });
    }
  }

  // Open modal with current carousel slide
  function openModal(index: number = currentIndex) {
    if (
      !disabled &&
      !inBuilder &&
      localvalue?.[index] &&
      isImage(localvalue[index])
    ) {
      modalImageIndex = index;
      showModal = true;
    }
  }

  // Helper to check if attachment is an image
  function isImage(attachment: any) {
    const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp"];
    return imageExtensions.includes(attachment.extension?.toLowerCase());
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="superCell"
  bind:this={anchor}
  class:multirow={true}
  class:inEdit={$cellState == "Editing"}
  class:inline={cellOptions.role == "tableCell"}
  class:tableCell={cellOptions.role == "tableCell"}
  class:formInput={cellOptions.role == "formInput"}
  class:disabled={cellOptions.disabled}
  class:readonly={cellOptions.readonly}
  style:color={cellOptions.color}
  style:background={cellOptions.background}
  style:overflow={"hidden"}
  on:focusin={cellState.focus}
  on:focusout={cellState.focousout}
  tabindex="0"
>
  <div class="slider">
    {#if localvalue?.length}
      {#key particlesToShow}
        <Carousel
          {particlesToShow}
          {particlesToScroll}
          dots={dots && !marquee}
          arrows={arrows && !marquee}
          {infinite}
          autoplay={autoplay || marquee}
          height={"100%"}
        >
          <div
            slot="prev"
            let:showPrevPage
            on:click={showPrevPage}
            class="slider-navbutton"
          >
            <i class="ph ph-caret-left"></i>
          </div>
          {#each localvalue as attachment, idx (idx)}
            <div
              class="slider-item"
              style:height={"100%"}
              on:click={() => {
                onItemClick(idx);
              }}
            >
              {#if isImage(attachment)}
                <div
                  class="slider-image"
                  class:selected={selectedIndices.has(idx)}
                  style="background-image: url('{attachment.url}')"
                  aria-label={attachment.name}
                >
                  {#if slotted}
                    <div class="slot-container">
                      <slot />
                    </div>
                  {/if}
                </div>
              {:else if !isGallery}
                <div class="slider-fallback">
                  <div class="pill">
                    {attachment.extension?.toUpperCase()}
                  </div>
                  <span class="filename">{attachment.name}</span>
                </div>
              {/if}
            </div>
          {/each}

          <div
            slot="next"
            let:showNextPage
            on:click={showNextPage}
            class="slider-navbutton"
          >
            <i class="ph ph-caret-right"></i>
          </div>
        </Carousel>
      {/key}
    {:else if !isGallery}
      <div class="slider-placeholder">
        {#if canAdd}
          <button
            class="btn-upload-empty"
            on:click={uploadNewAttachment}
            aria-label="Upload attachment"
            type="button"
            disabled={cellOptions.disabled || cellOptions.readonly}
          >
            <i class="ph ph-plus"></i>
            Upload Attachment
          </button>
        {/if}
      </div>
    {/if}
  </div>

  <!-- File input for uploading attachments, hidden from view -->
  <input
    type="file"
    bind:this={fileInput}
    on:change={handleFileSelect}
    multiple={multi}
    style="display: none"
  />

  <!-- SuperLightbox for image preview -->
  <SuperLightbox
    bind:items={localvalue}
    bind:open={showModal}
    bind:currentIndex={modalImageIndex}
    bind:selectedIndices
    on:close={() => console.log("lightbox closed")}
    on:delete={(e) => {
      handleDelete(e.detail.index);
    }}
    {canSelect}
    {canDelete}
  />
</div>

<style>
  .pill {
    border: 1px solid var(--spectrum-global-color-gray-500);
    padding: 0rem 0.25rem;
    border-radius: 3px;
    font-size: 11px;
    display: flex;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    justify-content: center;
  }

  .filename {
    flex: auto;
    line-height: 22px;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    color: var(--spectrum-global-color-gray-700);
    font-size: 12px;
  }

  /* Slider styles */
  .slider {
    flex: auto;
    display: flex;
    flex-direction: row;
    align-items: stretch;
    justify-content: stretch;
    height: 100%;
    width: 100%;
  }

  :global(.slider .sc-carousel__content-container) {
    height: 100%;
  }

  .slider-item {
    flex: 0 0 100%;
    min-width: 100%;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
  }

  .slider-image {
    position: relative;
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    border-radius: 4px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    padding: 1rem;
  }

  .slider-image.selected::after {
    content: "\2713";
    position: absolute;
    top: 1rem;
    left: 1rem;
    width: 1.5rem;
    height: 1.5rem;
    background: var(--spectrum-global-color-blue-600);
    border-radius: 4px;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1rem;
    font-weight: bold;
  }

  .slider-image:hover .slot-container {
    opacity: 1;
  }

  .slider-fallback {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .slider-fallback .filename {
    font-size: 14px;
    color: var(--spectrum-global-color-gray-700);
    text-align: center;
  }

  .slider-placeholder {
    flex: 1;
    width: 100%;
    height: 100%;
    color: var(--spectrum-global-color-gray-500);
    font-style: italic;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .slider-navbutton {
    display: flex;
    align-items: center;
    padding: 0 0.5rem;
  }

  .slider-navbutton:hover {
    color: var(--spectrum-global-color-blue-600);
    cursor: pointer;
  }

  .btn-upload-empty {
    background: none;
    border: 2px dashed var(--spectrum-global-color-gray-400);
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: all 0.2s ease;
    color: var(--spectrum-global-color-gray-600);
    font-size: 14px;
    padding: 1rem;
  }

  .btn-upload-empty:hover:not(:disabled) {
    border-color: var(--spectrum-global-color-blue-500);
    color: var(--spectrum-global-color-blue-500);
    background-color: var(--spectrum-global-color-blue-50);
  }

  .slot-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: stretch;
    justify-content: stretch;
    background-color: rgba(0, 0, 0, 0.5);
    opacity: 0;
  }
</style>
