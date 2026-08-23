import type { User } from "../api";
import type { Item } from "./types";

export const label = (x: Item) =>
  x.title || x.name || x.code || x.issue_number || x.id;
export const permissions = (user: User | undefined, permission: string) =>
  !!user?.permissions.includes(permission);
export const number = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;
