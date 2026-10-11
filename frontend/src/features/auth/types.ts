export type UserRole = "customer" | "platformAdmin";
export type OrgRole = "viewer" | "editor" | "admin" | "owner";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: string;
}
