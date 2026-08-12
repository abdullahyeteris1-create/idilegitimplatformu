import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadStudentProfile } from "../src/lib/students/studentProfileQuery.ts";

const profileRow = {
  id: "student-1",
  name: "Test Student",
  username: "test-student",
  class_name: "6-A",
};

function createQuery({ avatarData = { profile_image_url: null }, avatarError = null, profileData = profileRow } = {}) {
  const calls = [];
  return {
    calls,
    query: async (columns, studentId) => {
      calls.push({ columns, studentId });
      if (columns === "profile_image_url") return { data: avatarData, error: avatarError };
      return { data: profileData, error: null };
    },
  };
}

test("gecerli ogrenci kaydi production temel kolonlariyla yuklenir", async () => {
  const fake = createQuery({ avatarError: { code: "42703", message: "column does not exist" } });
  const errors = [];
  const profile = await loadStudentProfile(fake.query, "student-1", (stage, error) => errors.push({ stage, error }));

  assert.equal(profile?.id, "student-1");
  assert.equal(profile?.name, "Test Student");
  assert.equal(profile?.profile_image_url, null);
  assert.deepEqual(fake.calls[0], { columns: "id,name,username,class_name", studentId: "student-1" });
  assert.equal(errors[0]?.stage, "optional_avatar_query_failed");
});

test("profile_image_url null olsa da profil yuklenir", async () => {
  const fake = createQuery();
  const profile = await loadStudentProfile(fake.query, "student-1", () => {});
  assert.equal(profile?.profile_image_url, null);
});

test("profile_image_url varsa avatar profile eklenir", async () => {
  const fake = createQuery({ avatarData: { profile_image_url: "https://example.test/avatar.png" } });
  const profile = await loadStudentProfile(fake.query, "student-1", () => {});
  assert.equal(profile?.profile_image_url, "https://example.test/avatar.png");
});

test("bulunamayan ogrenci null doner ve opsiyonel avatar sorgusu yapilmaz", async () => {
  const fake = createQuery({ profileData: null });
  const profile = await loadStudentProfile(fake.query, "missing-student", () => {});
  assert.equal(profile, null);
  assert.equal(fake.calls.length, 1);
});

test("ogrenci paneli sadece gercekten unavailable profil icin login'e yonlendirir", async () => {
  const pageSource = await readFile("src/app/ogrenci/page.tsx", "utf8");
  assert.match(pageSource, /getStudentProfileById\(access\.studentId\)/);
  assert.match(pageSource, /if \(!student \|\| String\(student\.id\) !== access\.studentId \|\| !studentName\)/);
});
