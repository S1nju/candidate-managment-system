"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
} from "@/components/ui/card";
import { Loader2, CheckCircle2, FileText, X, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useLanguage } from "@/context/language-context";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useToast } from "@/hooks/use-toast";

export default function PublicFormPage() {
  const { uuid } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const previewRequested = searchParams.get("preview") === "1";
  const { toast } = useToast();
  const { t } = useLanguage();
  const { resolvedTheme, setTheme } = useTheme();
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const res = await axios.get(`/api/public/forms/${uuid}`, {
          params: previewRequested ? { preview: 1 } : undefined,
        });
        setForm(res.data);
        // Initialize form data
        const initial: Record<string, any> = {};
        res.data.fields.forEach((f: any) => {
          initial[f.name] = f.type === "checkbox_group" ? [] : "";
        });
        setFormData(initial);
      } catch (error) {
        console.error("Failed to load form", error);
      } finally {
        setLoading(false);
      }
    };
    fetchForm();
  }, [uuid, previewRequested]);

  const isPreview = previewRequested && !!form && form.status !== "active";

  const pages = form
    ? Array.from(new Set(form.fields.map((f: any) => f.page || 1))).sort(
        (a: any, b: any) => a - b,
      )
    : [];
  const isLastPage =
    currentPage === (pages.length > 0 ? Math.max(...(pages as number[])) : 1);
  const isFirstPage = currentPage === 1;

  const handleInputChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const checkConditions = (field: any) => {
    if (!field.conditions || field.conditions.length === 0) return true;

    return field.conditions.every((cond: any) => {
      if (!cond.field || !cond.operator) return true;

      const fieldValue = formData[cond.field];

      // Normalize values for reliable comparison
      const val1 = String(fieldValue ?? "").trim();
      const val2 = String(cond.value ?? "").trim();

      // Debug log to help diagnose issues
      console.log(
        `[Form Logic] Checking field '${field.label}': Dependency '${cond.field}' (Value: '${val1}') ${cond.operator} '${val2}'`,
      );

      if (cond.operator === "equals") {
        return val1 === val2;
      } else if (cond.operator === "not_equals") {
        return val1 !== val2;
      }

      // If unknown operator, we default to visible (true) to avoid hiding fields erroneously,
      // but we log a warning.
      console.warn(`[Form Logic] Unknown operator: ${cond.operator}`);
      return true;
    });
  };

  const validateCurrentPage = () => {
    const pageFields = form.fields.filter(
      (f: any) => (f.page || 1) === currentPage,
    );
    for (const field of pageFields) {
      // Skip validation if field is hidden by conditions
      if (!checkConditions(field)) continue;

      const isEmpty =
        field.type === "checkbox_group"
          ? !Array.isArray(formData[field.name]) ||
            formData[field.name].length === 0
          : !formData[field.name];

      if (field.validation_rules?.required && isEmpty) {
        toast({
          title: t("apply.missing_field_title").replace("{label}", field.label),
          description: t("apply.missing_field_desc"),
          variant: "destructive",
        });
        return false;
      }

      const pattern = field.validation_rules?.pattern;
      const value = formData[field.name];
      if (pattern && value) {
        try {
          if (!new RegExp(pattern).test(String(value))) {
            toast({
              title: t("apply.invalid_field_title").replace("{label}", field.label),
              description:
                field.validation_rules?.pattern_message ||
                t("apply.invalid_field_desc"),
              variant: "destructive",
            });
            return false;
          }
        } catch {
          // Invalid regex configured on the field - skip rather than block the candidate
        }
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentPage()) {
      const nextPageIndex = (pages as number[]).indexOf(currentPage) + 1;
      if (nextPageIndex < pages.length) {
        setCurrentPage(pages[nextPageIndex] as number);
        window.scrollTo(0, 0);
      }
    }
  };

  const handlePrevious = () => {
    const prevPageIndex = (pages as number[]).indexOf(currentPage) - 1;
    if (prevPageIndex >= 0) {
      setCurrentPage(pages[prevPageIndex] as number);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPreview) {
      toast({ title: t("apply.preview_submit_disabled") });
      return;
    }
    if (!validateCurrentPage()) return;

    setSubmitting(true);
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((v) => data.append(`fields[${key}][]`, v));
        } else {
          data.append(`fields[${key}]`, value);
        }
      });

      const res = await axios.post(`/api/public/forms/${uuid}/submit`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.kyc_required) {
        toast({
          title: t("apply.submitted_title"),
          description: t("apply.redirecting_kyc"),
        });
        window.location.href = res.data.kyc_redirect_url;
      } else {
        setSubmitted(true);
      }
    } catch (error: any) {
      toast({
        title: t("apply.submit_failed"),
        description:
          error.response?.data?.message || t("apply.check_inputs"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{t("apply.not_found_title")}</h1>
          <p className="text-muted-foreground">
            {t("apply.not_found_desc")}
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-10 pb-10">
            <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">{t("apply.thank_you_title")}</h2>
            <p className="text-muted-foreground">
              {t("apply.thank_you_desc")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPageFields = form.fields
    .filter((f: any) => (f.page || 1) === currentPage)
    .filter((f: any) => checkConditions(f));

  const currentPageTitle = currentPageFields[0]?.page_title || t("apply.default_step_title");
  const totalPagesCount = pages.length;
  const progress = ((pages.indexOf(currentPage) + 1) / totalPagesCount) * 100;

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="fixed top-4 right-4 z-10 flex items-center gap-1 rounded-lg border bg-card/80 backdrop-blur p-1 shadow-sm">
        <div className="w-36">
          <LanguageSwitcher />
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("header.toggle_theme")}
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 hidden dark:block" />
          <Moon className="h-4 w-4 dark:hidden" />
        </Button>
      </div>
      <div className="max-w-2xl mx-auto space-y-4 pt-8">
        {isPreview && (
          <div className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm text-foreground text-center">
            {t("apply.preview_banner")}
          </div>
        )}
        {/* Progress Bar */}
        {totalPagesCount > 1 && (
          <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-500 ease-in-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <Card>
          <CardHeader className="text-center">
            {totalPagesCount > 1 && (
              <p className="text-primary font-semibold text-sm mt-2 first:mt-0 uppercase tracking-wider">
                {t("apply.step_of")
                  .replace("{current}", String(pages.indexOf(currentPage) + 1))
                  .replace("{total}", String(totalPagesCount))
                  .replace("{title}", currentPageTitle)}
              </p>
            )}
            {form.description && currentPage === 1 && (
              <CardDescription className="text-lg mt-2 first:mt-0">
                {form.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {currentPageFields.map((field: any) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.name}>
                    {field.label}
                    {field.validation_rules?.required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </Label>

                  {field.type === "textarea" ? (
                    <div className="space-y-1">
                      <Textarea
                        id={field.name}
                        required={field.validation_rules?.required}
                        value={formData[field.name] || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (
                            !field.validation_rules?.max ||
                            value.length <= field.validation_rules.max
                          ) {
                            handleInputChange(field.name, value);
                          }
                        }}
                        placeholder={t("apply.type_placeholder").replace("{label}", field.label.toLowerCase())}
                        maxLength={field.validation_rules?.max}
                      />
                      {field.validation_rules?.max && (
                        <p className="text-xs text-muted-foreground text-right">
                          {(formData[field.name] || "").length} /{" "}
                          {field.validation_rules.max}
                        </p>
                      )}
                    </div>
                  ) : field.type === "select" ? (
                    <Select
                      value={formData[field.name] || ""}
                      onValueChange={(val) =>
                        handleInputChange(field.name, val)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("apply.choose_placeholder").replace("{label}", field.label.toLowerCase())}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {field.validation_rules?.options?.map((opt: string) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.type === "radio" ? (
                    <RadioGroup
                      value={formData[field.name] || ""}
                      onValueChange={(val) =>
                        handleInputChange(field.name, val)
                      }
                      className="flex flex-col gap-2 pt-2"
                    >
                      {field.validation_rules?.options?.map((opt: string) => (
                        <div key={opt} className="flex items-center space-x-2">
                          <RadioGroupItem
                            value={opt}
                            id={`${field.name}-${opt}`}
                          />
                          <Label
                            htmlFor={`${field.name}-${opt}`}
                            className="font-normal"
                          >
                            {opt}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : field.type === "checkbox_group" ? (
                    <div className="flex flex-col gap-2 pt-2">
                      {field.validation_rules?.options?.map((opt: string) => {
                        const selected: string[] = Array.isArray(
                          formData[field.name],
                        )
                          ? formData[field.name]
                          : [];
                        return (
                          <div
                            key={opt}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`${field.name}-${opt}`}
                              checked={selected.includes(opt)}
                              onCheckedChange={(checked: boolean) => {
                                const next = checked
                                  ? [...selected, opt]
                                  : selected.filter((v) => v !== opt);
                                handleInputChange(field.name, next);
                              }}
                            />
                            <Label
                              htmlFor={`${field.name}-${opt}`}
                              className="font-normal"
                            >
                              {opt}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  ) : field.type === "file" ? (
                    <div className="space-y-3">
                      <Input
                        id={field.name}
                        type="file"
                        required={field.validation_rules?.required}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleInputChange(field.name, file);
                          }
                        }}
                        className="cursor-pointer"
                        accept={
                          field.validation_rules?.accept ||
                          (field.name.includes("photo") ||
                          field.name.includes("image")
                            ? "image/*"
                            : ".pdf,.doc,.docx")
                        }
                      />
                      {formData[field.name] instanceof File && (
                        <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                          {formData[field.name].type.startsWith("image/") ? (
                            <div className="h-16 w-16 rounded overflow-hidden border bg-card flex-shrink-0">
                              <img
                                src={URL.createObjectURL(formData[field.name])}
                                alt={t("apply.preview_alt")}
                                className="h-full w-full object-cover"
                                onLoad={(e) =>
                                  URL.revokeObjectURL(
                                    (e.target as HTMLImageElement).src,
                                  )
                                }
                              />
                            </div>
                          ) : (
                            <div className="h-16 w-16 rounded border bg-card flex items-center justify-center flex-shrink-0">
                              <FileText className="h-8 w-8 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 text-sm">
                            <p className="font-medium truncate">
                              {formData[field.name].name}
                            </p>
                            <p className="text-muted-foreground">
                              {(formData[field.name].size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleInputChange(field.name, null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : field.type === "image" ? (
                    <div className="space-y-3">
                      <Input
                        id={field.name}
                        type="file"
                        accept="image/*"
                        required={field.validation_rules?.required}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleInputChange(field.name, file);
                          }
                        }}
                        className="cursor-pointer"
                      />
                      {formData[field.name] instanceof File && (
                        <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                          {formData[field.name].type.startsWith("image/") ? (
                            <div className="h-16 w-16 rounded overflow-hidden border bg-card flex-shrink-0">
                              <img
                                src={URL.createObjectURL(formData[field.name])}
                                alt={t("apply.preview_alt")}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-16 w-16 rounded border bg-muted flex items-center justify-center flex-shrink-0">
                              <FileText className="h-8 w-8 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 text-sm">
                            <p className="font-medium truncate">
                              {formData[field.name].name}
                            </p>
                            <p className="text-muted-foreground">
                              {(formData[field.name].size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleInputChange(field.name, null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Input
                        id={field.name}
                        type={field.type}
                        required={field.validation_rules?.required}
                        value={formData[field.name] || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (
                            field.type === "text" &&
                            field.validation_rules?.max &&
                            value.length > field.validation_rules.max
                          ) {
                            return;
                          }
                          handleInputChange(field.name, value);
                        }}
                        placeholder={t("apply.type_placeholder").replace("{label}", field.label.toLowerCase())}
                        maxLength={field.validation_rules?.max}
                        min={field.validation_rules?.min}
                      />
                      {field.type === "text" && field.validation_rules?.max && (
                        <p className="text-xs text-muted-foreground text-right">
                          {(formData[field.name] || "").length} /{" "}
                          {field.validation_rules.max}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <div className="flex gap-4 pt-4">
                {!isFirstPage && (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-12 text-lg"
                    onClick={handlePrevious}
                  >
                    {t("apply.previous")}
                  </Button>
                )}

                {isLastPage ? (
                  <Button
                    type="submit"
                    className="flex-1 h-12 text-lg"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {t("apply.submitting")}
                      </>
                    ) : (
                      t("apply.submit")
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="flex-1 h-12 text-lg"
                    onClick={handleNext}
                  >
                    {t("apply.next")}
                  </Button>
                )}
              </div>

              <p className="text-center text-xs text-muted-foreground mt-4">
                {t("apply.secured_by")}
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
