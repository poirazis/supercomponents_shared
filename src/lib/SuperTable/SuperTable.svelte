<script lang="ts">
  import { getContext, setContext, onDestroy, tick } from "svelte";
  import fsm from "svelte-fsm";
  import { writable } from "svelte/store";
  import {
    LogicalOperator,
    EmptyFilterOption,
    SearchFilters,
  } from "@budibase/types";

  import "./SuperTable.css";
  import {
    sizingMap,
    defaultOperatorMap,
    supportFilteringMap,
    supportSortingMap,
    supportEditingMap,
  } from "./constants.js";

  // Overlays
  import ScrollbarsOverlay from "./overlays/ScrollbarsOverlay.svelte";
  import EmptyResultSetOverlay from "./overlays/EmptyResultSetOverlay.svelte";
  import AddNewRowOverlay from "./overlays/AddNewRowOverlay.svelte";
  import SelectedActionsOverlay from "./overlays/SelectedActionsOverlay.svelte";
  import LoadingOverlay from "./overlays/LoadingOverlay.svelte";

  // Components
  import SuperTableColumn from "../SuperTableColumn/SuperTableColumn.svelte";
  import CellSkeleton from "../SuperTableCells/CellSkeleton.svelte";
  import RowButtonsColumn from "./controls/RowButtonsColumn.svelte";
  import SelectionColumn from "./controls/SelectionColumn.svelte";
  import RowContextMenu from "./overlays/RowContextMenu.svelte";

  // Sections
  import ControlSection from "./controls/ControlSection.svelte";
  import ColumnsSection from "./controls/ColumnsSection.svelte";

  const {
    API,
    processStringSync,
    notificationStore,
    enrichButtonActions,
    ActionTypes,
    Provider,
    fetchData,
    QueryUtils,
    memo,
    derivedMemo,
    builderStore,
  } = getContext("sdk");

  const context = getContext("context");

  const component = getContext("component");

  // Internally used to appropriately enrich context
  // this is component.id of the wrapper component seen by budibase
  export let comp_id;
  export let inBuilder;

  // Properties
  export let datasource;
  export let idColumn = "_id";
  export let sortColumn;
  export let sortOrder;
  export let limit = 50;
  export let fetchOnScroll = true;
  export let autoRefreshRate;
  export let paginate;
  export let filter;

  export let columnList;

  export let tableActions;

  export let showFooter;
  export let showHeader = true;
  export let size = "M";
  export let canInsert, canDelete, canEdit, canResize, canFilter, canSelect;
  export let superColumnsPos;
  export let showAutoColumns;
  export let showSpecialColumns;

  export let debounce = 750;
  export let rowMenu;
  export let rowMenuItems;
  export let rowMenuIcon = "ri-more-fill";
  export let menuItemsVisible = 0;
  export let rowContextMenuItems;

  export let preselectedIds;
  export let hideSelectionColumn;
  export let numberingColumn;
  export let stickFirstColumn = false;
  export let maxSelected = 0;
  export let selectedActions;

  export let beautifyLabels;
  export let columnSizing = "flex";
  export let columnMinWidth = "7rem";
  export let columnMaxWidth = "auto";
  export let columnFixedWidth = "7rem";
  export let dividers = "horizontal";
  export let dividersColor;

  export let rowColorTemplate, rowBGColorTemplate, rowDisabledTemplate;
  export let rowHeight;

  export let footerColorTemplate, footerBGColorTemplate;

  export let useOptionColors = true;
  export let optionsViewMode = "colorText";
  export let relViewMode = "pills";
  export let zebraColors = false;
  export let quiet;
  export let highlighters;
  export let entitySingular = "Row";
  export let entityPlural = "Rows";

  // Events
  export let onRowSelect;
  export let onCellChange;
  export let onRowClick;
  export let onCellClick;
  export let onLinkClick;
  export let onRowDblClick;
  export let onInsert;
  export let afterInsert;
  export let onDelete;
  export let afterDelete;
  export let afterEdit;
  export let onRefresh;

  const dataSourceStore = memo(datasource);
  const columnsStore = writable([]);
  const filterStore = memo(filter);

  $: dataSourceStore.set(datasource);

  $: filterStore.set(filter);
  $: stbData = createFetch($dataSourceStore);
  $: stbSchema.set($stbData?.definition?.schema);

  // Memoize schema changes - only update when schema actually changes
  let previousSchema = null;

  $: {
    const newSchema = $stbData?.definition?.schema;

    // Check if schema has actually changed
    const schemaChanged =
      JSON.stringify(newSchema) !== JSON.stringify(previousSchema);

    if (schemaChanged) {
      memoizedSchema.set(newSchema);
      previousSchema = newSchema;
      // Reset columnsStore only when schema changes
      columnsStore.set(columnList || []);
    }
  }

  // Update columnsStore when columnList changes
  $: columnsStore.set(columnList || []);

  $: _rowHeight = rowHeight
    ? toNumber(
        processStringSync(rowHeight, {
          [comp_id]: { row: {} },
        })
      ) || sizingMap[size].rowHeight
    : sizingMap[size].rowHeight;

  // Internal Variables
  let timer;

  let highlighted;
  let scrollHeight;
  let clientHeight;
  let columnStates = [];
  let canScroll;
  let horizontalVisible;
  let maxBodyHeight;
  let viewport;
  let columnsViewport;
  let touchStartY = 0;
  let touchStartX = 0;
  let overflow;
  let isEmpty;
  let _limit = limit;
  let start = 0;
  let end = 0;

  // Scrolling width lock variables
  let scrollLockTimeout;
  let isScrolling = false;
  let tableWidth = 0;

  // Keep track of the applied query extentions when filtering
  let stbColumnFilters = new Set();
  let queryExtensions = {};

  // Inserting New Record
  let temp_scroll_pos;
  const new_row = writable({});
  let errorTimer; // Timer for auto-clearing errors

  // Turm non primitive props into reactive stores to limit refreshes

  const stbSettings = memo({});
  const stbSchema = memo({});
  const memoizedSchema = memo({});
  // Create Stores
  const stbScrollPos = memo(0);
  const stbScrollOffset = memo(0);
  const stbScrollPercent = memo(0);
  const stbHorizontalScrollPos = memo(0);
  const stbHorizontalScrollPercent = memo(0);

  const stbVisibleRows = memo([]);

  const stbMenuID = memo(-1);
  const stbMenuAnchor = memo(-1);
  const stbSelected = memo([]);
  const maxSelectedStore = memo(maxSelected);
  $: maxSelectedStore.set(maxSelected);
  $: stbSelectedRows = derivedMemo(
    [stbData, stbSelected, maxSelectedStore],
    ([$stbData, $stbSelected, $maxSelectedStore]) => {
      const selectedRows = $stbData?.rows?.filter((row) =>
        $stbSelected?.includes(row[idColumn])
      );
      if ($maxSelectedStore === 1) {
        return selectedRows.length > 0 ? selectedRows[0] : null;
      }
      return selectedRows;
    }
  );

  const stbHovered = memo(-1);
  const stbEditing = memo(-1);
  const stbSortColumn = memo({});
  const stbSortOrder = memo({});

  const specialColumns = [
    "created_by",
    "created_at",
    "updated_by",
    "updated_at",
    "deleted_by",
    "deleted_at",
  ];

  // Update Settings Reactively so children can react to changes
  $: stbSettings.set({
    inBuilder: $builderStore?.inBuilder,
    showAutoColumns,
    showSpecialColumns,
    superColumnsPos,
    columnSizing: columnSizing || "flexible",
    columnMaxWidth: columnMaxWidth || "auto",
    columnMinWidth: columnMinWidth || "7rem",
    columnFixedWidth: columnFixedWidth || "7rem",
    debounce,
    hideSelectionColumn,
    dividers,
    dividersColor,
    showFooter,
    showHeader,
    rowMenuIcon,
    features: {
      canSelect,
      maxSelected,
      canFilter,
      canEdit,
      canDelete,
      canInsert,
      canResize,
    },
    data: {
      datasource,
      idColumn,
      filter,
      sortColumn,
      sortOrder,
      limit,
      emptyMessage: entityPlural
        ? "No " + entityPlural + " found"
        : "No Rows Found",
      paginate,
      autoRefreshRate,
      fetchOnScroll,
    },
    appearance: {
      size,
      headerHeight: showHeader ? sizingMap[size].headerHeight : 0,
      footerHeight: showFooter ? sizingMap[size].headerHeight : 0,
      rowHeight: _rowHeight,
      numberingColumn,
      hideSelectionColumn,
      quiet,
      useOptionColors,
      optionsViewMode,
      relViewMode,
      zebraColors,
      dynamicColors: true,
      highlighters,
      rowColorTemplate,
      rowBGColorTemplate,
      rowDisabledTemplate,
      footerColorTemplate,
      footerBGColorTemplate,
      cellPadding: sizingMap[size].cellPadding,
      beautifyLabels,
    },
    events: {
      onRowClick,
      onRowDblClick,
      onCellChange,
      onRowSelect,
      onDelete,
      afterDelete,
    },
  });

  $: stbRowMetadata = derivedMemo(
    [stbData, stbSettings],
    ([$stbData, $stbSettings]) => {
      if (!$stbData?.loaded) return [];
      return (
        $stbData?.rows?.map((row) => ({
          height: rowHeight
            ? toNumber(
                processStringSync(rowHeight, {
                  ...$context,
                  [comp_id]: { row },
                })
              ) || $stbSettings.appearance.rowHeight
            : $stbSettings.appearance.rowHeight,
          bgcolor: rowBGColorTemplate
            ? processStringSync(rowBGColorTemplate, {
                ...$context,
                [comp_id]: { row },
              })
            : undefined,
          color: rowColorTemplate
            ? processStringSync(rowColorTemplate, {
                ...$context,
                [comp_id]: { row },
              })
            : undefined,
          disabled: rowDisabledTemplate
            ? processStringSync(rowDisabledTemplate, {
                ...$context,
                [comp_id]: { row },
              })
            : undefined,
        })) || [{}]
      );
    }
  );

  $: cumulativeHeights = derivedMemo(
    [stbRowMetadata, stbSettings],
    ([$meta, $settings]) => {
      const defaultRowHeight = $settings.appearance?.rowHeight || 36;
      return $meta.map((_, i) =>
        $meta
          .slice(0, i + 1)
          .reduce(
            (sum, meta) => sum + Math.max(meta.height || defaultRowHeight, 0),
            0
          )
      );
    }
  );

  // The Super Table API
  const tableAPI = {
    unflattenObject: (obj, delimiter = ".") => {
      if (!obj) return {};

      return Object.keys(obj).reduce((res, k) => {
        const keys = k.split(delimiter);
        keys.reduce((acc, e, i) => {
          // Check if this is the last key in the path
          if (i === keys.length - 1) {
            acc[e] = obj[k]; // Assign the original value (including booleans)
            return acc;
          }

          // Determine the type for the next level
          const nextKey = keys[i + 1];
          if (!acc[e]) {
            acc[e] = isNaN(Number(nextKey)) ? {} : [];
          }
          return acc[e];
        }, res);
        return res;
      }, {});
    },
    populateColumns: (schema, list, auto, special) => {
      let jsoncolumnslist = [];
      let autocolumnsList = [];
      let specialColumnsList = [];
      let columns = [];

      if (schema) {
        if (list?.length) {
          columns = list.map((column) => {
            return tableAPI.enrichColumn(schema, {
              ...column,
              field: column.name,
            });
          });
        } else {
          if (auto) {
            autocolumnsList = Object.keys(schema)
              .filter((v) => schema[v]?.autocolumn)
              .map((v) => tableAPI.enrichColumn(schema, schema[v]));
          }

          if (special) {
            specialColumnsList = Object.keys(schema)
              .filter((v) => specialColumns.includes(v))
              .map((v) => tableAPI.enrichColumn(schema, schema[v]));
          }

          jsoncolumnslist = Object.keys(schema)
            .filter((v) => schema[v].nestedJSON)
            .map((v) => tableAPI.enrichColumn(schema, schema[v]));

          columns = Object.keys(schema)
            .filter(
              (v) =>
                !schema[v].autocolumn &&
                !specialColumns.includes(v) &&
                !schema[v].nestedJSON &&
                schema[v]?.visible != false &&
                v != idColumn
            )
            .map((v) => {
              return tableAPI.enrichColumn(schema, schema[v]);
            });
        }

        return [
          ...autocolumnsList,
          ...columns,
          ...jsoncolumnslist,
          ...specialColumnsList,
        ].sort((a, b) => a.order - b.order);
      }
      return [];
    },
    enrichColumn: (schema, bbcolumn) => {
      let type;
      let columnSchema;
      let isSelf;

      if (bbcolumn.name.includes(".")) {
        let words = bbcolumn.name.split(".");
        let outerSchema = schema[words[0]]?.schema;
        if (outerSchema && outerSchema[words[1]]) {
          columnSchema = outerSchema[words[1]];
          type = columnSchema.type;
        } else {
          // Handle case where nested column doesn't exist
          type = "string"; // Default type
          columnSchema = {};
        }
      } else {
        columnSchema = schema[bbcolumn.field];
        if (columnSchema) {
          type = columnSchema.type;
        } else {
          // Handle case where column doesn't exist in schema
          type = "string"; // Default type
          columnSchema = {};
        }

        if (bbcolumn.name.startsWith("fk_self_")) {
          isSelf = true;
          type = "link";
          columnSchema = {
            ...columnSchema,
            tableId: $dataSourceStore.tableId,
            relationshipType: "self",
            recursiveTable: true,
            primaryDisplay: $stbData?.definition?.primaryDisplay,
            type: "link",
          };
        }
      }

      return {
        ...bbcolumn,
        widthOverride: bbcolumn.width,
        readonly: columnSchema?.readonly,
        canEdit:
          supportEditingMap[type] &&
          canEdit &&
          !columnSchema?.readonly &&
          !isSelf &&
          !bbcolumn.autocolumn,
        canFilter: supportFilteringMap[type] ? canFilter : false,
        canSort: supportSortingMap[type],
        filteringOperators: QueryUtils.getValidOperatorsForType({ type }),
        defaultFilteringOperator: defaultOperatorMap[type],
        headerAlign: bbcolumn.align ? bbcolumn.align : "flex-start",
        type,
        displayName: beautifyLabel(bbcolumn.displayName ?? bbcolumn.field),
        schema: columnSchema,
      };
    },
    enrichContext: (row) => {
      return {
        ...$context,
        [comp_id]: {
          ...$context[comp_id],
          row,
        },
      };
    },
    registerSuperColumn: (id, state) => {
      columnStates = [...columnStates, { id, state }];
    },
    unregisterSuperColumn: (id) => {
      let pos = columnStates.findIndex((col) => col.id == id);
      if (pos > -1) {
        columnStates.splice(pos, 1);
        columnStates = columnStates;
      }
    },
    executeRowButtonAction: async (index, action) => {
      let cmd = enrichButtonActions(
        action,
        tableAPI.enrichContext($stbData.rows[index])
      );
      await cmd?.();
    },
    executeRowOnClickAction: async (index) => {
      await tableAPI.executeRowButtonAction(index, onRowClick);
    },
    executeCellOnClickAction: async (index, column, value, id) => {
      let cmd = enrichButtonActions(
        onCellClick,
        tableAPI.enrichContext($stbData.rows[index])
      );
      await cmd?.({ column, value, id });
    },
    executeOnLinkClickAction: async (column, linkItem) => {
      let cmd = enrichButtonActions(onLinkClick, {
        column,
        id: linkItem._id,
        primaryDisplay: linkItem.primaryDisplay,
      });
      await cmd?.({
        column,
        id: linkItem._id,
        primaryDisplay: linkItem.primaryDisplay,
      });
    },
    executeRowOnDblClickAction: async (id) => {
      await tableAPI.executeRowButtonAction(id, onRowDblClick);
    },
    executeRowOnSelectAction: async (index) => {
      await tick();
      let cmd = enrichButtonActions(
        onRowSelect,
        tableAPI.enrichContext($stbData.rows[index])
      );
      await cmd?.();
    },
    showContextMenu: (id, anchor) => {
      if (rowContextMenuItems?.length && $stbMenuID != id) {
        $stbMenuID = id;
        $stbMenuAnchor = anchor;
      } else {
        $stbMenuID = -1;
        $stbMenuAnchor = -1;
      }
    },
    executeRowContextMenuAction: async (id, action) => {
      await tableAPI.executeRowButtonAction(id, action);
      $stbMenuID = -1;
      $stbMenuAnchor = -1;
    },
    executeSelectedRowsAction: async (action) => {
      tableAPI.executeRowButtonAction(null, action);
    },
    selectRow: (index) => {
      let id = $stbData.rows[index][idColumn] ?? index;
      let disabled = $stbRowMetadata[index]["disabled"];

      if (maxSelected != 1) {
        if ($stbSelected.includes(id)) {
          $stbSelected.splice($stbSelected.indexOf(id), 1);
          $stbSelected = $stbSelected;
        } else {
          if (maxSelected == 0 || $stbSelected.length < maxSelected)
            $stbSelected = [...$stbSelected, id];
          else
            notificationStore.actions.warning(
              "Cannot select more than " +
                maxSelected +
                " " +
                (entityPlural || "Rows")
            );
        }
      } else {
        if ($stbSelected.includes(id)) {
          $stbSelected = [];
        } else {
          $stbSelected = [id];
        }
      }

      // Fire Assigned Events
      if ($stbSelected.length) tableAPI.executeRowOnSelectAction(index);
    },
    selectAllRows: () => {
      if ($stbSelected.length != $stbData.rows.length)
        $stbSelected = $stbData.rows.map((x) => x[idColumn]);
      else $stbSelected = [];

      tableAPI.executeRowOnSelectAction();
    },
    insertRow: async (row) => {
      let cmd_after = enrichButtonActions(afterInsert, $context);
      let saved_row;
      if (onInsert && onInsert.length) {
        let cmd = enrichButtonActions(onInsert, $context);
        await cmd?.();
      } else {
        stbState.startSave();
        try {
          saved_row = await API.saveRow(
            { ...$new_row, tableId },
            { suppressErrors: true }
          );

          // Clear errors on success
          $new_row.errors = {};
          $new_row = $new_row;
          stbState.refresh();
          let richContext = { ...$context, [comp_id]: { row: saved_row } };
          let cmd_after = enrichButtonActions(afterInsert, richContext);
          await cmd_after?.({ row: saved_row });
          stbState.endSave(); // Only on success
          return saved_row;
        } catch (e) {
          // Auto-clear errors after 2 seconds
          if (errorTimer) clearTimeout(errorTimer);
          errorTimer = setTimeout(() => {
            $new_row = { ...$new_row, errors: {} };
          }, 2000);

          // Parse Budibase API error
          $new_row.errors = {};
          if (e.json && e.json.validationErrors) {
            // Handle Budibase validation errors
            const validationErrors = e.json.validationErrors;
            Object.keys(validationErrors).forEach((field) => {
              $new_row.errors[field] =
                validationErrors[field][0] || "Validation error";
            });
          } else if (e.details || e.errors) {
            const errorDetails = e.details || e.errors;
            errorDetails.forEach((err) => {
              if (err.field) {
                $new_row.errors[err.field] = err.message || "Validation error";
              }
            });
          } else {
            // Fallback for generic errors
            $new_row.errors = { general: e.message || "Save failed" };
          }
        }
      }
    },
    deleteRow: async (index) => {
      let id = $stbData.rows[index][idColumn];
      let row = $stbData.rows[index];

      let autoDelete = [
        {
          parameters: {
            confirm: true,
            notificationOverride: true,
            customTitleText: "Delete " + (entitySingular || "Row") + " ?",
            confirmText:
              "Are you sure you want to delete this " +
              (entitySingular || "Row") +
              " ?",
            tableId: tableId,
            rowId: id,
          },
          "##eventHandlerType": "Delete Row",
        },
      ];

      let cmd;
      let cmd_after = enrichButtonActions(
        afterDelete,
        tableAPI.enrichContext($stbData.rows[index])
      );

      if (onDelete?.length) {
        cmd = enrichButtonActions(
          onDelete,
          tableAPI.enrichContext($stbData.rows[index])
        );
      } else {
        cmd = enrichButtonActions(autoDelete, {});
      }

      await cmd?.({ row });
      await cmd_after?.({ row });

      // Remove row from the selected list if selected
      if ($stbSelected.includes(id)) {
        $stbSelected.splice($stbSelected.indexOf(id), 1);
        $stbSelected = $stbSelected;
      }

      // Refresh the dataset
      stbData.refresh();
    },
    deleteSelectedRows: async () => {
      let autoDelete = [
        {
          parameters: {
            confirm: true,
            notificationOverride: true,
            customTitleText:
              "Delete " +
              $stbSelected.length +
              " " +
              (entityPlural || "Rows") +
              " ?",
            confirmText:
              "Are you sure you want to delete these " +
              (entityPlural || "Rows") +
              " ?",
            tableId: tableId,
            rowId: $stbSelected,
          },
          "##eventHandlerType": "Delete Row",
        },
      ];
      let cmd = enrichButtonActions(autoDelete, {});
      let cmd_after = enrichButtonActions(afterDelete, $context);
      await cmd?.();
      await cmd_after?.();
      stbData.refresh();
    },
    patchRow: async (patch) => {
      patch = tableAPI.unflattenObject(patch);
      if (tableId) {
        let row = await API.patchRow(
          {
            tableId,
            ...patch,
          },
          true
        );

        stbState.refresh();
        let richContext = {
          ...$context,
          [comp_id]: { row },
        };
        let cmd_after = enrichButtonActions(afterEdit, richContext);
        await cmd_after?.({ row });
        return row;
      }
    },
  };

  // Super Table State Machine
  const stbState = fsm("Init", {
    "*": {
      init() {
        return "Init";
      },
      refresh() {
        stbData?.refresh();
      },
      enrichRows() {},
      lockColumnWidths() {
        if (isScrolling) return; // Already locked
        isScrolling = true;
        // Clear any existing timeout
        if (scrollLockTimeout) {
          clearTimeout(scrollLockTimeout);
          scrollLockTimeout = null;
        }
        columnStates.forEach(({ state }) => state.lockWidth());
      },
      unlockColumnWidths() {
        // Only unlock if currently locked
        if (!isScrolling) return;
        isScrolling = false;
        // Clear any existing timeout
        if (scrollLockTimeout) {
          clearTimeout(scrollLockTimeout);
          scrollLockTimeout = null;
        }
        // Unlock all columns immediately (no delay needed for table resize)
        columnStates.forEach(({ state }) => state.unlockWidth());
      },
      scrollToTop() {
        $stbScrollPos = 0;
        $stbScrollOffset = 0;
        this.calculateRowBoundaries();
      },
      scrollTo(position) {
        $stbScrollPos = position;
        this.calculateRowBoundaries();
      },
      scrollToEnd() {
        $stbScrollPos =
          scrollHeight > maxBodyHeight
            ? scrollHeight - maxBodyHeight
            : $stbScrollPos;
        this.calculateRowBoundaries();
      },
      calculateBoundaries() {
        let rows = $stbData?.rows;
        if (!rows || !viewport) return;

        const defaultRowHeight = $stbSettings.appearance.rowHeight;

        // Calculate scrollHeight as sum of row heights from stbRowMetadata
        scrollHeight =
          ($cumulativeHeights[$cumulativeHeights.length - 1] || 0) +
          (canInsert ? 4 * defaultRowHeight : 2 * defaultRowHeight);

        // Calculate maxBodyHeight, adding one row height for extra space

        maxBodyHeight =
          viewport.clientHeight -
          $stbSettings.appearance.headerHeight -
          $stbSettings.appearance.footerHeight +
          defaultRowHeight; // Add extra row height for negative margin

        // Determine if scrolling is needed
        canScroll = scrollHeight > maxBodyHeight;
        overflow = canScroll;

        // Update scroll percentage
        $stbScrollPercent =
          scrollHeight > maxBodyHeight
            ? $stbScrollPos / (scrollHeight - maxBodyHeight)
            : 0;

        // Recalculate visible row boundaries
        this.calculateRowBoundaries();
      },
      calculateRowBoundaries() {
        let rows = $stbData?.rows;
        if (!rows?.length || !viewport || !$cumulativeHeights.length) return;

        const defaultRowHeight = $stbSettings.appearance.rowHeight;
        let start = 0,
          end = rows.length;

        // Find start index
        for (let i = 0; i < rows.length; i++) {
          if ($cumulativeHeights[i] > $stbScrollPos) {
            start = i;
            break;
          }
        }

        // Find end index
        for (let i = start; i < rows.length; i++) {
          if ($cumulativeHeights[i] >= $stbScrollPos + maxBodyHeight) {
            end = i + 1;
            break;
          }
        }

        // Update visible rows
        $stbVisibleRows = $stbData?.rows
          .slice(start, end)
          .map((_, i) => i + start);

        // Calculate scroll offset
        const startHeight = start > 0 ? $cumulativeHeights[start - 1] : 0;
        $stbScrollOffset = $stbScrollPos - startHeight;

        // Fetch more rows if nearing the end
        if (fetchOnScroll && rows.length > 0) {
          const loadedHeight = $cumulativeHeights[rows.length - 1];
          const remainingHeight =
            loadedHeight - ($stbScrollPos + maxBodyHeight);

          // Only fetch if we're actually scrolling near the end AND haven't loaded all possible rows
          // Check if total rows loaded < total available (if known) or if remainingHeight indicates need
          const hasMoreData =
            !$stbData.info?.total || rows.length < $stbData.info.total;
          if (
            remainingHeight < maxBodyHeight &&
            rows.length === _limit &&
            hasMoreData
          ) {
            stbState.fetchMoreRows(100); // Debounced fetch
          }
        }
      },
      handleVerticalScroll(delta) {
        // Lock column widths during scrolling to prevent flickering
        this.lockColumnWidths();

        $stbScrollPos = Math.max(
          Math.min(
            $stbScrollPos + delta,
            Math.max(0, scrollHeight - maxBodyHeight)
          ),
          0
        );
        $stbScrollPercent =
          scrollHeight > maxBodyHeight
            ? $stbScrollPos / (scrollHeight - maxBodyHeight)
            : 0;
        window.requestAnimationFrame(() => this.calculateRowBoundaries());
        // Note: We don't unlock here - columns stay locked during scrolling
      },
      handleWheel(e) {
        if ($stbState == "Inserting") {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        if (e.deltaY && canScroll) {
          e.preventDefault();
          e.stopPropagation();
          this.handleVerticalScroll(e.deltaY);
        } else if (e.deltaX) {
          // Lock column widths during horizontal scrolling too
          this.lockColumnWidths();

          if ($stbHorizontalScrollPos + e.deltaX < 0) {
            $stbHorizontalScrollPos = 0;
            $stbHorizontalScrollPercent = 0;
            return;
          }
          if (
            $stbHorizontalScrollPos + e.deltaX >
            columnsViewport?.scrollWidth - columnsViewport.clientWidth
          ) {
            $stbHorizontalScrollPos =
              columnsViewport?.scrollWidth - columnsViewport.clientWidth;
            $stbHorizontalScrollPercent = 1;
            return;
          }

          $stbHorizontalScrollPos += e.deltaX;
          $stbHorizontalScrollPercent =
            $stbHorizontalScrollPos / columnsViewport.scrollWidth;

          // Note: We don't unlock here - columns stay locked during scrolling
        }
      },
      handleKeyboard(e) {
        // TODO : Table Keyboard Handler
      },
      handleTouch(e, type) {
        if ($stbData.loading || $stbState === "Inserting") {
          e.preventDefault();
          return;
        }

        if (type === "start") {
          touchStartY = e.touches[0].clientY;
          touchStartX = e.touches[0].clientX;
        } else if (type === "move" && canScroll) {
          const touchY = e.touches[0].clientY;
          const touchX = e.touches[0].clientX;
          const deltaY = touchStartY - touchY; // Positive for swipe up, negative for swipe down
          const deltaX = touchStartX - touchX;

          // Prioritize vertical scrolling if swipe is mostly vertical
          if (Math.abs(deltaY) > Math.abs(deltaX)) {
            e.preventDefault(); // Prevent native vertical scroll
            this.handleVerticalScroll(deltaY * 0.5); // Adjust sensitivity (0.5 for smoother scrolling)
            touchStartY = touchY; // Update start position for continuous scrolling
          } else if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Handle horizontal touch scrolling
            this.lockColumnWidths();
            if ($stbHorizontalScrollPos + deltaX < 0) {
              $stbHorizontalScrollPos = 0;
              $stbHorizontalScrollPercent = 0;
            } else if (
              $stbHorizontalScrollPos + deltaX >
              columnsViewport?.scrollWidth - columnsViewport.clientWidth
            ) {
              $stbHorizontalScrollPos =
                columnsViewport?.scrollWidth - columnsViewport.clientWidth;
              $stbHorizontalScrollPercent = 1;
            } else {
              $stbHorizontalScrollPos += deltaX;
              $stbHorizontalScrollPercent =
                $stbHorizontalScrollPos / columnsViewport.scrollWidth;
            }
            touchStartX = touchX;
            // Note: We don't unlock here - columns stay locked during scrolling
          }
        }
      },
      sortBy(column, order) {
        sortColumn = column;
        sortOrder = order;
        $stbSortColumn = column;
        $stbSortOrder = order;
      },
      resizeRow(index, size) {
        $stbRowMetadata[index].height =
          size || $stbSettings.appearance.rowHeight;
        this.calculateBoundaries.debounce(20);
      },
      handleRowClick(index, column, value, id) {
        if (canSelect && !canEdit) tableAPI.selectRow(index);
        if (onCellClick) {
          tableAPI.executeCellOnClickAction(index, column, value, id);
          tableAPI.executeRowOnClickAction(index);
        } else {
          tableAPI.executeRowOnClickAction(index);
        }
      },
      addRow() {
        if (!onInsert || onInsert?.length == 0) {
          return "Inserting";
        } else {
          tableAPI.insertRow();
        }
      },
      edit() {
        return "Editing";
      },
    },
    Init: {
      _enter() {
        if (timer) clearInterval(timer);
        start = 0;
        end = 0;
        $stbScrollPos = 0;
        $stbScrollOffset = 0;
        $stbHorizontalScrollPos = 0;
        $stbSelected = [];
        $columnsStore = [];
        if (_limit != limit) _limit = limit;
      },
      synch(fetchState) {
        if (fetchState.loaded) {
          this.enrichRows();
          this.calculateBoundaries();
          if (autoRefreshRate && !inBuilder) {
            timer = setInterval(() => {
              if (!$stbData?.loading) stbData?.refresh();
              onRefresh?.();
            }, autoRefreshRate * 1000);
          }
          return "Idle";
        }
      },
    },
    Idle: {
      _enter() {
        isEmpty = $stbData.rows.length < 1;
        // Note: We don't unlock columns here anymore since columns auto-lock themselves
        // when they are flexible and become unlocked
      },
      _exit() {},
      synch(fetchState) {
        if (fetchState.loading) return;
        this.enrichRows();
        this.calculateBoundaries();
        isEmpty = !$stbData?.rows.length;
      },
      addFilter(filterObj) {
        let extention = QueryUtils.buildQuery([{ ...filterObj }]);
        stbColumnFilters.add(filterObj.id);
        addQueryExtension(filterObj.id, extention);
        return "Filtered";
      },
      fetchMoreRows(size) {
        _limit = _limit + size;
        stbData.update({ limit: _limit });
      },
    },
    Filtered: {
      _enter() {},
      _exit() {},
      addFilter(filterObj) {
        let extention = QueryUtils.buildQuery([{ ...filterObj }]);
        removeQueryExtension(filterObj.id);
        stbColumnFilters.add(filterObj.id);
        addQueryExtension(filterObj.id, extention);
      },
      removeFilter(id) {
        stbColumnFilters.delete(id);
        removeQueryExtension(id);
      },
      clearFilter(id) {
        stbColumnFilters.delete(id);
        removeQueryExtension(id);
        return "Idle";
      },
      clear() {
        stbColumnFilters.forEach((id) => {
          removeQueryExtension(id);
        });
        stbColumnFilters.clear();
        columnStates.forEach(({ state }) => state.reset());
        return "Idle";
      },
      synch(fetchState) {
        if (fetchState.loaded) {
          this.enrichRows();
          this.calculateBoundaries();
          this.calculateRowBoundaries();

          isEmpty = fetchState.rows.length < 1;
        }
      },
    },
    Editing: {
      async patchRow(index, id, rev, field, change) {
        let patch = { _id: id, _rev: rev, [field]: change };
        await tableAPI.patchRow(index, patch);
        stbState.refresh();
        return "Idle";
      },
      endEdit() {
        return "Idle";
      },
    },
    Inserting: {
      _enter() {
        isEmpty = false;
        columnStates.forEach(({ state }) => state.addRow());
        $new_row = {};
        temp_scroll_pos = $stbScrollPos;
        this.scrollToEnd();
      },
      _exit() {
        columnStates.forEach(({ state }) => state.cancelAddRow());
        this.scrollTo(temp_scroll_pos);
      },
      cancelAddRow() {
        return "Idle";
      },
      endSave() {
        this.refresh();
        return "Idle";
      },
      setValue(field, value) {
        $new_row[field] = value;
        // Clear errors for this field and cancel auto-clear timer
        if ($new_row.errors && $new_row.errors[field]) {
          delete $new_row.errors[field];
          if (errorTimer) {
            clearTimeout(errorTimer);
            errorTimer = null;
          }
        }
        $new_row = { ...$new_row }; // Trigger reactivity
      },
    },
  });

  // Virtual List Capabilities reacting to viewport change
  $: stbState.calculateBoundaries(
    clientHeight,
    canInsert,
    $stbSortColumn,
    fetchOnScroll,
    rowHeight,
    $stbSortColumn,
    $stbSortOrder
  );

  // Scroll to Top when filter changes
  $: stbState.scrollToTop(query);

  $: if (canSelect) stbSelected.set(preselectedIds ?? []);
  else stbSelected.set([]);

  $: idColumn = $stbData?.definition?.primary?.[0]
    ? $stbData?.definition?.primary?.[0]
    : $stbSchema?.id
      ? "id"
      : "_id";

  // Data Related
  $: defaultQuery = QueryUtils.buildQuery($filterStore);
  $: query = extendQuery(defaultQuery, queryExtensions);

  $: stbData?.update({
    query,
    sortColumn,
    sortOrder,
  });
  $: stbState.synch($stbData);
  $: tableId = $stbData?.definition?.tableId || $stbData?.definition?._id;

  // Derived Store with the columns to be rendered
  $: superColumns = derivedMemo(
    [memoizedSchema, columnsStore, stbSettings],
    ([$memoizedSchema, $columnsStore, $stbSettings]) => {
      return tableAPI.populateColumns(
        $memoizedSchema,
        $columnsStore,
        $stbSettings.showAutoColumns,
        $stbSettings.showSpecialColumns
      );
    }
  );

  // Derived Store with common column settings
  const commonColumnOptions = derivedMemo(stbSettings, ($stbSettings) => {
    return {
      hasChildren: false,
      maxWidth: columnMaxWidth || "auto",
      minWidth: columnMinWidth || "7rem",
      fixedWidth: columnFixedWidth || "7rem",
      sizing: columnSizing,
      canResize,
      canEdit: inBuilder ? false : canEdit,
      showFooter,
      showHeader,
      cellPadding: sizingMap[size].cellPadding,
      headerHeight: sizingMap[size].headerHeight,
      rowHeight: sizingMap[size].rowHeight,
      highlighters,
      useOptionColors: $stbSettings?.appearance?.useOptionColors || false,
      optionsViewMode,
      relViewMode,
      zebraColors,
      quiet,
    };
  });

  $: dividersStyles = {
    color:
      $stbSettings.dividersColor ?? "var(--spectrum-global-color-gray-200)",
    horizontal:
      $stbSettings.dividers == "both" || $stbSettings.dividers == "horizontal"
        ? "1px solid var(--super-table-devider-color)"
        : "1px solid transparent",
    vertical:
      $stbSettings.dividers == "both" || $stbSettings.dividers == "vertical"
        ? "1px solid var(--super-table-devider-color)"
        : "none",
  };

  // Build our data and actions ontext
  $: actions = [
    {
      type: ActionTypes.ClearRowSelection,
      callback: () => {
        $stbSelected = [];
      },
    },
    {
      type: ActionTypes.RefreshDatasource,
      callback: () => stbData?.refresh(),
    },
    {
      type: ActionTypes.AddDataProviderQueryExtension,
      callback: addQueryExtension,
    },
    {
      type: ActionTypes.RemoveDataProviderQueryExtension,
      callback: removeQueryExtension,
    },
  ];

  const addQueryExtension = (key, extension) => {
    if (!key || !extension) {
      return;
    }
    queryExtensions = { ...queryExtensions, [key]: extension };
  };

  const removeQueryExtension = (key) => {
    if (!key) {
      return;
    }
    const newQueryExtensions = { ...queryExtensions };
    delete newQueryExtensions[key];
    queryExtensions = newQueryExtensions;
  };

  // The "row" is dynamically enriched, but show the first one in the builder for preview
  $: dataContext = {
    row: inBuilder ? $stbData?.rows[0] : {},
    rows: $stbData?.rows,
    selectedRows: $stbSelectedRows,
    selectedIds: $stbSelected,
    id: $component.id,
    info: $stbData?.info,
    datasource: $dataSourceStore || {},
    schema: $stbSchema,
    state: {
      query: $stbData.query,
    },
    loaded: $stbData?.loaded,
    rowsLength: $stbData?.rows.length,
    pageNumber: $stbData?.pageNumber + 1,
    entitySingular,
    entityPlural,
    offset: 0,
    limit: 100,
  };

  // Show Action Buttons Column
  $: showButtonColumnRight = rowMenu == "columnRight" && rowMenuItems?.length;
  $: showButtonColumnLeft = rowMenu == "columnLeft" && rowMenuItems?.length;

  const createFetch = (datasource) => {
    stbState.init();
    return fetchData({
      API,
      datasource,
      options: {
        query,
        sortColumn,
        sortOrder,
        limit,
        paginate: false,
      },
    });
  };

  const extendQuery = (
    defaultQuery: SearchFilters,
    extensions: Record<string, any>
  ): SearchFilters => {
    if (!Object.keys(extensions).length) {
      return defaultQuery;
    }
    const extended: SearchFilters = {
      [LogicalOperator.AND]: {
        conditions: [
          ...(defaultQuery ? [defaultQuery] : []),
          ...Object.values(extensions || {}),
        ],
      },
      onEmptyFilter: EmptyFilterOption.RETURN_NONE,
    };

    // If there are no conditions applied at all, clear the request.
    return (extended[LogicalOperator.AND]?.conditions?.length ?? 0) > 0
      ? extended
      : {};
  };

  const beautifyLabel = (label) => {
    if (!beautifyLabels || !label) return label;

    let fields = label.split(".");
    fields.forEach((field, index) => {
      let words = field.split("_");
      words.forEach((word, index) => {
        if (word) words[index] = word[0]?.toUpperCase() + word?.slice(1);
      });
      fields[index] = words.join(" ");
    });
    return fields.join(" - ");
  };

  // Expose Context
  setContext("stbScrollPos", stbScrollPos);
  setContext("stbScrollOffset", stbScrollOffset);
  setContext("stbHorizontalScrollPos", stbHorizontalScrollPos);
  setContext("stbHovered", stbHovered);
  setContext("stbSelected", stbSelected);
  setContext("stbEditing", stbEditing);
  setContext("stbState", stbState);
  setContext("stbSettings", stbSettings);
  setContext("stbSortColumn", stbSortColumn);
  setContext("stbSortOrder", stbSortOrder);
  setContext("stbMenuID", stbMenuID);
  setContext("stbMenuAnchor", stbMenuAnchor);
  setContext("stbAPI", tableAPI);
  setContext("stbVisibleRows", stbVisibleRows);
  $: setContext("stbRowMetadata", stbRowMetadata);
  $: setContext("stbData", stbData);
  $: setContext("stbSchema", stbSchema);
  $: setContext("new_row", new_row);

  function toNumber(input) {
    const num = Number(input);
    return isNaN(num) ? null : num;
  }

  onDestroy(() => {
    if (timer) clearInterval(timer);
    if (scrollLockTimeout) clearTimeout(scrollLockTimeout);
  });

  // Unlock columns when table width changes to allow responsive re-rendering
  let previousTableWidth = 0;
  $: if (
    (tableWidth > 0 && tableWidth !== previousTableWidth) ||
    $columnsStore
  ) {
    previousTableWidth = tableWidth;
    // Unlock all columns to allow responsive re-rendering
    columnStates.forEach(({ state }) => state.unlockWidth());
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="super-table"
  class:quiet
  bind:this={viewport}
  bind:clientWidth={tableWidth}
  bind:clientHeight
  style:font-size={sizingMap[size].rowFontSize}
  style:--super-table-devider-color={dividersStyles.color}
  style:--super-table-body-height={maxBodyHeight}
  style:--super-table-header-height={$stbSettings.appearance.headerHeight}
  style:--super-table-footer-height={$stbSettings.appearance.footerHeight}
  style:--super-table-horizontal-dividers={dividersStyles.horizontal}
  style:--super-table-vertical-dividers={dividersStyles.vertical}
  style:--super-table-cell-padding={sizingMap[size].cellPadding}
  style:--super-column-top-offset={$stbScrollOffset * -1}
  on:mouseenter={() => (highlighted = true)}
  on:mouseleave={() => {
    highlighted = false;
    $stbHovered = null;
  }}
  on:keydown={stbState.handleKeyboard}
  on:wheel={stbState.handleWheel}
  on:touchstart={(e) => stbState.handleTouch(e, "start")}
  on:touchmove={(e) => stbState.handleTouch(e, "move")}
  on:touchend={(e) => stbState.handleTouch(e, "end")}
>
  <Provider {actions} data={dataContext} />
  {#key columnSizing}
    {#if $stbState != "Init"}
      {#if !isEmpty}
        <ControlSection>
          <SelectionColumn {hideSelectionColumn} />

          {#if showButtonColumnLeft}
            <RowButtonsColumn {rowMenuItems} {menuItemsVisible} {rowMenu} />
          {/if}

          {#if stickFirstColumn && $superColumns.length > 1}
            <SuperTableColumn
              sticky={true}
              scrollPos={$stbHorizontalScrollPos}
              columnOptions={{
                ...$superColumns[0],
                ...$commonColumnOptions,
                overflow,
                isFirst: true,
                isLast:
                  $superColumns?.length == 1 &&
                  !showButtonColumnRight &&
                  canScroll,
              }}
            />
          {/if}
        </ControlSection>
      {/if}

      <ColumnsSection
        {stbSettings}
        {superColumns}
        {commonColumnOptions}
        {canScroll}
        bind:columnsViewport
      >
        <slot />
      </ColumnsSection>

      {#if showButtonColumnRight && !isEmpty}
        <ControlSection>
          <RowButtonsColumn
            {rowMenuItems}
            {menuItemsVisible}
            {rowMenu}
            {canScroll}
            right={true}
          />
        </ControlSection>
      {/if}

      <ScrollbarsOverlay
        anchor={columnsViewport}
        clientHeight={maxBodyHeight}
        {scrollHeight}
        {highlighted}
        {isEmpty}
        bind:horizontalVisible
        on:positionChange={stbState.calculateRowBoundaries}
      />

      <EmptyResultSetOverlay
        {isEmpty}
        message={$stbSettings.data.emptyMessage}
        top={$superColumns?.length
          ? $stbSettings.appearance.headerHeight + 16
          : 16}
        bottom={horizontalVisible ? 24 : 16}
      />

      <RowContextMenu {rowContextMenuItems} />

      {#if $stbSettings.features.canInsert || $stbState == "Filtered"}
        <AddNewRowOverlay
          {stbState}
          {tableAPI}
          {highlighted}
          {tableActions}
          footer={$stbSettings.showFooter}
        />
      {/if}

      {#if $stbSettings.features.canSelect && selectedActions?.length}
        <SelectedActionsOverlay
          {stbSettings}
          {selectedActions}
          {stbSelected}
          {tableAPI}
          {stbState}
          {highlighted}
          {entitySingular}
          {entityPlural}
        />
      {/if}

      {#if $stbData.loading}
        <LoadingOverlay />
      {/if}
    {:else}
      <CellSkeleton />
    {/if}
  {/key}
</div>
