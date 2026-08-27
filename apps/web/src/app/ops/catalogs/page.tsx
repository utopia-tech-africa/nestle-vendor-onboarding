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
  createVendorType,
  createVendorTypeValue,
  deleteCompetitorBrand,
  deleteCompetitorProduct,
  deleteNestleProduct,
  deleteVendorType,
  deleteVendorTypeValue,
  listAdminCatalogs,
  updateCompetitorBrand,
  updateCompetitorProduct,
  updateNestleProduct,
  updateVendorType,
  updateVendorTypeValue,
  type CatalogCompetitorBrandRecord,
  type CatalogItemRecord,
  type CatalogVendorTypeRecord
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
  const [vendorTypeName, setVendorTypeName] = useState("");
  const [sellerTypeName, setSellerTypeName] = useState("");
  const [selectedVendorTypeId, setSelectedVendorTypeId] = useState<string | null>(null);

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

  const vendorTypes = catalogsQuery.data?.vendorTypes;
  const selectedVendorType: CatalogVendorTypeRecord | undefined = useMemo(() => {
    if (vendorTypes === undefined || vendorTypes.length === 0) return undefined;
    return vendorTypes.find((type) => type.id === selectedVendorTypeId) ?? vendorTypes[0];
  }, [vendorTypes, selectedVendorTypeId]);

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

  const createVendorTypeMutation = useMutation({
    mutationFn: async (name: string) => createVendorType(accessToken ?? "", { name }),
    ...mutateOptions,
    onSuccess: async (created) => {
      setVendorTypeName("");
      setSelectedVendorTypeId(created.id);
      await invalidate();
      toast.success("Vendor type added");
    }
  });
  const updateVendorTypeMutation = useMutation({
    mutationFn: async (payload: { id: string; name: string; isActive: boolean }) =>
      updateVendorType(accessToken ?? "", payload.id, {
        name: payload.name,
        isActive: payload.isActive
      }),
    ...mutateOptions
  });
  const deleteVendorTypeMutation = useMutation({
    mutationFn: async (id: string) => deleteVendorType(accessToken ?? "", id),
    ...mutateOptions,
    onSuccess: async () => {
      setSelectedVendorTypeId(null);
      await invalidate();
      toast.success("Catalog updated");
    }
  });

  const createSellerTypeMutation = useMutation({
    mutationFn: async (payload: { typeId: string; name: string }) =>
      createVendorTypeValue(accessToken ?? "", payload.typeId, { name: payload.name }),
    ...mutateOptions,
    onSuccess: async () => {
      setSellerTypeName("");
      await invalidate();
      toast.success("Seller type added");
    }
  });
  const updateSellerTypeMutation = useMutation({
    mutationFn: async (payload: { id: string; name: string; isActive: boolean }) =>
      updateVendorTypeValue(accessToken ?? "", payload.id, {
        name: payload.name,
        isActive: payload.isActive
      }),
    ...mutateOptions
  });
  const deleteSellerTypeMutation = useMutation({
    mutationFn: async (id: string) => deleteVendorTypeValue(accessToken ?? "", id),
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
    deleteProductMutation.isPending ||
    createVendorTypeMutation.isPending ||
    updateVendorTypeMutation.isPending ||
    deleteVendorTypeMutation.isPending ||
    createSellerTypeMutation.isPending ||
    updateSellerTypeMutation.isPending ||
    deleteSellerTypeMutation.isPending;

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

  const onAddVendorType = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const name = vendorTypeName.trim();
    if (name.length === 0) return;
    createVendorTypeMutation.mutate(name);
  };

  const onAddSellerType = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (selectedVendorType === undefined) return;
    const name = sellerTypeName.trim();
    if (name.length === 0) return;
    createSellerTypeMutation.mutate({ typeId: selectedVendorType.id, name });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Products, competitors & vendor types</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Add Nestlé products, competitor brands, vendor types, and seller types. Promoters see these as
          dropdowns when they add a vendor — they do not type free text.
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

          <section className={cardClass}>
            <h2 className="text-base font-semibold text-foreground">Vendor types</h2>
            <form className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={onAddVendorType}>
              <label className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">
                New type
                <input
                  className={inputClass}
                  value={vendorTypeName}
                  onChange={(event) => {
                    setVendorTypeName(event.target.value);
                  }}
                  placeholder="e.g. Table top"
                />
              </label>
              <button type="submit" className={calmPrimaryButtonInlineClass} disabled={busy}>
                Add
              </button>
            </form>
            <ul className="mt-4 space-y-2">
              {(vendorTypes ?? []).map((type) => (
                <li key={type.id}>
                  <button
                    type="button"
                    className={[
                      "mb-2 w-full rounded-md border px-3 py-1.5 text-left text-xs font-medium",
                      selectedVendorType?.id === type.id
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:bg-muted/40"
                    ].join(" ")}
                    onClick={() => {
                      setSelectedVendorTypeId(type.id);
                    }}
                  >
                    {type.name}
                    {type.isActive ? "" : " (inactive)"} · {String(type.values.length)} values
                  </button>
                  {selectedVendorType?.id === type.id ? (
                    <CatalogRow
                      row={type}
                      busy={busy}
                      onSave={(id, name, isActive) => {
                        updateVendorTypeMutation.mutate({ id, name, isActive });
                      }}
                      onDelete={(id) => {
                        deleteVendorTypeMutation.mutate(id);
                      }}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <section className={`${cardClass} lg:col-span-2`}>
            <h2 className="text-base font-semibold text-foreground">
              Seller types
              {selectedVendorType ? ` · ${selectedVendorType.name}` : ""}
            </h2>
            {selectedVendorType === undefined ? (
              <p className="mt-3 text-sm text-muted-foreground">Add a vendor type first.</p>
            ) : (
              <>
                <form
                  className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
                  onSubmit={onAddSellerType}
                >
                  <label className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">
                    New seller type for {selectedVendorType.name}
                    <input
                      className={inputClass}
                      value={sellerTypeName}
                      onChange={(event) => {
                        setSellerTypeName(event.target.value);
                      }}
                      placeholder="e.g. Koko seller"
                    />
                  </label>
                  <button type="submit" className={calmPrimaryButtonInlineClass} disabled={busy}>
                    Add
                  </button>
                </form>
                <ul className="mt-4 space-y-2">
                  {selectedVendorType.values.map((row) => (
                    <CatalogRow
                      key={row.id}
                      row={row}
                      busy={busy}
                      onSave={(id, name, isActive) => {
                        updateSellerTypeMutation.mutate({ id, name, isActive });
                      }}
                      onDelete={(id) => {
                        deleteSellerTypeMutation.mutate(id);
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
