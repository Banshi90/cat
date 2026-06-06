// ==========================================
// АНАЛИЗАТОР РОДОСЛОВНОЙ (ЭТАП "ДЕТЕКТИВ")
// ==========================================

/**
 * Структура данных для дерева предков:
 * {
 *   color: 'n',           // Цвет родителя
 *   silver: true,         // Есть ли серебро
 *   pattern: '22',        // Рисунок (solid, 22, 23, 24, 25, 11, 12)
 *   whiteSpot: 'none',    // Белая пятнистость (none, 01, 02, 03, 09)
 *   father: {...},        // Отец родителя
 *   mother: {...},        // Мать родителя
 *   fatherOfFather: {...}, // Дед по отцу
 *   motherOfFather: {...}, // Бабка по отцу
 *   fatherOfMother: {...}, // Дед по матери
 *   motherOfMother: {...}  // Бабка по матери
 * }
 */

/**
 * Парсит EMS-код и возвращает объект с параметрами
 * @param {string} emsCode - EMS-код (например, "ns 11", "gs 25 03", "n", "as 12")
 * @returns {Object} {color, silver, pattern, whiteSpot}
 */
export const parseEmsCode = (emsCode) => {
  if (!emsCode || emsCode.trim() === '' || emsCode.toLowerCase() === 'неизвестно') {
    return { color: 'unknown', silver: false, pattern: 'solid', whiteSpot: 'none' };
  }
  
  // Удаляем "MCO " если есть, приводим к нижнему регистру
  const code = emsCode.toLowerCase().replace('mco ', '').trim();
  
  // Базовые цвета
  const colors = ['n', 'a', 'd', 'e', 'f', 'g', 'w'];
  
  // Извлекаем цвет (первая буква)
  let color = 'unknown';
  for (const c of colors) {
    if (code.startsWith(c)) {
      color = c;
      break;
    }
  }
  
  // Проверяем серебро (s после цвета)
  const hasSilver = code.includes('s') && code.indexOf('s') === 1;
  
  // Извлекаем оставшуюся часть
  const startIndex = color.length + (hasSilver ? 1 : 0);
  const rest = code.substring(startIndex).trim();
  
  // Проверяем на 11/12
  const hasShaded11 = rest.includes('11');
  const hasShaded12 = rest.includes('12');
  
  // Извлекаем рисунок (22, 23, 24, 25, 11, 12)
  let pattern = 'solid';
  if (hasShaded11) pattern = '11';
  else if (hasShaded12) pattern = '12';
  else {
    const patternMatch = rest.match(/(22|23|24|25)/);
    if (patternMatch) pattern = patternMatch[1];
  }
  
  // Извлекаем белую пятнистость (01, 02, 03, 09)
  const whiteMatch = rest.match(/(01|02|03|09)/);
  const whiteSpot = whiteMatch ? whiteMatch[1] : 'none';
  
  return {
    color,
    silver: hasSilver,
    pattern,
    whiteSpot
  };
};

// ==========================================
// ФУНКЦИЯ 1: ПОДСЧЁТ БАЛЛОВ WIDE BAND
// ==========================================

/**
 * Подсчитывает баллы Wide Band для одного предка
 * @param {Object} ancestor - Объект предка {color, silver, pattern, whiteSpot}
 * @returns {number} Баллы: 0, 1 или 2
 */
const getWideBandPoints = (ancestor) => {
  // Если предок неизвестен или отсутствует
  if (!ancestor || ancestor.color === 'unknown') {
    return 0;
  }
  
  // 12 (шиншилла) = 2 балла
  if (ancestor.pattern === '12') {
    return 2;
  }
  
  // 11 (затушеванный) = 1 балл
  if (ancestor.pattern === '11') {
    return 1;
  }
  
  // Все остальные окрасы = 0 баллов
  return 0;
};

/**
 * Подсчитывает общую сумму баллов Wide Band для всей родословной
 * @param {Object} pedigreeTree - Дерево предков
 * @returns {number} Сумма баллов (0-12)
 */
export const calculateWideBandScore = (pedigreeTree) => {
  if (!pedigreeTree) return 0;
  
  let totalScore = 0;
  
  // Сам родитель (если 11/12)
  totalScore += getWideBandPoints(pedigreeTree);
  
  // Родители (2 предка)
  if (pedigreeTree.father) totalScore += getWideBandPoints(pedigreeTree.father);
  if (pedigreeTree.mother) totalScore += getWideBandPoints(pedigreeTree.mother);
  
  // Деды/бабки (4 предка)
  if (pedigreeTree.fatherOfFather) totalScore += getWideBandPoints(pedigreeTree.fatherOfFather);
  if (pedigreeTree.motherOfFather) totalScore += getWideBandPoints(pedigreeTree.motherOfFather);
  if (pedigreeTree.fatherOfMother) totalScore += getWideBandPoints(pedigreeTree.fatherOfMother);
  if (pedigreeTree.motherOfMother) totalScore += getWideBandPoints(pedigreeTree.motherOfMother);
  
  return totalScore;
};

// ==========================================
// ФУНКЦИЯ 2: АНАЛИЗ СКРЫТЫХ ГЕНОВ
// ==========================================

/**
 * Определяет, есть ли среди предков указанный окрас
 * @param {Object} pedigreeTree - Дерево предков
 * @param {Function} checkFn - Функция проверки предка
 * @returns {boolean} Найден ли окрас
 */
const hasAncestorWith = (pedigreeTree, checkFn) => {
  if (!pedigreeTree) return false;
  
  // Проверяем родителей
  if (pedigreeTree.father && checkFn(pedigreeTree.father)) return true;
  if (pedigreeTree.mother && checkFn(pedigreeTree.mother)) return true;
  
  // Проверяем дедов/бабок
  if (pedigreeTree.fatherOfFather && checkFn(pedigreeTree.fatherOfFather)) return true;
  if (pedigreeTree.motherOfFather && checkFn(pedigreeTree.motherOfFather)) return true;
  if (pedigreeTree.fatherOfMother && checkFn(pedigreeTree.fatherOfMother)) return true;
  if (pedigreeTree.motherOfMother && checkFn(pedigreeTree.motherOfMother)) return true;
  
  return false;
};

/**
 * Анализирует родословную и определяет скрытые рецессивные гены
 * @param {Object} pedigreeTree - Дерево предков
 * @param {Object} parentPhenotype - Фенотип родителя {color, silver, pattern, whiteSpot}
 * @param {string} sex - Пол родителя ('male' или 'female')
 * @returns {Object} Генотип с учётом скрытых генов
 */
export const analyzePedigree = (pedigreeTree, parentPhenotype, sex) => {
  const genotype = {
    O: 'unknown',
    D: 'unknown',
    I: 'unknown',
    A: 'unknown',
    Ta: 'unknown',
    S: 'unknown',
    W: 'ww',
    wideBandScore: 0
  };
  
  if (!pedigreeTree || !parentPhenotype) {
    return genotype;
  }
  
  const { color, silver, pattern, whiteSpot } = parentPhenotype;
  
  // ==========================================
  // 1. ЛОКУС W (Доминантный белый)
  // ==========================================
  genotype.W = (color === 'w') ? 'Ww' : 'ww';
  
  // ==========================================
  // 2. ЛОКУС O (Цвет, сцепленный с полом)
  // ==========================================
  if (color === 'w') {
    // Белый родитель — нужно восстановить скрытый цвет из родословной
    // Упрощённая логика: ищем ближайшего цветного предка
    genotype.O = 'unknown'; // Будет определено позже
  } else if (sex === 'male') {
    genotype.O = (color === 'd' || color === 'e') ? 'O' : 'o';
  } else {
    if (color === 'd' || color === 'e') genotype.O = 'OO';
    else if (color === 'f' || color === 'g') genotype.O = 'Oo';
    else genotype.O = 'oo';
  }
  
  // ==========================================
  // 3. ЛОКУС D (Осветление)
  // ==========================================
  if (color === 'a' || color === 'e' || color === 'g') {
    // Осветлённый окрас = dd (гомозигота)
    genotype.D = 'dd';
  } else if (color !== 'w') {
    // Плотный окрас — проверяем предков на наличие осветления
    const hasDilutedAncestor = hasAncestorWith(pedigreeTree, (ancestor) => {
      return ancestor.color === 'a' || ancestor.color === 'e' || ancestor.color === 'g';
    });
    
    if (hasDilutedAncestor) {
      // Есть осветлённый предок → родитель может быть Dd (50% вероятность)
      genotype.D = 'Dd'; // Предполагаем носительство
    } else {
      // Нет осветлённых предков → скорее всего DD
      genotype.D = 'DD';
    }
  }
  
  // ==========================================
  // 4. ЛОКУС I (Серебро)
  // ==========================================
  if (silver) {
    // Есть серебро — проверяем, есть ли предок без серебра
    const hasNonSilverAncestor = hasAncestorWith(pedigreeTree, (ancestor) => {
      return !ancestor.silver && ancestor.color !== 'w';
    });
    
    if (hasNonSilverAncestor) {
      // Есть предок без серебра → родитель гарантированно Ii
      genotype.I = 'Ii';
    } else {
      // Все предки с серебром → может быть II
      genotype.I = 'unknown'; // Не знаем точно
    }
  } else {
    // Нет серебра → строго ii
    genotype.I = 'ii';
  }
  
  // ==========================================
  // 5. ЛОКУСЫ A и Ta (Агути и Рисунок)
  // ==========================================
  if (pattern === 'solid') {
    // Солид = aa (не-агути)
    genotype.A = 'aa';
    genotype.Ta = 'unknown';
  } else if (pattern === '11' || pattern === '12') {
    // 11/12 = агути с wide band
    genotype.A = 'unknown'; // Агути (AA или Aa)
    
    // Проверяем, есть ли солид в предках
    const hasSolidAncestor = hasAncestorWith(pedigreeTree, (ancestor) => {
      return ancestor.pattern === 'solid' && ancestor.color !== 'w';
    });
    
    if (hasSolidAncestor) {
      // Есть солид в предках → родитель может быть Aa
      genotype.A = 'Aa';
    } else {
      // Нет солидов → скорее всего AA
      genotype.A = 'AA';
    }
    
    // Предполагаем тикированный как базовый рисунок
    genotype.Ta = 'TaTa';
  } else {
    // Обычный рисунок (22, 23, 24, 25) = агути
    genotype.A = 'unknown';
    
    // Проверяем, есть ли солид в предках
    const hasSolidAncestor = hasAncestorWith(pedigreeTree, (ancestor) => {
      return ancestor.pattern === 'solid' && ancestor.color !== 'w';
    });
    
    if (hasSolidAncestor) {
      genotype.A = 'Aa';
    } else {
      genotype.A = 'AA';
    }
    
    // Определяем рисунок
    if (pattern === '25') {
      genotype.Ta = 'TaTa';
    } else if (pattern === '23') {
      genotype.Ta = 'TmTm';
    } else if (pattern === '24') {
      genotype.Ta = 'spsp';
    } else if (pattern === '22') {
      genotype.Ta = 'tbtb';
    }
    
    // Проверяем, есть ли другие рисунки в предках
    const hasDifferentPattern = hasAncestorWith(pedigreeTree, (ancestor) => {
      return ancestor.pattern !== pattern && 
             ancestor.pattern !== 'solid' && 
             ancestor.pattern !== '11' && 
             ancestor.pattern !== '12' &&
             ancestor.color !== 'w';
    });
    
    if (hasDifferentPattern) {
      // Есть другой рисунок → родитель может быть гетерозиготой
      if (pattern === '25') genotype.Ta = 'Tatb';
      else if (pattern === '23') genotype.Ta = 'Tmtb';
      else if (pattern === '24') genotype.Ta = 'sptb';
      else if (pattern === '22') genotype.Ta = 'tbtb';
    }
  }
  
  // ==========================================
  // 6. ЛОКУС S (Белая пятнистость)
  // ==========================================
  if (whiteSpot === '01' || whiteSpot === '02') {
    // Много белого → SS
    genotype.S = 'SS';
  } else if (whiteSpot === '03' || whiteSpot === '09') {
    // Мало белого → Ss
    genotype.S = 'Ss';
  } else {
    // Нет белого → ss
    genotype.S = 'ss';
  }
  
  // ==========================================
  // 7. WIDE BAND SCORE
  // ==========================================
  genotype.wideBandScore = calculateWideBandScore(pedigreeTree);
  
  return genotype;
};

// ==========================================
// ТЕСТОВЫЕ ДАННЫЕ ДЛЯ ПРОВЕРКИ
// ==========================================

export const testPedigrees = [
  {
    id: 1,
    name: 'Простая родословная без Wide Band',
    pedigree: {
      color: 'n', silver: false, pattern: '22', whiteSpot: 'none',
      father: { color: 'n', silver: false, pattern: '22', whiteSpot: 'none' },
      mother: { color: 'n', silver: false, pattern: '22', whiteSpot: 'none' },
      fatherOfFather: { color: 'n', silver: false, pattern: '22', whiteSpot: 'none' },
      motherOfFather: { color: 'n', silver: false, pattern: '22', whiteSpot: 'none' },
      fatherOfMother: { color: 'n', silver: false, pattern: '22', whiteSpot: 'none' },
      motherOfMother: { color: 'n', silver: false, pattern: '22', whiteSpot: 'none' }
    },
    expectedScore: 0
  },
  {
    id: 2,
    name: 'Родословная с затушеванным родителем',
    pedigree: {
      color: 'ns', silver: true, pattern: '11', whiteSpot: 'none',
      father: { color: 'ns', silver: true, pattern: '11', whiteSpot: 'none' },
      mother: { color: 'ns', silver: true, pattern: '22', whiteSpot: 'none' },
      fatherOfFather: { color: 'n', silver: false, pattern: '22', whiteSpot: 'none' },
      motherOfFather: { color: 'n', silver: false, pattern: '22', whiteSpot: 'none' },
      fatherOfMother: { color: 'n', silver: false, pattern: '22', whiteSpot: 'none' },
      motherOfMother: { color: 'n', silver: false, pattern: '22', whiteSpot: 'none' }
    },
    expectedScore: 2 // 1 (сам) + 1 (отец) = 2
  },
  {
    id: 3,
    name: 'Родословная с шиншиллой в предках',
    pedigree: {
      color: 'ns', silver: true, pattern: '22', whiteSpot: 'none',
      father: { color: 'n', silver: false, pattern: '22', whiteSpot: 'none' },
      mother: { color: 'n', silver: false, pattern: '22', whiteSpot: 'none' },
      fatherOfFather: { color: 'ns', silver: true, pattern: '12', whiteSpot: 'none' },
      motherOfFather: { color: 'n', silver: false, pattern: '22', whiteSpot: 'none' },
      fatherOfMother: { color: 'n', silver: false, pattern: '22', whiteSpot: 'none' },
      motherOfMother: { color: 'n', silver: false, pattern: '22', whiteSpot: 'none' }
    },
    expectedScore: 2 // 2 (дед по отцу)
  },
  {
    id: 4,
    name: 'Сложная родословная с множественными 11/12',
    pedigree: {
      color: 'ns', silver: true, pattern: '11', whiteSpot: 'none',
      father: { color: 'ns', silver: true, pattern: '12', whiteSpot: 'none' },
      mother: { color: 'ns', silver: true, pattern: '11', whiteSpot: 'none' },
      fatherOfFather: { color: 'ns', silver: true, pattern: '11', whiteSpot: 'none' },
      motherOfFather: { color: 'ns', silver: true, pattern: '12', whiteSpot: 'none' },
      fatherOfMother: { color: 'ns', silver: true, pattern: '12', whiteSpot: 'none' },
      motherOfMother: { color: 'ns', silver: true, pattern: '11', whiteSpot: 'none' }
    },
    expectedScore: 10 
  }
];

// ==========================================
// ФУНКЦИЯ ЗАПУСКА ТЕСТОВ
// ==========================================

export const runPedigreeTests = () => {
  console.log('%c🧬 ТЕСТЫ АНАЛИЗАТОРА РОДОСЛОВНОЙ', 'color: #007bff; font-weight: bold; font-size: 14px;');
  console.log('='.repeat(70));
  
  let passed = 0;
  let failed = 0;
  
  testPedigrees.forEach(test => {
    const score = calculateWideBandScore(test.pedigree);
    const isPassed = score === test.expectedScore;
    
    if (isPassed) {
      passed++;
      console.log(`%c✅ Тест ${test.id}: ${test.name}`, 'color: green');
      console.log(`   Ожидалось: ${test.expectedScore}, Получено: ${score}`);
    } else {
      failed++;
      console.log(`%c❌ Тест ${test.id}: ${test.name}`, 'color: red; font-weight: bold');
      console.log(`   Ожидалось: ${test.expectedScore}, Получено: ${score}`);
    }
    
    // Тестируем analyzePedigree
    const genotype = analyzePedigree(test.pedigree, test.pedigree, 'male');
    console.log(`   Генотип:`, genotype);
    console.log('');
  });
  
  console.log('='.repeat(70));
  const color = failed === 0 ? 'green' : 'red';
  console.log(`%c📊 ИТОГ: Пройдено ${passed} из ${testPedigrees.length}`, 
    `font-weight: bold; font-size: 13px; color: ${color}`);
  
  return { passed, failed, total: testPedigrees.length };
};

/**
 * Собирает дерево родословной из текстовых кодов
 * @param {string} fatherCode - EMS-код отца
 * @param {string} motherCode - EMS-код матери
 * @param {string} fatherFatherCode - EMS-код деда по отцу
 * @param {string} fatherMotherCode - EMS-код бабки по отцу
 * @param {string} motherFatherCode - EMS-код деда по матери
 * @param {string} motherMotherCode - EMS-код бабки по матери
 * @returns {Object} Дерево родословной
 */
export const buildPedigreeTree = (
  fatherCode,
  motherCode,
  fatherFatherCode,
  fatherMotherCode,
  motherFatherCode,
  motherMotherCode
) => {
  return {
    color: 'unknown', // Будет заполнено из основного состояния
    silver: false,
    pattern: 'solid',
    whiteSpot: 'none',
    father: parseEmsCode(fatherCode),
    mother: parseEmsCode(motherCode),
    fatherOfFather: parseEmsCode(fatherFatherCode),
    motherOfFather: parseEmsCode(fatherMotherCode),
    fatherOfMother: parseEmsCode(motherFatherCode),
    motherOfMother: parseEmsCode(motherMotherCode)
  };
};

/**
 * Тест функции сборки родословной
 */
export const testBuildPedigree = () => {
  console.log('%c🧬 ТЕСТ СБОРКИ РОДОСЛОВНОЙ', 'color: #007bff; font-weight: bold; font-size: 14px;');
  console.log('='.repeat(70));
  
  const tree = buildPedigreeTree(
    'ns 11',      // Отец
    'gs 25',      // Мать
    'n',          // Дед по отцу
    'as 12',      // Бабка по отцу
    'd',          // Дед по матери
    'fs 11'       // Бабка по матери
  );
  
  console.log('Дерево родословной:', tree);
  console.log('');
  console.log('Отец:', tree.father);
  console.log('Мать:', tree.mother);
  console.log('Дед по отцу:', tree.fatherOfFather);
  console.log('Бабка по отцу:', tree.motherOfFather);
  console.log('Дед по матери:', tree.fatherOfMother);
  console.log('Бабка по матери:', tree.motherOfMother);
  console.log('');
  
  const score = calculateWideBandScore(tree);
  console.log(`Баллы Wide Band: ${score}`);
  console.log('='.repeat(70));
  
  return tree;
};

/**
 * Подсчитывает баллы Wide Band для папы или мамы
 * @param {string} selfCode - EMS-код самого родителя
 * @param {string} fatherCode - EMS-код отца
 * @param {string} motherCode - EMS-код матери
 * @param {string} fatherFatherCode - EMS-код деда по отцу
 * @param {string} fatherMotherCode - EMS-код бабки по отцу
 * @param {string} motherFatherCode - EMS-код деда по матери
 * @param {string} motherMotherCode - EMS-код бабки по матери
 * @returns {number} Сумма баллов
 */
export const calculatePedigreeScore = (
  selfCode,
  fatherCode,
  motherCode,
  fatherFatherCode,
  fatherMotherCode,
  motherFatherCode,
  motherMotherCode
) => {
  const tree = {
    ...parseEmsCode(selfCode),
    father: parseEmsCode(fatherCode),
    mother: parseEmsCode(motherCode),
    fatherOfFather: parseEmsCode(fatherFatherCode),
    motherOfFather: parseEmsCode(fatherMotherCode),
    fatherOfMother: parseEmsCode(motherFatherCode),
    motherOfMother: parseEmsCode(motherMotherCode)
  };
  
  return calculateWideBandScore(tree);
};