import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { HANGMAN_WORDS } from "../src/lib/exercises/word-games/hangmanWords.ts";
import { WORD_GUESS_WORDS_BY_LENGTH } from "../src/lib/exercises/word-games/wordGuessWords.ts";
import { isValidTurkishWord, normalizeTurkishText, TURKISH_ALPHABET } from "../src/lib/exercises/word-games/turkishAlphabet.ts";

const hangmanClient = fs.readFileSync("src/app/egzersizler/adam-asmaca/HangmanExerciseClient.tsx", "utf8");
const wordGuessClient = fs.readFileSync("src/app/egzersizler/kelime-tahmin/WordGuessExerciseClient.tsx", "utf8");
const allWordGuessWords = Object.values(WORD_GUESS_WORDS_BY_LENGTH).flat();

test("Türkçe alfabe 29 harfi I ve İ ayrımıyla korur", () => {
  assert.equal(TURKISH_ALPHABET.length, 29);
  for (const letter of ["Ç", "Ğ", "I", "İ", "Ö", "Ş", "Ü"]) assert.ok(TURKISH_ALPHABET.includes(letter));
  assert.notEqual(TURKISH_ALPHABET.indexOf("I"), TURKISH_ALPHABET.indexOf("İ"));
  assert.equal(TURKISH_ALPHABET.includes("Q"), false);
  assert.equal(TURKISH_ALPHABET.includes("W"), false);
  assert.equal(TURKISH_ALPHABET.includes("X"), false);
});

test("Türkçe normalizasyonu locale ve NFC kurallarını uygular", () => {
  assert.equal(normalizeTurkishText("i"), "İ");
  assert.equal(normalizeTurkishText("ı"), "I");
  assert.equal(normalizeTurkishText("çğöşü"), "ÇĞÖŞÜ");
  assert.equal(normalizeTurkishText("öğrenci"), "ÖĞRENCİ");
  assert.equal(normalizeTurkishText("ė"), "Ė".normalize("NFC"));
});

test("oyun client'ları ortak alfabe ve normalizasyon helper'ını kullanır", () => {
  for (const source of [hangmanClient, wordGuessClient]) {
    assert.match(source, /TURKISH_ALPHABET/);
    assert.match(source, /normalizeTurkishText/);
    assert.doesNotMatch(source, /ABCDEFGHIJKLMNOPQRSTUVWXYZ/);
    assert.doesNotMatch(source, /.toUpperCase()/);
  }
});

test("Adam Asmaca kelime havuzu Türkçe karakterli, geçerli ve tekrarsızdır", () => {
  assert.ok(HANGMAN_WORDS.length >= 60);
  assert.equal(new Set(HANGMAN_WORDS).size, HANGMAN_WORDS.length);
  assert.ok(HANGMAN_WORDS.some((word) => /[ÇĞİÖŞÜ]/u.test(word)));
  assert.ok(HANGMAN_WORDS.some((word) => word.includes("I")));
  assert.ok(HANGMAN_WORDS.some((word) => word.includes("İ")));
  for (const word of HANGMAN_WORDS) {
    assert.ok(isValidTurkishWord(word), "invalid hangman word: " + word);
    assert.ok(word.length > 1);
  }
});

test("Kelime Tahmin havuzu her uzunlukta yeterli ve geçerlidir", () => {
  assert.ok(allWordGuessWords.length >= 60);
  assert.equal(new Set(allWordGuessWords).size, allWordGuessWords.length);
  for (const [length, words] of Object.entries(WORD_GUESS_WORDS_BY_LENGTH)) {
    assert.ok(words.length >= 10);
    for (const word of words) {
      assert.equal(word.length, Number(length), "wrong length: " + word);
      assert.ok(isValidTurkishWord(word), "invalid word guess word: " + word);
    }
  }
});

test("I, İ ve Türkçe kelime eşleşmeleri birbirine karışmaz", () => {
  assert.equal(normalizeTurkishText("ışık"), "IŞIK");
  assert.equal(normalizeTurkishText("incir"), "İNCİR");
  assert.equal(normalizeTurkishText("öğrenci"), "ÖĞRENCİ");
  assert.notEqual(normalizeTurkishText("CICEK"), "ÇİÇEK");
  assert.notEqual(normalizeTurkishText("OGRENCI"), "ÖĞRENCİ");
  assert.notEqual(normalizeTurkishText("i"), normalizeTurkishText("ı"));
});
