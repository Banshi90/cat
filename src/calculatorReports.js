// ==========================================
// ГЕНЕРАТОР ОТЧЁТОВ ДЛЯ ПРОВЕРКИ КАЛЬКУЛЯТОРА
// ==========================================

import { 
  getEmsFromPhenotype, 
  deriveGenotypeFromPhenotype, 
  interpretKittenGenotype, 
  assignBadge 
} from './panels/Home';

// 10 тестовых комбинаций
export const testCases = [
  {
    id: 1,
    name: "Чёрный солид × Чёрный солид (без тестов)",
    father: { color: 'n', silver: false, pattern: 'solid', whiteSpot: 'none', hasTests: false, shadedStatus: 'none' },
    mother: { color: 'n', silver: false, pattern: 'solid', whiteSpot: 'none', hasTests: false, shadedStatus: 'none' }
  },
  {
    id: 2,
    name: "Голубой × Голубой (оба dd — только осветлённые)",
    father: { color: 'a', silver: false, pattern: 'solid', whiteSpot: 'none', hasTests: false, shadedStatus: 'none' },
    mother: { color: 'a', silver: false, pattern: 'solid', whiteSpot: 'none', hasTests: false, shadedStatus: 'none' }
  },
  {
    id: 3,
    name: "Красный кот × Чёрная кошка (сцепленный с полом)",
    father: { color: 'd', silver: false, pattern: 'solid', whiteSpot: 'none', hasTests: false, shadedStatus: 'none' },
    mother: { color: 'n', silver: false, pattern: 'solid', whiteSpot: 'none', hasTests: false, shadedStatus: 'none' }
  },
  {
    id: 4,
    name: "Серебристый × Серебристый (оба с серебром)",
    father: { color: 'n', silver: true, pattern: 'solid', whiteSpot: 'none', hasTests: false, shadedStatus: 'none' },
    mother: { color: 'n', silver: true, pattern: 'solid', whiteSpot: 'none', hasTests: false, shadedStatus: 'none' }
  },
  {
    id: 5,
    name: "Тикированный × Мраморный (разные рисунки)",
    father: { color: 'n', silver: false, pattern: '25', whiteSpot: 'none', hasTests: false, shadedStatus: 'none' },
    mother: { color: 'n', silver: false, pattern: '22', whiteSpot: 'none', hasTests: false, shadedStatus: 'none' }
  },
  {
    id: 6,
    name: "Биколор × Биколор (оба с белым 03)",
    father: { color: 'n', silver: false, pattern: 'solid', whiteSpot: '03', hasTests: false, shadedStatus: 'none' },
    mother: { color: 'n', silver: false, pattern: 'solid', whiteSpot: '03', hasTests: false, shadedStatus: 'none' }
  },
  {
    id: 7,
    name: "Затушеванный 11 × Обычный серебристый",
    father: { color: 'n', silver: true, pattern: '25', whiteSpot: 'none', hasTests: false, shadedStatus: '11' },
    mother: { color: 'n', silver: true, pattern: '25', whiteSpot: 'none', hasTests: false, shadedStatus: 'none' }
  },
  {
    id: 8,
    name: "Белый (скрытый неизвестен) × Чёрный",
    father: { color: 'w', silver: false, pattern: 'solid', whiteSpot: 'none', hasTests: false, shadedStatus: 'none', knowHidden: false },
    mother: { color: 'n', silver: false, pattern: 'solid', whiteSpot: 'none', hasTests: false, shadedStatus: 'none' }
  },
  {
    id: 9,
    name: "Кремовый × Кремовый (осветлённые красные)",
    father: { color: 'e', silver: false, pattern: 'solid', whiteSpot: 'none', hasTests: false, shadedStatus: 'none' },
    mother: { color: 'e', silver: false, pattern: 'solid', whiteSpot: 'none', hasTests: false, shadedStatus: 'none' }
  },
  {
    id: 10,
    name: "Сложная: Красный серебристый тигр с белым × Голубокремовая",
    father: { color: 'd', silver: true, pattern: '23', whiteSpot: '03', hasTests: false, shadedStatus: 'none' },
    mother: { color: 'g', silver: false, pattern: 'solid', whiteSpot: 'none', hasTests: false, shadedStatus: 'none' }
  }
];

// Функция полного расчёта для тестовых данных
const runCalculation = (fatherData, motherData) => {
  const parseLocusWithSpectrum = (genotypeStr, locusName) => {
    if (genotypeStr !== 'unknown') {
      let step = 2;
      if (locusName === 'A' || locusName === 'D' || locusName === 'I') step = 1;
      const result = [];
      for (let i = 0; i < genotypeStr.length; i += step) {
        result.push(genotypeStr.substring(i, i + step));
      }
      return result;
    }
    switch (locusName) {
      case 'D': return ['D', 'd'];
      case 'I': return ['I', 'i'];
      case 'A': return ['A', 'a'];
      case 'Ta': return ['Ta', 'Tm', 'sp', 'tb'];
      case 'S': return ['S', 's'];
      case 'Sh': return ['N', 'sh', 'ch'];
      default: return ['?'];
    }
  };

  const fatherGenotype = deriveGenotypeFromPhenotype(
    fatherData.color, fatherData.silver, fatherData.pattern, fatherData.whiteSpot, 'male',
    fatherData.knowHidden, fatherData.hiddenColor, fatherData.hiddenSilver, 
    fatherData.hiddenPattern, fatherData.hiddenWhiteSpot,
    fatherData.shadedStatus || 'none', 'conservative'
  );

  const motherGenotype = deriveGenotypeFromPhenotype(
    motherData.color, motherData.silver, motherData.pattern, motherData.whiteSpot, 'female',
    motherData.knowHidden, motherData.hiddenColor, motherData.hiddenSilver,
    motherData.hiddenPattern, motherData.hiddenWhiteSpot,
    motherData.shadedStatus || 'none', 'conservative'
  );

  const fatherD = parseLocusWithSpectrum(fatherGenotype.D, 'D');
  const motherD = parseLocusWithSpectrum(motherGenotype.D, 'D');
  const fatherI = parseLocusWithSpectrum(fatherGenotype.I, 'I');
  const motherI = parseLocusWithSpectrum(motherGenotype.I, 'I');
  const fatherA = parseLocusWithSpectrum(fatherGenotype.A, 'A');
  const motherA = parseLocusWithSpectrum(motherGenotype.A, 'A');
  const fatherTa = parseLocusWithSpectrum(fatherGenotype.Ta, 'Ta');
  const motherTa = parseLocusWithSpectrum(motherGenotype.Ta, 'Ta');
  const fatherW = fatherGenotype.W.split('');
  const motherW = motherGenotype.W.split('');
  const fatherS = parseLocusWithSpectrum(fatherGenotype.S, 'S');
  const motherS = parseLocusWithSpectrum(motherGenotype.S, 'S');
  const fatherSh = parseLocusWithSpectrum(fatherGenotype.Sh, 'Sh');
  const motherSh = parseLocusWithSpectrum(motherGenotype.Sh, 'Sh');

  let fatherO = (fatherGenotype.O === 'unknown') ? ['O', 'o'] : 
                (fatherData.color === 'd' || fatherData.color === 'e') ? ['O'] : ['o'];

  let motherO = [];
  if (motherGenotype.O === 'unknown') {
    motherO = ['O', 'o'];
  } else if (motherData.color === 'd' || motherData.color === 'e') {
    motherO = ['O', 'O'];
  } else if (motherData.color === 'f' || motherData.color === 'g') {
    motherO = ['O', 'o'];
  } else {
    motherO = ['o', 'o'];
  }

  const maleKittensRaw = [];
  const femaleKittensRaw = [];

  for (const fD of fatherD) {
    for (const mD of motherD) {
      for (const fI of fatherI) {
        for (const mI of motherI) {
          for (const fA of fatherA) {
            for (const mA of motherA) {
              for (const fTa of fatherTa) {
                for (const mTa of motherTa) {
                  for (const fW of fatherW) {
                    for (const mW of motherW) {
                      for (const fS of fatherS) {
                        for (const mS of motherS) {
                          for (const fSh of fatherSh) {
                            for (const mSh of motherSh) {
                              const combD = [fD, mD];
                              const combI = [fI, mI];
                              const combA = [fA, mA];
                              const combTa = [fTa, mTa];
                              const combW = [fW, mW];
                              const combS = [fS, mS];
                              const combSh = [fSh, mSh];

                              for (const mO of motherO) {
                                const phenotype = interpretKittenGenotype('male', [mO], combD, combI, combA, combTa, combW, combS, combSh);
                                maleKittensRaw.push(phenotype);
                              }

                              for (const fO of fatherO) {
                                for (const mO of motherO) {
                                  const phenotype = interpretKittenGenotype('female', [fO, mO], combD, combI, combA, combTa, combW, combS, combSh);
                                  femaleKittensRaw.push(phenotype);
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  const processGroup = (rawKittens) => {
    const total = rawKittens.length;
    if (total === 0) return [];

    const counts = {};
    rawKittens.forEach(k => {
      const key = `${k.code}|${k.name}`;
      counts[key] = (counts[key] || 0) + 1;
    });

    return Object.keys(counts).map(key => {
      const [code, name] = key.split('|');
      const count = counts[key];
      const percent = parseFloat(((count / total) * 100).toFixed(1));
      const kitten = { code, name, percent };
      kitten.badge = assignBadge(kitten, fatherData, motherData, 'conservative');
      return kitten;
    }).sort((a, b) => b.percent - a.percent);
  };

  return {
    males: processGroup(maleKittensRaw),
    females: processGroup(femaleKittensRaw)
  };
};

// Главная функция генерации отчётов
export const generateReport = () => {
  console.clear();
  console.log("%c🧬 ГЕНЕРАЦИЯ ОТЧЁТОВ ДЛЯ ПРОВЕРКИ КАЛЬКУЛЯТОРА", "color: #007bff; font-weight: bold; font-size: 16px;");
  console.log("%c   (Оценку правильности производите вручную)\n", "color: #666; font-style: italic;");

  testCases.forEach(test => {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`🧬 ПРИМЕР ${test.id}: ${test.name}`);
    console.log(`${'═'.repeat(70)}\n`);

    const fatherEms = getEmsFromPhenotype(test.father.color, test.father.silver, test.father.pattern, test.father.whiteSpot);
    const motherEms = getEmsFromPhenotype(test.mother.color, test.mother.silver, test.mother.pattern, test.mother.whiteSpot);

    console.log(`👨 ПАПА: ${fatherEms.ems} (${fatherEms.fullName})`);
    console.log(`   Цвет: ${test.father.color}, Серебро: ${test.father.silver ? 'да' : 'нет'}, Рисунок: ${test.father.pattern}, Белый: ${test.father.whiteSpot}`);
    console.log(`   Затушеванность: ${test.father.shadedStatus || 'нет'}, ДНК-тесты: ${test.father.hasTests ? 'да' : 'нет'}\n`);

    console.log(`👩 МАМА: ${motherEms.ems} (${motherEms.fullName})`);
    console.log(`   Цвет: ${test.mother.color}, Серебро: ${test.mother.silver ? 'да' : 'нет'}, Рисунок: ${test.mother.pattern}, Белый: ${test.mother.whiteSpot}`);
    console.log(`   Затушеванность: ${test.mother.shadedStatus || 'нет'}, ДНК-тесты: ${test.mother.hasTests ? 'да' : 'нет'}\n`);

    const results = runCalculation(test.father, test.mother);

    console.log('📊 РЕЗУЛЬТАТЫ РАСЧЁТА:');
    console.log('━'.repeat(70));

    console.log('♂️ КОТЫ:');
    if (results.males.length > 0) {
      results.males.forEach(kitten => {
        const badge = kitten.badge === 'guaranteed' ? '🟢' : 
                      kitten.badge === 'carrierBoth' ? '🔵' : '🟡';
        console.log(`  ${badge} ${kitten.code} — ${kitten.name} (${kitten.percent}%)`);
      });
    } else {
      console.log('  (нет данных)');
    }

    console.log('\n♀️ КОШКИ:');
    if (results.females.length > 0) {
      results.females.forEach(kitten => {
        const badge = kitten.badge === 'guaranteed' ? '🟢' : 
                      kitten.badge === 'carrierBoth' ? '🔵' : '🟡';
        console.log(`  ${badge} ${kitten.code} — ${kitten.name} (${kitten.percent}%)`);
      });
    } else {
      console.log('  (нет данных)');
    }
  });

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 Сгенерировано отчётов: ${testCases.length}`);
  console.log(`${'═'.repeat(70)}\n`);
};