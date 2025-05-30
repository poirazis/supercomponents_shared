<script lang="ts">
  import { setContext, getContext, createEventDispatcher } from "svelte";
  import type { Readable, Writable } from "svelte/store";
  import { derived, get, writable } from "svelte/store";
  import type {
    DataFetchDatasource,
    FieldSchema,
    FieldType,
    Table,
    TableSchema,
    UIFieldValidationRule,
  } from "@budibase/types";

  const dispatch = createEventDispatcher();

  type FieldInfo<T = any> = {
    name: string;
    step: number;
    type: `${FieldType}`;
    fieldState: {
      fieldId: string;
      value: T;
      defaultValue: T;
      disabled: boolean;
      readonly: boolean;
      validator: ((_value: T) => string | null) | null;
      error: string | null | undefined;
      lastUpdate: number;
    };
    fieldApi: {
      setValue(_value: T): void;
      validate(): boolean;
      reset(): void;
    };
    fieldSchema: FieldSchema | {};
  };

  export let dataSource: DataFetchDatasource | undefined = undefined;
  export let disabled: boolean = false;
  export let readonly: boolean = false;
  export let initialValues: Record<string, any> | undefined = undefined;
  export let size: "Medium" | "Large" | undefined = undefined;
  export let schema: TableSchema | undefined = undefined;
  export let definition: Table | undefined = undefined;
  export let disableSchemaValidation: boolean = false;
  export let editAutoColumns: boolean = false;
  export let provideContext: boolean = true;
  export let currentStep: Writable<number>;

  const { Provider, ActionTypes, createValidatorFromConstraints } =
    getContext("sdk");

  let fields: Writable<FieldInfo>[] = [];
  export const formState = writable({
    values: {},
    errors: {},
    valid: true,
    dirty: false,
    currentStep: get(currentStep),
  });

  $: values = deriveFieldProperty(fields, (f) => f.fieldState.value);
  $: errors = deriveFieldProperty(fields, (f) => f.fieldState.error);
  $: enrichments = deriveBindingEnrichments(fields);
  $: valid = !Object.values($errors).some((error) => error != null);
  $: dirty = deriveDirtyStatus(fields, initialValues);

  $: currentStepValid = derived(
    [currentStep, ...fields],
    ([currentStepValue, ...fieldsValue]) => {
      return !fieldsValue
        .filter((f) => f.step === currentStepValue)
        .some((f) => f.fieldState.error != null);
    }
  );

  // Offer the form as a bindable property so it can be puppeteered by parent components
  export let form;
  $: form = {
    formState,
    formApi,
    dataSource,
  };

  $: {
    formState.set({
      values: $values,
      errors: $errors,
      valid,
      dirty: $dirty,
      currentStep: $currentStep,
    });
  }

  $: formValue = deriveFormValue(initialValues, $values, $enrichments);

  $: dataContext = {
    ...formValue,
    __value: formValue,
    __valid: valid,
    __dirty: $dirty,
    __currentStep: $currentStep,
    __currentStepValid: $currentStepValid,
  };

  const deriveFieldProperty = (
    fieldStores: Readable<FieldInfo>[],
    getProp: (_field: FieldInfo) => any
  ) => {
    return derived(fieldStores, (fieldValues) => {
      return fieldValues.reduce(
        (map, field) => ({ ...map, [field.name]: getProp(field) }),
        {}
      );
    });
  };

  const deriveDirtyStatus = (
    fieldStores: Readable<FieldInfo>[],
    initialValues: Record<string, any> | undefined
  ) => {
    return derived(fieldStores, (fieldValues) => {
      return fieldValues.some((field) => {
        const initial =
          deepGet(initialValues, field.name) ?? field.fieldState.defaultValue;
        return field.fieldState.value !== initial;
      });
    });
  };

  const deriveBindingEnrichments = (fieldStores: Readable<FieldInfo>[]) => {
    return derived(fieldStores, (fieldValues) => {
      const enrichments: Record<string, string> = {};
      fieldValues.forEach((field) => {
        if (field.type === "attachment") {
          const value = field.fieldState.value;
          let url = null;
          if (Array.isArray(value) && value[0] != null) {
            url = value[0].url;
          }
          enrichments[`${field.name}_first`] = url;
        }
      });
      return enrichments;
    });
  };

  const deriveFormValue = (
    initialValues: Record<string, any> | undefined,
    values: Record<string, any>,
    enrichments: Record<string, string>
  ) => {
    let formValue = cloneDeep(initialValues || {});
    const sortedFields = Object.entries(values || {})
      .map(([key, value]) => {
        const field = getField(key);
        return {
          key,
          value,
          lastUpdate: get(field).fieldState?.lastUpdate || 0,
        };
      })
      .sort((a, b) => {
        return a.lastUpdate - b.lastUpdate;
      });

    sortedFields.forEach(({ key, value }) => {
      deepSet(formValue, key, value);
    });
    Object.entries(enrichments || {}).forEach(([key, value]) => {
      deepSet(formValue, key, value);
    });
    return formValue;
  };

  const getField = (name: string) => {
    return fields.find((field) => get(field).name === name)!;
  };

  const sanitiseValue = (
    value: any,
    schema: FieldSchema | undefined,
    type: `${FieldType}`
  ) => {
    if (Array.isArray(value) && type === "array" && schema) {
      const options = schema?.constraints?.inclusion || [];
      return value
        .map((opt) => String(opt))
        .filter((opt) => options.includes(opt));
    }
    return value;
  };

  const formApi = {
    registerField: (
      field: string,
      type: FieldType,
      defaultValue: string | null = null,
      fieldDisabled: boolean = false,
      fieldReadOnly: boolean = false,
      validationRules: UIFieldValidationRule[],
      step: number = 1
    ) => {
      if (!field) {
        return;
      }
      const schemaConstraints = disableSchemaValidation
        ? null
        : schema?.[field]?.constraints;
      const validator = createValidatorFromConstraints(
        schemaConstraints,
        validationRules,
        field,
        definition
      );

      defaultValue = sanitiseValue(defaultValue, schema?.[field], type);

      let initialValue = deepGet(initialValues, field) ?? defaultValue;
      let initialError = null;
      let fieldId = `id-${uuid()}`;
      const existingField = getField(field);
      if (existingField) {
        const { fieldState } = get(existingField);
        fieldId = fieldState.fieldId;
        if (fieldState.value != null && fieldState.value !== "") {
          initialValue = fieldState.value;
        }
        if (fieldState.error) {
          initialError = validator?.(initialValue);
        }
      }

      const isAutoColumn = !!schema?.[field]?.autocolumn;

      const fieldInfo = writable<FieldInfo>({
        name: field,
        type,
        step: step || 1,
        fieldState: {
          fieldId,
          value: initialValue,
          error: initialError,
          disabled:
            disabled || fieldDisabled || (isAutoColumn && !editAutoColumns),
          readonly:
            readonly || fieldReadOnly || (schema?.[field] as any)?.readonly,
          defaultValue,
          validator,
          lastUpdate: Date.now(),
        },
        fieldApi: makeFieldApi(field),
        fieldSchema: schema?.[field] ?? {},
      });

      if (existingField) {
        const otherFields = fields.filter((info) => get(info).name !== field);
        fields = [...otherFields, fieldInfo];
      } else {
        fields = [...fields, fieldInfo];
      }

      return fieldInfo;
    },
    validate: () => {
      const stepFields = fields.filter(
        (field) => get(field).step === get(currentStep)
      );
      let valid = true;
      let hasScrolled = false;
      stepFields.forEach((field) => {
        const fieldValid = get(field).fieldApi.validate();
        valid = valid && fieldValid;
        if (!valid && !hasScrolled) {
          handleScrollToField({ field: get(field) });
          hasScrolled = true;
        }
      });
      return valid;
    },
    reset: () => {
      fields.forEach((field) => {
        get(field).fieldApi.reset();
      });
      dispatch("reset");
    },
    changeStep: ({
      type,
      number,
    }: {
      type: "next" | "prev" | "first" | "specific";
      number: any;
    }) => {
      if (type === "next") {
        currentStep.update((step) => step + 1);
      } else if (type === "prev") {
        currentStep.update((step) => Math.max(1, step - 1));
      } else if (type === "first") {
        currentStep.set(1);
      } else if (type === "specific" && number && !isNaN(number)) {
        currentStep.set(parseInt(number));
      }
    },
    setStep: (step: number) => {
      if (step) {
        currentStep.set(step);
      }
    },
    setFieldValue: (fieldName: string, value: any) => {
      const field = getField(fieldName);
      if (!field) {
        return;
      }
      const { fieldApi } = get(field);
      fieldApi.setValue(value);
    },
    resetField: (fieldName: string) => {
      const field = getField(fieldName);
      if (!field) {
        return;
      }
      const { fieldApi } = get(field);
      fieldApi.reset();
    },
  };

  const makeFieldApi = (field: string) => {
    const setValue = (value: any, skipCheck = false) => {
      const fieldInfo = getField(field);
      const { fieldState } = get(fieldInfo);
      const { validator } = fieldState;

      if (!skipCheck && fieldState.value === value) {
        return false;
      }

      const error = validator?.(value);
      fieldInfo.update((state) => {
        state.fieldState.value = value;
        state.fieldState.error = error;
        state.fieldState.lastUpdate = Date.now();
        return state;
      });
      dispatch("change", { field, value });
      return true;
    };

    const reset = () => {
      const fieldInfo = getField(field);
      const { fieldState } = get(fieldInfo);
      const newValue = fieldState.defaultValue;

      fieldInfo.update((state) => {
        state.fieldState.value = newValue;
        state.fieldState.error = null;
        state.fieldState.lastUpdate = Date.now();
        return state;
      });
    };

    const deregister = () => {
      const fieldInfo = getField(field);
      fieldInfo.update((state) => {
        state.fieldState.validator = null;
        state.fieldState.error = null;
        return state;
      });
    };

    const setDisabled = (fieldDisabled: boolean) => {
      const fieldInfo = getField(field);
      const isAutoColumn = !!schema?.[field]?.autocolumn;
      fieldInfo.update((state) => {
        state.fieldState.disabled = disabled || fieldDisabled || isAutoColumn;
        return state;
      });
    };

    return {
      setValue,
      reset,
      setDisabled,
      deregister,
      validate: () => {
        const fieldInfo = getField(field);
        setValue(get(fieldInfo).fieldState.value, true);
        return !get(fieldInfo).fieldState.error;
      },
    };
  };

  setContext("form", {
    formState,
    formApi,
    dataSource,
  });

  setContext("form-step", writable(1));

  const handleUpdateFieldValue = ({
    type,
    field,
    value,
  }: {
    type: "set" | "reset";
    field: string;
    value: any;
  }) => {
    if (type === "set") {
      formApi.setFieldValue(field, value);
    } else {
      formApi.resetField(field);
    }
  };

  const handleScrollToField = (props: { field: FieldInfo | string }) => {
    let field;
    if (typeof props.field === "string") {
      field = get(getField(props.field));
    } else {
      field = props.field;
    }
    const fieldId = field.fieldState.fieldId;
    const fieldElement = document.getElementById(fieldId);
    if (fieldElement) {
      fieldElement.focus({ preventScroll: true });
    }
    const label = document.querySelector<HTMLElement>(
      `label[for="${fieldId}"]`
    );
    if (label) {
      label.style.scrollMargin = "100px";
      label.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  const actions = [
    { type: ActionTypes.ValidateForm, callback: formApi.validate },
    { type: ActionTypes.ClearForm, callback: formApi.reset },
    { type: ActionTypes.ChangeFormStep, callback: formApi.changeStep },
    { type: ActionTypes.UpdateFieldValue, callback: handleUpdateFieldValue },
    { type: ActionTypes.ScrollTo, callback: handleScrollToField },
  ];

  // Generate a UUID (simplified version for brevity)
  function uuid(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // Deep clone an object
  function cloneDeep<T>(obj: T): T {
    if (obj == null || typeof obj !== "object") {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(cloneDeep) as any;
    }
    const cloned: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = cloneDeep(obj[key]);
      }
    }
    return cloned;
  }

  // Get a value from an object using a dot-notation path
  function deepGet(obj: any, path: string | string[]): any {
    if (!obj || !path) {
      return undefined;
    }
    const pathArray = Array.isArray(path) ? path : path.split(".");
    let current = obj;
    for (const key of pathArray) {
      if (current == null) {
        return undefined;
      }
      current = current[key];
    }
    return current;
  }

  // Set a value in an object using a dot-notation path
  function deepSet(obj: any, path: string | string[], value: any): void {
    if (!obj || !path) {
      return;
    }
    const pathArray = Array.isArray(path) ? path : path.split(".");
    let current = obj;
    for (let i = 0; i < pathArray.length - 1; i++) {
      const key = pathArray[i];
      if (!current[key] || typeof current[key] !== "object") {
        current[key] = {};
      }
      current = current[key];
    }
    current[pathArray[pathArray.length - 1]] = value;
  }
</script>

{#if provideContext}
  <Provider {actions} data={dataContext}>
    <slot />
  </Provider>
{:else}
  <slot />
{/if}
