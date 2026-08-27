"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { type SyntheticEvent, type ReactElement, useMemo, useState } from "react";

import { BoneyardInlineFallback } from "@/components/boneyard/boneyard-inline-fallback";
import {
  getAdminUserListUsersQueryKey,
  useAdminGeofenceListGeofences,
  useAdminRegionListRegions,
  useAdminUserCreateUser,
  useAdminUserListUsers,
  useAdminUserUpdateUser
} from "@/lib/api/generated/client";
import type { AdminUserUpdateUserBody } from "@/lib/api/generated/model";
import { AdminUserCreateUserBodyRole } from "@/lib/api/generated/model";
import { ApiError } from "@/lib/api/problem-details";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useAuthStore } from "@/lib/auth/auth-store";
import { calmPrimaryButtonClass, calmSecondaryButtonClass } from "@/lib/calm-ui";
import {
  type AdminUserRow,
  type GeofenceRow,
  parseAdminUserFromOrval,
  parseAdminUsersFromOrval,
  parseGeofencesFromOrval,
  parseRegionsFromOrval
} from "@/lib/ops/ops-adapters";
import { toast } from "@/lib/toast";

const cardClass = "rounded-xl border border-border bg-card/80 p-5 shadow-sm dark:bg-card/50";

const inputClass =
  "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const ALL_ROLES = [
  AdminUserCreateUserBodyRole.promoter,
  AdminUserCreateUserBodyRole.client,
  AdminUserCreateUserBodyRole.supervisor,
  AdminUserCreateUserBodyRole.admin
] as const;

const FIELD_ROLES = [
  AdminUserCreateUserBodyRole.promoter,
  AdminUserCreateUserBodyRole.client
] as const;

/** Radix Select requires a non-empty value; map to/from optional region & gender. */
const SELECT_NONE = "__none__";

const accessCodeLabel = (code: string): string => code.toUpperCase();

const toggleId = (ids: string[], id: string): string[] =>
  ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];

const WorkAreasField = ({
  geofences,
  isLoading,
  isError,
  selectedIds,
  onToggle,
  disabled
}: {
  geofences: GeofenceRow[];
  isLoading: boolean;
  isError: boolean;
  selectedIds: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
}): ReactElement => (
  <div>
    <p className="text-xs font-medium text-muted-foreground">Work areas</p>
    <p className="mt-1 text-[11px] text-muted-foreground">
      Clock-in is allowed only inside the selected radii. Leave empty to use any active work area
      until you assign one.
    </p>
    {disabled ? (
      <p className="mt-2 text-xs text-muted-foreground">
        Switch the role to promoter to assign work areas.
      </p>
    ) : null}
    {isLoading ? (
      <p className="mt-2 text-xs text-muted-foreground">Loading work areas…</p>
    ) : null}
    {isError ? (
      <p className="mt-2 text-xs text-destructive">Could not load work areas.</p>
    ) : null}
    {!isLoading && !isError && geofences.length === 0 ? (
      <p className="mt-2 text-xs text-muted-foreground">
        No work areas yet.{" "}
        <Link href="/ops/geofences" className="text-primary underline-offset-4 hover:underline">
          Create them under Work areas
        </Link>
        .
      </p>
    ) : null}
    {!isLoading && !isError && geofences.length > 0 ? (
      <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
        {geofences.map((fence) => (
          <li key={fence.id}>
            <label
              className={`flex items-center gap-2 text-sm text-foreground ${
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
              }`}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(fence.id)}
                disabled={disabled}
                onChange={() => {
                  onToggle(fence.id);
                }}
              />
              <span>
                {fence.label}
                <span className="ml-1 text-xs text-muted-foreground">
                  ({Math.round(fence.radiusMeters)} m
                  {fence.isActive ? "" : " · inactive"})
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    ) : null}
  </div>
);

export default function OpsUsersPage(): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const isAdmin = currentUser?.role === "admin";
  const creatableRoles = isAdmin ? ALL_ROLES : FIELD_ROLES;

  const usersQuery = useAdminUserListUsers({
    query: {
      enabled: accessToken !== null,
      select: (r) => parseAdminUsersFromOrval(r)
    }
  });

  const regionsQuery = useAdminRegionListRegions({
    query: {
      enabled: accessToken !== null,
      select: (r) => parseRegionsFromOrval(r)
    }
  });

  const geofencesQuery = useAdminGeofenceListGeofences({
    query: {
      enabled: accessToken !== null,
      select: (r) => parseGeofencesFromOrval(r)
    }
  });

  const createMutation = useAdminUserCreateUser({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getAdminUserListUsersQueryKey() });
      }
    }
  });

  const updateMutation = useAdminUserUpdateUser({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getAdminUserListUsersQueryKey() });
      }
    }
  });

  const [createFullName, setCreateFullName] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createRole, setCreateRole] = useState<(typeof ALL_ROLES)[number]>(
    AdminUserCreateUserBodyRole.promoter
  );
  const [createRegionId, setCreateRegionId] = useState("");
  const [createGender, setCreateGender] = useState<"" | "male" | "female" | "other">("");
  const [createGeofenceIds, setCreateGeofenceIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<(typeof ALL_ROLES)[number]>(
    AdminUserCreateUserBodyRole.promoter
  );
  const [editRegionId, setEditRegionId] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editGender, setEditGender] = useState<"" | "male" | "female" | "other">("");
  const [editGeofenceIds, setEditGeofenceIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const filteredUsers = useMemo(() => {
    const rows = usersQuery.data ?? [];
    const query = search.trim().toLowerCase();
    if (query.length === 0) {
      return rows;
    }
    const queryDigits = query.replace(/\D/g, "");
    return rows.filter((row) => {
      const hay = [
        row.fullName,
        row.email,
        row.phone,
        row.uniqueCode,
        row.role,
        row.region?.name,
        ...row.workAreas.map((area) => area.label)
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (hay.includes(query)) {
        return true;
      }
      if (queryDigits.length >= 3 && row.phone.replace(/\D/g, "").includes(queryDigits)) {
        return true;
      }
      return false;
    });
  }, [search, usersQuery.data]);

  const supervisorCanEdit = (row: AdminUserRow): boolean => {
    if (isAdmin) {
      return true;
    }
    return row.role !== "supervisor" && row.role !== "admin";
  };

  const startEdit = (row: AdminUserRow): void => {
    setFormError(null);
    setEditing(row);
    setEditFullName(row.fullName);
    setEditPhone(row.phone);
    setEditEmail(row.email ?? "");
    setEditRole(row.role);
    setEditRegionId(row.regionId ?? "");
    setEditActive(row.isActive);
    setEditGender(row.gender ?? "");
    setEditGeofenceIds(row.workAreas.map((area) => area.id));
  };

  const cancelEdit = (): void => {
    setFormError(null);
    setEditing(null);
  };

  const onCreateSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setFormError(null);
    const fullName = createFullName.trim();
    const phone = createPhone.trim();
    if (!fullName || !phone) {
      toast.error("Full name and phone are required.");
      return;
    }
    createMutation.mutate(
      {
        data: {
          fullName,
          phone,
          role: createRole,
          ...(createEmail.trim() ? { email: createEmail.trim() } : {}),
          ...(createRegionId ? { regionId: createRegionId } : {}),
          ...(createGender ? { gender: createGender } : {}),
          ...(createRole === AdminUserCreateUserBodyRole.promoter
            ? { geofenceIds: createGeofenceIds }
            : {})
        }
      },
      {
        onSuccess: (result: unknown) => {
          try {
            const user = parseAdminUserFromOrval(result);
            toast.success("User invited", {
              description: `${user.fullName} · ${user.phone} · Access code: ${user.uniqueCode.toUpperCase()}`
            });
          } catch {
            toast.success("User invited", {
              description:
                "Sign-in SMS sent. Find the new user in the list below to copy the access code."
            });
          }
          setCreateFullName("");
          setCreatePhone("");
          setCreateEmail("");
          setCreateRole(AdminUserCreateUserBodyRole.promoter);
          setCreateRegionId("");
          setCreateGender("");
          setCreateGeofenceIds([]);
        },
        onError: (err: unknown) => {
          const msg =
            err instanceof ApiError ? (err.problem?.detail ?? err.message) : "Create failed.";
          toast.error("Could not invite user", { description: msg });
        }
      }
    );
  };

  const onEditSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!editing) return;
    setFormError(null);
    const fullName = editFullName.trim();
    const phone = editPhone.trim();
    if (!fullName) {
      setFormError("Full name is required.");
      return;
    }
    if (!phone) {
      setFormError("Phone is required.");
      return;
    }
    const body: AdminUserUpdateUserBody = {
      fullName,
      role: editRole,
      isActive: editActive,
      email: editEmail.trim().length > 0 ? editEmail.trim() : null
    };
    if (phone !== editing.phone) {
      body.phone = phone;
    }
    if (editGender) {
      body.gender = editGender;
    }
    const regionChanged = (editing.regionId ?? "") !== editRegionId;
    if (regionChanged) {
      body.regionId = editRegionId.length > 0 ? editRegionId : null;
    }
    if (editRole === AdminUserCreateUserBodyRole.promoter) {
      body.geofenceIds = editGeofenceIds;
    } else if (editing.role === "promoter") {
      body.geofenceIds = [];
    }
    updateMutation.mutate(
      { id: editing.id, data: body },
      {
        onSuccess: () => {
          toast.success("User updated", {
            description:
              phone !== editing.phone
                ? "They sign in with the new number and the same access code."
                : undefined
          });
          cancelEdit();
        },
        onError: (err: unknown) => {
          const msg =
            err instanceof ApiError ? (err.problem?.detail ?? err.message) : "Update failed.";
          setFormError(msg);
        }
      }
    );
  };

  const toggleQuickActive = (row: AdminUserRow): void => {
    if (currentUser?.id === row.id) {
      return;
    }
    updateMutation.mutate({
      id: row.id,
      data: { isActive: !row.isActive }
    });
  };

  const roleOptionsForEdit = isAdmin ? ALL_ROLES : FIELD_ROLES;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Users</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Invite field and ops team members with their phone number. They receive a text message
          with sign-in instructions and an access code. A new person is only added after that text
          sends successfully—if it does not go through, nothing is saved and you can try again or
          ask whoever runs your systems to check the text-message setup. Add an email on
          supervisor/admin accounts so they receive Resend ops alerts and attendance digests.
          Supervisors can add and manage promoters and clients, including correcting a phone number
          if it was captured wrong. Only admins can add or change supervisor and admin accounts.
          Assign promoters to work areas so they can only clock in inside those radii.
        </p>
      </div>

      <section className={cardClass}>
        <h2 className="text-base font-semibold text-foreground">Invite user</h2>
        <form className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={onCreateSubmit}>
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="u-name">
              Full name
            </label>
            <input
              id="u-name"
              className={inputClass}
              value={createFullName}
              onChange={(e) => {
                setCreateFullName(e.target.value);
              }}
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="u-phone">
              Phone
            </label>
            <input
              id="u-phone"
              className={inputClass}
              value={createPhone}
              onChange={(e) => {
                setCreatePhone(e.target.value);
              }}
              placeholder="0244123456"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="u-email">
              Email (optional)
            </label>
            <input
              id="u-email"
              type="email"
              className={inputClass}
              value={createEmail}
              onChange={(e) => {
                setCreateEmail(e.target.value);
              }}
              placeholder="ops@example.com"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Needed on supervisor/admin for alert emails.
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="u-role">
              Role
            </label>
            <Select
              value={createRole}
              onValueChange={(value) => {
                setCreateRole(value as (typeof ALL_ROLES)[number]);
              }}
            >
              <SelectTrigger className="mt-1" id="u-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {creatableRoles.map((r) => (
                  <SelectItem key={r} value={r} className="capitalize">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="u-region">
              Region (optional)
            </label>
            <Select
              value={createRegionId.length > 0 ? createRegionId : SELECT_NONE}
              onValueChange={(value) => {
                setCreateRegionId(value === SELECT_NONE ? "" : value);
              }}
            >
              <SelectTrigger className="mt-1" id="u-region">
                <SelectValue placeholder="— None —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_NONE}>— None —</SelectItem>
                {regionsQuery.data?.map((reg) => (
                  <SelectItem key={reg.id} value={reg.id}>
                    {reg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="u-gender">
              Gender (optional)
            </label>
            <Select
              value={createGender.length > 0 ? createGender : SELECT_NONE}
              onValueChange={(value) => {
                setCreateGender(
                  value === SELECT_NONE ? "" : (value as "male" | "female" | "other")
                );
              }}
            >
              <SelectTrigger className="mt-1" id="u-gender">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_NONE}>—</SelectItem>
                <SelectItem value="male">male</SelectItem>
                <SelectItem value="female">female</SelectItem>
                <SelectItem value="other">other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <WorkAreasField
              geofences={geofencesQuery.data ?? []}
              isLoading={geofencesQuery.isLoading}
              isError={geofencesQuery.isError}
              selectedIds={createGeofenceIds}
              disabled={createRole !== AdminUserCreateUserBodyRole.promoter}
              onToggle={(id) => {
                setCreateGeofenceIds((current) => toggleId(current, id));
              }}
            />
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              className={calmPrimaryButtonClass}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating…" : "Create & send invite"}
            </button>
          </div>
        </form>
        {formError ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}
      </section>

      <section className={cardClass}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">All users</h2>
            {usersQuery.data !== undefined ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {filteredUsers.length}
                {search.trim() ? ` of ${usersQuery.data.length}` : ""} user
                {filteredUsers.length === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>
          <label className="text-xs font-medium text-muted-foreground sm:w-80">
            Search
            <input
              className={inputClass}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
              }}
              placeholder="Name, phone, access code, role, region…"
            />
          </label>
        </div>
        {usersQuery.isLoading ? (
          <BoneyardInlineFallback name="ops-users-list" className="mt-3 min-h-[14rem]" />
        ) : null}
        {usersQuery.isError ? (
          <p className="mt-3 text-sm text-destructive">Could not load users.</p>
        ) : null}
        {usersQuery.data?.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No users in this list.</p>
        ) : null}
        {usersQuery.data !== undefined &&
        usersQuery.data.length > 0 &&
        filteredUsers.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No users match that search.</p>
        ) : null}
        {filteredUsers.length > 0 ? (
          <>
        <div className="mt-4 hidden xl:block">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-3 py-2 font-medium text-foreground">Name</th>
                  <th className="px-3 py-2 font-medium text-foreground">Role</th>
                  <th className="px-3 py-2 font-medium text-foreground">Phone</th>
                  <th className="px-3 py-2 font-medium text-foreground">Access code</th>
                  <th className="px-3 py-2 font-medium text-foreground">Region</th>
                  <th className="px-3 py-2 font-medium text-foreground">Work areas</th>
                  <th className="px-3 py-2 font-medium text-foreground">Active</th>
                  <th className="px-3 py-2 font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-foreground">
                      <span className="font-medium">{row.fullName}</span>
                      <p className="text-xs text-muted-foreground">{row.email ?? "—"}</p>
                    </td>
                    <td className="px-3 py-2 capitalize text-muted-foreground">{row.role}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.phone}</td>
                    <td className="px-3 py-2">
                      <code className="text-xs text-foreground">{accessCodeLabel(row.uniqueCode)}</code>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{row.region?.name ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.role === "promoter"
                        ? row.workAreas.length > 0
                          ? row.workAreas.map((area) => area.label).join(", ")
                          : "Any active"
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          row.isActive
                            ? "rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-400"
                            : "rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        }
                      >
                        {row.isActive ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="text-xs font-medium text-primary hover:underline"
                          onClick={() => {
                            void navigator.clipboard.writeText(accessCodeLabel(row.uniqueCode));
                          }}
                        >
                          Copy code
                        </button>
                        {supervisorCanEdit(row) ? (
                          <button
                            type="button"
                            className="text-xs font-medium text-primary hover:underline"
                            onClick={() => {
                              startEdit(row);
                            }}
                          >
                            Edit
                          </button>
                        ) : null}
                        {supervisorCanEdit(row) ? (
                          <button
                            type="button"
                            className="text-xs font-medium text-muted-foreground hover:text-foreground"
                            disabled={updateMutation.isPending || currentUser?.id === row.id}
                            onClick={() => {
                              toggleQuickActive(row);
                            }}
                          >
                            {row.isActive ? "Deactivate" : "Activate"}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <ul className="mt-4 flex flex-col gap-3 xl:hidden">
          {filteredUsers.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-border bg-muted/20 p-4 dark:bg-muted/10"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{row.fullName}</p>
                  <p className="text-xs capitalize text-muted-foreground">{row.role}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{row.phone}</p>
                  <p className="mt-2 font-mono text-[11px] text-foreground">
                    {accessCodeLabel(row.uniqueCode)}
                  </p>
                  {row.role === "promoter" && row.workAreas.length > 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.workAreas.map((area) => area.label).join(", ")}
                    </p>
                  ) : null}
                </div>
                <span
                  className={
                    row.isActive
                      ? "shrink-0 rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-400"
                      : "shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs"
                  }
                >
                  {row.isActive ? "Active" : "Off"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                {supervisorCanEdit(row) ? (
                  <button
                    type="button"
                    className="text-sm font-medium text-primary"
                    onClick={() => {
                      startEdit(row);
                    }}
                  >
                    Edit
                  </button>
                ) : null}
                {supervisorCanEdit(row) ? (
                  <button
                    type="button"
                    className="text-sm text-muted-foreground"
                    disabled={updateMutation.isPending || currentUser?.id === row.id}
                    onClick={() => {
                      toggleQuickActive(row);
                    }}
                  >
                    Toggle active
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
          </>
        ) : null}
      </section>

      {editing ? (
        <div className="fixed inset-0 z-1000 flex items-end justify-center bg-background/70 p-4 backdrop-blur-sm sm:items-center">
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl"
            role="dialog"
            aria-labelledby="edit-user-title"
          >
            <h2 id="edit-user-title" className="text-lg font-semibold text-foreground">
              Edit user
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Id: <code className="text-foreground">{editing.id}</code> · Access code:{" "}
              <code className="text-foreground">{accessCodeLabel(editing.uniqueCode)}</code>
            </p>
            <form className="mt-4 space-y-3" onSubmit={onEditSubmit}>
              <div>
                <label className="text-xs font-medium text-muted-foreground" htmlFor="eu-name">
                  Full name
                </label>
                <input
                  id="eu-name"
                  className={inputClass}
                  value={editFullName}
                  onChange={(e) => {
                    setEditFullName(e.target.value);
                  }}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground" htmlFor="eu-phone">
                  Phone
                </label>
                <input
                  id="eu-phone"
                  className={inputClass}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={editPhone}
                  onChange={(e) => {
                    setEditPhone(e.target.value);
                  }}
                  placeholder="0244123456"
                  required
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  They sign in with this number and the same access code.
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground" htmlFor="eu-email">
                  Email
                </label>
                <input
                  id="eu-email"
                  type="email"
                  className={inputClass}
                  value={editEmail}
                  onChange={(e) => {
                    setEditEmail(e.target.value);
                  }}
                  placeholder="ops@example.com"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Leave blank to clear. Supervisor/admin emails receive Resend ops alerts.
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground" htmlFor="eu-role">
                  Role
                </label>
                <Select
                  value={editRole}
                  onValueChange={(value) => {
                    setEditRole(value as (typeof ALL_ROLES)[number]);
                  }}
                >
                  <SelectTrigger className="mt-1" id="eu-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptionsForEdit.map((r) => (
                      <SelectItem key={r} value={r} className="capitalize">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground" htmlFor="eu-region">
                  Region
                </label>
                <Select
                  value={editRegionId.length > 0 ? editRegionId : SELECT_NONE}
                  onValueChange={(value) => {
                    setEditRegionId(value === SELECT_NONE ? "" : value);
                  }}
                >
                  <SelectTrigger className="mt-1" id="eu-region">
                    <SelectValue placeholder="— None assigned —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_NONE}>— None assigned —</SelectItem>
                    {regionsQuery.data?.map((reg) => (
                      <SelectItem key={reg.id} value={reg.id}>
                        {reg.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Assign a territory or choose &quot;None&quot; to remove the user&apos;s region.
                </p>
              </div>
              <WorkAreasField
                geofences={geofencesQuery.data ?? []}
                isLoading={geofencesQuery.isLoading}
                isError={geofencesQuery.isError}
                selectedIds={editGeofenceIds}
                disabled={editRole !== AdminUserCreateUserBodyRole.promoter}
                onToggle={(id) => {
                  setEditGeofenceIds((current) => toggleId(current, id));
                }}
              />
              <div>
                <label className="text-xs font-medium text-muted-foreground" htmlFor="eu-gender">
                  Gender
                </label>
                <Select
                  value={editGender.length > 0 ? editGender : SELECT_NONE}
                  onValueChange={(value) => {
                    setEditGender(
                      value === SELECT_NONE ? "" : (value as "male" | "female" | "other")
                    );
                  }}
                >
                  <SelectTrigger className="mt-1" id="eu-gender">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_NONE}>—</SelectItem>
                    <SelectItem value="male">male</SelectItem>
                    <SelectItem value="female">female</SelectItem>
                    <SelectItem value="other">other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={editActive}
                  disabled={currentUser?.id === editing.id}
                  onChange={(e) => {
                    setEditActive(e.target.checked);
                  }}
                />
                Active
              </label>
              {currentUser?.id === editing.id ? (
                <p className="text-xs text-muted-foreground">
                  You cannot deactivate yourself here.
                </p>
              ) : null}
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button type="button" className={calmSecondaryButtonClass} onClick={cancelEdit}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className={calmPrimaryButtonClass}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
            {formError ? (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
