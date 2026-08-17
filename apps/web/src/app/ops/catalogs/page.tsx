"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactElement, type SyntheticEvent, useMemo, useState } from "react";

import { BoneyardInlineFallback } from "@/components/boneyard/boneyard-inline-fallback";
import { formatApiErrorMessage } from "@/lib/api/format-api-error";
import { useAuthStore } from "@/lib/auth/auth-store";
import {
  calmPrimaryButtonInlineClass,
  calmToolbarOutlineButtonInlineClass
} from "@/lib/calm-ui";
import {
  createCompetitorBrand,
  createCompetitorProduct,
  createNestleProduct,
  deleteCompetitorBrand,
  deleteCompetitorProduct,
  deleteNestleProduct,
  listAdminCatalogs,
  updateCompetitorBrand,
  updateCompetitorProduct,
  updateNestleProduct,
  type CatalogCompetitorBrandRecord,
  type CatalogItemRecord
} from "@/lib/outlet/outlet-api";
import { toast } from "@/lib/toast";

const cardClass = "rounded-xl border border-border bg-card/80 p-5 shadow-sm dark:bg-card/50";
const inputClass =
  "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const catalogsQueryKey = ["ops", "catalogs"] as const;

const CatalogRow = ({
  row,
  onSave,
  onDelete,
  busy
}: {
  row: CatalogItemRecord;
  onSave: (id: string, name: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  busy: boolean;
}): ReactElement => {
  const [name, setName] = useState(row.name);
  const [isActive, setIsActive] = useState(row.isActive);
  const dirty = name.trim() !== row.name || isActive !== row.isActive;

  return (
    <li className="rounded-lg border border-border bg-muted/20 p-3 dark:bg-muted/10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className={`${inputClass} mt-0`}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
        <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => {
              setIsActive(event.target.checked);
            }}
          />
          Active
        </label>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            className={calmPrimaryButtonInlineClass}
            disabled={busy || !dirty || name.trim().length === 0}
            onClick={() => {
              onSave(row.id, name.trim(), isActive);
            }}
          >
            Save
          </button>
          <button
            type="button"
            className={calmToolbarOutlineButtonInlineClass}
            disabled={busy}
            onClick={() => {
              if (window.confirm(`Delete “${row.name}”?`)) {
                onDelete(row.id);
              }
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  );
};

export default function OpsCatalogsPage(): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const [nestleName, setNestleName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [productName, setProductName] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);

  const catalogsQuery = useQuery({
    queryKey: catalogsQueryKey,
    queryFn: async () => listAdminCatalogs(accessToken ?? ""),
    enabled: accessToken !== null
  });

  const brands = catalogsQuery.data?.competitorBrands ?? [];
  const selectedBrand: CatalogCompetitorBrandRecord | undefined = useMemo(() => {
    if (brands.length === 0) return undefined;
    return brands.find((brand) => brand.id === selectedBrandId) ?? brands[0];
  }, [brands, selectedBrandId]);

  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: catalogsQueryKey });
    await queryClient.invalidateQueries({ queryKey: ["field", "catalogs"] });
  };

  const mutateOptions = {
    onSuccess: async () => {
      await invalidate();
      toast.success("Catalog updated");
    },
    onError: (error: unknown) => {
      toast.error(formatApiErrorMessage(error, "Could not update catalog."));
    }
  };

  const createNestleMutation = useMutation({
    mutationFn: async (name: string) => createNestleProduct(accessToken ?? "", { name }),
    ...mutateOptions,
    onSuccess: async () => {
      setNestleName("");
      await invalidate();
      toast.success("Nestlé product added");
    }
  });
  const updateNestleMutation = useMutation({
    mutationFn: async (payload: { id: string; name: string; isActive: boolean }) =>
      updateNestleProduct(accessToken ?? "", payload.id, {
        name: payload.name,
        isActive: payload.isActive
      }),
    ...mutateOptions
  });
  const deleteNestleMutation = useMutation({
    mutationFn: async (id: string) => deleteNestleProduct(accessToken ?? "", id),
    ...mutateOptions
  });

  const createBrandMutation = useMutation({
    mutationFn: async (name: string) => createCompetitorBrand(accessToken ?? "", { name }),
    ...mutateOptions,
    onSuccess: async (created) => {
      setBrandName("");
      setSelectedBrandId(created.id);
      await invalidate();
      toast.success("Competitor brand added");
    }
  });
  const updateBrandMutation = useMutation({
    mutationFn: async (payload: { id: string; name: string; isActive: boolean }) =>
      updateCompetitorBrand(accessToken ?? "", payload.id, {
        name: payload.name,
        isActive: payload.isActive
      }),
    ...mutateOptions
  });
  const deleteBrandMutation = useMutation({
    mutationFn: async (id: string) => deleteCompetitorBrand(accessToken ?? "", id),
    ...mutateOptions,
    onSuccess: async () => {
      setSelectedBrandId(null);
      await invalidate();
      toast.success("Catalog updated");
    }
  });

  const createProductMutation = useMutation({
    mutationFn: async (payload: { brandId: string; name: string }) =>
      createCompetitorProduct(accessToken ?? "", payload.brandId, { name: payload.name }),
    ...mutateOptions,
    onSuccess: async () => {
      setProductName("");
      await invalidate();
      toast.success("Competitor product added");
    }
  });
  const updateProductMutation = useMutation({
    mutationFn: async (payload: { id: string; name: string; isActive: boolean }) =>
      updateCompetitorProduct(accessToken ?? "", payload.id, {
        name: payload.name,
        isActive: payload.isActive
      }),
    ...mutateOptions
  });
  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => deleteCompetitorProduct(accessToken ?? "", id),
    ...mutateOptions
  });

  const busy =
    createNestleMutation.isPending ||
    updateNestleMutation.isPending ||
    deleteNestleMutation.isPending ||
    createBrandMutation.isPending ||
    updateBrandMutation.isPending ||
    deleteBrandMutation.isPending ||
    createProductMutation.isPending ||
    updateProductMutation.isPending ||
    deleteProductMutation.isPending;

  const onAddNestle = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const name = nestleName.trim();
    if (name.length === 0) return;
    createNestleMutation.mutate(name);
  };

  const onAddBrand = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const name = brandName.trim();
    if (name.length === 0) return;
    createBrandMutation.mutate(name);
  };

  const onAddProduct = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (selectedBrand === undefined) return;
    const name = productName.trim();
    if (name.length === 0) return;
    createProductMutation.mutate({ brandId: selectedBrand.id, name });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Products & competitors</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Add Nestlé products, competitor brands, and competitor products. Promoters see these as
          dropdowns on the visit form — they do not type free text.
        </p>
      </div>

      {catalogsQuery.isLoading ? (
        <BoneyardInlineFallback name="ops-catalogs" className="min-h-48" />
      ) : null}
      {catalogsQuery.isError ? (
        <p className="text-sm text-destructive">Could not load catalogs.</p>
      ) : null}

      {catalogsQuery.data !== undefined ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className={cardClass}>
            <h2 className="text-base font-semibold text-foreground">Nestlé products</h2>
            <form className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={onAddNestle}>
              <label className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">
                New product
                <input
                  className={inputClass}
                  value={nestleName}
                  onChange={(event) => {
                    setNestleName(event.target.value);
                  }}
                  placeholder="e.g. Milo"
                />
              </label>
              <button type="submit" className={calmPrimaryButtonInlineClass} disabled={busy}>
                Add
              </button>
            </form>
            <ul className="mt-4 space-y-2">
              {catalogsQuery.data.nestleProducts.map((row) => (
                <CatalogRow
                  key={row.id}
                  row={row}
                  busy={busy}
                  onSave={(id, name, isActive) => {
                    updateNestleMutation.mutate({ id, name, isActive });
                  }}
                  onDelete={(id) => {
                    deleteNestleMutation.mutate(id);
                  }}
                />
              ))}
            </ul>
          </section>

          <section className={cardClass}>
            <h2 className="text-base font-semibold text-foreground">Competitor brands</h2>
            <form className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={onAddBrand}>
              <label className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">
                New brand
                <input
                  className={inputClass}
                  value={brandName}
                  onChange={(event) => {
                    setBrandName(event.target.value);
                  }}
                  placeholder="e.g. Ovaltine"
                />
              </label>
              <button type="submit" className={calmPrimaryButtonInlineClass} disabled={busy}>
                Add
              </button>
            </form>
            <ul className="mt-4 space-y-2">
              {brands.map((brand) => (
                <li key={brand.id}>
                  <button
                    type="button"
                    className={[
                      "mb-2 w-full rounded-md border px-3 py-1.5 text-left text-xs font-medium",
                      selectedBrand?.id === brand.id
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:bg-muted/40"
                    ].join(" ")}
                    onClick={() => {
                      setSelectedBrandId(brand.id);
                    }}
                  >
                    {brand.name}
                    {brand.isActive ? "" : " (inactive)"} · {String(brand.products.length)} products
                  </button>
                  {selectedBrand?.id === brand.id ? (
                    <CatalogRow
                      row={brand}
                      busy={busy}
                      onSave={(id, name, isActive) => {
                        updateBrandMutation.mutate({ id, name, isActive });
                      }}
                      onDelete={(id) => {
                        deleteBrandMutation.mutate(id);
                      }}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <section className={`${cardClass} lg:col-span-2`}>
            <h2 className="text-base font-semibold text-foreground">
              Competitor products
              {selectedBrand ? ` · ${selectedBrand.name}` : ""}
            </h2>
            {selectedBrand === undefined ? (
              <p className="mt-3 text-sm text-muted-foreground">Add a competitor brand first.</p>
            ) : (
              <>
                <form
                  className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
                  onSubmit={onAddProduct}
                >
                  <label className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">
                    New product for {selectedBrand.name}
                    <input
                      className={inputClass}
                      value={productName}
                      onChange={(event) => {
                        setProductName(event.target.value);
                      }}
                      placeholder="e.g. Ovaltine powder"
                    />
                  </label>
                  <button type="submit" className={calmPrimaryButtonInlineClass} disabled={busy}>
                    Add
                  </button>
                </form>
                <ul className="mt-4 space-y-2">
                  {selectedBrand.products.map((row) => (
                    <CatalogRow
                      key={row.id}
                      row={row}
                      busy={busy}
                      onSave={(id, name, isActive) => {
                        updateProductMutation.mutate({ id, name, isActive });
                      }}
                      onDelete={(id) => {
                        deleteProductMutation.mutate(id);
                      }}
                    />
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
