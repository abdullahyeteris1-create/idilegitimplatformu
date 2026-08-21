import assert from "node:assert/strict";
import test from "node:test";
import {
  createEmptySelection,
  createFashionRound,
  evaluateFashionRound,
  FASHION_COLORS,
  FASHION_DIFFICULTIES,
  FASHION_MAX_SPEED_BONUS,
  FASHION_TOTAL_ROUNDS,
  getFashionColor,
  getFashionPerformanceMessage,
  getMemorizeDurationMs,
  summarizeFashionGame,
} from "../src/lib/moda-hafizasi/gameConfig.ts";

function playRounds(difficultyId, speedId = "normal", count = FASHION_TOTAL_ROUNDS) {
  const rounds = [];
  const history = [];

  for (let index = 0; index < count; index += 1) {
    const round = createFashionRound({ index, difficultyId, speedId, history });
    rounds.push(round);
    history.push({ answer: round.answer, look: round.look });
  }

  return rounds;
}

test("her zorluk seviyesi kendi slot ve secenek sayisini uretir", () => {
  for (const difficulty of FASHION_DIFFICULTIES) {
    const round = createFashionRound({ index: 0, difficultyId: difficulty.id, speedId: "normal" });

    assert.deepEqual(round.slots, difficulty.slots);
    assert.equal(round.slots.length, difficulty.id === "baslangic" ? 3 : 4);

    for (const slot of round.slots) {
      assert.equal(round.options[slot].length, difficulty.optionCount, `${difficulty.id}/${slot} secenek sayisi`);
      assert.ok(round.answer[slot], `${difficulty.id}/${slot} cevabi olmali`);
      assert.ok(
        round.options[slot].includes(round.answer[slot]),
        `${difficulty.id}/${slot}: dogru cevap secenekler arasinda olmali`,
      );
      assert.equal(new Set(round.options[slot]).size, difficulty.optionCount, "secenekler tekrar etmemeli");
    }

    // Kullanilmayan slotlar bos kalir (orn. Baslangic'ta aksesuar).
    if (difficulty.id === "baslangic") {
      assert.equal(round.answer.accessory, null);
      assert.deepEqual(round.options.accessory, []);
      assert.equal(round.look.accessoryStyle, "none");
    }
  }
});

test("bir tur icindeki parcalar farkli renkler alir", () => {
  for (const difficulty of FASHION_DIFFICULTIES) {
    for (const round of playRounds(difficulty.id)) {
      const colors = round.slots.map((slot) => round.answer[slot]);
      assert.equal(new Set(colors).size, colors.length, `${difficulty.id}: ayni turda renkler tekrar etmemeli`);
    }
  }
});

test("dusuk seviyelerde secenekler farkli renk ailelerinden gelir", () => {
  for (const difficultyId of ["baslangic", "ileri"]) {
    for (const round of playRounds(difficultyId)) {
      for (const slot of round.slots) {
        const families = round.options[slot].map((id) => getFashionColor(id).family);
        assert.equal(
          new Set(families).size,
          families.length,
          `${difficultyId}/${slot}: ayni aileden birden fazla secenek olmamali`,
        );
      }
    }
  }
});

test("Usta ve Uzman seviyelerinde yaniltici (ayni aile) secenekler kullanilir", () => {
  for (const difficultyId of ["usta", "uzman"]) {
    const difficulty = FASHION_DIFFICULTIES.find((item) => item.id === difficultyId);

    for (const round of playRounds(difficultyId, "normal", 12)) {
      for (const slot of round.slots) {
        const answerFamily = getFashionColor(round.answer[slot]).family;
        const familySize = FASHION_COLORS.filter((color) => color.family === answerFamily).length;
        const sameFamilyOptions = round.options[slot].filter((id) => getFashionColor(id).family === answerFamily);
        // Hedef sayiya ulasilamayan ailelerde (orn. notr) mevcut tum renkler kullanilir.
        const expected = Math.min(difficulty.confusableCount, familySize - 1);

        assert.ok(
          sameFamilyOptions.length - 1 >= expected,
          `${difficultyId}/${slot}: ${expected} yaniltici renk beklenirken ${sameFamilyOptions.length - 1} bulundu`,
        );
        assert.ok(sameFamilyOptions.length >= 2, `${difficultyId}/${slot}: en az bir benzer renk bulunmali`);
      }
    }
  }
});

test("Uzman seviyesi Usta'dan daha fazla secenek ve yaniltici renk sunar", () => {
  const usta = FASHION_DIFFICULTIES.find((item) => item.id === "usta");
  const uzman = FASHION_DIFFICULTIES.find((item) => item.id === "uzman");

  assert.ok(uzman.optionCount > usta.optionCount);
  assert.ok(uzman.confusableCount > usta.confusableCount);
  assert.ok(uzman.colorIds.length >= FASHION_COLORS.length);
});

test("arka arkaya ayni veya cok benzer kombinasyon uretilmez", () => {
  for (const difficulty of FASHION_DIFFICULTIES) {
    for (let repeat = 0; repeat < 15; repeat += 1) {
      const rounds = playRounds(difficulty.id);

      for (let index = 1; index < rounds.length; index += 1) {
        const previous = rounds[index - 1];
        const current = rounds[index];
        const matching = current.slots.filter((slot) => previous.answer[slot] === current.answer[slot]).length;

        assert.ok(
          matching <= current.slots.length - 2,
          `${difficulty.id}: ${index}. tur onceki turla ${matching}/${current.slots.length} parcada ayni`,
        );
      }
    }
  }
});

test("hiz ayari ve zorluk seviyesi sureyi bagimsiz etkiler", () => {
  // Ayni zorlukta hiz arttikca sure kisalir.
  assert.ok(getMemorizeDurationMs("ileri", "rahat") > getMemorizeDurationMs("ileri", "normal"));
  assert.ok(getMemorizeDurationMs("ileri", "normal") > getMemorizeDurationMs("ileri", "hizli"));

  // Ayni hizda zorluk arttikca sure kisalir.
  assert.ok(getMemorizeDurationMs("baslangic", "normal") > getMemorizeDurationMs("ileri", "normal"));
  assert.ok(getMemorizeDurationMs("ileri", "normal") > getMemorizeDurationMs("usta", "normal"));
  assert.ok(getMemorizeDurationMs("usta", "normal") > getMemorizeDurationMs("uzman", "normal"));

  // Hiz ayari, zorluktan bagimsiz olarak her seviyede ayni yonde calisir.
  for (const difficulty of FASHION_DIFFICULTIES) {
    assert.ok(getMemorizeDurationMs(difficulty.id, "rahat") > getMemorizeDurationMs(difficulty.id, "hizli"));
  }

  assert.equal(getMemorizeDurationMs("ileri", "normal"), 5000);
  assert.equal(getMemorizeDurationMs("ileri", "rahat"), 7000);
  assert.equal(getMemorizeDurationMs("ileri", "hizli"), 3000);
});

test("Uzman seviyesinde tur ilerledikce sure kisalir, digerlerinde sabit kalir", () => {
  assert.ok(getMemorizeDurationMs("uzman", "rahat", 9) < getMemorizeDurationMs("uzman", "rahat", 0));
  assert.equal(getMemorizeDurationMs("usta", "rahat", 9), getMemorizeDurationMs("usta", "rahat", 0));
  assert.ok(getMemorizeDurationMs("uzman", "hizli", 9) >= 1600, "sure alt sinirin altina inmemeli");
});

test("puanlama dogru parca sayisina gore hesaplanir", () => {
  const round = createFashionRound({ index: 0, difficultyId: "ileri", speedId: "normal" });
  const fullSelection = { ...round.answer };

  const perfect = evaluateFashionRound(round, fullSelection, 30000);
  assert.equal(perfect.correctCount, 4);
  assert.equal(perfect.baseScore, 100);
  assert.equal(perfect.speedBonus, 0, "20 sn ustu cevapta hiz bonusu olmaz");

  const threeCorrect = { ...fullSelection };
  const wrongOption = round.options.shoes.find((id) => id !== round.answer.shoes);
  threeCorrect.shoes = wrongOption;
  const partial = evaluateFashionRound(round, threeCorrect, 30000);
  assert.equal(partial.correctCount, 3);
  assert.equal(partial.baseScore, 75);
  assert.deepEqual(partial.wrongSlots, ["shoes"]);

  const empty = evaluateFashionRound(round, createEmptySelection(), 30000);
  assert.equal(empty.correctCount, 0);
  assert.equal(empty.baseScore, 0);
  assert.equal(empty.score, 0);
});

test("hiz bonusu sinirlidir ve ana basari puaninin onune gecmez", () => {
  const round = createFashionRound({ index: 0, difficultyId: "ileri", speedId: "normal" });

  const instantPerfect = evaluateFashionRound(round, { ...round.answer }, 0);
  assert.equal(instantPerfect.speedBonus, FASHION_MAX_SPEED_BONUS);
  assert.ok(instantPerfect.speedBonus < instantPerfect.baseScore);

  const wrongSelection = createEmptySelection();
  for (const slot of round.slots) {
    wrongSelection[slot] = round.options[slot].find((id) => id !== round.answer[slot]);
  }
  const instantWrong = evaluateFashionRound(round, wrongSelection, 0);
  assert.equal(instantWrong.speedBonus, 0, "hicbir parca dogru degilse hiz bonusu verilmez");

  // Hizli ama 1/4 dogru cevap, yavas ama 4/4 dogru cevabi gecemez.
  const onlyOne = createEmptySelection();
  for (const slot of round.slots) onlyOne[slot] = round.options[slot].find((id) => id !== round.answer[slot]);
  onlyOne.top = round.answer.top;
  const fastPoor = evaluateFashionRound(round, onlyOne, 0);
  const slowPerfect = evaluateFashionRound(round, { ...round.answer }, 19000);
  assert.ok(slowPerfect.score > fastPoor.score);
});

test("oyun sonu ozeti ve performans mesaji beklendigi gibi hesaplanir", () => {
  const round = createFashionRound({ index: 0, difficultyId: "ileri", speedId: "normal" });
  const perfect = evaluateFashionRound(round, { ...round.answer }, 30000);
  const empty = evaluateFashionRound(round, createEmptySelection(), 10000);

  const summary = summarizeFashionGame([perfect, empty]);
  assert.equal(summary.roundsPlayed, 2);
  assert.equal(summary.totalPieces, 8);
  assert.equal(summary.correctPieces, 4);
  assert.equal(summary.wrongPieces, 4);
  assert.equal(summary.successPercent, 50);
  assert.equal(summary.averageResponseMs, 20000);

  assert.equal(getFashionPerformanceMessage(100), "Muhteşem bir görsel hafıza!");
  assert.equal(getFashionPerformanceMessage(90), "Muhteşem bir görsel hafıza!");
  assert.equal(getFashionPerformanceMessage(89), "Harika gidiyorsun!");
  assert.equal(getFashionPerformanceMessage(75), "Harika gidiyorsun!");
  assert.equal(getFashionPerformanceMessage(74), "Biraz daha dikkat, çok iyi olacak!");
  assert.equal(getFashionPerformanceMessage(50), "Biraz daha dikkat, çok iyi olacak!");
  assert.equal(getFashionPerformanceMessage(49), "Tekrar deneyerek hafızanı güçlendirebilirsin!");
});

test("karakter gorunumu tur basina cesitlenir", () => {
  const rounds = playRounds("uzman", "normal", 20);
  const hairStyles = new Set(rounds.map((round) => round.look.hairStyle));
  const bagStyles = new Set(rounds.map((round) => round.look.bagStyle));
  const shoeStyles = new Set(rounds.map((round) => round.look.shoeStyle));
  const accessoryStyles = new Set(rounds.map((round) => round.look.accessoryStyle));

  assert.ok(hairStyles.size >= 3, "en az 3 farkli sac modeli gorulmeli");
  assert.ok(bagStyles.size >= 2, "en az 2 farkli canta modeli gorulmeli");
  assert.ok(shoeStyles.size >= 2, "en az 2 farkli ayakkabi modeli gorulmeli");
  assert.ok(accessoryStyles.size >= 2, "en az 2 farkli aksesuar modeli gorulmeli");
  assert.ok(!accessoryStyles.has("none"), "Uzman seviyesinde aksesuar her zaman bulunur");
});
