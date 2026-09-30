"use client";
import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useLanguage } from "@/context/language-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trash2,
  Plus,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Layout,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (handle: React.HTMLAttributes<HTMLElement>) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
        opacity: isDragging ? 0.6 : 1,
      }}
    >
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

export interface FormField {
  id?: string;
  type: string;
  label: string;
  name: string;
  validation_rules: {
    required: boolean;
    max?: number;
    min?: number;
    options?: string[];
    pattern?: string;
    pattern_message?: string;
  };
  order: number;
  page?: number;
  page_title?: string;
  options?: string[];
  conditions?: { field: string; operator: string; value: string }[];
}

interface FormBuilderProps {
  initialFields?: FormField[];
  onChange: (fields: FormField[]) => void;
}

export function FormBuilder({
  initialFields = [],
  onChange,
}: FormBuilderProps) {
  const { t } = useLanguage();
  const [fields, setFields] = useState<FormField[]>(
    initialFields.length > 0
      ? initialFields
      : [
          {
            type: "text",
            label: t("forms.builder.default_name_label"),
            name: "name",
            validation_rules: { required: true },
            order: 0,
            page: 1,
          },
          {
            type: "email",
            label: t("forms.builder.default_email_label"),
            name: "email",
            validation_rules: { required: true },
            order: 1,
            page: 1,
          },
        ],
  );

  const [regexVisibleFor, setRegexVisibleFor] = useState<Set<number>>(
    new Set(),
  );

  const pages = Array.from(new Set(fields.map((f) => f.page || 1))).sort(
    (a, b) => a - b,
  );

  const addField = (page: number) => {
    const newField: FormField = {
      type: "text",
      label: t("forms.builder.new_field_label"),
      name: `field_${fields.length}`,
      validation_rules: { required: false },
      order: fields.length,
      page: page,
    };
    const updated = [...fields, newField];
    setFields(updated);
    onChange(updated);
  };

  const removeField = (index: number) => {
    const updated = fields.filter((_, i) => i !== index);
    setFields(updated);
    onChange(updated);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...updates };
    setFields(updated);
    onChange(updated);
  };

  const updateValidation = (
    index: number,
    updates: Partial<FormField["validation_rules"]>,
  ) => {
    const updated = [...fields];
    updated[index] = {
      ...updated[index],
      validation_rules: { ...updated[index].validation_rules, ...updates },
    };
    setFields(updated);
    onChange(updated);
  };

  // Helper to manage options (now top-level, but keeping backward compat if needed)
  const updateOptions = (index: number, newOptions: string[]) => {
    const updated = [...fields];
    // Store in both places for now to be safe, or just top level if backend prefers
    updated[index] = { ...updated[index], options: newOptions };
    // Also update validation_rules for legacy frontend support if needed
    updated[index].validation_rules = {
      ...updated[index].validation_rules,
      options: newOptions,
    } as any;
    setFields(updated);
    onChange(updated);
  };

  const addCondition = (index: number) => {
    const updated = [...fields];
    const currentConditions = updated[index].conditions || [];
    updated[index] = {
      ...updated[index],
      conditions: [
        ...currentConditions,
        { field: "", operator: "equals", value: "" },
      ],
    };
    setFields(updated);
    onChange(updated);
  };

  const updateCondition = (
    fieldIndex: number,
    conditionIndex: number,
    updates: any,
  ) => {
    const updated = [...fields];
    const conditions = [...(updated[fieldIndex].conditions || [])];
    conditions[conditionIndex] = { ...conditions[conditionIndex], ...updates };
    updated[fieldIndex] = { ...updated[fieldIndex], conditions };
    setFields(updated);
    onChange(updated);
  };

  const removeCondition = (fieldIndex: number, conditionIndex: number) => {
    const updated = [...fields];
    const conditions = [...(updated[fieldIndex].conditions || [])];
    conditions.splice(conditionIndex, 1);
    updated[fieldIndex] = { ...updated[fieldIndex], conditions };
    setFields(updated);
    onChange(updated);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (pageNumber: number, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = Number(String(active.id).replace("f-", ""));
    const to = Number(String(over.id).replace("f-", ""));

    // slots (indices in the full array) occupied by this page
    const slots = fields
      .map((f, i) => ((f.page || 1) === pageNumber ? i : -1))
      .filter((i) => i >= 0);
    const ordered = slots.slice();
    ordered.splice(ordered.indexOf(from), 1);
    ordered.splice(ordered.indexOf(to) + (slots.indexOf(from) < slots.indexOf(to) ? 1 : 0), 0, from);

    const updated = [...fields];
    slots.forEach((slot, k) => {
      updated[slot] = fields[ordered[k]];
    });
    const final = updated.map((f, i) => ({ ...f, order: i }));
    setFields(final);
    onChange(final);
  };

  const moveField = (index: number, direction: "up" | "down") => {
    const updated = [...fields];
    const currentField = updated[index];
    const pageFields = updated.filter(
      (f) => (f.page || 1) === (currentField.page || 1),
    );
    const fieldPageIndex = pageFields.findIndex((f) => f === currentField);

    if (
      (direction === "up" && fieldPageIndex === 0) ||
      (direction === "down" && fieldPageIndex === pageFields.length - 1)
    )
      return;

    const targetField =
      pageFields[direction === "up" ? fieldPageIndex - 1 : fieldPageIndex + 1];
    const targetIndex = updated.findIndex((f) => f === targetField);

    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Update overall order
    const final = updated.map((f, i) => ({ ...f, order: i }));
    setFields(final);
    onChange(final);
  };

  const addPage = () => {
    const nextPath = pages.length > 0 ? Math.max(...pages) + 1 : 1;
    addField(nextPath);
  };

  const updatePageTitle = (page: number, title: string) => {
    const updated = fields.map((f) =>
      (f.page || 1) === page ? { ...f, page_title: title } : f,
    );
    setFields(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Layout className="h-5 w-5 text-blue-600" />
          {t("forms.builder.structure")}
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addPage}
          className="flex items-center gap-2 border-primary text-primary hover:bg-primary/5"
        >
          <Plus className="h-4 w-4" />
          {t("forms.builder.add_page")}
        </Button>
      </div>

      <div className="space-y-12">
        {pages.map((pageNumber) => (
          <div
            key={pageNumber}
            className="space-y-4 border-l-2 border-slate-200 dark:border-slate-800 pl-6 relative"
          >
            <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-slate-200 dark:bg-slate-800 border-4 border-background" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/50 p-4 rounded-lg border">
              <div className="flex-1 space-y-1">
                <Label className="text-xs uppercase font-bold text-muted-foreground">
                  {t("forms.builder.page_title").replace(
                    "{page}",
                    pageNumber.toString(),
                  )}
                </Label>
                <Input
                  placeholder={
                    t("forms.builder.page_title_placeholder") ||
                    "ex. Informations personnelles"
                  }
                  className="bg-transparent border-0 border-b rounded-none px-0 focus-visible:ring-0 text-lg font-semibold h-8"
                  value={
                    fields.find((f) => (f.page || 1) === pageNumber)
                      ?.page_title || ""
                  }
                  onChange={(e) => updatePageTitle(pageNumber, e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleDragEnd(pageNumber, e)}
              >
                <SortableContext
                  items={fields
                    .map((f, i) => ({ f, i }))
                    .filter(({ f }) => (f.page || 1) === pageNumber)
                    .map(({ i }) => `f-${i}`)}
                  strategy={verticalListSortingStrategy}
                >
              {fields
                .map((f, i) => ({ ...f, originalIndex: i }))
                .filter((f) => (f.page || 1) === pageNumber)
                .map((field) => (
                  <SortableRow key={field.originalIndex} id={`f-${field.originalIndex}`}>
                  {(handle) => (
                  <Card
                    className="relative group border shadow-none bg-card hover:border-slate-300 dark:hover:border-slate-700 transition-colors mb-4"
                  >
                    <CardContent className="p-4 flex gap-4 items-start">
                      <div className="flex flex-col gap-1 pt-2 items-center">
                        <button
                          type="button"
                          className="h-6 w-6 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
                          aria-label={t("forms.builder.drag_handle")}
                          title={t("forms.builder.drag_handle")}
                          {...(handle as React.ButtonHTMLAttributes<HTMLButtonElement>)}
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveField(field.originalIndex, "up")}
                        >
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveField(field.originalIndex, "down")}
                        >
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>

                      <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">
                              {t("forms.builder.field_label")}
                            </Label>
                            <Input
                              className="h-9 bg-background"
                              value={field.label}
                              onChange={(e) =>
                                updateField(field.originalIndex, {
                                  label: e.target.value,
                                  name: ["name", "email"].includes(field.name)
                                    ? field.name
                                    : e.target.value
                                        .toLowerCase()
                                        .replace(/\s+/g, "_"),
                                })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">
                              {t("forms.builder.field_type")}
                            </Label>
                            <Select
                              value={field.type}
                              onValueChange={(val) =>
                                updateField(field.originalIndex, { type: val })
                              }
                              disabled={["name", "email"].includes(field.name)}
                            >
                              <SelectTrigger className="h-9 bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">
                                  {t("forms.builder.field_type_text")}
                                </SelectItem>
                                <SelectItem value="number">
                                  {t("forms.builder.field_type_number")}
                                </SelectItem>
                                <SelectItem value="email">
                                  {t("forms.builder.field_type_email")}
                                </SelectItem>
                                <SelectItem value="date">
                                  {t("forms.builder.field_type_date")}
                                </SelectItem>
                                <SelectItem value="select">
                                  {t("forms.builder.field_type_select")}
                                </SelectItem>
                                <SelectItem value="radio">
                                  {t("forms.builder.field_type_radio")}
                                </SelectItem>
                                <SelectItem value="checkbox_group">
                                  {t("forms.builder.field_type_multiselect")}
                                </SelectItem>
                                <SelectItem value="textarea">
                                  {t("forms.builder.field_type_textarea")}
                                </SelectItem>
                                <SelectItem value="file">
                                  {t("forms.builder.field_type_file")}
                                </SelectItem>
                                <SelectItem value="image">
                                  {t("forms.builder.field_type_image")}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">
                              {t("forms.builder.move_page")}
                            </Label>
                            <Select
                              value={String(field.page || 1)}
                              onValueChange={(val) =>
                                updateField(field.originalIndex, {
                                  page: parseInt(val),
                                })
                              }
                            >
                              <SelectTrigger className="h-9 bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {pages.map((p) => (
                                  <SelectItem key={p} value={String(p)}>
                                    {t("forms.builder.page_number").replace(
                                      "{page}",
                                      String(p),
                                    )}
                                  </SelectItem>
                                ))}
                                <SelectItem
                                  value={String(Math.max(...pages) + 1)}
                                >
                                  {t("forms.builder.new_page_option").replace(
                                    "{page}",
                                    String(Math.max(...pages) + 1),
                                  )}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2 flex flex-col justify-end">
                            <div className="flex items-center space-x-2 pb-2">
                              <Checkbox
                                id={`req-${field.originalIndex}`}
                                checked={field.validation_rules.required}
                                onCheckedChange={(checked: boolean) =>
                                  updateValidation(field.originalIndex, {
                                    required: !!checked,
                                  })
                                }
                                disabled={["name", "email"].includes(
                                  field.name,
                                )}
                              />
                              <label
                                htmlFor={`req-${field.originalIndex}`}
                                className="text-[12px] font-medium leading-none"
                              >
                                {t("forms.builder.mandatory")}
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Options Editor */}
                        {["select", "radio", "checkbox_group"].includes(
                          field.type,
                        ) && (
                          <div className="bg-muted/30 p-3 rounded-md border border-dashed dark:border-slate-800">
                            <Label className="text-xs uppercase text-muted-foreground font-bold mb-2 block">
                              {t("forms.builder.options")}
                            </Label>
                            <div className="flex flex-wrap gap-2">
                              {(
                                field.options ||
                                (field.validation_rules as any).options ||
                                []
                              ).map((opt: string, optIdx: number) => (
                                <div
                                  key={optIdx}
                                  className="flex items-center gap-1 bg-background border px-2 py-1 rounded text-sm group/opt shadow-sm"
                                >
                                  <span>{opt}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4 text-destructive hover:bg-destructive/10 rounded-full"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      const opts = [...(field.options || [])];
                                      opts.splice(optIdx, 1);
                                      updateOptions(field.originalIndex, opts);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                              <div className="flex gap-1 items-center">
                                <Input
                                  placeholder={
                                    t("forms.builder.add_option_placeholder") ||
                                    "Ajouter une option..."
                                  }
                                  className="h-7 w-40 text-xs bg-background"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      const val = e.currentTarget.value.trim();
                                      if (val) {
                                        const opts = [
                                          ...(field.options ||
                                            (field.validation_rules as any)
                                              .options ||
                                            []),
                                          val,
                                        ];
                                        updateOptions(
                                          field.originalIndex,
                                          opts,
                                        );
                                        e.currentTarget.value = "";
                                      }
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Regex Validation Editor */}
                        {["text", "number", "textarea"].includes(field.type) &&
                          (regexVisibleFor.has(field.originalIndex) ||
                          field.validation_rules.pattern ? (
                            <div className="bg-muted/30 p-3 rounded-md border border-dashed dark:border-slate-800 space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs uppercase text-muted-foreground font-bold">
                                  {t("forms.builder.regex_section_title") ||
                                    "Regex Validation"}
                                </Label>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs px-2 text-destructive hover:text-destructive"
                                  onClick={() => {
                                    updateValidation(field.originalIndex, {
                                      pattern: "",
                                      pattern_message: "",
                                    });
                                    setRegexVisibleFor((prev) => {
                                      const next = new Set(prev);
                                      next.delete(field.originalIndex);
                                      return next;
                                    });
                                  }}
                                >
                                  <X className="h-3 w-3 mr-1" />{" "}
                                  {t("forms.builder.remove_regex") || "Retirer"}
                                </Button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <Label className="text-xs uppercase text-muted-foreground font-bold">
                                    {t("forms.builder.regex_pattern") ||
                                      "Validation Pattern (regex)"}
                                  </Label>
                                  <Input
                                    className="h-8 text-xs bg-background font-mono"
                                    placeholder="^[0-9]{5}$"
                                    value={field.validation_rules.pattern || ""}
                                    onChange={(e) =>
                                      updateValidation(field.originalIndex, {
                                        pattern: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs uppercase text-muted-foreground font-bold">
                                    {t("forms.builder.regex_error_message") ||
                                      "Error Message"}
                                  </Label>
                                  <Input
                                    className="h-8 text-xs bg-background"
                                    placeholder={
                                      t(
                                        "forms.builder.regex_error_placeholder",
                                      ) || "Format invalide"
                                    }
                                    value={
                                      field.validation_rules.pattern_message ||
                                      ""
                                    }
                                    onChange={(e) =>
                                      updateValidation(field.originalIndex, {
                                        pattern_message: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() =>
                                setRegexVisibleFor((prev) =>
                                  new Set(prev).add(field.originalIndex),
                                )
                              }
                            >
                              <Plus className="h-3 w-3 mr-1" />{" "}
                              {t("forms.builder.add_regex") ||
                                "Ajouter une regex"}
                            </Button>
                          ))}

                        {/* Conditions Editor */}
                        {!["name", "email"].includes(field.name) && (
                          <div className="mt-2">
                            <div className="flex items-center gap-2 mb-2">
                              <Label className="text-xs font-semibold text-muted-foreground">
                                {t("forms.builder.logic_conditions") ||
                                  "Conditions Logiques"}
                              </Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  addCondition(field.originalIndex)
                                }
                                className="h-5 text-xs px-2 text-blue-600 hover:text-blue-700"
                              >
                                {t("forms.builder.add_rule") ||
                                  "+ Ajouter une règle"}
                              </Button>
                            </div>
                            {field.conditions &&
                              field.conditions.length > 0 && (
                                <div className="space-y-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-md border text-sm">
                                  {field.conditions.map((cond, condIdx) => (
                                    <div
                                      key={condIdx}
                                      className="flex items-center gap-2"
                                    >
                                      <span className="text-xs text-muted-foreground w-18">
                                        {t("forms.builder.show_if") ||
                                          "Afficher si"}
                                      </span>
                                      <Select
                                        value={cond.field}
                                        onValueChange={(val) =>
                                          updateCondition(
                                            field.originalIndex,
                                            condIdx,
                                            { field: val },
                                          )
                                        }
                                      >
                                        <SelectTrigger className="h-7 w-32 text-xs">
                                          <SelectValue
                                            placeholder={
                                              t("forms.builder.select_field") ||
                                              "Choisir un champ"
                                            }
                                          />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {fields
                                            .filter(
                                              (f) =>
                                                f.name &&
                                                f.name !== field.name,
                                            )
                                            .map((f) => (
                                              <SelectItem
                                                key={f.name}
                                                value={f.name}
                                              >
                                                {f.label}
                                              </SelectItem>
                                            ))}
                                        </SelectContent>
                                      </Select>
                                      <Select
                                        value={cond.operator}
                                        onValueChange={(val) =>
                                          updateCondition(
                                            field.originalIndex,
                                            condIdx,
                                            { operator: val },
                                          )
                                        }
                                      >
                                        <SelectTrigger className="h-7 w-24 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="equals">
                                            {t(
                                              "forms.builder.condition_equals",
                                            ) || "Est égal à"}
                                          </SelectItem>
                                          <SelectItem value="not_equals">
                                            {t(
                                              "forms.builder.condition_not_equals",
                                            ) || "N'est pas égal à"}
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Input
                                        className="h-7 w-32 text-xs"
                                        placeholder={
                                          t("forms.builder.condition_value") ||
                                          "Valeur"
                                        }
                                        value={cond.value}
                                        onChange={(e) =>
                                          updateCondition(
                                            field.originalIndex,
                                            condIdx,
                                            { value: e.target.value },
                                          )
                                        }
                                      />
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-destructive"
                                        onClick={() =>
                                          removeCondition(
                                            field.originalIndex,
                                            condIdx,
                                          )
                                        }
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                          </div>
                        )}
                      </div>

                      {!["name", "email"].includes(field.name) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeField(field.originalIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                  )}
                  </SortableRow>
                ))}
                </SortableContext>
              </DndContext>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addField(pageNumber)}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <Plus className="h-4 w-4 mr-1" />{" "}
                {t("forms.builder.add_field").replace(
                  "{page}",
                  pageNumber.toString(),
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="ghost"
        className="w-full border-2 border-dashed h-20 bg-muted/20 hover:bg-muted/50 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition-all"
        onClick={addPage}
      >
        <Plus className="mr-2 h-5 w-5" /> {t("forms.builder.create_page")}
      </Button>
    </div>
  );
}
