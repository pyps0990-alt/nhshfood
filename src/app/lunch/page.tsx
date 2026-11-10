"use client";

import { Suspense } from "react";
import { DepartmentMenuPage } from "@/components/DepartmentMenuPage";

export default function LunchPage() {
  return (
    <Suspense>
      <DepartmentMenuPage department="lunch" />
    </Suspense>
  );
}
