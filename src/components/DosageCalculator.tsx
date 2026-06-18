/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Medicine, Language, CartItem } from '../types';
import { MEDICINES_DATA, TRANSLATIONS } from '../data';
import { 
  Calculator, 
  AlertTriangle, 
  ShoppingCart, 
  Check, 
  ChevronDown, 
  Info, 
  Sparkles, 
  Calendar, 
  DollarSign, 
  Eye, 
  ShieldAlert, 
  TrendingDown, 
  RotateCcw 
} from 'lucide-react';
import { motion } from 'motion/react';

interface DosageCalculatorProps {
  currentLang: Language;
  onAddToCart: (medicine: Medicine, quantity: number) => void;
  cart: CartItem[];
  allMedicines?: Medicine[];
  searchQuery?: string;
}

export default function DosageCalculator({
  currentLang,
  onAddToCart,
  cart,
  allMedicines,
  searchQuery = ''
}: DosageCalculatorProps) {
  const activeMedicines = allMedicines && allMedicines.length > 0 ? allMedicines : MEDICINES_DATA;

  const filteredMedicines = searchQuery.trim()
    ? activeMedicines.filter((med) => {
        const query = searchQuery.toLowerCase();
        const nameMatch = (med.name[currentLang] || '').toLowerCase().includes(query) || 
                          (med.name['ru'] || '').toLowerCase().includes(query) || 
                          (med.name['en'] || '').toLowerCase().includes(query);
        const subMatch = (med.activeSubstance[currentLang] || '').toLowerCase().includes(query) || 
                         (med.activeSubstance['ru'] || '').toLowerCase().includes(query) || 
                         (med.activeSubstance['en'] || '').toLowerCase().includes(query);
        const catMatch = (med.category || '').toLowerCase().includes(query);
        return nameMatch || subMatch || catMatch;
      })
    : activeMedicines;
  
  const [selectedMedId, setSelectedMedId] = useState<string>(() => filteredMedicines[0]?.id || activeMedicines[0].id);

  // Auto-select first filtered item if current selection is filtered out
  useEffect(() => {
    if (searchQuery.trim() && filteredMedicines.length > 0) {
      const exists = filteredMedicines.some((m) => m.id === selectedMedId);
      if (!exists) {
        setSelectedMedId(filteredMedicines[0].id);
      }
    }
  }, [searchQuery, filteredMedicines, selectedMedId]);
  
  // Peptide Dilution Planner inputs
  const [vialMg, setVialMg] = useState<number>(5);
  const [diluentMl, setDiluentMl] = useState<number>(2);
  const [syringeType, setSyringeType] = useState<100 | 50 | 30>(100); // 100 U (1ml), 50 U (0.5ml), 30 U (0.3ml)
  const [desiredMcg, setDesiredMcg] = useState<number>(250);
  
  // Custom user schedule choice: 'daily' | 'twice_daily' | 'every_other_day' | 'weekly'
  const [frequencyMode, setFrequencyMode] = useState<'daily' | 'twice_daily' | 'every_other_day' | 'weekly'>('weekly');

  // Feedback status
  const [successMsg, setSuccessMsg] = useState<boolean>(false);

  const t = (key: string) => {
    return TRANSLATIONS[key]?.[currentLang] || key;
  };

  const selectedMed = activeMedicines.find((m) => m.id === selectedMedId) || activeMedicines[0];

  // Sync default vial weight (mg) and optimal frequency when selected medicine changes
  useEffect(() => {
    if (selectedMed) {
      setVialMg(selectedMed.mgPerUnit);
      
      // Auto-set comfortable default dosage & dosing regimen based on peptide profile
      if (selectedMed.category === 'weightloss') {
        setDesiredMcg(250);
        setFrequencyMode('weekly');
      } else if (selectedMed.id === 'bpc-157') {
        setDesiredMcg(250);
        setFrequencyMode('twice_daily');
      } else if (selectedMed.id === 'tb-500') {
        setDesiredMcg(500);
        setFrequencyMode('every_other_day');
      } else {
        setDesiredMcg(150);
        setFrequencyMode('daily');
      }
    }
  }, [selectedMedId, selectedMed]);

  // Mathematical Calculations
  const totalMcgInVial = vialMg * 1000; // 1 mg = 1000 mcg
  const concentrationMcgPerMl = totalMcgInVial / (diluentMl || 1);
  
  // On insulin syringes calibrated for U-100/U-50/U-30, 100 units = 1 ml. So 1 unit = 0.01 ml.
  // This means peptide mcg per 1 Unit (IU) of syringe volume is:
  const mcgPerUnit = concentrationMcgPerMl * 0.01; 
  
  // Syringe units to draw for corresponding desired dosage:
  const unitsToDrawRaw = mcgPerUnit > 0 ? (desiredMcg / mcgPerUnit) : 0;
  const unitsToDraw = Number(unitsToDrawRaw.toFixed(1));
  
  // In milliliters:
  const mlToDraw = Number((unitsToDraw * 0.01).toFixed(3));
  
  // Total injections in 1 vial
  const totalInjectionsPerVial = desiredMcg > 0 ? Math.floor(totalMcgInVial / desiredMcg) : 0;
  
  // Cost per injection / single shot cost
  const costPerInjection = totalInjectionsPerVial > 0 ? Math.round(selectedMed.price / totalInjectionsPerVial) : 0;

  // Lasting duration estimation based on chosen active frequency
  const calculateDuration = () => {
    if (totalInjectionsPerVial <= 0) return { count: 0, text: '' };
    
    switch (frequencyMode) {
      case 'daily':
        return { count: totalInjectionsPerVial, key: 'daysLabel' };
      case 'twice_daily':
        return { count: Math.floor(totalInjectionsPerVial / 2), key: 'daysLabel' };
      case 'every_other_day':
        return { count: totalInjectionsPerVial * 2, key: 'daysLabel' };
      case 'weekly':
        return { count: totalInjectionsPerVial, key: 'weeksLabel' };
      default:
        return { count: totalInjectionsPerVial, key: 'daysLabel' };
    }
  };

  const durationMeta = calculateDuration();

  // Constraints check and safety thresholds
  const isOverSyringeCapacity = unitsToDraw > syringeType;
  const isOverVialCapacity = desiredMcg > totalMcgInVial;

  const handleAddCalculatedToCart = () => {
    onAddToCart(selectedMed, 1);
    setSuccessMsg(true);
    setTimeout(() => setSuccessMsg(false), 3500);
  };

  const resetToOptimalDefaults = () => {
    if (selectedMed) {
      setVialMg(selectedMed.mgPerUnit);
      setDiluentMl(2);
      setSyringeType(100);
      if (selectedMed.category === 'weightloss') {
        setDesiredMcg(250);
        setFrequencyMode('weekly');
      } else {
        setDesiredMcg(250);
        setFrequencyMode('daily');
      }
    }
  };

  // Local translations overrides for advanced peptide terms
  const l = {
    vialMgLabel: {
      ru: 'Препарат во флаконе',
      en: 'Peptide Amount in Vial',
      ar: 'كمية الببتيد في الزجاجة'
    },
    diluentMlLabel: {
      ru: 'Флакон разбавителя (Стерильная вода)',
      en: 'Bacteriostatic Water Added',
      ar: 'كمية الماء المعقم المضاف'
    },
    syringeCapacityLabel: {
      ru: 'Калибровка инсулинового шприца',
      en: 'Insulin Syringe Calibration',
      ar: 'معايرة حقنة الأنسولين'
    },
    desiredMcgLabel: {
      ru: 'Желаемая доза за одну инъекцию',
      en: 'Desired Single Dosage',
      ar: 'الجرعة الفردية المطلوبة'
    },
    concentrationTitle: {
      ru: 'Концентрация раствора',
      en: 'Solution Concentration',
      ar: 'تركيز المحلول'
    },
    perUnitTitle: {
      ru: 'В 1 единице (U) шприца',
      en: 'Active substance per 1 U',
      ar: 'المادة الفعالة لكل وحدة (U)'
    },
    totalLiquidTitle: {
      ru: 'Набрать готового раствора',
      en: 'Total Liquid volume to draw',
      ar: 'حجم السائل المطلوب سحبه'
    },
    unitsToFillTitle: {
      ru: 'ОТМЕТКА НА СКАЛЕ (U / ЕДИНЦЫ)',
      en: 'UNITS TO DRAW (U on scale)',
      ar: 'الوحدات المراد سحبها (درجة U)'
    },
    warningOverSyringe: {
      ru: 'Внимание! Расчетный объем разовой дозы превосходит объем шприца. Добавьте больше жидкого разбавителя или замените шприц на больший.',
      en: 'Warning: Required volume exceeds syringe limit! Add more sterile diluent water or switch to a larger syringe volume.',
      ar: 'تحذير: الحجم المطلوب يتجاوز حد الحقنة! أضف المزيد من الماء المعقم للتخفيف أو اطلب حقنة بسعة أكبر.'
    },
    warningOverVial: {
      ru: 'Направленная разовая доза превышает весь объем пептида во флаконе!',
      en: 'Target single dose is higher than total peptide quantity in the vial!',
      ar: 'تحذير: الجرعة الفردية المطلوبة تجتاز إجمالي كمية الببتيد في القارورة!'
    },
    vialPriceLabel: {
      ru: 'Стоимость этого оригинального флакона',
      en: 'Buy this active vial unit price',
      ar: 'سعر شراء هذه القارورة الأصلية'
    },
    visualGuide: {
      ru: 'Клиническая схема разведения и забора пептида',
      en: 'Clinical Reconstitution & Draw Scale representation',
      ar: 'المخطط السريري لتخفيف وسحب الببتيد'
    },
    injectionsPerVialLabel: {
      ru: 'Всего доз (уколов) во флаконе',
      en: 'Total Injections per Vial',
      ar: 'إجمالي الحقن لكل قارورة'
    },
    costPerInjectionLabel: {
      ru: 'Себестоимость одного укола',
      en: 'Cost per Single Shot/Injection',
      ar: 'تكلفة الحقنة الواحدة'
    },
    durationLabel: {
      ru: 'Одного флакона вам хватит на',
      en: 'Single vial supply lasts',
      ar: 'تكفي القارورة الواحدة لمدة'
    },
    daysLabel: {
      ru: 'дн.',
      en: 'days',
      ar: 'أيام'
    },
    weeksLabel: {
      ru: 'нед.',
      en: 'weeks',
      ar: 'أسابيع'
    },
    howOftenLabel: {
      ru: 'Планируемый режим использования',
      en: 'Selected Administration Frequency',
      ar: 'طريقة الاستخدام الروتيني المحددة'
    },
    ruleNeverShake: {
      ru: 'Действуйте аккуратно: плавно вливайте воду во флакон по стеклянной стенке. Ни в коем случае не трясите флакон агрессивно — это разрушает пептидные белковые связи.',
      en: 'Act gently: slowly inject bacteriostatic water along the sterile vial glass wall. Forceful shaking can denature and destroy delicate peptide sequences.',
      ar: 'تعامل بلطف: احقن الماء المعقم ببطء على طول الجدار الزجاجي المعقم للقارورة. رج القارورة بقوة قد يكسر الروابط الببتيدية الحساسة ويخرب الببتيد.'
    },
    storageRule: {
      ru: 'Приготовленный жидкий препарат храните строго в холодильной камере при 2-8°C. Оберегайте от воздействия прямых солнечных лучей и яркого дневного света.',
      en: 'Reconstituted liquid solution must be stored in refrigerator at 2°C to 8°C. Shield completely from direct light, heat sources, and freezing.',
      ar: 'يرجى حفظ المحلول المجهز ببرودة الثلاجة من 2 إلى 8 درجات مئوية بشكل صارم. تجنب أشعة الشمس المباشرة والضوء الساطع.'
    },
    frequencyDaily: {
      ru: 'Ежедневно (1 раз в сутки)',
      en: 'Everyday (1 injection daily)',
      ar: 'يومياً (حقنة واحدة باليوم)'
    },
    frequencyTwiceDaily: {
      ru: '2 раза в день (утром и вечером)',
      en: '2 times a day (Morning & Night)',
      ar: 'مرتين يومياً (صباحاً ومساءً)'
    },
    frequencyOnceWeekly: {
      ru: 'Раз в неделю (стандарт для GLP-1 / похудения)',
      en: 'Once per week (GLP-1 Weightloss standard)',
      ar: 'مرة واحدة في الأسبوع (قياسي لـ GLP-1 للتخسيس)'
    },
    frequencyEveryOtherDay: {
      ru: 'Через день (Раз в 48 часов)',
      en: 'Every other day (Each 48h)',
      ar: 'يوم بعد يوم (كل 48 ساعة)'
    },
    vialVisualHeader: {
      ru: 'Флакон пептида',
      en: 'Peptide Vial Reconstitution',
      ar: 'قارورة الببتيد'
    },
    vialLiquidStatePowder: {
      ru: 'Сухой лиофилизат',
      en: 'Sterile Lyophilized Powder',
      ar: 'مسحوق جاف معقم'
    },
    vialLiquidStateDissolved: {
      ru: 'Растворенный пептид',
      en: 'Reconstituted Liquid Peptide',
      ar: 'الببتيد المحلول الجاهз'
    },
    calcResetBtn: {
      ru: 'Сбросить параметры',
      en: 'Reset to standard parameters',
      ar: 'إعادة تعيين المعايير الأساسية'
    }
  };

  const getLocalText = (key: keyof typeof l) => {
    return l[key][currentLang] || l[key]['en'];
  };

  return (
    <div className="bg-slate-50/20 rounded-3xl border border-slate-100 p-6 sm:p-8 space-y-8 shadow-xs" id="calculator-panel">
      
      {/* Header Banner showcasing calculator premium status */}
      <div className="bg-gradient-to-r from-teal-800 to-slate-900 rounded-3xl text-white p-6 sm:p-8 relative overflow-hidden shadow-lg border border-teal-700/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(20,184,166,0.15),transparent)] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-teal-300">
              <Calculator className="w-6 h-6 shrink-0" />
              <span className="text-xs font-black uppercase tracking-widest bg-teal-500/20 text-teal-300 px-3 py-1 rounded-full border border-teal-500/30">
                PRO CALIBRATION v3.5
              </span>
            </div>
            <h2 id="calc-header-title" className="text-xl sm:text-2xl font-black tracking-tight">{t('calculatorHeader')}</h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              {t('calcIntro')}
            </p>
          </div>
          <button 
            type="button" 
            onClick={resetToOptimalDefaults}
            className="self-start md:self-center px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-xl border border-white/10 flex items-center gap-1.5 transition active:scale-95 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{getLocalText('calcResetBtn')}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="calculator-grid">
        
        {/* Left Side: Inputs parameters */}
        <div className="lg:col-span-5 space-y-6 bg-white p-6 sm:p-7 rounded-3xl border border-slate-100" id="calc-controls">
          
          {/* Section subtitle */}
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-2 h-2 rounded-full bg-teal-500" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
              {currentLang === 'ru' ? 'Шаг 1: Параметры флакона и шприца' : 'Step 1: Input variables'}
            </h3>
          </div>

          {/* 1. Target Peptide Selection */}
          <div className="space-y-1.5" id="calc-med-select-box">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider">{t('selectMedicineLabel')}</label>
              {searchQuery.trim() && (
                <span className="text-[10px] text-teal-600 font-bold bg-teal-50 px-2 py-0.5 rounded-full">
                  {currentLang === 'ru' ? `Найдено: ${filteredMedicines.length}` : `Found: ${filteredMedicines.length}`}
                </span>
              )}
            </div>
            <div className="relative">
              {filteredMedicines.length === 0 ? (
                <div className="w-full bg-rose-50 border border-rose-100 rounded-xl px-4 py-3.5 text-xs font-bold text-rose-700">
                  {currentLang === 'ru' ? 'Ничего не найдено по вашему запросу' : 'No peptides matching your search'}
                </div>
              ) : (
                <>
                  <select
                    id="calc-med-select"
                    value={selectedMedId}
                    onChange={(e) => setSelectedMedId(e.target.value)}
                    className="w-full appearance-none bg-slate-50 hover:bg-slate-100/80 border border-slate-200 focus:border-teal-500 rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-800 focus:outline-none transition cursor-pointer pr-10"
                  >
                    {filteredMedicines.map((med) => (
                      <option key={med.id} value={med.id}>
                        {med.name[currentLang]} — {med.mgPerUnit} мг ({t(`cat${med.category.charAt(0).toUpperCase() + med.category.slice(1)}`)})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 2. Vial Quantity Option Button Group & Custom Slider */}
          <div className="space-y-2" id="vial-weight-box">
            <div className="flex justify-between items-center text-[11px] font-black text-slate-600 uppercase tracking-wider">
              <span>{getLocalText('vialMgLabel')}</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0.1"
                  max="100"
                  step="0.1"
                  value={vialMg || ''}
                  onChange={(e) => setVialMg(Number(e.target.value) || 0)}
                  className="w-14 px-1 py-0.5 bg-teal-50 focus:bg-white text-teal-700 rounded border border-teal-100 focus:outline-none focus:ring-1 focus:ring-teal-500 text-xs font-black text-center"
                />
                <span className="text-[10px] text-teal-700 font-bold lowercase">мг</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[2, 5, 10, 15].map((mg) => (
                <button
                  key={mg}
                  type="button"
                  onClick={() => setVialMg(mg)}
                  className={`py-2 rounded-lg text-xs font-extrabold border transition ${
                    vialMg === mg
                      ? 'bg-teal-600 border-teal-600 text-white shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/70'
                  }`}
                >
                  {mg} mg
                </button>
              ))}
            </div>
            <input
              id="calc-vial-range"
              type="range"
              min="1"
              max="30"
              step="1"
              value={vialMg}
              onChange={(e) => setVialMg(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-teal-600 focus:outline-none"
            />
          </div>

          {/* 3. Reconstitution liquid (diluent added) */}
          <div className="space-y-2" id="diluent-ml-box">
            <div className="flex justify-between items-center text-[11px] font-black text-slate-600 uppercase tracking-wider">
              <span>{getLocalText('diluentMlLabel')}</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0.1"
                  max="50"
                  step="0.1"
                  value={diluentMl || ''}
                  onChange={(e) => setDiluentMl(Number(e.target.value) || 0)}
                  className="w-14 px-1 py-0.5 bg-teal-50 focus:bg-white text-teal-700 rounded border border-teal-100 focus:outline-none focus:ring-1 focus:ring-teal-500 text-xs font-black text-center"
                />
                <span className="text-[10px] text-teal-700 font-bold lowercase">мл</span>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 1.5, 2, 3, 5].map((ml) => (
                <button
                  key={ml}
                  type="button"
                  onClick={() => setDiluentMl(ml)}
                  className={`py-2 rounded-lg text-xs font-extrabold border transition ${
                    diluentMl === ml
                      ? 'bg-teal-600 border-teal-600 text-white shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/70'
                  }`}
                >
                  {ml} ml
                </button>
              ))}
            </div>
            <input
              id="calc-diluent-range"
              type="range"
              min="0.5"
              max="10"
              step="0.5"
              value={diluentMl}
              onChange={(e) => setDiluentMl(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-teal-600 focus:outline-none"
            />
          </div>

          {/* 4. Insulin Syringe Capacity Choice */}
          <div className="space-y-2" id="syringe-type-box">
            <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block">
              {getLocalText('syringeCapacityLabel')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'U-100 (1.0 ml)', value: 100 },
                { label: 'U-50 (0.5 ml)', value: 50 },
                { label: 'U-30 (0.3 ml)', value: 30 }
              ].map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSyringeType(s.value as 100 | 50 | 30)}
                  className={`py-3 px-1.5 rounded-xl text-xs font-black border transition flex flex-col items-center justify-center gap-1 ${
                    syringeType === s.value
                      ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-[11px]">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 5. Desired Single Dosage in Micrograms */}
          <div className="space-y-3 pt-2" id="desired-mcg-box">
            <div className="flex justify-between items-center text-[11px] font-black text-slate-600 uppercase tracking-wider">
              <span>{getLocalText('desiredMcgLabel')}</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  max="10000"
                  step="10"
                  value={desiredMcg || ''}
                  onChange={(e) => setDesiredMcg(Number(e.target.value) || 0)}
                  className="w-16 px-1 py-0.5 bg-teal-50 focus:bg-white text-teal-700 rounded border border-teal-100 focus:outline-none focus:ring-1 focus:ring-teal-500 text-xs font-black text-center"
                />
                <span className="text-[10px] text-teal-700 font-bold lowercase">мкг</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-1.5">
              {[100, 250, 500, 750, 1000, 1500].map((dosage) => (
                <button
                  key={dosage}
                  type="button"
                  onClick={() => setDesiredMcg(dosage)}
                  className={`px-3 py-2 rounded-lg text-xs font-extrabold border transition ${
                    desiredMcg === dosage
                      ? 'bg-teal-600 border-teal-600 text-white shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/70'
                  }`}
                >
                  {dosage} mcg
                </button>
              ))}
            </div>

            <input
              id="calc-dosage-range"
              type="range"
              min="20"
              max="2500"
              step="10"
              value={desiredMcg}
              onChange={(e) => setDesiredMcg(Number(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-teal-600 focus:outline-none"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-bold tracking-tight select-none px-0.5">
              <span>20 мкг</span>
              <span>1000 мкг</span>
              <span>2500 мкг</span>
            </div>
          </div>

          {/* 6. Frequency Planning */}
          <div className="space-y-3 pt-2 border-t border-slate-100" id="frequency-mode-box">
            <div className="flex justify-between items-center text-[11px] font-black text-slate-600 uppercase tracking-wider">
              <span>{getLocalText('howOftenLabel')}</span>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              {[
                { value: 'weekly', text: getLocalText('frequencyOnceWeekly') },
                { value: 'daily', text: getLocalText('frequencyDaily') },
                { value: 'twice_daily', text: getLocalText('frequencyTwiceDaily') },
                { value: 'every_other_day', text: getLocalText('frequencyEveryOtherDay') }
              ].map((item) => (
                <label 
                  key={item.value} 
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition select-none ${
                    frequencyMode === item.value 
                      ? 'bg-teal-50/40 border-teal-500/30 text-teal-900 shadow-2xs' 
                      : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="calc-frequency"
                    value={item.value}
                    checked={frequencyMode === item.value}
                    onChange={() => setFrequencyMode(item.value as any)}
                    className="mt-0.5 accent-teal-600 h-3.5 w-3.5 shrink-0"
                  />
                  <span>{item.text}</span>
                </label>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Dynamic calculations + Interactive visual simulator */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-7 rounded-3xl border border-slate-100 flex flex-col justify-between space-y-6" id="calc-results">
          
          <div className="space-y-6">
            
            {/* Header section with icon linking Step 2 */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-600" />
                <h3 id="calc-results-title" className="text-xs font-black text-slate-800 uppercase tracking-widest">
                  {t('calcResultsTitle')}
                </h3>
              </div>
              <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md font-bold uppercase shrink-0">
                {currentLang === 'ru' ? 'Живой расчет' : 'Real-time'}
              </span>
            </div>

            {/* Calculations metrics matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Concentration */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider leading-relaxed">
                  {getLocalText('concentrationTitle')}
                </span>
                <p id="concentration-factor" className="text-sm font-black text-slate-800">
                  {(concentrationMcgPerMl / 1000).toFixed(2)} мг/мл <span className="text-[10px] font-medium text-slate-400">({concentrationMcgPerMl.toLocaleString()} мкг/мл)</span>
                </p>
              </div>

              {/* Peptide per Unit */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider leading-relaxed">
                  {getLocalText('perUnitTitle')}
                </span>
                <p id="mcg-per-unit" className="text-sm font-black text-teal-700">
                  {mcgPerUnit.toFixed(1)} мкг / mcg
                </p>
              </div>

              {/* Liquid ml to draw */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider leading-relaxed">
                  {getLocalText('totalLiquidTitle')}
                </span>
                <p id="target-ml-draw" className="text-base font-black text-slate-800">
                  {mlToDraw} мл / ml <span className="text-[10px] text-slate-400 font-medium">({(mlToDraw * 1000).toFixed(0)} мкл)</span>
                </p>
              </div>

              {/* Volume scale pointer crucial U! */}
              <div className="bg-teal-50 p-4 rounded-2xl border border-teal-500/10 space-y-1 shadow-2xs">
                <span className="text-[10px] text-teal-800 font-extrabold block uppercase tracking-wider">
                  {getLocalText('unitsToFillTitle')}
                </span>
                <p id="target-units-draw" className="text-xl sm:text-2xl font-black text-teal-900 flex items-baseline gap-1 animate-pulse">
                  <span>{unitsToDraw}</span>
                  <span className="text-[10px] font-bold uppercase text-teal-700">{currentLang === 'ru' ? 'ЕДИНИЦ' : currentLang === 'ar' ? 'وحدات' : 'Units'} (U)</span>
                </p>
              </div>

            </div>

            {/* ADRESSED INPUT: "ПОЖАЛУЙСТА ДОБАВЬ УКОЛЫ ПРИ РАСЧЁТЕ" -> NEW INJECTIONS COUNT & ECONOMIC CONSOLE INDEX CARD */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-5 border border-slate-850 space-y-4 shadow-md" id="dosage-injections-breakdown">
              
              <div className="flex items-center gap-1.5 border-b border-white/5 pb-2">
                <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  {currentLang === 'ru' ? 'Показатели расхода и уколов' : 'Injections & Duration Profile'}
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* 1. Total injections in vial */}
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">
                    {getLocalText('injectionsPerVialLabel')}
                  </span>
                  <p className="text-lg font-black text-white flex items-baseline gap-1" id="vial-total-shots-metric">
                    <span>{totalInjectionsPerVial}</span>
                    <span className="text-[10px] text-teal-400 font-bold">{currentLang === 'ru' ? 'уколов' : 'shots'}</span>
                  </p>
                </div>

                {/* 2. Pure Cost Per Single Injection */}
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">
                    {getLocalText('costPerInjectionLabel')}
                  </span>
                  <p className="text-lg font-black text-amber-300 flex items-baseline gap-0.5" id="vial-shot-cost-metric">
                    <span>{costPerInjection.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-400 font-bold">{t('currencySymbol')}</span>
                  </p>
                </div>

                {/* 3. Duration calendar prediction */}
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider animate-pulse">
                    {getLocalText('durationLabel')}
                  </span>
                  <p className="text-lg font-black text-teal-300 flex items-baseline gap-1" id="vial-duration-metric">
                    <span>~ {durationMeta.count}</span>
                    <span className="text-xs font-bold text-slate-400">{getLocalText(durationMeta.key as any)}</span>
                  </p>
                </div>

              </div>

              {/* Economic Advantage Indicator Banner */}
              <div className="text-[10px] text-slate-400 bg-white/5 p-2.5 rounded-xl border border-white/5 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {currentLang === 'ru' 
                      ? 'При покупке курса от 3-х флаконов действует клубная скидка -15%' 
                      : 'Order 3 or more vials to secure standard closed club flat -15% discount!'
                    }
                  </span>
                </div>
                <span className="text-emerald-400 font-bold uppercase select-none whitespace-nowrap">CLUB EXCLUSIVE</span>
              </div>

            </div>

            {/* Error or Warning Displays */}
            {isOverSyringeCapacity && (
              <div id="syringe-warning" className="bg-rose-50 text-rose-700 border border-rose-100 rounded-2xl p-4 text-xs font-bold leading-relaxed flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <span>{getLocalText('warningOverSyringe')}</span>
              </div>
            )}

            {isOverVialCapacity && (
              <div id="vial-warning" className="bg-rose-50 text-rose-700 border border-rose-100 rounded-2xl p-4 text-xs font-bold leading-relaxed flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <span>{getLocalText('warningOverVial')}</span>
              </div>
            )}

            {/* HIGH-END INTERACTIVE VISUAL DILUTION SIMULATOR DIAGRAM: VIAL AND SYRINGE */}
            <div className="bg-slate-950 rounded-2xl p-5 border border-slate-900 space-y-4" id="syringe-interactive-graphic">
              
              <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block">
                  {getLocalText('visualGuide')}
                </span>
                <span className="text-[10px] text-teal-400 font-black uppercase tracking-wider bg-teal-950 border border-teal-900 px-2 py-0.5 rounded-md">
                  {syringeType === 100 ? 'Syringe U-100' : syringeType === 50 ? 'Syringe U-50' : 'Syringe U-30'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                
                {/* A. Animated Peptide Vial representation (Custom CSS & SVG) */}
                <div className="md:col-span-3 flex flex-col items-center justify-center p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase">
                    {getLocalText('vialVisualHeader')}
                  </span>
                  
                  {/* Vial graphics container */}
                  <div className="relative w-16 h-28 bg-transparent flex flex-col items-center">
                    
                    {/* Metal cap and plastic flip top lid */}
                    <div className="w-8 h-2 bg-teal-500 rounded-sm z-10" />
                    <div className="w-6 h-1.5 bg-slate-500 border border-slate-400" />
                    <div className="w-4 h-3 bg-slate-600/50" />
                    
                    {/* Main Glass neck and body */}
                    <div className="w-12 h-20 bg-slate-950 border-2 border-slate-500 rounded-xl relative overflow-hidden flex flex-col justify-end">
                      
                      {/* Interactive Fluid Layer */}
                      {/* Fluid level depends on the diluted volume (ml). Max 10ml, let's represent height based on diluentMl / 10 */}
                      <div 
                        className="w-full bg-gradient-to-t from-teal-500/80 to-teal-400/40 border-t border-teal-300 transition-all duration-500 ease-out"
                        style={{ height: `${Math.min(95, Math.max(15, (diluentMl / 10) * 100))}%` }}
                      >
                        {/* Shimmering fluid bubbles */}
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.05)_25%,transparent_25%)] bg-[size:10px_10px] opacity-20 animate-pulse" />
                      </div>
                      
                      {/* Floating sterile powder label when dry vs liquid */}
                      <div className="absolute inset-0 flex items-center justify-center p-1 text-center">
                        <span className="text-[8px] font-black tracking-tighter text-slate-100 uppercase bg-slate-950/80 px-1 py-0.5 rounded-sm line-clamp-2 select-none">
                          {selectedMed.name[currentLang]}
                          <br />
                          {vialMg} mg
                        </span>
                      </div>

                    </div>
                  </div>

                  <span className="text-[9px] text-slate-500 font-semibold uppercase text-center">
                    {diluentMl > 0 ? getLocalText('vialLiquidStateDissolved') : getLocalText('vialLiquidStatePowder')}
                  </span>
                </div>

                {/* B. Syringe Drawing Volume Scale (The dynamically-drawn Insulin Syringe) */}
                <div className="md:col-span-9 space-y-3">
                  <div className="relative w-full overflow-hidden bg-slate-900/40 rounded-xl p-3 flex items-center justify-center">
                    <svg viewBox="0 0 540 85" className="w-full h-auto select-none" fill="none" xmlns="http://www.w3.org/2000/svg">
                      
                      {/* Needle tip connector assembly */}
                      <rect x="15" y="38" width="12" height="10" fill="#f8fafc" rx="1.5" />
                      <line x1="0" y1="43" x2="15" y2="43" stroke="#cbd5e1" strokeWidth="2.5" />

                      {/* Syringe Outer Glass Barrel Body */}
                      <rect x="27" y="20" width="460" height="46" rx="4" fill="#0f172a" stroke="#475569" strokeWidth="2.5" />

                      {/* Shaded/Colored Liquid Fill Area inside Syringe */}
                      {/* The volume is proportioned dynamically using target units draw over total units (syringeType) */}
                      {unitsToDraw > 0 && (
                        <rect
                          x="29"
                          y="22.5"
                          width={Math.min(456, (Math.min(unitsToDraw, syringeType) / syringeType) * 456)}
                          height="41"
                          fill="url(#liquid-gradient)"
                          opacity="0.85"
                        />
                      )}

                      {/* Plunger shaft and black stopper seal gasket */}
                      {/* Plunger stopper is at the end of liquid fill */}
                      {(() => {
                        const fillWidth = Math.min(456, (Math.min(unitsToDraw, syringeType) / syringeType) * 456);
                        const stopperX = 29 + fillWidth;
                        return (
                          <>
                            {/* Stopper rubber head seal */}
                            <rect x={stopperX - 8} y="22.5" width="8" height="41" fill="#ea580c" rx="1" />
                            <rect x={stopperX - 12} y="22.5" width="4" height="41" fill="#334155" />
                            {/* Metal Plunger Rod stretching out on the right */}
                            <rect x={stopperX} y="38.5" width={500 - stopperX} height="9" fill="#94a3b8" />
                            {/* Plunger thumb-press base */}
                            <rect x="500" y="16" width="10" height="54" fill="#cbd5e1" rx="2" />
                          </>
                        );
                      })()}

                      {/* Calibration tick marks on syringe glass */}
                      {/* We draw ticks from 0 to syringeType */}
                      {Array.from({ length: 11 }).map((_, idx) => {
                        const unitVal = Math.round((syringeType / 10) * idx);
                        const percentX = idx / 10;
                        const xCoord = 29 + percentX * 456;
                        return (
                          <g key={idx}>
                            {/* Main ticks every 10% interval */}
                            <line x1={xCoord} y1="22" x2={xCoord} y2="34" stroke="#475569" strokeWidth="2" />
                            {/* Label text under ticks */}
                            <text x={xCoord} y="53" fill="#94a3b8" fontSize="10" fontWeight="bold" textAnchor="middle">
                              {unitVal}
                            </text>
                          </g>
                        );
                      })}

                      {/* Micro tick marks in between */}
                      {Array.from({ length: 50 }).map((_, idx) => {
                        if (idx % 5 === 0) return null; // Skip main ticks
                        const percentX = idx / 50;
                        const xCoord = 29 + percentX * 456;
                        return (
                          <line key={idx} x1={xCoord} y1="22" x2={xCoord} y2="28" stroke="#334155" strokeWidth="1" />
                        );
                      })}

                      {/* Linear Liquid Gradient Definition */}
                      <defs>
                        <linearGradient id="liquid-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#0d9488" stopOpacity="0.85" />
                        </linearGradient>
                      </defs>
                    </svg>
                    
                    {/* Float units indicator above graphic */}
                    {unitsToDraw > 0 && (
                      <div className="absolute top-1 left-1.5 bg-teal-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs animate-pulse">
                        FLOW BARREL: {unitsToDraw} Units (U)
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold px-2">
                    <span>← {currentLang === 'ru' ? 'Коннектор иглы' : 'Needle Point'}</span>
                    <span>{currentLang === 'ru' ? 'Плунжер шприца' : 'Syringe Plunger'} →</span>
                  </div>
                </div>

              </div>

            </div>

            {/* Preparation and Reconstitution safety rules panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1" id="sterile-safety-guide">
              
              {/* Shake warning */}
              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 flex items-start gap-2.5">
                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h5 className="text-[10px] font-black text-amber-800 uppercase tracking-widest">
                    {currentLang === 'ru' ? 'Смешивать без встряхивания' : 'Gently Reconstitute'}
                  </h5>
                  <p className="text-[10px] text-amber-900 leading-normal">
                    {getLocalText('ruleNeverShake')}
                  </p>
                </div>
              </div>

              {/* Storage warning */}
              <div className="bg-sky-50/50 p-4 rounded-2xl border border-sky-100 flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h5 className="text-[10px] font-black text-sky-800 uppercase tracking-widest">
                    {currentLang === 'ru' ? 'Холод и Темнота (2°C - 8°C)' : 'Refrigerated Storage'}
                  </h5>
                  <p className="text-[10px] text-sky-900 leading-normal">
                    {getLocalText('storageRule')}
                  </p>
                </div>
              </div>

            </div>

          </div>

          {/* Dilution Action Purchase Button Footer */}
          <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Direct peptide price display */}
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase">{getLocalText('vialPriceLabel')}</span>
              <div id="calc-res-cost" className="text-2xl font-black text-slate-950 flex items-baseline gap-1">
                <span>{selectedMed.price.toLocaleString()} {t('currencySymbol')}</span>
                <span className="text-xs text-slate-400 font-medium">/ {currentLang === 'ru' ? 'за флакон (vial)' : 'per active vial'}</span>
              </div>
            </div>

            {/* Shopping cart button */}
            <button
              id="btn-add-calculated-cart"
              onClick={handleAddCalculatedToCart}
              className="px-6 py-4 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-teal-100 active:scale-95 transition-all duration-300 transform"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{t('btnAddToCartCalc')}</span>
            </button>

          </div>

          {/* Success Banner inside calculator context */}
          {successMsg && (
            <div id="calc-success-banner" className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl p-3 text-xs flex items-center justify-center gap-2 font-bold animate-fade-in shadow-2xs">
              <Check className="w-4 h-4 animate-bounce" />
              <span>
                {currentLang === 'ru' 
                  ? `Флакон ${selectedMed.name['ru']} успешно добавлен в вашу корзину!` 
                  : `1 Vial of ${selectedMed.name['en']} has been loaded into your cart!`
                }
              </span>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
