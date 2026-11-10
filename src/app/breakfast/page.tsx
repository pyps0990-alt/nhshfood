"use client";

import { Suspense } from "react";
import { DepartmentMenuPage } from "@/components/DepartmentMenuPage";

export default function BreakfastPage() {
  return (
    <Suspense>
      <DepartmentMenuPage department="breakfast" />
    </Suspense>
  );
}
