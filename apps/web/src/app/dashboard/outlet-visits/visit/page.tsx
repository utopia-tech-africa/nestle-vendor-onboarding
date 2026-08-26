"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, type ReactElement, type SyntheticEvent, useMemo, useState } from "react";

import { BoneyardInlineFallback } from "@/components/boneyard/boneyard-inline-fallback";
import { CatalogCheckboxGroup, CatalogSelect } from "@/components/catalog-fields";
import { OutletMapPreview } from "@/components/outlet-map-preview";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useNetworkOnline } from "@/hooks/use-network-online";
import { formatApiErrorMessage } from "@/lib/api/format-api-error";
import { ApiError } from "@/lib/api/problem-details";
import { useAuthStore } from "@/lib/auth/auth-store";
import { calmMutedLinkClass, calmPrimaryButtonClass } from "@/lib/calm-ui";
import { enqueueOutletVisitForOfflineSync } from "@/lib/field/field-offline-enqueue";
import { requestCurrentPosition } from "@/lib/geolocation/request-current-position";
import { FALLBACK_FIELD_CATALOGS, SELLER_TYPE_QUESTION_PROMPT, VENDOR_TYPE_QUESTION_PROMPT } from "@/lib/outlet/field-catalogs";
import {
  createOutletVisit,
  getActiveQuestionnaire,
  getFieldCatalogs,
  vendorLabel,
  type CreateOutletVisitPayload
} from "@/lib/outlet/outlet-api";
import { toast } from "@/lib/toast";

import {
  SELECT_NONE,
  activeQuestionnaireKey,
  blankCompetitor,
  fieldCatalogsQueryKey,
  fieldVendorInputClass,
  fieldVendorPageClass,
  parseMultiChoiceAnswer,
  parseQuestionOptions,
  serializeMultiChoiceAnswer,
  type CompetitorDraft
} from "../field-vendor-shared";
import { useFieldVendorOptions } from "../use-field-vendor-options";

function RecordVendorVisitPageInner(): ReactElement {
  const searchParams = useSearchParams();
  const accessToken = useAuthStore((state) => state.accessToken);
  const online = useNetworkOnline();
  const { vendorOptions } = useFieldVendorOptions(accessToken);

  const outletIdFromUrl = searchParams.get("outletId")?.trim() ?? "";
  const [pickedOutletId, setPickedOutletId] = useState<string | null>(null);
  const [prevOutletIdFromUrl, setPrevOutletIdFromUrl] = useState(outletIdFromUrl);
  if (outletIdFromUrl !== prevOutletIdFromUrl) {
    setPrevOutletIdFromUrl(outletIdFromUrl);
    setPickedOutletId(null);
  }
  const outletId = pickedOutletId ?? outletIdFromUrl;
  const [isCapturingVisitLocation, setIsCapturingVisitLocation] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [nestleProductAvailable, setNestleProductAvailable] = useState<boolean | null>(null);
  const [nestleProducts, setNestleProducts] = useState<string[]>([]);
  const [productPlacementNotes, setProductPlacementNotes] = useState("");
  const [shelfVisibilityNotes, setShelfVisibilityNotes] = useState("");
  const [posMaterialsPresent, setPosMaterialsPresent] = useState<boolean | null>(null);
  const [promotionalMaterialsPresent, setPromotionalMaterialsPresent] = useState<boolean | null>(
    null
  );
  const [stockLevelNotes, setStockLevelNotes] = useState("");
  const [outOfStock, setOutOfStock] = useState<boolean | null>(null);
  const [competitors, setCompetitors] = useState<CompetitorDraft[]>([blankCompetitor()]);

  const catalogsQuery = useQuery({
    queryKey: fieldCatalogsQueryKey,
    queryFn: async () => getFieldCatalogs(accessToken ?? ""),
    enabled: accessToken !== null,
    staleTime: 60 * 60 * 1000,
    placeholderData: FALLBACK_FIELD_CATALOGS
  });
  const catalogs = catalogsQuery.data ?? FALLBACK_FIELD_CATALOGS;

  const questionnaireQuery = useQuery({
    queryKey: activeQuestionnaireKey,
    queryFn: async () => getActiveQuestionnaire(accessToken ?? ""),
    enabled: accessToken !== null,
    staleTime: 5 * 60 * 1000
  });

  const vendorTypeQuestionId = useMemo(
    () =>
      questionnaireQuery.data?.questions.find((question) => question.prompt === VENDOR_TYPE_QUESTION_PROMPT)
        ?.id,
    [questionnaireQuery.data]
  );
  const sellerTypeQuestionId = useMemo(
    () =>
      questionnaireQuery.data?.questions.find((question) => question.prompt === SELLER_TYPE_QUESTION_PROMPT)
        ?.id,
    [questionnaireQuery.data]
  );
  const selectedVendorTypeAnswer =
    vendorTypeQuestionId !== undefined ? (answers[vendorTypeQuestionId] ?? "") : "";

  const selectedOutlet = useMemo(() => {
    if (!outletId) return null;
    return vendorOptions.find((row) => row.id === outletId) ?? null;
  }, [outletId, vendorOptions]);

  const selectedVendorLabel = selectedOutlet
    ? `${vendorLabel(selectedOutlet)}${selectedOutlet.locationArea ? ` · ${selectedOutlet.locationArea}` : ""}`
    : null;

  const createVisitMutation = useMutation({
    mutationFn: async (payload: CreateOutletVisitPayload) =>
      createOutletVisit(accessToken ?? "", payload)
  });

  const resetVisitForm = (): void => {
    setAnswers({});
    setNestleProductAvailable(null);
    setNestleProducts([]);
    setProductPlacementNotes("");
    setShelfVisibilityNotes("");
    setPosMaterialsPresent(null);
    setPromotionalMaterialsPresent(null);
    setStockLevelNotes("");
    setOutOfStock(null);
    setCompetitors([blankCompetitor()]);
  };

  const buildVisitPayload = (
    targetOutletId: string,
    latitude: number,
    longitude: number
  ): CreateOutletVisitPayload => {
    const questionnaire = questionnaireQuery.data;
    const questionnairePayload =
      questionnaire !== null && questionnaire !== undefined
        ? {
            questionnaireId: questionnaire.id,
            answers: questionnaire.questions.map((q) => ({
              questionId: q.id,
              ...(answers[q.id]?.trim() ? { valueText: answers[q.id].trim() } : {})
            }))
          }
        : undefined;

    const competitorPayload = competitors
      .filter((c) => c.brandName.trim().length > 0)
      .map((c) => ({
        brandName: c.brandName.trim(),
        ...(c.brandName === "Other" && c.brandNameOther?.trim()
          ? { brandNameOther: c.brandNameOther.trim() }
          : {}),
        ...(c.products && c.products.length > 0 ? { products: c.products } : {}),
        ...(c.pricingNotes?.trim() ? { pricingNotes: c.pricingNotes.trim() } : {}),
        ...(c.promotionsNotes?.trim() ? { promotionsNotes: c.promotionsNotes.trim() } : {}),
        ...(c.discountsNotes?.trim() ? { discountsNotes: c.discountsNotes.trim() } : {}),
        ...(c.newLaunchesNotes?.trim() ? { newLaunchesNotes: c.newLaunchesNotes.trim() } : {}),
        ...(c.displayQualityNotes?.trim()
          ? { displayQualityNotes: c.displayQualityNotes.trim() }
          : {}),
        ...(c.marketObservations?.trim()
          ? { marketObservations: c.marketObservations.trim() }
          : {})
      }));

    return {
      outletId: targetOutletId,
      latitude,
      longitude,
      ...(nestleProductAvailable !== null || nestleProducts.length > 0
        ? { nestleProductAvailable: nestleProductAvailable === true || nestleProducts.length > 0 }
        : {}),
      ...(nestleProducts.length > 0 ? { nestleProducts } : {}),
      ...(productPlacementNotes.trim()
        ? { productPlacementNotes: productPlacementNotes.trim() }
        : {}),
      ...(shelfVisibilityNotes.trim()
        ? { shelfVisibilityNotes: shelfVisibilityNotes.trim() }
        : {}),
      ...(posMaterialsPresent !== null ? { posMaterialsPresent } : {}),
      ...(promotionalMaterialsPresent !== null ? { promotionalMaterialsPresent } : {}),
      ...(stockLevelNotes.trim() ? { stockLevelNotes: stockLevelNotes.trim() } : {}),
      ...(outOfStock !== null ? { outOfStock } : {}),
      ...(competitorPayload.length > 0 ? { competitors: competitorPayload } : {}),
      ...(questionnairePayload !== undefined ? { questionnaire: questionnairePayload } : {})
    };
  };

  const handleSubmitVisit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!outletId) {
      toast.error("Select a vendor first.");
      return;
    }
    const questionnaire = questionnaireQuery.data;
    const missingRequired = questionnaire?.questions.find((question) => {
      if (!question.required) {
        return false;
      }
      return (answers[question.id]?.trim() ?? "").length === 0;
    });
    if (missingRequired !== undefined) {
      toast.error(`Answer required: ${missingRequired.prompt}`);
      return;
    }
    setIsCapturingVisitLocation(true);
    void (async () => {
      const position = await requestCurrentPosition();
      setIsCapturingVisitLocation(false);
      if (!position.ok) {
        toast.error(position.message);
        return;
      }
      const payload = buildVisitPayload(outletId, position.latitude, position.longitude);

      if (!online) {
        try {
          await enqueueOutletVisitForOfflineSync(payload);
          toast.success("Visit saved offline. It will sync when you are back online.");
          resetVisitForm();
        } catch {
          toast.error("Could not save visit offline.");
        }
        return;
      }

      createVisitMutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Vendor visit submitted.");
          resetVisitForm();
        },
        onError: (error: unknown) => {
          if (error instanceof ApiError && error.status === 0) {
            void enqueueOutletVisitForOfflineSync(payload).then(() => {
              toast.success("Visit saved offline. It will sync when you are back online.");
              resetVisitForm();
            });
            return;
          }
          toast.error(formatApiErrorMessage(error, "Could not submit visit."));
        }
      });
    })();
  };

  if (accessToken === null) {
    return <BoneyardInlineFallback name="field-record-visit-auth" className="min-h-32" />;
  }

  return (
    <div className={fieldVendorPageClass}>
      <div>
        <p className="text-sm">
          <Link href="/dashboard/outlet-visits" className={calmMutedLinkClass}>
            Back to vendors
          </Link>
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">Record visit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Capture the questionnaire, Nestlé visibility, and competitor intel.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <form className="flex flex-col gap-6" onSubmit={handleSubmitVisit}>
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-sm font-medium">Vendor</p>
              <Select
                key={outletIdFromUrl || SELECT_NONE}
                value={outletId || SELECT_NONE}
                onValueChange={(value) => setPickedOutletId(value === SELECT_NONE ? "" : value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select vendor">{selectedVendorLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE}>Select vendor</SelectItem>
                  {outletId && selectedOutlet === null ? (
                    <SelectItem value={outletId}>Selected vendor</SelectItem>
                  ) : null}
                  {vendorOptions.map((outlet) => (
                    <SelectItem key={outlet.id} value={outlet.id}>
                      {vendorLabel(outlet)}
                      {outlet.locationArea ? ` · ${outlet.locationArea}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 text-xs text-muted-foreground">
                New vendor?{" "}
                <Link href="/dashboard/outlet-visits/new" className={calmMutedLinkClass}>
                  Add vendor
                </Link>
              </p>
            </div>
            {selectedOutlet?.latitude != null && selectedOutlet.longitude != null ? (
              <OutletMapPreview
                latitude={selectedOutlet.latitude}
                longitude={selectedOutlet.longitude}
                locationArea={selectedOutlet.locationArea}
              />
            ) : null}
          </div>

          {questionnaireQuery.data ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">{questionnaireQuery.data.title}</p>
              <div className="grid gap-4 sm:grid-cols-2">
              {questionnaireQuery.data.questions.map((q) => {
                const storedOptions = parseQuestionOptions(q.optionsJson);
                const sellerOptions = (
                  catalogs.vendorTypeValuesByType[selectedVendorTypeAnswer] ?? []
                ).map((item) => item.label);
                const options =
                  q.prompt === VENDOR_TYPE_QUESTION_PROMPT
                    ? catalogs.vendorTypes.map((item) => item.label)
                    : q.prompt === SELLER_TYPE_QUESTION_PROMPT
                      ? sellerOptions
                      : storedOptions;
                const isWide = q.type === "textarea" || q.type === "multi_choice";
                return (
                  <div key={q.id} className={`block text-sm${isWide ? " sm:col-span-2" : ""}`}>
                    <p>
                      {q.prompt}
                      {q.required ? " *" : ""}
                    </p>
                    {q.helpText ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{q.helpText}</p>
                    ) : null}
                    {q.type === "textarea" ? (
                      <textarea
                        className={fieldVendorInputClass}
                        rows={3}
                        value={answers[q.id] ?? ""}
                        onChange={(e) =>
                          setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                        }
                        required={q.required}
                      />
                    ) : q.type === "boolean" ? (
                      <Select
                        value={answers[q.id]?.length ? answers[q.id]! : SELECT_NONE}
                        onValueChange={(value) =>
                          setAnswers((prev) => ({
                            ...prev,
                            [q.id]: value === SELECT_NONE ? "" : value
                          }))
                        }
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
                    ) : q.type === "single_choice" ? (
                      <Select
                        value={answers[q.id]?.length ? answers[q.id]! : SELECT_NONE}
                        onValueChange={(value) => {
                          const next = value === SELECT_NONE ? "" : value;
                          setAnswers((prev) => {
                            const updated = { ...prev, [q.id]: next };
                            if (q.prompt === VENDOR_TYPE_QUESTION_PROMPT && sellerTypeQuestionId) {
                              updated[sellerTypeQuestionId] = "";
                            }
                            return updated;
                          });
                        }}
                      >
                        <SelectTrigger className="mt-1 h-10 w-full">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SELECT_NONE}>Select</SelectItem>
                          {options.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : q.type === "multi_choice" ? (
                      <CatalogCheckboxGroup
                        options={options.map((opt) => ({ value: opt, label: opt }))}
                        selected={parseMultiChoiceAnswer(answers[q.id])}
                        onChange={(next) =>
                          setAnswers((prev) => ({
                            ...prev,
                            [q.id]: serializeMultiChoiceAnswer(next)
                          }))
                        }
                      />
                    ) : (
                      <input
                        className={fieldVendorInputClass}
                        type={q.type === "number" ? "number" : "text"}
                        value={answers[q.id] ?? ""}
                        onChange={(e) =>
                          setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                        }
                        required={q.required}
                      />
                    )}
                  </div>
                );
              })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No active questionnaire configured. Ops can add one under Questionnaires.
            </p>
          )}

          <div className="space-y-3">
            <p className="text-sm font-medium">Nestlé visibility</p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={nestleProductAvailable === true || nestleProducts.length > 0}
                onChange={(e) => setNestleProductAvailable(e.target.checked)}
              />
              Nestlé product available
            </label>
            <div className="text-sm">
              Nestlé products
              <CatalogCheckboxGroup
                options={catalogs.nestleProducts}
                selected={nestleProducts}
                onChange={setNestleProducts}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={outOfStock === true}
                onChange={(e) => setOutOfStock(e.target.checked)}
              />
              Out of stock
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={posMaterialsPresent === true}
                onChange={(e) => setPosMaterialsPresent(e.target.checked)}
              />
              POS materials present
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={promotionalMaterialsPresent === true}
                onChange={(e) => setPromotionalMaterialsPresent(e.target.checked)}
              />
              Promotional materials present
            </label>
            <label className="text-sm">
              Product placement
              <textarea
                className={fieldVendorInputClass}
                rows={2}
                value={productPlacementNotes}
                onChange={(e) => setProductPlacementNotes(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Shelf visibility
              <textarea
                className={fieldVendorInputClass}
                rows={2}
                value={shelfVisibilityNotes}
                onChange={(e) => setShelfVisibilityNotes(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Stock levels
              <textarea
                className={fieldVendorInputClass}
                rows={2}
                value={stockLevelNotes}
                onChange={(e) => setStockLevelNotes(e.target.value)}
              />
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Competitor activity</p>
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => setCompetitors((prev) => [...prev, blankCompetitor()])}
              >
                Add competitor
              </button>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
            {competitors.map((competitor, index) => (
              <div key={competitor.key} className="space-y-2 rounded-lg border border-border p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">
                    Competitor {index + 1}
                  </p>
                  {competitors.length > 1 ? (
                    <button
                      type="button"
                      className="text-xs text-destructive hover:underline"
                      onClick={() =>
                        setCompetitors((prev) =>
                          prev.filter((item) => item.key !== competitor.key)
                        )
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
                      setCompetitors((prev) =>
                        prev.map((item) =>
                          item.key === competitor.key
                            ? { ...item, brandName: value, products: [] }
                            : item
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
                      onChange={(e) =>
                        setCompetitors((prev) =>
                          prev.map((item) =>
                            item.key === competitor.key
                              ? { ...item, brandNameOther: e.target.value }
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
                        setCompetitors((prev) =>
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
                        onChange={(e) =>
                          setCompetitors((prev) =>
                            prev.map((item) =>
                              item.key === competitor.key
                                ? { ...item, [field]: e.target.value }
                                : item
                            )
                          )
                        }
                      />
                    ) : (
                      <input
                        className={fieldVendorInputClass}
                        value={competitor[field] ?? ""}
                        onChange={(e) =>
                          setCompetitors((prev) =>
                            prev.map((item) =>
                              item.key === competitor.key
                                ? { ...item, [field]: e.target.value }
                                : item
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

          <button
            type="submit"
            className={`${calmPrimaryButtonClass} lg:w-auto lg:min-w-56`}
            disabled={createVisitMutation.isPending || isCapturingVisitLocation || !outletId}
          >
            {isCapturingVisitLocation
              ? "Getting GPS…"
              : createVisitMutation.isPending
                ? "Submitting…"
                : "Submit visit"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default function RecordVendorVisitPage(): ReactElement {
  return (
    <Suspense fallback={<BoneyardInlineFallback name="field-record-visit-suspense" className="min-h-32" />}>
      <RecordVendorVisitPageInner />
    </Suspense>
  );
}
