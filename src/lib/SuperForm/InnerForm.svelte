<script lang="ts">
  import { setContext, getContext } from "svelte";
  import type { Readable, Writable } from "svelte/store";
  import { get } from "svelte/store";
  import type {
    DataFetchDatasource,
    FieldSchema,
    FieldType,
    Table,
    TableSchema,
    UIFieldValidationRule,
  } from "@budibase/types";

  // Local utility functions
  const generateUUID = (): string => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const deepClone = <T,>(obj: T): T => {
    if (obj === null || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) {
      return obj.map((item) => deepClone(item)) as T;
    }
    const cloned = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  };

  const getDeep = (obj: Record<string, any> | undefined, path: string): any => {
    if (!obj) return undefined;
    return path.split(".").reduce((current, key) => {
      return current && typeof current === "object" ? current[key] : undefined;
    }, obj);
  };

  const setDeep = (
    obj: Record<string, any>,
    path: string,
    value: any
  ): void => {
    const keys = path.split(".");
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== "object") {
        current[key] = {};
      }
      current = current[key];
    }
    current[keys[keys.length - 1]] = value;
  };

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
      lastUpdate: number | null;
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

  export let form 


  const component = getContext("component");
  const {
    Provider,
    ActionTypes,
    createValidatorFromConstraints,
    memo,
    derivedMemo,
  } = getContext("sdk");

  let fields: Writable<FieldInfo>[] = [];
  const formState = memo({
    values: {},
    errors: {},
    valid: true,
    currentStep: get(currentStep),
  });

  $: values = deriveFieldProperty(fields, (f) => f.fieldState.value);
  $: errors = deriveFieldProperty(fields, (f) => f.fieldState.error);

  $: enrichments = deriveBindingEnrichments(fields);
  $: valid = !Object.values($errors).some((error) => error != null);
  $: dirty = derivedMemo(fields, (fieldValues) => {
    return fieldValues.some((field) => {
      const { fieldState } = field;
      const initial =
        getDeep(initialValues, field.name) ?? fieldState.defaultValue;
      return fieldState.lastUpdate != null && fieldState.value !== initial;
    });
  });

  $: currentStepValid = derivedMemo(
    [currentStep, ...fields],
    ([currentStepValue, ...fieldsValue]) => {
      return !fieldsValue
        .filter((f) => f.step === currentStepValue)
        .some((f) => f.fieldState.error != null);
    }
  );

  $: {
    formState.set({
      values: $values,
      errors: $errors,
      valid,
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

  $: form = {
    formState,
    formApi,
    dataSource,
  }

  const deriveFieldProperty = (
    fieldStores: Readable<FieldInfo>[],
    getProp: (_field: FieldInfo) => any
  ) => {
    return derivedMemo(fieldStores, (fieldValues) => {
      return fieldValues.reduce(
        (map, field) => ({ ...map, [field.name]: getProp(field) }),
        {}
      );
    });
  };

  const deriveBindingEnrichments = (fieldStores: Readable<FieldInfo>[]) => {
    return derivedMemo(fieldStores, (fieldValues) => {
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
    let formValue = deepClone(initialValues || {});

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
      setDeep(formValue, key, value);
    });
    Object.entries(enrichments || {}).forEach(([key, value]) => {
      setDeep(formValue, key, value);
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

      let initialValue = getDeep(initialValues, field) ?? defaultValue;
      let initialError = null;
      let fieldId = `id-${generateUUID()}`;
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

      const fieldInfo = memo<FieldInfo>({
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
          lastUpdate: null,
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

      return true;
    };

    const reset = () => {
      const fieldInfo = getField(field);
      const { fieldState } = get(fieldInfo);
      const newValue = fieldState.defaultValue;

      fieldInfo.update((state) => {
        state.fieldState.value = newValue;
        state.fieldState.error = null;
        state.fieldState.lastUpdate = null;
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

  $: setContext("form", form);

  setContext("form-step", memo(1));

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

</script>

{#if provideContext}
  <Provider {actions} data={dataContext}>
    <slot />
  </Provider>
{:else}
  <slot />
{/if}
