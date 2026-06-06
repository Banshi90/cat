import React, { useState, useEffect } from 'react';
import {
  Panel, PanelHeader, Group, FormItem, RadioGroup, Radio, Checkbox,
  Button, Div, Card, CardGrid, SimpleCell, Text, Title, Spacing, Select, Header
} from '@vkontakte/vkui';
import {
  VKShareButton, VKIcon,
  TelegramShareButton, TelegramIcon,
  WhatsappShareButton, WhatsappIcon,
  FacebookShareButton, FacebookIcon,
  EmailShareButton, EmailIcon,
} from 'react-share';

import bgImage from '../assets/bg.jpg';
import { generateReport } from '../calculatorReports';
import { runPedigreeTests, parseEmsCode, testBuildPedigree, calculatePedigreeScore } from '../pedigreeAnalyzer';
// ==========================================
// ГЕНЕТИЧЕСКИЕ СПРАВОЧНИКИ И КОНСТАНТЫ
// ==========================================

export const getEmsFromPhenotype = (color, hasSilver, pattern, whiteSpot) => {
  // Если животное полностью белое — показываем MCO w
  if (color === 'w') {
    return { ems: 'MCO w', fullName: 'Белый' };
  }
  
  let base = '';
  let name = '';
  
  switch (color) {
    case 'n': base = 'n'; name = 'Черный'; break;
    case 'a': base = 'a'; name = 'Голубой'; break;
    case 'd': base = 'd'; name = 'Красный'; break;
    case 'e': base = 'e'; name = 'Кремовый'; break;
    case 'f': base = 'f'; name = 'Черепаховый'; break;
    case 'g': base = 'g'; name = 'Голубокремовый'; break;
    default: base = 'n'; name = 'Черный';
  }
  
  const silverCode = hasSilver ? 's' : '';
  let emsBase = base + silverCode;
  let fullName = '';
  
  // Защита: 11 и 12 требуют серебра. Если серебра нет, считаем как солид.
  if ((pattern === '11' || pattern === '12') && !hasSilver) {
    pattern = 'solid';
  }
  
  if (pattern === 'solid') {
    if (hasSilver) {
      // Черепаховые окрасы — особенные (женский род)
      if (color === 'f') {
        fullName = 'Черная дымная черепаха';
      } else if (color === 'g') {
        fullName = 'Голубокремовая дымная черепаха';
      } else {
        fullName = `${name} дымный`;
      }
    } else {
      // Черепаховые окрасы — особенные (женский род)
      if (color === 'f') {
        fullName = 'Черная черепаха';
      } else if (color === 'g') {
        fullName = 'Голубокремовая черепаха';
      } else {
        fullName = `${name} солид`;
      }
    }
  } else {
    let patternCode = '';
    let patternName = '';
    
    switch (pattern) {
      case '22': patternCode = '22'; patternName = 'мраморный'; break;
      case '23': patternCode = '23'; patternName = 'тигровый'; break;
      case '24': patternCode = '24'; patternName = 'пятнистый'; break;
      case '25': patternCode = '25'; patternName = 'тикированный'; break;
      case '11': patternCode = '11'; patternName = 'затушеванный'; break;
      case '12': patternCode = '12'; patternName = 'шиншилла'; break;
      default: patternCode = ''; patternName = '';
    }
    
    if (patternCode) {
      emsBase = emsBase + ' ' + patternCode;
    }
    
    if (hasSilver) {
      fullName = `Серебристый ${name.toLowerCase()} ${patternName}`;
    } else {
      fullName = `${name} ${patternName}`;
    }
  }
  
  // Добавляем белую пятнистость
  let whiteCode = '';
  let whiteName = '';
  if (whiteSpot === '01') { whiteCode = ' 01'; whiteName = ' ван'; }
  else if (whiteSpot === '02') { whiteCode = ' 02'; whiteName = ' арлекин'; }
  else if (whiteSpot === '03') { whiteCode = ' 03'; whiteName = ' биколор'; }
  else if (whiteSpot === '09') { whiteCode = ' 09'; whiteName = ' с белым'; }
  
  const ems = `MCO ${emsBase}${whiteCode}`.trim();
  fullName = fullName + whiteName;
  
  return { ems, fullName };
};

export const GENOTYPE_OPTIONS = {
  D: [
    { value: 'unknown', label: 'Не тестировалось (рассчитать по фенотипу)' },
    { value: 'DD', label: 'D/D (Плотный, не несет осветление)' },
    { value: 'Dd', label: 'D/d (Плотный, носитель осветления)' },
    { value: 'dd', label: 'd/d (Осветленный: голубой / кремовый)' }
  ],
  I: [
    { value: 'unknown', label: 'Неизвестно (рассчитать по фенотипу)' },
    { value: 'II', label: 'I/I — все котята с серебром (гомозигота)' },
    { value: 'Ii', label: 'I/i — есть котята без серебра (гетерозигота)' },
    { value: 'ii', label: 'i/i — без серебра (не носитель)' }
  ],
  A: [
    { value: 'unknown', label: 'Не тестировалось (рассчитать по фенотипу)' },
    { value: 'AA', label: 'A/A (Агути гомозигота, чистый рисунок)' },
    { value: 'Aa', label: 'A/a (Агути гетерозигота, несет солид)' },
    { value: 'aa', label: 'a/a (Нон-агути, солидный окрас)' }
  ],
  Ta: [
    { value: 'unknown', label: 'Не тестировалось (рассчитать по фенотипу)' },
    { value: 'TaTa', label: 'Ta/Ta (Тикированный гомозигота)' },
    { value: 'Tatb', label: 'Ta/tb (Тикированный, носитель мрамора)' },
    { value: 'TmTm', label: 'Tm/Tm (Тигровый гомозигота)' },
    { value: 'Tmtb', label: 'Tm/tb (Тигровый, носитель мрамора)' },
    { value: 'spsp', label: 'sp/sp (Пятнистый гомозигота)' },
    { value: 'sptb', label: 'sp/tb (Пятнистый, носитель мрамора)' },
    { value: 'tbtb', label: 'tb/tb (Мраморный окрас)' }
  ],
  W: [
    { value: 'WW', label: 'W/W (Белый гомозигота, все дети будут белыми)' },
    { value: 'Ww', label: 'W/w (Белый гетерозигота, несет цвет)' },
    { value: 'ww', label: 'w/w (Не белый)' }
  ],
  S: [
    { value: 'SS', label: 'S/S (Много белого: Ван 01 / Арлекин 02)' },
    { value: 'Ss', label: 'S/s (Биколор 03 / С белым 09)' },
    { value: 'ss', label: 's/s (Без белого)' }
  ],
  Sh: [
    { value: 'NN', label: 'N/N (Не несет затушеванность/шиншиллу)' },
    { value: 'Nsh', label: 'N/sh (Визуально обычный, несет затушеванность 11)' },
    { value: 'Nch', label: 'N/ch (Визуально обычный, несет шиншиллу 12)' },
    { value: 'shsh', label: 'sh/sh (Затушеванный окрас 11)' },
    { value: 'shch', label: 'sh/ch (Затушеванный 11, несет шиншиллу 12)' },
    { value: 'chch', label: 'ch/ch (Шиншилла / Шелл 12)' }
  ]
};

export const deriveGenotypeFromPhenotype = (
  color, hasSilver, pattern, whiteSpot, sex,
  knowHidden, hiddenColor, hiddenSilver, hiddenPattern, hiddenWhiteSpot,
  calcMode
) => {
  // Базовый генотип по умолчанию
  const genotype = { O: 'o', D: 'unknown', I: 'unknown', A: 'unknown', Ta: 'tbtb', W: 'ww', S: 'ss' };
  if (!color) return genotype;

  // Определение фактических признаков с учетом белого плаща (W)
  const checkColor     = (color === 'w') ? (knowHidden ? hiddenColor : 'unknown') : color;
  const checkSilver    = (color === 'w') ? (knowHidden ? hiddenSilver : hasSilver) : hasSilver;
  const checkPattern   = (color === 'w') ? (knowHidden ? hiddenPattern : pattern) : pattern;
  const checkWhiteSpot = (color === 'w') ? (knowHidden ? hiddenWhiteSpot : 'none') : whiteSpot;

  // 1. Локус W (Доминантный белый)
  genotype.W = (color === 'w') ? 'Ww' : 'ww';

  // Пограничный сценарий: скрытый окрас белого животного полностью неизвестен
  if (checkColor === 'unknown') {
    genotype.O = 'unknown'; genotype.D = 'unknown'; genotype.I = 'unknown';
    genotype.A = 'unknown'; genotype.Ta = 'unknown'; genotype.S = 'unknown';
    return genotype;
  }

  // 2. Локус O (Цвет, сцепленный с полом)
  if (sex === 'male') {
    genotype.O = (checkColor === 'd' || checkColor === 'e') ? 'O' : 'o';
  } else {
    if (checkColor === 'd' || checkColor === 'e') genotype.O = 'OO';
    else if (checkColor === 'f' || checkColor === 'g') genotype.O = 'Oo';
    else genotype.O = 'oo';
  }

  // 3. Локус D (Осветление)
  if (checkColor === 'a' || checkColor === 'e' || checkColor === 'g') {
    genotype.D = 'dd';
  } else {
    genotype.D = 'unknown'; 
  }

  // 4. Локус I (Серебро)
  genotype.I = checkSilver ? 'unknown' : 'ii';

  // 5. Локусы A (Агути) и Ta (Рисунок)
  if (checkPattern === 'solid') {
    // Проверяем, есть ли в родословной 11/12 (это маркер носительства агути)
    // Для этого нужно передать родословную в функцию, но пока упрощаем:
    // Если у солида есть серебро (дым) — он может нести агути
    if (checkSilver) {
      genotype.A = 'Aa'; // Дымный солид потенциально несёт агути
    } else {
      genotype.A = 'aa'; // Обычный солид
    }
    genotype.Ta = 'unknown';
  } else if (checkPattern === '11' || checkPattern === '12') {
    // 11 и 12 — это АГУТИ с wide band!
    genotype.A = 'unknown'; // Агути (может быть AA или Aa)
    
    // Предполагаем тикированный как базовый рисунок
    if (calcMode === 'conservative') {
      genotype.Ta = 'TaTa';
    } else {
      genotype.Ta = 'Tatb';
    }
  } else {
    genotype.A = 'unknown';
    
    if (calcMode === 'conservative') {
      if (checkPattern === '25') genotype.Ta = 'TaTa';
      else if (checkPattern === '23') genotype.Ta = 'TmTm';
      else if (checkPattern === '24') genotype.Ta = 'spsp';
      else genotype.Ta = 'tbtb';
    } else {
      if (checkPattern === '25') genotype.Ta = 'Tatb';
      else if (checkPattern === '23') genotype.Ta = 'Tmtb';
      else if (checkPattern === '24') genotype.Ta = 'sptb';
      else genotype.Ta = 'tbtb';
    }
  }

  // 6. Локус S (Белая пятнистость)
  if (checkWhiteSpot === '01' || checkWhiteSpot === '02') genotype.S = 'SS';
  else if (checkWhiteSpot === '03' || checkWhiteSpot === '09') genotype.S = 'Ss';
  else genotype.S = 'ss';

  // 7. Локус Sh (Wide Band) — определяется по коду рисунка 11/12
  if (checkPattern === '11') {
    genotype.Sh = 'shsh'; // Затушеванный = гомозигота по wide band
  } else if (checkPattern === '12') {
    genotype.Sh = 'chch'; // Шиншилла = гомозигота по шиншилле
  } else {
    genotype.Sh = 'NN'; // Обычный окрас = без wide band
  }

  return genotype;
};

// ==========================================
// ГЕНЕТИЧЕСКИЙ ДВИЖОК
// ==========================================

export const interpretKittenGenotype = (sex, locusO, locusD, locusI, locusA, locusTa, locusW, locusS, locusSh) => {
  // 1. ПРОВЕРКА НА ПОЛНЫЙ БЕЛЫЙ ОКРАС (Локус W)
  if (locusW.includes('W')) {
    return { code: 'MCO w', name: 'Белый' };
  }

  const isDiluted = locusD[0] === 'd' && locusD[1] === 'd';
  let colorCode = 'n';
  let colorName = 'Черный';
  let isRedSeries = false;

  if (sex === 'male') {
    const oAllele = locusO[0];
    if (oAllele === 'O') {
      colorCode = isDiluted ? 'e' : 'd';
      colorName = isDiluted ? 'Кремовый' : 'Красный';
      isRedSeries = true;
    } else {
      colorCode = isDiluted ? 'a' : 'n';
      colorName = isDiluted ? 'Голубой' : 'Черный';
    }
  } else {
    const hasBigO = locusO.includes('O');
    const hasSmallO = locusO.includes('o');

    if (hasBigO && hasSmallO) {
      colorCode = isDiluted ? 'g' : 'f';
      colorName = isDiluted ? 'Голубокремовый' : 'Черепаховый';
    } else if (hasBigO && !hasSmallO) {
      colorCode = isDiluted ? 'e' : 'd';
      colorName = isDiluted ? 'Кремовый' : 'Красный';
      isRedSeries = true;
    } else {
      colorCode = isDiluted ? 'a' : 'n';
      colorName = isDiluted ? 'Голубой' : 'Черный';
    }
  }

  const isTabby = locusA.some(allele => allele.includes('A'));
  const isSilver = locusI.some(allele => allele.includes('I'));

  // 3. АНАЛИЗ ГЕНОВ ШИРОКОЙ ПОЛОСЫ (Локус Sh)
  const shCount = locusSh.filter(x => x === 'sh').length;
  const chCount = locusSh.filter(x => x === 'ch').length;
  
  let emsPattern = '';
  let patternName = 'солид';
  
  // Эффект Wide Band (11/12) физически проявляется ТОЛЬКО если котенок Агути (табби) И на Серебре!
  const isVisualShaded = isTabby && isSilver && (shCount === 2 || chCount === 2 || (shCount === 1 && chCount === 1));

  if (isTabby) {
    if (isVisualShaded) {
      if (chCount === 2) {
        emsPattern = ' 12';
        patternName = isRedSeries ? 'шелл камео' : 'шиншилла';
      } else {
        emsPattern = ' 11';
        patternName = isRedSeries ? 'затушеванный камео' : 'затушеванный';
      }
    } else {
      // Стандартный разбор табби-рисунков
      const taWeights = { 'Ta': 1, 'Tm': 2, 'sp': 3, 'tb': 4, '?': 5 };
      const sortedTa = [...locusTa].sort((x, y) => taWeights[x] - taWeights[y]);
      const dominantTa = sortedTa[0];
      if (dominantTa === 'Ta') { emsPattern = ' 25'; patternName = 'тикированный'; }
      else if (dominantTa === 'Tm') { emsPattern = ' 23'; patternName = 'тигровый'; }
      else if (dominantTa === 'sp') { emsPattern = ' 24'; patternName = 'пятнистый'; }
      else { emsPattern = ' 22'; patternName = 'мраморный'; }
    }
  }

  // 4. РАСЧЕТ БЕЛОЙ ПЯТНИСТОСТИ (Локус S)
  let emsWhite = '';
  let whiteName = '';
  const bigSCount = locusS.filter(x => x === 'S').length;

  if (bigSCount === 2) {
    emsWhite = ' 02';
    whiteName = ' арлекин';
  } else if (bigSCount === 1) {
    emsWhite = ' 03';
    whiteName = ' биколор';
  }

  // 5. СБОРКА EMS И РУССКОГО НАЗВАНИЯ
  let finalCode = `MCO ${colorCode}${isSilver ? 's' : ''}${emsPattern}${emsWhite}`;
  let finalName = '';

  if (isVisualShaded) {
    if (colorCode === 'f' || colorCode === 'g') {
      finalName = `Серебристый ${colorName.toLowerCase()} ${patternName}`;
    } else {
      finalName = isRedSeries 
        ? `${colorName} ${patternName}` 
        : `Серебристый ${colorName.toLowerCase()} ${patternName}`;
    }
  } else if (isTabby) {
    finalName = isSilver ? `Серебристый ${colorName.toLowerCase()} ${patternName}` : `${colorName} ${patternName}`;
  } else {
    finalName = isSilver ? `${colorName} дымный` : `${colorName} солид`;
  }

  if (emsWhite) {
    finalName += whiteName;
  }

  return { code: finalCode, name: finalName };
};

// ==========================================
// ФУНКЦИЯ НАЗНАЧЕНИЯ МАРКЕРОВ (БАДЖЕЙ)
// ==========================================
/**
 * Назначает маркер-бейдж для окраса котенка на основе покомпонентного генетического анализа.
 * Каждый признак (осветление, солид, теплота) проверяется независимо.
 */
/**
 * Назначает маркер-бейдж для окраса котенка.
 * Исправлено: проверяет, может ли визуально доминантный родитель без теста заблокировать признак.
 */
export const assignBadge = (kitten, fatherPheno, motherPheno, calcMode) => {
  const kCode = kitten.code;
  const kParts = kCode.replace('MCO ', '').split(' ');
  const kColorAndSilver = kParts[0] || '';
  
  const kColor = kColorAndSilver.replace('s', '');
  const kHasSilver = kColorAndSilver.includes('s');
  
  const kHasPattern = kParts.some(p => ['11', '12', '22', '23', '24', '25'].includes(p));
  const kIsDiluted = ['a', 'e', 'g'].includes(kColor);

  const isFatherDense = ['n', 'd'].includes(fatherPheno.color);
  const isMotherDense = ['n', 'd', 'f'].includes(motherPheno.color);
  
  const isFatherTabby = fatherPheno.pattern !== 'solid' && fatherPheno.color !== 'w';
  const isMotherTabby = motherPheno.pattern !== 'solid' && motherPheno.color !== 'w';
  
  const isFatherSilver = fatherPheno.silver && fatherPheno.color !== 'w';
  const isMotherSilver = motherPheno.silver && motherPheno.color !== 'w';

  // ШАГ 1: ПРОВЕРКА КАЖДОГО ПРИЗНАКА НА ВОЗМОЖНОСТЬ СКРЫТОГО БЛОКИРОВАНИЯ
  
  // ОСВЕТЛЕНИЕ (d): котёнок осветлён, но хотя бы один визуально плотный родитель без теста может быть гомозиготой DD
  const locusDRequiresCarrier = kIsDiluted && (
    (isFatherDense && !fatherPheno.hasTests) || 
    (isMotherDense && !motherPheno.hasTests)
  );
  
  // РИСУНОК (A): котёнок солид, но хотя бы один визуально табби родитель без теста может быть гомозиготой AA
  const locusARequiresCarrier = !kHasPattern && (
    (isFatherTabby && !fatherPheno.hasTests) || 
    (isMotherTabby && !motherPheno.hasTests)
  ) && kColor !== 'w';
  
  // СЕРЕБРО (I): котёнок тёплый, но хотя бы один визуально серебристый родитель без теста может быть гомозиготой II
  const locusIRequiresCarrier = !kHasSilver && (
    (isFatherSilver && !fatherPheno.hasTests) || 
    (isMotherSilver && !motherPheno.hasTests)
  ) && kColor !== 'w';

  // Вспомогательная функция для определения статуса локуса
  const getLocusStatus = (requiresCarrier) => {
    if (!requiresCarrier) return 'guaranteed';
    if (calcMode === 'conservative') {
      return 'theoretical'; // Без тестов — теоретическое выщепление
    } else {
      return 'carrierBoth'; // В расширенном режиме показываем как требующее носительства
    }
  };

  const statusD = getLocusStatus(locusDRequiresCarrier);
  const statusA = getLocusStatus(locusARequiresCarrier);
  const statusI = getLocusStatus(locusIRequiresCarrier);

  // Исключение для белого окраса
  if (kitten.percent === -1 && (kColor === 'w' || fatherPheno.color === 'w' || motherPheno.color === 'w')) {
    return 'theoretical';
  }

  // ИЕРАРХИЯ СТРОГОСТИ: theoretical > carrierBoth > guaranteed
  if (statusD === 'theoretical' || statusA === 'theoretical' || statusI === 'theoretical') {
    return 'theoretical';
  }
  
  if (statusD === 'carrierBoth' || statusA === 'carrierBoth' || statusI === 'carrierBoth') {
    return 'carrierBoth';
  }

  return 'guaranteed';
};

// ==========================================
// ФУНКЦИЯ ПРИМЕНЕНИЯ БАЛЛЬНОЙ СИСТЕМЫ WIDE BAND
// ==========================================
/**
 * Применяет балльную систему Wide Band к результатам расчёта
 * @param {Array} results - Массив результатов расчёта
 * @param {number} totalScore - Сумма баллов Wide Band обоих родителей
 * @returns {Array} Обновлённый массив результатов с 11/12
 */
const applyWideBandSystem = (results, totalScore) => {
  // Если массив пустой — выходим
  if (results.length === 0) return results;
  
  // Определяем, работаем ли с точными процентами или с "Возможен"
  const hasExactPercent = results[0].percent !== -1;
  
  // 1. Определяем пороги по сумме баллов
  let percent11 = 0, percent12 = 0, tier = 'none';
  
  if (totalScore >= 10) {
    percent11 = 10; percent12 = 5; tier = 'high';
  } else if (totalScore >= 6) {
    percent11 = 12.5; percent12 = 2.5; tier = 'medium';
  } else if (totalScore >= 3) {
    percent11 = 2.5; percent12 = 0; tier = 'low';
  } else {
    return results; // 0-2 балла: 11/12 невозможны
  }
  
  console.log(`🎨 Wide Band: уровень ${tier}, 11=${percent11}%, 12=${percent12}%`);
  
  // 2. Находим дымов (с серебром, без рисунка) и агути с серебром
  const smokeIndices = [];
  const tabbyIndices = [];
  
  results.forEach((k, idx) => {
    if (k.code === 'MCO w') return; // Белых не трогаем
    const parts = k.code.replace('MCO ', '').split(' ');
    const hasPattern = parts.some(p => ['22', '23', '24', '25'].includes(p));
    const hasSilver = parts[0].includes('s');
    
    if (hasPattern && hasSilver) tabbyIndices.push(idx);
    else if (!hasPattern && hasSilver) smokeIndices.push(idx);
  });
  
  if (tabbyIndices.length === 0) {
    console.log('⚠️ Нет агути с серебром — 11/12 не могут появиться');
    return results;
  }
  
  // 3. Уменьшаем дымов на 15 процентных пунктов
  const newResults = results.map(k => ({...k}));
  let freedFromSmoke = 0;
  
  smokeIndices.forEach(idx => {
    const k = newResults[idx];
    if (hasExactPercent) {
      const reduction = Math.min(15, k.percent);
      freedFromSmoke += reduction;
      k.percent = parseFloat((k.percent - reduction).toFixed(1));
    } else {
      // Для "Возможен" просто помечаем как изменённый
      freedFromSmoke += 1; // условная единица
    }
  });
  
  console.log(`📉 Забрали у дымов: ${freedFromSmoke.toFixed(1)}%`);
  
  // 4. Для высокого шанса забираем 20% у рисунков
  let freedFromTabby = 0;
  if (tier === 'high') {
    tabbyIndices.forEach(idx => {
      const k = newResults[idx];
      if (hasExactPercent) {
        const reduction = k.percent * 0.20;
        freedFromTabby += reduction;
        k.percent = parseFloat((k.percent - reduction).toFixed(1));
      } else {
        freedFromTabby += 1;
      }
    });
    console.log(`📉 Забрали у рисунков: ${freedFromTabby.toFixed(1)}%`);
  }
  
  // 5. Создаём записи для 11 и 12
    const totalTabbyPercent = hasExactPercent 
    ? tabbyIndices.reduce((sum, idx) => sum + newResults[idx].percent, 0)
    : tabbyIndices.length; // условная единица для "Возможен"
  
  const createShadedEntry = (kitten, shadedCode, shadedName) => {
    const parts = kitten.code.replace('MCO ', '').split(' ');
    const colorSilver = parts[0];
    const whiteSpot = parts.find(p => ['01', '02', '03', '09'].includes(p)) || '';
    const newCode = `MCO ${colorSilver} ${shadedCode}${whiteSpot ? ' ' + whiteSpot : ''}`.trim();
    
    let newName = kitten.name
      .replace('мраморный', shadedName)
      .replace('тигровый', shadedName)
      .replace('пятнистый', shadedName)
      .replace('тикированный', shadedName);
    
    return { code: newCode, name: newName, percent: 0, badge: 'wideBand' };
  };
  
  const shadedEntries = [];
  
  // Создаём 11
  if (percent11 > 0 && tabbyIndices.length > 0) {
    tabbyIndices.forEach(idx => {
      const k = newResults[idx];
      const entry = createShadedEntry(k, '11', 'затушеванный');
      entry.percent = hasExactPercent 
        ? parseFloat((percent11 / tabbyIndices.length).toFixed(1))
        : -1; // "Возможен"
      if (!hasExactPercent || entry.percent > 0) {
        shadedEntries.push(entry);
      }
    });
  }
  
  // Создаём 12
  if (percent12 > 0 && tabbyIndices.length > 0) {
    tabbyIndices.forEach(idx => {
      const k = newResults[idx];
      const entry = createShadedEntry(k, '12', 'шиншилла');
      entry.percent = hasExactPercent 
        ? parseFloat((percent12 / tabbyIndices.length).toFixed(1))
        : -1; // "Возможен"
      if (!hasExactPercent || entry.percent > 0) {
        shadedEntries.push(entry);
      }
    });
  }
  
  console.log(`✨ Создано записей 11/12: ${shadedEntries.length}`);
  
  // 6. Возвращаем остаток рисункам (только для точных процентов)
  if (hasExactPercent) {
    const usedForShaded = percent11 + percent12;
    const totalFreed = freedFromSmoke + freedFromTabby;
    const remainder = totalFreed - usedForShaded;
    
    if (remainder > 0 && totalTabbyPercent > 0) {
      tabbyIndices.forEach(idx => {
        const k = newResults[idx];
        const proportion = k.percent / totalTabbyPercent;
        const addition = parseFloat((remainder * proportion).toFixed(1));
        k.percent = parseFloat((k.percent + addition).toFixed(1));
      });
    }
  }
  
  // 7. Добавляем записи 11/12 и фильтруем
  return [...newResults, ...shadedEntries].filter(k => k.percent > 0 || k.percent === -1);
};


// ==========================================
// ФУНКЦИИ СОХРАНЕНИЯ ВЯЗОК
// ==========================================

/**
 * Сохраняет вязку в localStorage
 */
const saveMating = (name, fatherData, motherData) => {
  const mating = {
    id: Date.now(),
    name: name || `Вязка ${new Date().toLocaleDateString('ru-RU')}`,
    date: new Date().toISOString(),
    father: fatherData,
    mother: motherData
  };
  
  const savedMatings = JSON.parse(localStorage.getItem('catMatings') || '[]');
  savedMatings.unshift(mating); // Добавляем в начало
  
  // Ограничиваем до 10 вязок
  if (savedMatings.length > 10) {
    savedMatings.pop();
  }
  
  localStorage.setItem('catMatings', JSON.stringify(savedMatings));
  return mating;
};

/**
 * Загружает все сохранённые вязки
 */
const getSavedMatings = () => {
  return JSON.parse(localStorage.getItem('catMatings') || '[]');
};

/**
 * Удаляет вязку по ID
 */
const deleteMating = (id) => {
  const savedMatings = getSavedMatings();
  const filtered = savedMatings.filter(m => m.id !== id);
  localStorage.setItem('catMatings', JSON.stringify(filtered));
  return filtered;
};


/**
 * Скачивает вязку в JSON файл
 */
const downloadMating = (mating) => {
  const fileName = `Вязка_${mating.name.replace(/\s+/g, '_')}_${new Date(mating.date).toLocaleDateString('ru-RU').replace(/\./g, '-')}.json`;
  const jsonStr = JSON.stringify(mating, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Формирует текст для шаринга
 */
const generateShareText = (results, fatherEms, motherEms) => {
  let text = `🧬 Генетический расчёт окрасов Мейн-кун\n\n`;
  text += `👨 ПАПА: ${fatherEms.ems} (${fatherEms.fullName})\n`;
  text += `👩 МАМА: ${motherEms.ems} (${motherEms.fullName})\n\n`;
  
  if (results.wideBandScore > 0) {
    text += `✨ Баллы Wide Band: ${results.wideBandScore}\n`;
    if (results.wideBandScore >= 10) {
      text += `👑 Высокий шанс затушеванных котят!\n`;
    } else if (results.wideBandScore >= 6) {
      text += `🔥 Средний шанс затушеванных котят\n`;
    } else if (results.wideBandScore >= 3) {
      text += `📈 Низкий шанс затушеванных котят\n`;
    }
    text += `\n`;
  }
  
  text += `♂️ КОТЫ:\n`;
  results.males.slice(0, 5).forEach(k => {
    const percent = k.percent === -1 ? 'Возможен' : `${k.percent}%`;
    text += `  ${k.code} — ${percent}\n`;
  });
  
  text += `\n♀️ КОШКИ:\n`;
  results.females.slice(0, 5).forEach(k => {
    const percent = k.percent === -1 ? 'Возможен' : `${k.percent}%`;
    text += `  ${k.code} — ${percent}\n`;
  });
  
  text += `\n🔗 Рассчитано в калькуляторе MCO: https://vk.com/mcowcf`;
  
  return text;
};

// ==========================================
// ОСНОВНОЙ КОМПОНЕНТ HOME
// ==========================================
export const Home = ({ id }) => {
  // Состояния для ОТЦА
  const [fatherColor, setFatherColor] = useState('n');
  const [fatherSilver, setFatherSilver] = useState(false);
  const [fatherPattern, setFatherPattern] = useState('solid');
  const [fatherWhiteSpot, setFatherWhiteSpot] = useState('none');
  const [fatherHasTests, setFatherHasTests] = useState(false);
  const [fatherGenotype, setFatherGenotype] = useState({
    O: 'o', D: 'DD', I: 'ii', A: 'aa', Ta: 'unknown', W: 'ww', S: 'ss', Sh: 'NN'
  });

  // Состояния для скрытого окраса белого кота
  const [fatherKnowHidden, setFatherKnowHidden] = useState(false);
  const [fatherHiddenColor, setFatherHiddenColor] = useState('n');
  const [fatherHiddenSilver, setFatherHiddenSilver] = useState(false);
  const [fatherHiddenPattern, setFatherHiddenPattern] = useState('solid');
  const [fatherHiddenWhiteSpot, setFatherHiddenWhiteSpot] = useState('none');

  // Состояния для предков папы (родословная) - текстовые коды
  const [showFatherPedigree, setShowFatherPedigree] = useState(false);
  const [fatherFatherCode, setFatherFatherCode] = useState('');
  const [fatherMotherCode, setFatherMotherCode] = useState('');
  const [fatherFatherFatherCode, setFatherFatherFatherCode] = useState('');
  const [fatherFatherMotherCode, setFatherFatherMotherCode] = useState('');
  const [fatherMotherFatherCode, setFatherMotherFatherCode] = useState('');
  const [fatherMotherMotherCode, setFatherMotherMotherCode] = useState('');

  // Состояния для предков мамы (родословная) - текстовые коды
  const [showMotherPedigree, setShowMotherPedigree] = useState(false);
  const [motherFatherCode, setMotherFatherCode] = useState('');
  const [motherMotherCode, setMotherMotherCode] = useState('');
  const [motherFatherFatherCode, setMotherFatherFatherCode] = useState('');
  const [motherFatherMotherCode, setMotherFatherMotherCode] = useState('');
  const [motherMotherFatherCode, setMotherMotherFatherCode] = useState('');
  const [motherMotherMotherCode, setMotherMotherMotherCode] = useState('');

  // Состояния для МАТЕРИ
  const [motherColor, setMotherColor] = useState('n');
  const [motherSilver, setMotherSilver] = useState(false);
  const [motherPattern, setMotherPattern] = useState('solid');
  const [motherWhiteSpot, setMotherWhiteSpot] = useState('none');
  const [motherHasTests, setMotherHasTests] = useState(false);
  const [motherGenotype, setMotherGenotype] = useState({
    O: 'oo', D: 'DD', I: 'ii', A: 'aa', Ta: 'unknown', W: 'ww', S: 'ss', Sh: 'NN'
  });

  // Состояния для скрытого окраса белой кошки
  const [motherKnowHidden, setMotherKnowHidden] = useState(false);
  const [motherHiddenColor, setMotherHiddenColor] = useState('n');
  const [motherHiddenSilver, setMotherHiddenSilver] = useState(false);
  const [motherHiddenPattern, setMotherHiddenPattern] = useState('solid');
  const [motherHiddenWhiteSpot, setMotherHiddenWhiteSpot] = useState('none');

  const [results, setResults] = useState(null);
  const [showLegend, setShowLegend] = useState(false);

  const [calcMode, setCalcMode] = useState('conservative'); // 'conservative' или 'expanded'
  const [savedMatings, setSavedMatings] = useState([]);
  const [showSavedMatings, setShowSavedMatings] = useState(false);
  const [matingName, setMatingName] = useState('');
  const fileInputRef = React.useRef(null);

  /**
   * Загружает вязку из JSON файла
   */
  const loadMatingFromFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rawData = JSON.parse(e.target.result);
        
        // Очищаем ключи от пробелов
        const cleanObject = (obj) => {
          const cleaned = {};
          for (const [key, value] of Object.entries(obj)) {
            const cleanKey = key.trim();
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              cleaned[cleanKey] = cleanObject(value);
            } else {
              cleaned[cleanKey] = typeof value === 'string' ? value.trim() : value;
            }
          }
          return cleaned;
        };
        
        const mating = cleanObject(rawData);
        
        console.log('📂 Загруженная вязка:', mating);
        
        if (!mating.father || !mating.mother) {
          alert('❌ Неверный формат файла!');
          return;
        }
        
        // Загружаем данные папы
        setFatherColor(mating.father.color || 'n');
        setFatherSilver(mating.father.silver || false);
        setFatherPattern(mating.father.pattern || 'solid');
        setFatherWhiteSpot(mating.father.whiteSpot || 'none');
        setFatherHasTests(mating.father.hasTests || false);
        if (mating.father.genotype) {
          setFatherGenotype(mating.father.genotype);
        }
        if (mating.father.pedigree) {
          setFatherFatherCode(mating.father.pedigree.father || '');
          setFatherMotherCode(mating.father.pedigree.mother || '');
          setFatherFatherFatherCode(mating.father.pedigree.fatherOfFather || '');
          setFatherFatherMotherCode(mating.father.pedigree.motherOfFather || '');
          setFatherMotherFatherCode(mating.father.pedigree.fatherOfMother || '');
          setFatherMotherMotherCode(mating.father.pedigree.motherOfMother || '');
        }
        
        // Загружаем данные мамы
        setMotherColor(mating.mother.color || 'n');
        setMotherSilver(mating.mother.silver || false);
        setMotherPattern(mating.mother.pattern || 'solid');
        setMotherWhiteSpot(mating.mother.whiteSpot || 'none');
        setMotherHasTests(mating.mother.hasTests || false);
        if (mating.mother.genotype) {
          setMotherGenotype(mating.mother.genotype);
        }
        if (mating.mother.pedigree) {
          setMotherFatherCode(mating.mother.pedigree.father || '');
          setMotherMotherCode(mating.mother.pedigree.mother || '');
          setMotherFatherFatherCode(mating.mother.pedigree.fatherOfFather || '');
          setMotherFatherMotherCode(mating.mother.pedigree.motherOfFather || '');
          setMotherMotherFatherCode(mating.mother.pedigree.fatherOfMother || '');
          setMotherMotherMotherCode(mating.mother.pedigree.motherOfMother || '');
        }
        
        // Добавляем в сохранённые вязки
        const currentMatings = JSON.parse(localStorage.getItem('catMatings') || '[]');
        const matingWithId = { ...mating, id: Date.now() };
        currentMatings.unshift(matingWithId);
        localStorage.setItem('catMatings', JSON.stringify(currentMatings));
        setSavedMatings(currentMatings);
        
        alert('✅ Вязка загружена из файла!');
      } catch (err) {
        console.error('Ошибка загрузки файла:', err);
        alert('❌ Ошибка чтения файла: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

    // Функция сохранения в красивый PDF-отчёт
  const handleSavePDF = () => {
    if (!results) return;

    const date = new Date().toLocaleDateString('ru-RU');
    
    // Формируем красивый текст для печати
    let printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Расчёт окрасов Мейн-кун</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 30px; color: #333; max-width: 800px; margin: 0 auto; }
          h1 { text-align: center; color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 15px; }
          .date { text-align: center; color: #7f8c8d; margin-bottom: 25px; }
          .parents { display: flex; gap: 20px; margin-bottom: 30px; }
          .parent { flex: 1; padding: 15px; border-radius: 10px; }
          .dad { background: #e3f2fd; border-left: 4px solid #2196f3; }
          .mom { background: #fce4ec; border-left: 4px solid #e91e63; }
          .parent-title { font-weight: bold; font-size: 16px; margin-bottom: 5px; }
          .ems { font-family: monospace; font-size: 20px; font-weight: bold; margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #f5f5f5; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; }
          td { padding: 10px 12px; border-bottom: 1px solid #eee; }
          .badge { display: inline-block; width: 14px; height: 14px; border-radius: 50%; margin-right: 8px; vertical-align: middle; }
          .green { background: #4caf50; }
          .yellow { background: #ffc107; }
          .blue { background: #2196f3; }
          .purple { background: #9c27b0; }
          .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 15px; }
          @media print { 
            body { padding: 10px; }
            /* Принудительно сохраняем фоновые цвета при печати */
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
          }
        </style>
      </head>
      <body>
        <h1>🧬 Генетический расчёт окрасов Мейн-кун</h1>
        <div class="date">Дата расчёта: ${date}</div>
        
        <div class="parents">
          <div class="parent dad">
            <div class="parent-title">♂️ ПАПА</div>
            <div class="ems">${fatherEms.ems}</div>
            <div>${fatherEms.fullName}</div>
          </div>
          <div class="parent mom">
            <div class="parent-title">♀️ МАМА</div>
            <div class="ems">${motherEms.ems}</div>
            <div>${motherEms.fullName}</div>
          </div>
        </div>

        ${results.wideBandScore > 0 ? `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 20px; border-radius: 10px; margin: 20px 0;">
          <div style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">🧬 Баллы Wide Band — ген широкой полосы (затушеванность)</div>
          <div style="display: flex; gap: 30px; font-size: 15px;">
            <div> Папа: <b>${results.wideBandScore - (results.motherWideBandScore || 0)}</b> баллов</div>
            <div>👩 Мама: <b>${results.motherWideBandScore || 0}</b> баллов</div>
            <div style="font-size: 18px;">✨ Итого: <b>${results.wideBandScore}</b> баллов</div>
          </div>
          <div style="margin-top: 10px; font-size: 13px; opacity: 0.9;">
            ${results.wideBandScore >= 10 ? '👑 Высокий шанс: линия закреплена, возможны шиншиллы (12)' : 
              results.wideBandScore >= 6 ? '🔥 Средний шанс: интенсивная работа с серебром в питомнике' : 
              results.wideBandScore >= 3 ? '📈 Низкий шанс: редкое выщепление затушеванных' : 
              '❌ Шанс минимальный: полигенов Wide Band (гена широкой полосы) недостаточно'}
          </div>
        </div>
        ` : ''}

        <h2>♂️ Коты</h2>
        <table>
          <tr><th>Код</th><th>Название</th><th>Вероятность</th></tr>
          ${results.males.map(k => {
            const badgeClass = k.badge === 'guaranteed' ? 'green' : k.badge === 'carrierBoth' ? 'blue' : k.badge === 'wideBand' ? 'purple' : 'yellow';
            return `<tr><td><span class="badge ${badgeClass}"></span><b>${k.code}</b></td><td>${k.name}</td><td>${k.percent === -1 ? 'Возможен' : k.percent + '%'}</td></tr>`;
          }).join('')}
        </table>

        <h2>♀️ Кошки</h2>
        <table>
          <tr><th>Код</th><th>Название</th><th>Вероятность</th></tr>
          ${results.females.map(k => {
            const badgeClass = k.badge === 'guaranteed' ? 'green' : k.badge === 'carrierBoth' ? 'blue' : k.badge === 'wideBand' ? 'purple' : 'yellow';
            return `<tr><td><span class="badge ${badgeClass}"></span><b>${k.code}</b></td><td>${k.name}</td><td>${k.percent === -1 ? 'Возможен' : k.percent + '%'}</td></tr>`;
          }).join('')}
        </table>

        <div class="footer">Сгенерировано калькулятором окрасов Мейн-кун • https://vk.com/mcowcf</div>
      </body>
      </html>
    `;

    // Открываем новое окно для печати
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Ждём загрузки стилей и запускаем печать
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Загружаем сохранённые вязки при старте
  useEffect(() => {
    setSavedMatings(getSavedMatings());
  }, []);
  
  // Сброс pattern с 11/12 на solid, если сняли серебро
  useEffect(() => {
    if (!fatherSilver && (fatherPattern === '11' || fatherPattern === '12')) {
      setFatherPattern('solid');
    }
  }, [fatherSilver, fatherPattern]);

  // Сброс генотипа серебра на ii, если сняли чекбокс серебра
  useEffect(() => {
    if (!fatherSilver && fatherGenotype.I !== 'ii') {
      setFatherGenotype(prev => ({ ...prev, I: 'ii' }));
    }
  }, [fatherSilver]);

  // Синхронизация генотипа отца с фенотипом (без тестов)
  useEffect(() => {
    if (!fatherHasTests) {
      const derived = deriveGenotypeFromPhenotype(
        fatherColor, fatherSilver, fatherPattern, fatherWhiteSpot, 'male',
        fatherKnowHidden, fatherHiddenColor, fatherHiddenSilver, fatherHiddenPattern, fatherHiddenWhiteSpot,
        calcMode
      );
      setFatherGenotype(prev => ({ ...prev, ...derived }));
    }
  }, [fatherColor, fatherSilver, fatherPattern, fatherWhiteSpot, fatherHasTests, fatherKnowHidden, fatherHiddenColor, fatherHiddenSilver, fatherHiddenPattern, fatherHiddenWhiteSpot, calcMode]);
  
  // Загружаем сохранённые вязки при старте
  useEffect(() => {
    setSavedMatings(getSavedMatings());
  }, []);
  
  // Сброс pattern с 11/12 на solid, если сняли серебро
  useEffect(() => {
    if (!motherSilver && (motherPattern === '11' || motherPattern === '12')) {
      setMotherPattern('solid');
    }
  }, [motherSilver, motherPattern]);

  // Сброс генотипа серебра на ii, если сняли чекбокс серебра
  useEffect(() => {
    if (!motherSilver && motherGenotype.I !== 'ii') {
      setMotherGenotype(prev => ({ ...prev, I: 'ii' }));
    }
  }, [motherSilver]);

  // Синхронизация генотипа матери с фенотипом (без тестов)
  useEffect(() => {
    if (!motherHasTests) {
      const derived = deriveGenotypeFromPhenotype(
        motherColor, motherSilver, motherPattern, motherWhiteSpot, 'female',
        motherKnowHidden, motherHiddenColor, motherHiddenSilver, motherHiddenPattern, motherHiddenWhiteSpot,
        calcMode
      );
      setMotherGenotype(prev => ({ ...prev, ...derived }));
    }
  }, [motherColor, motherSilver, motherPattern, motherWhiteSpot, motherHasTests, motherKnowHidden, motherHiddenColor, motherHiddenSilver, motherHiddenPattern, motherHiddenWhiteSpot, calcMode]);

  // Вычисляем EMS для отображения
  const fatherEms = getEmsFromPhenotype(fatherColor, fatherSilver, fatherPattern, fatherWhiteSpot);
  const motherEms = getEmsFromPhenotype(motherColor, motherSilver, motherPattern, motherWhiteSpot);

  const handleFatherGenotypeChange = (locus, value) => {
    setFatherGenotype(prev => ({ ...prev, [locus]: value }));
  };

  const handleMotherGenotypeChange = (locus, value) => {
    setMotherGenotype(prev => ({ ...prev, [locus]: value }));
  };

const calculate = () => {
  // Считаем баллы Wide Band для папы и мамы
  const fatherWideBandScore = calculatePedigreeScore(
    `${fatherColor}${fatherSilver ? 's' : ''} ${fatherPattern}`.trim(),
    fatherFatherCode,
    fatherMotherCode,
    fatherFatherFatherCode,
    fatherFatherMotherCode,
    fatherMotherFatherCode,
    fatherMotherMotherCode
  );
  
  const motherWideBandScore = calculatePedigreeScore(
    `${motherColor}${motherSilver ? 's' : ''} ${motherPattern}`.trim(),
    motherFatherCode,
    motherMotherCode,
    motherFatherFatherCode,
    motherFatherMotherCode,
    motherMotherFatherCode,
    motherMotherMotherCode
  );
  
  const totalWideBandScore = fatherWideBandScore + motherWideBandScore;
  
  console.log(`📊 Баллы Wide Band: Папа=${fatherWideBandScore}, Мама=${motherWideBandScore}, Итого=${totalWideBandScore}`);
  
  // Умный парсер локусов с поддержкой "широкого спектра"
  const parseLocusWithSpectrum = (genotypeStr, locusName, sex) => {
    console.log("parseLocusWithSpectrum вызвана с:", genotypeStr, locusName);
    
    // Защита от undefined
    if (genotypeStr === undefined || genotypeStr === null) {
      console.warn(`⚠️ Локус ${locusName} не определён, возвращаем дефолтные аллели`);
      return ['?'];
    }
    
    // Специальная обработка для локуса Sh (аллели разной длины: N, sh, ch)
    if (locusName === 'Sh' && genotypeStr !== 'unknown') {
      const alleles = [];
      let i = 0;
      while (i < genotypeStr.length) {
        if (genotypeStr[i] === 's' && genotypeStr[i+1] === 'h') {
          alleles.push('sh'); i += 2;
        } else if (genotypeStr[i] === 'c' && genotypeStr[i+1] === 'h') {
          alleles.push('ch'); i += 2;
        } else if (genotypeStr[i] === 'N') {
          alleles.push('N'); i += 1;
        } else {
          i++; // защита от бесконечного цикла
        }
      }
      console.log("Результат парсинга Sh:", alleles);
      return alleles;
    }
    
    if (genotypeStr !== 'unknown') {

      // Для разных локусов разная длина аллелей
      let step = 2; // По умолчанию 2 символа (Ta, Tm, sp, tb, Ss)
      if (locusName === 'A') step = 1; // Аллели A и a — 1 символ
      if (locusName === 'D') step = 1; // Аллели D и d — 1 символ
      if (locusName === 'I') step = 1; // Аллели I и i — 1 символ
      if (locusName === 'S') step = 1; 
      
      const result = [];
      for (let i = 0; i < genotypeStr.length; i += step) {
        result.push(genotypeStr.substring(i, i + step));
      }
      console.log("Результат парсинга для", locusName, ":", result);
      return result;
    }

    // Если значение 'unknown', возвращаем все возможные аллели для мейн-кунов
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

  // Фенотипы для анализа бейджей (визуальные признаки, без ДНК)
  const fatherPheno = {
    color: fatherColor,
    silver: fatherSilver,
    pattern: fatherPattern,
    whiteSpot: fatherWhiteSpot,
    hasTests: fatherHasTests
  };

  const motherPheno = {
    color: motherColor,
    silver: motherSilver,
    pattern: motherPattern,
    whiteSpot: motherWhiteSpot,
    hasTests: motherHasTests
  };

  // Определяем, нужен ли точный процент или широкий спектр
  const showExactPercent = (
    fatherGenotype.O !== 'unknown' &&
    motherGenotype.O !== 'unknown' &&
    fatherGenotype.A !== 'unknown' &&
    motherGenotype.A !== 'unknown' &&
    fatherGenotype.D !== 'unknown' &&
    motherGenotype.D !== 'unknown' &&
    fatherGenotype.I !== 'unknown' &&
    motherGenotype.I !== 'unknown' &&
    fatherGenotype.Ta !== 'unknown' &&
    motherGenotype.Ta !== 'unknown' &&
    fatherGenotype.S !== 'unknown' &&
    motherGenotype.S !== 'unknown'
  );

  // Парсим локусы с поддержкой широкого спектра
  const fatherD = parseLocusWithSpectrum(fatherGenotype.D, 'D');
  const motherD = parseLocusWithSpectrum(motherGenotype.D, 'D');
  const fatherI = parseLocusWithSpectrum(fatherGenotype.I, 'I');
  const motherI = parseLocusWithSpectrum(motherGenotype.I, 'I');
  const fatherA = parseLocusWithSpectrum(fatherGenotype.A, 'A');
  const motherA = parseLocusWithSpectrum(motherGenotype.A, 'A');

  // ========== ЛОГИ ПОСЛЕ ОБЪЯВЛЕНИЯ ПЕРЕМЕННЫХ ==========
  console.log("=== ПАРСИНГ A ===");
  console.log("fatherGenotype.A:", fatherGenotype.A);
  console.log("motherGenotype.A:", motherGenotype.A);
  console.log("fatherA после парсинга:", fatherA);
  console.log("motherA после парсинга:", motherA);
  // ========== КОНЕЦ ЛОГОВ ==========

  const fatherTa = parseLocusWithSpectrum(fatherGenotype.Ta, 'Ta');
  const motherTa = parseLocusWithSpectrum(motherGenotype.Ta, 'Ta');
  const fatherW = fatherGenotype.W.split('');
  const motherW = motherGenotype.W.split('');
  const fatherS = parseLocusWithSpectrum(fatherGenotype.S, 'S');
  const motherS = parseLocusWithSpectrum(motherGenotype.S, 'S');
  const fatherSh = parseLocusWithSpectrum(fatherGenotype.Sh, 'Sh');
  const motherSh = parseLocusWithSpectrum(motherGenotype.Sh, 'Sh');
  
  // Локус O для отца
  let fatherO = [];
  if (fatherGenotype.O === 'unknown') {
    fatherO = ['O', 'o']; // Кот не знает, какой он под белым: красный или черный
  } else if (fatherHasTests) {
    fatherO = [fatherGenotype.O];
  } else {
    fatherO = (fatherColor === 'd' || fatherColor === 'e') ? ['O'] : ['o'];
  }

  // Локус O для матери
  let motherO = [];
  if (motherGenotype.O === 'unknown') {
    motherO = ['O', 'o']; // Кошка под белым может нести оба гена (быть черепахой)
  } else if (motherHasTests) {
    motherO = motherGenotype.O.split('');
  } else {
    if (motherColor === 'd' || motherColor === 'e') motherO = ['O', 'O'];
    else if (motherColor === 'f' || motherColor === 'g') motherO = ['O', 'o'];
    else motherO = ['o', 'o'];
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

                              // Сыновья
                              for (const mO of motherO) {
                                const phenotype = interpretKittenGenotype('male', [mO], combD, combI, combA, combTa, combW, combS, combSh);
                                maleKittensRaw.push(phenotype);
                              }

                              // Дочери
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

  const processGroup = (rawKittens, fatherPheno, motherPheno, calcMode, wideBandScore) => {
    const total = rawKittens.length;
    if (total === 0) return [];

    const counts = {};
    rawKittens.forEach(k => {
      const key = `${k.code}|${k.name}`;
      counts[key] = (counts[key] || 0) + 1;
    });

    let results = Object.keys(counts).map(key => {
      const [code, name] = key.split('|');
      const count = counts[key];
      const percent = showExactPercent ? parseFloat(((count / total) * 100).toFixed(1)) : -1;
      
      // Создаём базовый объект котёнка
      const kitten = { code, name, percent };
      
      // Добавляем бейдж
      kitten.badge = assignBadge(kitten, fatherPheno, motherPheno, calcMode);
      
      return kitten;
    });

    // Применяем балльную систему Wide Band
    if (wideBandScore > 0) {
      results = applyWideBandSystem(results, wideBandScore);
    }

    return results.sort((a, b) => b.percent - a.percent);
  };

  setResults({
    males: processGroup(maleKittensRaw, fatherPheno, motherPheno, calcMode, totalWideBandScore),
    females: processGroup(femaleKittensRaw, fatherPheno, motherPheno, calcMode, totalWideBandScore),
    isEstimated: !showExactPercent,
    wideBandScore: totalWideBandScore,
    fatherWideBandScore: fatherWideBandScore,
    motherWideBandScore: motherWideBandScore
  });
};

  const fatherColors = [
    { value: 'n', label: 'Черный' },
    { value: 'a', label: 'Голубой' },
    { value: 'd', label: 'Красный' },
    { value: 'e', label: 'Кремовый' },
    { value: 'w', label: 'Белый' }
  ];

  const motherColors = [
    { value: 'n', label: 'Черный' },
    { value: 'a', label: 'Голубой' },
    { value: 'd', label: 'Красный' },
    { value: 'e', label: 'Кремовый' },
    { value: 'f', label: 'Черепаховый' },
    { value: 'g', label: 'Голубокремовый' },
    { value: 'w', label: 'Белый' }
  ];

const patternOptions = [
  { value: 'solid', label: 'Без рисунка (солид)' },
  { value: '22', label: '22 (Мраморный)' },
  { value: '23', label: '23 (Тигровый)' },
  { value: '24', label: '24 (Пятнистый)' },
  { value: '25', label: '25 (Тикированный)' },
  { value: '11', label: '11 (Затушеванный)' },
  { value: '12', label: '12 (Шиншилла)' }
];

  const whiteSpotOptions = [
    { value: 'none', label: 'Нет белого' },
    { value: '01', label: '01 (Ван)' },
    { value: '02', label: '02 (Арлекин)' },
    { value: '03', label: '03 (Биколор)' },
    { value: '09', label: '09 (С белым)' }
  ];

  const isFatherWhite = fatherColor === 'w';
  const isMotherWhite = motherColor === 'w';

return (
  <Panel 
    id={id} 
    style={{ 
      backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${bgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      minHeight: '100vh',
      paddingBottom: 40
    }}
  >
    <PanelHeader separator={false}>
      <div style={{ 
        fontSize: 'clamp(20px, 6vw, 28px)',
        fontWeight: 'bold', 
        color: 'var(--vkui--color_text_primary)',
        padding: '12px 16px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        🧬 Калькулятор MCO
      </div>
    </PanelHeader>

    {/* ========================================== */}
    {/* СООБЩЕНИЕ О ТЕСТИРОВАНИИ - УДАЛИТЬ ПОТОМ! */}
    {/* ========================================== */}
    <Div style={{ 
      marginTop: 8, 
      marginBottom: 3, 
      padding: '10px 12px',
      backgroundColor: 'var(--vkui--color_background_secondary)', 
      borderRadius: '8px'
    }}>
      <Text style={{ fontSize: 13, color: 'var(--vkui--color_text_secondary)', lineHeight: '18px' }}>
        🔵 <b>Калькулятор в режиме тестирования</b>
      </Text>
    </Div>

    </Div>
    {/* ========================================== */}

    {/* КНОПКА ЗАГРУЗИТЬ ИЗ ФАЙЛА - В НАЧАЛЕ СТРАНИЦЫ */}
    <Div style={{ marginTop: 3, marginBottom: 8 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            loadMatingFromFile(e.target.files[0]);
            e.target.value = '';
          }
        }}
      />
      <Button 
        size="l" 
        stretched 
        mode="primary"
        appearance="accent"
        onClick={() => fileInputRef.current?.click()}
        style={{ height: 50, fontSize: 16 }}
      >
        Загрузить вязку из файла
      </Button>
    </Div>
    
      {/* БЛОК ПАПЫ */}
      <Group header={<Header mode="primary">♂️ Папа (Кот)</Header>} style={{ backgroundColor: 'transparent' }}>
        <Card mode="shadow" style={{ backgroundColor: 'var(--vkui--color_background_content)', borderRadius: 12, margin: 8, padding: 8 }}>
                  <Checkbox checked={fatherHasTests} onChange={e => setFatherHasTests(e.target.checked)} style={{ marginBottom: 12 }}>
                    <span style={{ fontWeight: 'bold' }}>У папы есть результаты ДНК-тестов</span>
                  </Checkbox>

                  <FormItem top="Базовый визуальный цвет">
            <RadioGroup>
              {fatherColors.map(opt => (
                <Radio key={opt.value} value={opt.value} checked={fatherColor === opt.value} onChange={() => setFatherColor(opt.value)}>
                  {opt.label}
                </Radio>
              ))}
            </RadioGroup>
          </FormItem>

          <FormItem>
            <Checkbox checked={fatherSilver} onChange={e => setFatherSilver(e.target.checked)} disabled={isFatherWhite}>
              Есть серебро или дым (s)
            </Checkbox>
          </FormItem>

          <FormItem top="Визуальный тип рисунка">
            <RadioGroup>
              {patternOptions.map(opt => {
                // 11 и 12 доступны ТОЛЬКО с серебром
                const isShadedCode = opt.value === '11' || opt.value === '12';
                const isDisabled = isFatherWhite || (isShadedCode && !fatherSilver);
                return (
                  <Radio key={opt.value} value={opt.value} checked={fatherPattern === opt.value} onChange={() => setFatherPattern(opt.value)} disabled={isDisabled}>
                    {opt.label}
                  </Radio>
                );
              })}
            </RadioGroup>
          </FormItem>

          <FormItem top="Белая пятнистость (01-09)">
            <RadioGroup>
              {whiteSpotOptions.map(opt => (
                <Radio key={opt.value} value={opt.value} checked={fatherWhiteSpot === opt.value} onChange={() => setFatherWhiteSpot(opt.value)} disabled={isFatherWhite}>
                  {opt.label}
                </Radio>
              ))}
            </RadioGroup>
          </FormItem>

          {/* БЛОК ДЛЯ БЕЛОГО ОКРАСА */}
          {isFatherWhite && (
            <Div style={{ marginTop: 12, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
              <Checkbox checked={fatherKnowHidden} onChange={e => setFatherKnowHidden(e.target.checked)} style={{ fontWeight: '500' }}>
                Я знаю скрытый окрас под белым
              </Checkbox>

              {!fatherKnowHidden && (
                <Text style={{ fontSize: 12, color: '#818c99', marginTop: 8 }}>
                  ℹ️ Калькулятор рассчитает максимально широкий спектр всех теоретически возможных цветных котят.
                </Text>
              )}

              {fatherKnowHidden && (
                <Div style={{ padding: '8px 0 0 0' }}>
                  <FormItem top="Скрытый базовый цвет">
                    <RadioGroup>
                      <Radio value="n" checked={fatherHiddenColor === 'n'} onChange={() => setFatherHiddenColor('n')}>Черный</Radio>
                      <Radio value="a" checked={fatherHiddenColor === 'a'} onChange={() => setFatherHiddenColor('a')}>Голубой</Radio>
                      <Radio value="d" checked={fatherHiddenColor === 'd'} onChange={() => setFatherHiddenColor('d')}>Красный</Radio>
                      <Radio value="e" checked={fatherHiddenColor === 'e'} onChange={() => setFatherHiddenColor('e')}>Кремовый</Radio>
                    </RadioGroup>
                  </FormItem>
                  <FormItem>
                    <Checkbox checked={fatherHiddenSilver} onChange={e => setFatherHiddenSilver(e.target.checked)}>
                      Скрытое серебро / дым
                    </Checkbox>
                  </FormItem>
                  <FormItem top="Скрытый тип рисунка">
                    <RadioGroup>
                      <Radio value="solid" checked={fatherHiddenPattern === 'solid'} onChange={() => setFatherHiddenPattern('solid')}>Солид (без рисунка)</Radio>
                      <Radio value="22" checked={fatherHiddenPattern === '22'} onChange={() => setFatherHiddenPattern('22')}>Мраморный (22)</Radio>
                      <Radio value="23" checked={fatherHiddenPattern === '23'} onChange={() => setFatherHiddenPattern('23')}>Тигровый (23)</Radio>
                      <Radio value="24" checked={fatherHiddenPattern === '24'} onChange={() => setFatherHiddenPattern('24')}>Пятнистый (24)</Radio>
                      <Radio value="25" checked={fatherHiddenPattern === '25'} onChange={() => setFatherHiddenPattern('25')}>Тикированный (25)</Radio>
                    </RadioGroup>
                  </FormItem>
                  <FormItem top="Скрытая белая пятнистость">
                    <RadioGroup>
                      <Radio value="none" checked={fatherHiddenWhiteSpot === 'none'} onChange={() => setFatherHiddenWhiteSpot('none')}>Нет белого</Radio>
                      <Radio value="01" checked={fatherHiddenWhiteSpot === '01'} onChange={() => setFatherHiddenWhiteSpot('01')}>Ван (01)</Radio>
                      <Radio value="02" checked={fatherHiddenWhiteSpot === '02'} onChange={() => setFatherHiddenWhiteSpot('02')}>Арлекин (02)</Radio>
                      <Radio value="03" checked={fatherHiddenWhiteSpot === '03'} onChange={() => setFatherHiddenWhiteSpot('03')}>Биколор (03)</Radio>
                      <Radio value="09" checked={fatherHiddenWhiteSpot === '09'} onChange={() => setFatherHiddenWhiteSpot('09')}>С белым (09)</Radio>
                    </RadioGroup>
                  </FormItem>
                </Div>
              )}
            </Div>
          )}

          <Text weight="2" style={{ marginTop: 12, marginBottom: 8, fontSize: 15, color: 'var(--vkui--color_text_primary)' }}>
            ️🟢 Окрас кота: <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{fatherEms.ems}</span> ({fatherEms.fullName})
          </Text>

          {/* КНОПКА-СПОЙЛЕР ДЛЯ РОДОСЛОВНОЙ ПАПЫ */}
          <Button
            mode="tertiary"
            size="m"
            onClick={() => setShowFatherPedigree(!showFatherPedigree)}
            stretched
            style={{ marginTop: 8, justifyContent: 'flex-start' }}
          >
            {showFatherPedigree ? '🔼 Скрыть родословную' : '🔽 Указать родословную (дедушки и бабушки)'}
          </Button>

          {/* БЛОК РОДОСЛОВНОЙ ПАПЫ */}
          {showFatherPedigree && (
            <Div style={{ marginTop: 12, padding: 12, backgroundColor: 'var(--vkui--color_background_secondary)', borderRadius: 8 }}>
              <Text weight="2" style={{ marginBottom: 12, fontSize: 14, color: 'var(--vkui--color_text_primary)' }}>
                📜 Введите EMS-коды предков (например: ns 22, gs 25, n, as 12 03)
              </Text>

              {/* ОТЕЦ ПАПЫ */}
              <FormItem top="👴 Отец папы (дед котят):" style={{ marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder="ns 22"
                  value={fatherFatherCode}
                  onChange={(e) => setFatherFatherCode(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--vkui--color_border)', fontSize: '14px' }}
                />
              </FormItem>

              {/* МАТЬ ПАПЫ */}
              <FormItem top="👵 Мать папы (бабка котят):" style={{ marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder="ns 22"
                  value={fatherMotherCode}
                  onChange={(e) => setFatherMotherCode(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--vkui--color_border)', fontSize: '14px' }}
                />
              </FormItem>

              {/* ДЕД ПО ОТЦУ ПАПЫ */}
              <FormItem top="👴👴 Дед по отцу папы (прадед котят):" style={{ marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder="ns 22"
                  value={fatherFatherFatherCode}
                  onChange={(e) => setFatherFatherFatherCode(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--vkui--color_border)', fontSize: '14px' }}
                />
              </FormItem>

              {/* БАБКА ПО ОТЦУ ПАПЫ */}
              <FormItem top="👵👵 Бабка по отцу папы (прабабка котят):" style={{ marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder="ns 22"
                  value={fatherFatherMotherCode}
                  onChange={(e) => setFatherFatherMotherCode(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--vkui--color_border)', fontSize: '14px' }}
                />
              </FormItem>

              {/* ДЕД ПО МАТЕРИ ПАПЫ */}
              <FormItem top="👴 Дед по матери папы (прадед котят):" style={{ marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder="ns 22"
                  value={fatherMotherFatherCode}
                  onChange={(e) => setFatherMotherFatherCode(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--vkui--color_border)', fontSize: '14px' }}
                />
              </FormItem>

              {/* БАБКА ПО МАТЕРИ ПАПЫ */}
              <FormItem top="👵👵 Бабка по матери папы (прабабка котят):" style={{ marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder="ns 22"
                  value={fatherMotherMotherCode}
                  onChange={(e) => setFatherMotherMotherCode(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--vkui--color_border)', fontSize: '14px' }}
                />
              </FormItem>

              {/* КНОПКА СБРОСА */}
              <Button
                mode="tertiary"
                size="s"
                onClick={() => {
                  setFatherFatherCode('');
                  setFatherMotherCode('');
                  setFatherFatherFatherCode('');
                  setFatherFatherMotherCode('');
                  setFatherMotherFatherCode('');
                  setFatherMotherMotherCode('');
                }}
                style={{ marginTop: 8 }}
              >
                🗑️ Сбросить родословную папы
              </Button>

              {/* ОТОБРАЖЕНИЕ БАЛЛОВ WIDE BAND */}
              {(fatherFatherCode || fatherMotherCode || fatherFatherFatherCode || 
                fatherFatherMotherCode || fatherMotherFatherCode || fatherMotherMotherCode) && (
                <Div style={{ marginTop: 12, padding: 8, backgroundColor: '#E3F2FD', borderRadius: 6 }}>
                  <Text style={{ fontSize: 13, color: '#1976D2' }}>
                    📊 Баллы Wide Band (ген широкой полосы) папы: <b>{calculatePedigreeScore(
                      `${fatherColor}${fatherSilver ? 's' : ''} ${fatherPattern}`.trim(),
                      fatherFatherCode,
                      fatherMotherCode,
                      fatherFatherFatherCode,
                      fatherFatherMotherCode,
                      fatherMotherFatherCode,
                      fatherMotherMotherCode
                    )}</b>
                  </Text>
                </Div>
              )}
            </Div>
          )}

          {fatherHasTests && (
            <Div style={{ padding: '8px 0 0 0' }}>
              <FormItem top="Локус Агути (A) по тестам">
                <Select value={fatherGenotype.A} onChange={(e) => handleFatherGenotypeChange('A', e.target.value)} options={GENOTYPE_OPTIONS.A} />
              </FormItem>
              <FormItem top="Локус Разбавления (D) по тестам">
                <Select value={fatherGenotype.D} onChange={(e) => handleFatherGenotypeChange('D', e.target.value)} options={GENOTYPE_OPTIONS.D} />
              </FormItem>
              <FormItem 
                top="Генотип по серебру (I) -проверка по потомству." 
                bottom={
                  !fatherSilver 
                    ? "Без серебра — генотип ii" 
                    : "Были и с серебром, и без → Ii. Всегда только серебро → II"
                }
              >
                <Select 
                  value={fatherGenotype.I} 
                  onChange={(e) => handleFatherGenotypeChange('I', e.target.value)} 
                  options={GENOTYPE_OPTIONS.I}
                  disabled={!fatherSilver}
                />
              </FormItem>
              <FormItem top="Локус Рисунка (Ta) по тестам" bottom={fatherPattern === 'solid' ? "Отец солид, но тест может выявить скрытый рисунок" : ""}>
                <Select value={fatherGenotype.Ta} onChange={(e) => handleFatherGenotypeChange('Ta', e.target.value)} options={GENOTYPE_OPTIONS.Ta} />
              </FormItem>
              <FormItem top="Локус Белого (W) по тестам">
                <Select value={fatherGenotype.W} onChange={(e) => handleFatherGenotypeChange('W', e.target.value)} options={GENOTYPE_OPTIONS.W} />
              </FormItem>
              <FormItem top="Локус Белой пятнистости (S) по тестам">
                <Select value={fatherGenotype.S} onChange={(e) => handleFatherGenotypeChange('S', e.target.value)} options={GENOTYPE_OPTIONS.S} />
              </FormItem>
            </Div>
          )}
        </Card>
      </Group>

      <Spacing size={16} />

      {/* БЛОК МАМЫ */}
      <Group header={<Header mode="primary">♀️ Мама (Кошка)</Header>} style={{ backgroundColor: 'transparent' }}>
        <Card mode="shadow" style={{ backgroundColor: 'var(--vkui--color_background_content)', borderRadius: 12, margin: 8, padding: 8 }}>
                  <Checkbox checked={motherHasTests} onChange={e => setMotherHasTests(e.target.checked)} style={{ marginBottom: 12 }}>
                    <span style={{ fontWeight: 'bold' }}>У мамы есть результаты ДНК-тестов</span>
                  </Checkbox>

                  <FormItem top="Базовый визуальный цвет">
            <RadioGroup>
              {motherColors.map(opt => (
                <Radio key={opt.value} value={opt.value} checked={motherColor === opt.value} onChange={() => setMotherColor(opt.value)}>
                  {opt.label}
                </Radio>
              ))}
            </RadioGroup>
          </FormItem>

          <FormItem>
            <Checkbox checked={motherSilver} onChange={e => setMotherSilver(e.target.checked)} disabled={isMotherWhite}>
              Есть серебро или дым (s)
            </Checkbox>
          </FormItem>

          <FormItem top="Визуальный тип рисунка">
            <RadioGroup>
              {patternOptions.map(opt => {
                const isShadedCode = opt.value === '11' || opt.value === '12';
                const isDisabled = isMotherWhite || (isShadedCode && !motherSilver);
                return (
                  <Radio key={opt.value} value={opt.value} checked={motherPattern === opt.value} onChange={() => setMotherPattern(opt.value)} disabled={isDisabled}>
                    {opt.label}
                  </Radio>
                );
              })}
            </RadioGroup>
          </FormItem>

          <FormItem top="Белая пятнистость (01-09)">
            <RadioGroup>
              {whiteSpotOptions.map(opt => (
                <Radio key={opt.value} value={opt.value} checked={motherWhiteSpot === opt.value} onChange={() => setMotherWhiteSpot(opt.value)} disabled={isMotherWhite}>
                  {opt.label}
                </Radio>
              ))}
            </RadioGroup>
          </FormItem>

          {/* БЛОК ДЛЯ БЕЛОГО ОКРАСА (МАМА) */}
          {isMotherWhite && (
            <Div style={{ marginTop: 12, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
              <Checkbox checked={motherKnowHidden} onChange={e => setMotherKnowHidden(e.target.checked)} style={{ fontWeight: '500' }}>
                Я знаю скрытый окрас под белым
              </Checkbox>

              {!motherKnowHidden && (
                <Text style={{ fontSize: 12, color: '#818c99', marginTop: 8 }}>
                  ℹ️ Калькулятор рассчитает максимально широкий спектр всех теоретически возможных цветных котят.
                </Text>
              )}

              {motherKnowHidden && (
                <Div style={{ padding: '8px 0 0 0' }}>
                  <FormItem top="Скрытый базовый цвет">
                    <RadioGroup>
                      <Radio value="n" checked={motherHiddenColor === 'n'} onChange={() => setMotherHiddenColor('n')}>Черный</Radio>
                      <Radio value="a" checked={motherHiddenColor === 'a'} onChange={() => setMotherHiddenColor('a')}>Голубой</Radio>
                      <Radio value="d" checked={motherHiddenColor === 'd'} onChange={() => setMotherHiddenColor('d')}>Красный</Radio>
                      <Radio value="e" checked={motherHiddenColor === 'e'} onChange={() => setMotherHiddenColor('e')}>Кремовый</Radio>
                      <Radio value="f" checked={motherHiddenColor === 'f'} onChange={() => setMotherHiddenColor('f')}>Черепаховый</Radio>
                      <Radio value="g" checked={motherHiddenColor === 'g'} onChange={() => setMotherHiddenColor('g')}>Голубокремовый</Radio>
                    </RadioGroup>
                  </FormItem>
                  <FormItem>
                    <Checkbox checked={motherHiddenSilver} onChange={e => setMotherHiddenSilver(e.target.checked)}>
                      Скрытое серебро / дым
                    </Checkbox>
                  </FormItem>
                  <FormItem top="Скрытый тип рисунка">
                    <RadioGroup>
                      <Radio value="solid" checked={motherHiddenPattern === 'solid'} onChange={() => setMotherHiddenPattern('solid')}>Солид (без рисунка)</Radio>
                      <Radio value="22" checked={motherHiddenPattern === '22'} onChange={() => setMotherHiddenPattern('22')}>Мраморный (22)</Radio>
                      <Radio value="23" checked={motherHiddenPattern === '23'} onChange={() => setMotherHiddenPattern('23')}>Тигровый (23)</Radio>
                      <Radio value="24" checked={motherHiddenPattern === '24'} onChange={() => setMotherHiddenPattern('24')}>Пятнистый (24)</Radio>
                      <Radio value="25" checked={motherHiddenPattern === '25'} onChange={() => setMotherHiddenPattern('25')}>Тикированный (25)</Radio>
                    </RadioGroup>
                  </FormItem>
                  <FormItem top="Скрытая белая пятнистость">
                    <RadioGroup>
                      <Radio value="none" checked={motherHiddenWhiteSpot === 'none'} onChange={() => setMotherHiddenWhiteSpot('none')}>Нет белого</Radio>
                      <Radio value="01" checked={motherHiddenWhiteSpot === '01'} onChange={() => setMotherHiddenWhiteSpot('01')}>Ван (01)</Radio>
                      <Radio value="02" checked={motherHiddenWhiteSpot === '02'} onChange={() => setMotherHiddenWhiteSpot('02')}>Арлекин (02)</Radio>
                      <Radio value="03" checked={motherHiddenWhiteSpot === '03'} onChange={() => setMotherHiddenWhiteSpot('03')}>Биколор (03)</Radio>
                      <Radio value="09" checked={motherHiddenWhiteSpot === '09'} onChange={() => setMotherHiddenWhiteSpot('09')}>С белым (09)</Radio>
                    </RadioGroup>
                  </FormItem>
                </Div>
              )}
            </Div>
          )}

          <Text weight="2" style={{ marginTop: 12, marginBottom: 8, fontSize: 15, color: 'var(--vkui--color_text_primary)' }}>
            ️🟢 Окрас кошки: <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{motherEms.ems}</span> ({motherEms.fullName})
          </Text>

          {/* КНОПКА-СПОЙЛЕР ДЛЯ РОДОСЛОВНОЙ МАМЫ */}
          <Button
            mode="tertiary"
            size="m"
            onClick={() => setShowMotherPedigree(!showMotherPedigree)}
            stretched
            style={{ marginTop: 8, justifyContent: 'flex-start' }}
          >
            {showMotherPedigree ? ' Скрыть родословную' : ' Указать родословную (дедушки и бабушки)'}
          </Button>

          {/* БЛОК РОДОСЛОВНОЙ МАМЫ */}
          {showMotherPedigree && (
            <Div style={{ marginTop: 12, padding: 12, backgroundColor: 'var(--vkui--color_background_secondary)', borderRadius: 8 }}>
              <Text weight="2" style={{ marginBottom: 12, fontSize: 14, color: 'var(--vkui--color_text_primary)' }}>
                📜 Введите EMS-коды предков (например: ns 23, gs 25, n, ns 12 03)
              </Text>

              {/* ОТЕЦ МАМЫ */}
              <FormItem top="👴 Отец мамы (дед котят):" style={{ marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder="ns 22"
                  value={motherFatherCode}
                  onChange={(e) => setMotherFatherCode(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--vkui--color_border)', fontSize: '14px' }}
                />
              </FormItem>

              {/* МАТЬ МАМЫ */}
              <FormItem top=" Мать мамы (бабка котят):" style={{ marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder="ns 22"
                  value={motherMotherCode}
                  onChange={(e) => setMotherMotherCode(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--vkui--color_border)', fontSize: '14px' }}
                />
              </FormItem>

              {/* ДЕД ПО ОТЦУ МАМЫ */}
              <FormItem top="👴👴 Дед по отцу мамы (прадед котят):" style={{ marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder="ns 22"
                  value={motherFatherFatherCode}
                  onChange={(e) => setMotherFatherFatherCode(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--vkui--color_border)', fontSize: '14px' }}
                />
              </FormItem>

              {/* БАБКА ПО ОТЦУ МАМЫ */}
              <FormItem top="👵👵 Бабка по отцу мамы (прабабка котят):" style={{ marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder="ns 22"
                  value={motherFatherMotherCode}
                  onChange={(e) => setMotherFatherMotherCode(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--vkui--color_border)', fontSize: '14px' }}
                />
              </FormItem>

              {/* ДЕД ПО МАТЕРИ МАМЫ */}
              <FormItem top=" Дед по матери мамы (прадед котят):" style={{ marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder="ns 22"
                  value={motherMotherFatherCode}
                  onChange={(e) => setMotherMotherFatherCode(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--vkui--color_border)', fontSize: '14px' }}
                />
              </FormItem>

              {/* БАБКА ПО МАТЕРИ МАМЫ */}
              <FormItem top="👵👵 Бабка по матери мамы (прабабка котят):" style={{ marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder="ns 22"
                  value={motherMotherMotherCode}
                  onChange={(e) => setMotherMotherMotherCode(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--vkui--color_border)', fontSize: '14px' }}
                />
              </FormItem>

              {/* КНОПКА СБРОСА */}
              <Button
                mode="tertiary"
                size="s"
                onClick={() => {
                  setMotherFatherCode('');
                  setMotherMotherCode('');
                  setMotherFatherFatherCode('');
                  setMotherFatherMotherCode('');
                  setMotherMotherFatherCode('');
                  setMotherMotherMotherCode('');
                }}
                style={{ marginTop: 8 }}
              >
                🗑️ Сбросить родословную мамы
              </Button>

              {/* ОТОБРАЖЕНИЕ БАЛЛОВ WIDE BAND */}
              {(motherFatherCode || motherMotherCode || motherFatherFatherCode || 
                motherFatherMotherCode || motherMotherFatherCode || motherMotherMotherCode) && (
                <Div style={{ marginTop: 12, padding: 8, backgroundColor: '#FCE4EC', borderRadius: 6 }}>
                  <Text style={{ fontSize: 13, color: '#C2185B' }}>
                     Баллы Wide Band (ген широкой полосы) мамы:: <b>{calculatePedigreeScore(
                      `${motherColor}${motherSilver ? 's' : ''} ${motherPattern}`.trim(),
                      motherFatherCode,
                      motherMotherCode,
                      motherFatherFatherCode,
                      motherFatherMotherCode,
                      motherMotherFatherCode,
                      motherMotherMotherCode
                    )}</b>
                  </Text>
                </Div>
              )}
            </Div>
          )}

          {/* БЛОК СОХРАНЕНИЯ ВЯЗКИ — ПОСЛЕ ЗАПОЛНЕНИЯ РОДОСЛОВНОЙ */}
          <Div style={{ marginTop: 16 }}>
            <input
              type="text"
              placeholder="Название вязки (например: Агат × Барселона)"
              value={matingName}
              onChange={(e) => setMatingName(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '10px', 
                borderRadius: '8px', 
                border: '1px solid var(--vkui--color_border)', 
                fontSize: '14px',
                marginBottom: '8px'
              }}
            />
            <Button 
              size="m" 
              stretched 
              mode="secondary"
              onClick={() => {
                const fatherData = {
                  color: fatherColor,
                  silver: fatherSilver,
                  pattern: fatherPattern,
                  whiteSpot: fatherWhiteSpot,
                  hasTests: fatherHasTests,
                  genotype: fatherGenotype,
                  pedigree: {
                    father: fatherFatherCode,
                    mother: fatherMotherCode,
                    fatherOfFather: fatherFatherFatherCode,
                    motherOfFather: fatherFatherMotherCode,
                    fatherOfMother: fatherMotherFatherCode,
                    motherOfMother: fatherMotherMotherCode
                  }
                };
                
                const motherData = {
                  color: motherColor,
                  silver: motherSilver,
                  pattern: motherPattern,
                  whiteSpot: motherWhiteSpot,
                  hasTests: motherHasTests,
                  genotype: motherGenotype,
                  pedigree: {
                    father: motherFatherCode,
                    mother: motherMotherCode,
                    fatherOfFather: motherFatherFatherCode,
                    motherOfFather: motherFatherMotherCode,
                    fatherOfMother: motherMotherFatherCode,
                    motherOfMother: motherMotherMotherCode
                  }
                };
                
                saveMating(matingName, fatherData, motherData);
                setSavedMatings(getSavedMatings());
                setMatingName('');
                alert('✅ Вязка сохранена!');
              }}
            >
              ⤵️ Сохранить вязку
            </Button>
          </Div>

          {motherHasTests && (
            <Div style={{ padding: '8px 0 0 0' }}>
              <FormItem top="Локус Агути (A) по тестам">
                <Select value={motherGenotype.A} onChange={(e) => handleMotherGenotypeChange('A', e.target.value)} options={GENOTYPE_OPTIONS.A} />
              </FormItem>
              <FormItem top="Локус Разбавления (D) по тестам">
                <Select value={motherGenotype.D} onChange={(e) => handleMotherGenotypeChange('D', e.target.value)} options={GENOTYPE_OPTIONS.D} />
              </FormItem>
              <FormItem 
                top="Генотип по серебру (I) -проверка по потомству." 
                bottom={
                  !motherSilver 
                    ? "Без серебра — генотип ii" 
                    : "Были и с серебром, и без → Ii. Всегда только серебро → II"
                }
              >
                <Select 
                  value={motherGenotype.I} 
                  onChange={(e) => handleMotherGenotypeChange('I', e.target.value)} 
                  options={GENOTYPE_OPTIONS.I}
                  disabled={!motherSilver}
                />
              </FormItem>
              <FormItem top="Локус Рисунка (Ta) по тестам" bottom={motherPattern === 'solid' ? "Кошка солид, но тест может выявить скрытый рисунок" : ""}>
                <Select value={motherGenotype.Ta} onChange={(e) => handleMotherGenotypeChange('Ta', e.target.value)} options={GENOTYPE_OPTIONS.Ta} />
              </FormItem>
              <FormItem top="Локус Белого (W) по тестам">
                <Select value={motherGenotype.W} onChange={(e) => handleMotherGenotypeChange('W', e.target.value)} options={GENOTYPE_OPTIONS.W} />
              </FormItem>
              <FormItem top="Локус Белой пятнистости (S) по тестам">
                <Select value={motherGenotype.S} onChange={(e) => handleMotherGenotypeChange('S', e.target.value)} options={GENOTYPE_OPTIONS.S} />
              </FormItem>
            </Div>
          )}
        </Card>
      </Group>

      {/* ПОДСКАЗКА ДЛЯ ПОЛЬЗОВАТЕЛЯ */}
      <Div style={{ 
        marginTop: 16, 
        marginBottom: 16, 
        padding: '12px 14px', 
        backgroundColor: 'var(--vkui--color_background_secondary)', 
        borderRadius: 12,
        border: '1px solid var(--vkui--color_image_border_alpha)'
      }}>
        <Text weight="2" style={{ fontSize: 14, color: 'var(--vkui--color_text_primary)', lineHeight: '20px', marginBottom: 8 }}>
          Без ДНК-тестов доминантные окрасы рассчитываются как носители скрытых рецессивных генов. Для точного расчёта включите чекбокс «ДНК-тесты».
        </Text>
        <Text weight="1" style={{ fontSize: 13, color: 'var(--vkui--color_text_secondary)', lineHeight: '18px' }}>
          <b>Затушеванность (11/12):</b> ДНК-тестов на ген Wide Band (широкой полосы) не существует. Калькулятор анализирует родословную и считает баллы полигенов затушеванности. Чем больше баллов — тем выше шанс рождения котят 11/12. Окрасы 11/12 возможны только при наличии серебра (I-) и агути (A-).
        </Text>
        
        {/* Дополнительная подсказка, если оба родителя 11/12 */}
        {(fatherPattern === '11' || fatherPattern === '12') && (motherPattern === '11' || motherPattern === '12') && (
          <Text weight="1" style={{ fontSize: 13, color: '#1976D2', lineHeight: '18px', marginTop: 8 }}>
            💡 <b>Ваша вязка:</b> Оба родителя визуально 11/12, поэтому котята будут 11/12 по законам Менделя. Балльная система Wide Band (гена широкой полосы) важна, когда родители визуально обычные табби, но в родословной есть затушеванные предки.
          </Text>
        )}
      </Div>

      <Div>
        <Button size="l" stretched onClick={calculate} mode="primary">
          Рассчитать помет
        </Button>
      </Div>

      {/* КНОПКА ПОКАЗАТЬ СОХРАНЁННЫЕ ВЯЗКИ */}
      {savedMatings.length > 0 && (
        <Div style={{ marginTop: 8 }}>
          <Button 
            size="m" 
            stretched 
            mode="tertiary"
            onClick={() => setShowSavedMatings(!showSavedMatings)}
          >
            {showSavedMatings ? '🔼 Скрыть сохранённые вязки' : `📂 Сохранённые вязки (${savedMatings.length})`}
          </Button>
        </Div>
      )}

      {/* СПИСОК СОХРАНЁННЫХ ВЯЗОК */}
      {showSavedMatings && savedMatings.length > 0 && (
        <Div style={{ marginTop: 8, padding: 12, backgroundColor: 'var(--vkui--color_background_secondary)', borderRadius: 8 }}>
          {savedMatings.map(mating => (
            <div key={mating.id} style={{ 
              padding: '12px', 
              backgroundColor: 'var(--vkui--color_background_content)', 
              borderRadius: '8px', 
              marginBottom: '8px',
              border: '1px solid var(--vkui--color_border)'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                {mating.name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--vkui--color_text_secondary)', marginBottom: '8px' }}>
                {new Date(mating.date).toLocaleString('ru-RU')}
              </div>
              <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                👨 {mating.father.color}{mating.father.silver ? 's' : ''} {mating.father.pattern} × 
                👩 {mating.mother.color}{mating.mother.silver ? 's' : ''} {mating.mother.pattern}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Button 
                  size="s" 
                  mode="primary"
                  onClick={() => {
                    setFatherColor(mating.father.color);
                    setFatherSilver(mating.father.silver);
                    setFatherPattern(mating.father.pattern);
                    setFatherWhiteSpot(mating.father.whiteSpot);
                    setFatherHasTests(mating.father.hasTests);
                    if (mating.father.genotype) setFatherGenotype(mating.father.genotype);
                    if (mating.father.pedigree) {
                      setFatherFatherCode(mating.father.pedigree.father || '');
                      setFatherMotherCode(mating.father.pedigree.mother || '');
                      setFatherFatherFatherCode(mating.father.pedigree.fatherOfFather || '');
                      setFatherFatherMotherCode(mating.father.pedigree.motherOfFather || '');
                      setFatherMotherFatherCode(mating.father.pedigree.fatherOfMother || '');
                      setFatherMotherMotherCode(mating.father.pedigree.motherOfMother || '');
                    }
                    
                    setMotherColor(mating.mother.color);
                    setMotherSilver(mating.mother.silver);
                    setMotherPattern(mating.mother.pattern);
                    setMotherWhiteSpot(mating.mother.whiteSpot);
                    setMotherHasTests(mating.mother.hasTests);
                    if (mating.mother.genotype) setMotherGenotype(mating.mother.genotype);
                    if (mating.mother.pedigree) {
                      setMotherFatherCode(mating.mother.pedigree.father || '');
                      setMotherMotherCode(mating.mother.pedigree.mother || '');
                      setMotherFatherFatherCode(mating.mother.pedigree.fatherOfFather || '');
                      setMotherFatherMotherCode(mating.mother.pedigree.motherOfFather || '');
                      setMotherMotherFatherCode(mating.mother.pedigree.fatherOfMother || '');
                      setMotherMotherMotherCode(mating.mother.pedigree.motherOfMother || '');
                    }
                    
                    setShowSavedMatings(false);
                    alert('✅ Вязка применена к калькулятору!');
                  }}
                >
                  ✅ Применить вязку
                </Button>
                <Button 
                  size="s" 
                  mode="secondary"
                  onClick={() => downloadMating(mating)}
                >
                  📥 Скачать JSON
                </Button>
                <Button 
                  size="s" 
                  mode="secondary"
                  onClick={() => {
                    if (confirm('Удалить эту вязку?')) {
                      deleteMating(mating.id);
                      setSavedMatings(getSavedMatings());
                    }
                  }}
                >
                  🗑️ Удалить
                </Button>
              </div>
            </div>
          ))}
        </Div>
      )}

{results && (
  <Group header={<Header mode="secondary">📊 Результаты</Header>} style={{ backgroundColor: 'transparent' }}>
        
    {/* ЛЕГЕНДА МАРКЕРОВ — видна сразу, объясняет все значки */}
    <Div style={{ marginBottom: 12 }}>
      <Button 
        mode="tertiary" 
        size="s" 
        onClick={() => setShowLegend(!showLegend)} 
        stretched
        style={{ justifyContent: 'flex-start', paddingLeft: 12 }}
      >
        {showLegend ? '🔼 Скрыть расшифровку' : '🔽 Что означают значки 🟢🟡🔵🟣'}
      </Button>
      
      {showLegend && (
        <Div style={{ marginTop: 8, padding: 12, backgroundColor: '#F5F5F5', borderRadius: 8 }}>
          <Text style={{ fontSize: 13, marginBottom: 4 }}>
            <span style={{ marginRight: 6 }}>🟢</span>Гарантированно — окрас подтверждён фенотипом родителей
          </Text>
          <Text style={{ fontSize: 13, marginBottom: 4 }}>
            <span style={{ marginRight: 6 }}>🟡</span>Рецессивное выщепление — нужны ДНК-тесты для подтверждения
          </Text>
          <Text style={{ fontSize: 13, marginBottom: 4 }}>
            <span style={{ marginRight: 6 }}>🔵</span>Требует носительства — оба родителя должны быть носителями
          </Text>
          <Text style={{ fontSize: 13 }}>
            <span style={{ marginRight: 6 }}>🟣</span>Полигенное выщепление — окрасы 11/12 благодаря Wide Band (гену широкой полосы) из родословной
          </Text>
        </Div>
      )}
    </Div>

    <CardGrid size="l">
      
      {/* Коты ♂️ */}
      <Card mode="outline" style={{ backgroundColor: 'var(--vkui--color_background_content)' }}>
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 24, marginRight: 8 }}>♂️</span>
            <Title level="2">Коты</Title>
          </div>
          
          {results.males.map((kitten, idx) => {
            // Подготовка текста и иконки бейджа
            let subtitleText = "";
            let badgeIcon = "";
            
            if (kitten.badge === 'wideBand') {
              subtitleText = "Полигенное выщепление (Wide Band / ген широкой полосы из родословной)";
              badgeIcon = "";
            } else if (kitten.badge === 'theoretical') {
              const kParts = kitten.code.replace('MCO ', '').split(' ');
              const kBaseColor = kParts[0]?.replace('s', '') || '';
              const isWhiteRelated = kBaseColor === 'w' || fatherColor === 'w' || motherColor === 'w';
              
              if (isWhiteRelated) {
                subtitleText = "Широкий спектр (скрытый окрас белого родителя неизвестен)";
              } else {
                subtitleText = "Рецессивное выщепление: требуется подтверждение носительства тестами";
              }
              badgeIcon = "🟡";
            } else if (kitten.badge === 'carrierBoth') {
              subtitleText = "Возможен, только если ОБА родителя скрытые носители";
              badgeIcon = "🔵";
            } else if (kitten.badge === 'guaranteed') {
              subtitleText = "Гарантированный фенотипичный спектр вязки";
              badgeIcon = "🟢";
            }
            
            return (
              <SimpleCell key={`male-${idx}`} multiline>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {badgeIcon && <Text style={{ fontSize: 16 }}>{badgeIcon}</Text>}
                    <Text style={{ fontSize: 14, fontWeight: kitten.badge === 'carrierBoth' ? '500' : 'normal' }}>
                      {kitten.code} — {kitten.name}
                    </Text>
                  </div>
                  <Text weight="1" style={{ 
                    color: kitten.percent === -1 ? '#4CAF50' : 'var(--vkui--color_text_primary)', 
                    fontWeight: '600',
                    minWidth: 60,
                    textAlign: 'right'
                  }}>
                    {kitten.percent === -1 ? 'Возможен' : `${kitten.percent}%`}
                  </Text>
                </div>
                {subtitleText && (
                  <Text style={{ 
                    color: kitten.badge === 'carrierBoth' ? '#FF9800' : 'var(--vkui--color_text_secondary)', 
                    fontSize: 12, 
                    marginTop: 4, 
                    marginLeft: '24px' 
                  }}>
                    {subtitleText}
                  </Text>
                )}
              </SimpleCell>
            );
          })}
        </div>
      </Card>
      
      {/* Кошки ♀️ */}
      <Card mode="outline" style={{ backgroundColor: 'var(--vkui--color_background_content)' }}>
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 24, marginRight: 8 }}>♀️</span>
            <Title level="2">Кошки</Title>
          </div>
          
          {results.females.map((kitten, idx) => {
            // Подготовка текста и иконки бейджа
            let subtitleText = "";
            let badgeIcon = "";
            
            if (kitten.badge === 'wideBand') {
              subtitleText = "Полигенное выщепление (Wide Band из родословной)";
              badgeIcon = "";
            } else if (kitten.badge === 'theoretical') {
              const kParts = kitten.code.replace('MCO ', '').split(' ');
              const kBaseColor = kParts[0]?.replace('s', '') || '';
              const isWhiteRelated = kBaseColor === 'w' || fatherColor === 'w' || motherColor === 'w';
              
              if (isWhiteRelated) {
                subtitleText = "Широкий спектр (скрытый окрас белого родителя неизвестен)";
              } else {
                subtitleText = "Рецессивное выщепление: требуется подтверждение носительства тестами";
              }
              badgeIcon = "🟡";
            } else if (kitten.badge === 'carrierBoth') {
              subtitleText = "Возможен, только если ОБА родителя скрытые носители";
              badgeIcon = "🔵";
            } else if (kitten.badge === 'guaranteed') {
              subtitleText = "Гарантированный фенотипичный спектр вязки";
              badgeIcon = "🟢";
            }
            
            return (
              <SimpleCell key={`female-${idx}`} multiline>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {badgeIcon && <Text style={{ fontSize: 16 }}>{badgeIcon}</Text>}
                    <Text style={{ fontSize: 14, fontWeight: kitten.badge === 'carrierBoth' ? '500' : 'normal' }}>
                      {kitten.code} — {kitten.name}
                    </Text>
                  </div>
                  <Text weight="1" style={{ 
                    color: kitten.percent === -1 ? '#4CAF50' : 'var(--vkui--color_text_primary)', 
                    fontWeight: '600',
                    minWidth: 60,
                    textAlign: 'right'
                  }}>
                    {kitten.percent === -1 ? 'Возможен' : `${kitten.percent}%`}
                  </Text>
                </div>
                {subtitleText && (
                  <Text style={{ 
                    color: kitten.badge === 'carrierBoth' ? '#FF9800' : 'var(--vkui--color_text_secondary)', 
                    fontSize: 12, 
                    marginTop: 4, 
                    marginLeft: '24px' 
                  }}>
                    {subtitleText}
                  </Text>
                )}
              </SimpleCell>
            );
          })}
        </div>
      </Card>
      
    </CardGrid>
  </Group>
)}


      {/* КНОПКИ ДЕЙСТВИЙ — ПОСЛЕ РЕЗУЛЬТАТОВ */}
      {results && (
        <Div style={{ marginTop: 16, marginBottom: 16 }}>
          <Button
            size="l"
            stretched
            mode="primary"
            appearance="accent"
            onClick={async () => {
              const shareText = generateShareText(results, fatherEms, motherEms);
              
              if (navigator.share) {
                try {
                  await navigator.share({
                    title: 'Генетический расчёт окрасов Мейн-кун',
                    text: shareText
                  });
                } catch (err) {
                  if (err.name !== 'AbortError') {
                    navigator.clipboard.writeText(shareText);
                    alert('✅ Результат скопирован!');
                  }
                }
              } else {
                navigator.clipboard.writeText(shareText).then(() => {
                  alert('✅ Результат скопирован в буфер обмена!');
                });
              }
            }}
            style={{ height: 50, fontSize: 16, marginBottom: 8 }}
          >
            📤 Поделиться результатом
          </Button>
          
          <Button
            size="l"
            stretched
            mode="primary"
            appearance="accent"
            onClick={handleSavePDF}
            style={{ height: 50, fontSize: 16 }}
          >
            📄 Сохранить отчёт в PDF
          </Button>
        </Div>
      )}

        {/* КНОПКА ГЕНЕРАЦИИ ОТЧЁТОВ */}
        {/* <Div style={{ marginBottom: 16 }}>
          <Button
            size="m"
            stretched
            mode="outline"
            appearance="accent"
            onClick={generateReport}
            style={{ height: 40, fontSize: 14 }}
          >
            🧪 Сгенерировать 10 отчётов для проверки
          </Button>
        </Div> */}

        {/* КНОПКА ТЕСТОВ РОДОСЛОВНОЙ */}
        {/* <Div style={{ marginBottom: 16 }}>
          <Button
            size="m"
            stretched
            mode="outline"
            appearance="accent"
            onClick={runPedigreeTests}
            style={{ height: 40, fontSize: 14 }}
          >
            🧬 Тесты анализатора родословной
          </Button>
        </Div> */}

        {/* КНОПКА ТЕСТА СБОРКИ РОДОСЛОВНОЙ */}
        {/* <Div style={{ marginBottom: 16 }}>
          <Button
            size="m"
            stretched
            mode="outline"
            appearance="accent"
            onClick={testBuildPedigree}
            style={{ height: 40, fontSize: 14 }}
          >
            🧪 Тест сборки родословной
          </Button>
        </Div>*/}

</Panel> 
);      
};        