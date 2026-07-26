import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("available/in_progress gorevde TaskLaunchForm render edilir, locked/completed'ta edilmez", async () => {
  const source = await read(
    "src/components/education-programs/StudentEducationProgramStudentView.tsx",
  );

  assert.match(source, /import \{ TaskLaunchForm \} from "@\/components\/education-programs\/TaskLaunchForm"/);
  assert.match(
    source,
    /task\.status === "available" \|\| task\.status === "in_progress"/,
  );
  assert.match(source, /<TaskLaunchForm/);
  assert.match(source, /label=\{task\.status === "available" \? "Başla" : "Devam Et"\}/);
});

test("TaskLaunchForm istemci bileseni cift tiklamaya karsi pending durumunu disable eder", async () => {
  const source = await read("src/components/education-programs/TaskLaunchForm.tsx");

  assert.match(source, /"use client"/);
  assert.match(source, /useFormStatus/);
  assert.match(source, /disabled=\{pending\}/);
  assert.match(source, /useActionState/);
  assert.match(source, /startEducationProgramTaskAction/);
});

test("TaskLaunchForm eski Assignment System V2'ye bagli degildir", async () => {
  const source = await read("src/components/education-programs/TaskLaunchForm.tsx");

  assert.doesNotMatch(source, /@\/lib\/assignments\//);
  assert.doesNotMatch(source, /@\/components\/assignments\//);
  assert.doesNotMatch(source, /AssignmentTaskProvider/);
});

test("FAZ 2B izolasyon testleri hala gecerlidir: TaskLaunchForm butonu Assignment V2/service-role'e sizinti yaratmaz", async () => {
  // NOT: bu test onceden view dosyasinin "use client" ICERMEDIGINI kontrol
  // ediyordu. FAZ 4-2B-2'de view dosyasi, sag ilerleme panelinin secili gune
  // erismesi icin BILINCLI olarak "use client" oldu (gun secim state'i artik
  // parent'ta) - bu, TaskLaunchForm butonuyla ilgisiz, ayri bir karar. Asil
  // izolasyon garantisi (Assignment V2/service-role sizintisi olmamasi) asagida
  // dogrudan kontrol edilir; "use client" olup olmamasi bunun bir garantisi
  // degildi zaten (Next.js zaten client component'lerin service-role gibi
  // server-only moduller import etmesine izin vermez).
  const source = await read(
    "src/components/education-programs/StudentEducationProgramStudentView.tsx",
  );

  assert.doesNotMatch(source, /@\/lib\/assignments\//);
  assert.doesNotMatch(source, /@\/components\/assignments\//);
  assert.doesNotMatch(source, /getSupabaseServiceRoleClient/);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE/);
});
