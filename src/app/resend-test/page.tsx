import { notFound } from "next/navigation";
import { ResendTestForm } from "./ResendTestForm";

export default function ResendTestPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <ResendTestForm />;
}
