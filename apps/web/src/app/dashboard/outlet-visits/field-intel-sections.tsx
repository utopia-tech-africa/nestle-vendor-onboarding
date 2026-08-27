"use client";

import { type ReactElement } from "react";

import { CatalogCheckboxGroup, CatalogSelect } from "@/components/catalog-fields";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import type { FieldCatalogs } from "@/lib/outlet/field-catalogs";
import type { QuestionnaireQuestion } from "@/lib/outlet/outlet-api";

import {
  SELECT_NONE,
  fieldVendorInputClass,
  parseMultiChoiceAnswer,
  parseQuestionOptions,
  serializeMultiChoiceAnswer,
  type CompetitorDraft
} from "./field-vendor-shared";

export function QuestionnaireFields({
  title,
  questions,
  answers,
  onAnswer
}: {
  title: string;
  questions: QuestionnaireQuestion[];
  answers: Record<string, string>;
  onAnswer: (questionId: string, value: string) => void;
}): ReactElement {
  return (
    <div className="space-y-3 sm:col-span-2">
      <p className="text-sm font-medium">{title}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {questions.map((question) => {
          const options = parseQuestionOptions(question.optionsJson);
          const isWide = question.type === "textarea" || question.type === "multi_choice";
          return (
            <div key={question.id} className={`block text-sm${isWide ? " sm:col-span-2" : ""}`}>
              <p>
                {question.prompt}
                {question.required ? " *" : ""}
              </p>
              {question.helpText ? (
                <p className="mt-0.5 text-xs text-muted-foreground">{question.helpText}</p>
              ) : null}
              {question.type === "textarea" ? (
                <textarea
                  className={fieldVendorInputClass}
                  rows={3}
                  value={answers[question.id] ?? ""}
                  onChange={(event) => onAnswer(question.id, event.target.value)}
                  required={question.required}
                />
              ) : question.type === "boolean" ? (
                <Select
                  value={answers[question.id]?.length ? answers[question.id] : SELECT_NONE}
                  onValueChange={(value) => onAnswer(question.id, value === SELECT_NONE ? "" : value)}
                >
                  <SelectTrigger className="mt-1 h-10 w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_NONE}>Select</SelectItem>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              ) : question.type === "single_choice" ? (
                <Select
                  value={answers[question.id]?.length ? answers[question.id] : SELECT_NONE}
                  onValueChange={(value) => onAnswer(question.id, value === SELECT_NONE ? "" : value)}
                >
                  <SelectTrigger className="mt-1 h-10 w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_NONE}>Select</SelectItem>
                    {options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : question.type === "multi_choice" ? (
                <CatalogCheckboxGroup
                  options={options.map((option) => ({ value: option, label: option }))}
                  selected={parseMultiChoiceAnswer(answers[question.id])}
                  onChange={(next) => onAnswer(question.id, serializeMultiChoiceAnswer(next))}
                />
              ) : (
                <input
                  className={fieldVendorInputClass}
                  type={question.type === "number" ? "number" : "text"}
                  value={answers[question.id] ?? ""}
                  onChange={(event) => onAnswer(question.id, event.target.value)}
                  required={question.required}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function NestleVisibilityFields({
  catalogs,
  nestleProductAvailable,
  nestleProducts,
  outOfStock,
  posMaterialsPresent,
  promotionalMaterialsPresent,
  productPlacementNotes,
  shelfVisibilityNotes,
  stockLevelNotes,
  onChange
}: {
  catalogs: FieldCatalogs;
  nestleProductAvailable: boolean | null;
  nestleProducts: string[];
  outOfStock: boolean | null;
  posMaterialsPresent: boolean | null;
  promotionalMaterialsPresent: boolean | null;
  productPlacementNotes: string;
  shelfVisibilityNotes: string;
  stockLevelNotes: string;
  onChange: {
    nestleProductAvailable: (value: boolean) => void;
    nestleProducts: (value: string[]) => void;
    outOfStock: (value: boolean) => void;
    posMaterialsPresent: (value: boolean) => void;
    promotionalMaterialsPresent: (value: boolean) => void;
    productPlacementNotes: (value: string) => void;
    shelfVisibilityNotes: (value: string) => void;
    stockLevelNotes: (value: string) => void;
  };
}): ReactElement {
  return (
    <div className="space-y-3 sm:col-span-2">
      <p className="text-sm font-medium">Nestlé on stall</p>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={nestleProductAvailable === true || nestleProducts.length > 0}
          onChange={(event) => onChange.nestleProductAvailable(event.target.checked)}
        />
        Nestlé product available
      </label>
      <div className="text-sm">
        Nestlé products
        <CatalogCheckboxGroup
          options={catalogs.nestleProducts}
          selected={nestleProducts}
          onChange={onChange.nestleProducts}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={outOfStock === true}
          onChange={(event) => onChange.outOfStock(event.target.checked)}
        />
        Out of stock
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={posMaterialsPresent === true}
          onChange={(event) => onChange.posMaterialsPresent(event.target.checked)}
        />
        POS materials present
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={promotionalMaterialsPresent === true}
          onChange={(event) => onChange.promotionalMaterialsPresent(event.target.checked)}
        />
        Promotional materials present
      </label>
      <label className="text-sm">
        Product placement
        <textarea
          className={fieldVendorInputClass}
          rows={2}
          value={productPlacementNotes}
          onChange={(event) => onChange.productPlacementNotes(event.target.value)}
        />
      </label>
      <label className="text-sm">
        Shelf visibility
        <textarea
          className={fieldVendorInputClass}
          rows={2}
          value={shelfVisibilityNotes}
          onChange={(event) => onChange.shelfVisibilityNotes(event.target.value)}
        />
      </label>
      <label className="text-sm">
        Stock levels
        <textarea
          className={fieldVendorInputClass}
          rows={2}
          value={stockLevelNotes}
          onChange={(event) => onChange.stockLevelNotes(event.target.value)}
        />
      </label>
    </div>
  );
}

export function CompetitorActivityFields({
  catalogs,
  competitors,
  onChange
}: {
  catalogs: FieldCatalogs;
  competitors: CompetitorDraft[];
  onChange: (next: CompetitorDraft[] | ((prev: CompetitorDraft[]) => CompetitorDraft[])) => void;
}): ReactElement {
  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Competitors</p>
        <button
          type="button"
          className="text-xs font-medium text-primary hover:underline"
          onClick={() =>
            onChange((prev) => [
              ...prev,
              {
                key: crypto.randomUUID(),
                brandName: "",
                brandNameOther: "",
                products: [],
                pricingNotes: "",
                promotionsNotes: "",
                discountsNotes: "",
                newLaunchesNotes: "",
                displayQualityNotes: "",
                marketObservations: ""
              }
            ])
          }
        >
          Add competitor
        </button>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {competitors.map((competitor, index) => (
          <div key={competitor.key} className="space-y-2 rounded-lg border border-border p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Competitor {index + 1}</p>
              {competitors.length > 1 ? (
                <button
                  type="button"
                  className="text-xs text-destructive hover:underline"
                  onClick={() =>
                    onChange((prev) => prev.filter((item) => item.key !== competitor.key))
                  }
                >
                  Remove
                </button>
              ) : null}
            </div>
            <label className="block text-sm">
              Brand
              <CatalogSelect
                value={competitor.brandName}
                options={catalogs.competitorBrands}
                onValueChange={(value) =>
                  onChange((prev) =>
                    prev.map((item) =>
                      item.key === competitor.key ? { ...item, brandName: value, products: [] } : item
                    )
                  )
                }
                allowEmpty
                emptyLabel="Select brand"
              />
            </label>
            {competitor.brandName === "Other" ? (
              <label className="block text-sm">
                Other brand name
                <input
                  className={fieldVendorInputClass}
                  value={competitor.brandNameOther ?? ""}
                  onChange={(event) =>
                    onChange((prev) =>
                      prev.map((item) =>
                        item.key === competitor.key
                          ? { ...item, brandNameOther: event.target.value }
                          : item
                      )
                    )
                  }
                />
              </label>
            ) : null}
            {competitor.brandName.length > 0 ? (
              <div className="text-sm">
                Products
                <CatalogCheckboxGroup
                  options={
                    catalogs.competitorProductsByBrand[competitor.brandName] ??
                    catalogs.competitorProductsByBrand.Other ??
                    []
                  }
                  selected={competitor.products ?? []}
                  onChange={(next) =>
                    onChange((prev) =>
                      prev.map((item) =>
                        item.key === competitor.key ? { ...item, products: next } : item
                      )
                    )
                  }
                />
              </div>
            ) : null}
            {(
              [
                ["pricingNotes", "Pricing"],
                ["promotionsNotes", "Promotions"],
                ["discountsNotes", "Discounts"],
                ["newLaunchesNotes", "New launches"],
                ["displayQualityNotes", "Display quality"],
                ["marketObservations", "Market observations"]
              ] as const
            ).map(([field, label]) => (
              <label key={field} className="block text-sm">
                {label}
                {field === "marketObservations" ? (
                  <textarea
                    className={fieldVendorInputClass}
                    rows={2}
                    value={competitor[field] ?? ""}
                    onChange={(event) =>
                      onChange((prev) =>
                        prev.map((item) =>
                          item.key === competitor.key ? { ...item, [field]: event.target.value } : item
                        )
                      )
                    }
                  />
                ) : (
                  <input
                    className={fieldVendorInputClass}
                    value={competitor[field] ?? ""}
                    onChange={(event) =>
                      onChange((prev) =>
                        prev.map((item) =>
                          item.key === competitor.key ? { ...item, [field]: event.target.value } : item
                        )
                      )
                    }
                  />
                )}
              </label>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ItemsGivenFields({
  items,
  selectedIds,
  lockedIds,
  onToggle
}: {
  items: { id: string; name: string }[];
  selectedIds: string[];
  lockedIds?: string[];
  onToggle: (itemId: string, given: boolean) => void;
}): ReactElement {
  const locked = new Set(lockedIds ?? []);
  return (
    <fieldset className="min-w-0 space-y-2 border-0 p-0 sm:col-span-2">
      <legend className="text-sm font-medium text-foreground">Tick each item you have given her</legend>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No items configured yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const given = selectedIds.includes(item.id);
            const isLocked = locked.has(item.id);
            return (
              <li key={item.id}>
                <label
                  className={[
                    "flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3 dark:bg-muted/10",
                    given ? "border-emerald-500/40 bg-emerald-500/5" : "",
                    isLocked ? "cursor-default" : "cursor-pointer"
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 size-5 shrink-0 accent-primary"
                    checked={given}
                    disabled={isLocked}
                    onChange={(event) => onToggle(item.id, event.target.checked)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-foreground">{item.name}</span>
                    {isLocked ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">Already given</span>
                    ) : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </fieldset>
  );
}
