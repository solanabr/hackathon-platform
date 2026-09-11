import type { ReactNode } from "react";
import { notFound } from "next/navigation";

// Design explorations never ship: in production every /lab route is a 404,
// whatever the middleware lets through.
export default function LabLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
