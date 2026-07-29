import { loadTwoSideFocusWordSets } from "@/lib/two-side-focus/twoSideFocusRepository";
import { TwoSideFocusExerciseClient } from "./TwoSideFocusExerciseClient";

export const dynamic = "force-dynamic";

export default async function TwoSideFocusPage() {
  const { wordSets } = await loadTwoSideFocusWordSets();

  return <TwoSideFocusExerciseClient initialWordSets={wordSets} />;
}
