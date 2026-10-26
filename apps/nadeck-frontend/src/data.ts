/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Language } from './types';


export const MEDICINES_DATA: Product[] = [
  {
    id: 'semaglutide',
    type: 'peptide',
    unit: 'mg',
    name: {
      ru: 'Semaglutide 5mg',
      en: 'Semaglutide 5mg'
    },
    category: 'weightloss',
    description: {
      ru: 'Революционный пептид для снижения аппетита, улучшения метаболизма и эффективного контроля веса.',
      en: 'Revolutionary peptide for appetite suppression, metabolic enhancement, and effective weight management.'
    },
    fullDescription: {
      ru: 'Семаглутид — это селективный агонист рецепторов ГПП-1 (глюкагоноподобного пептида-1). Он имитирует действие естественного гормона сытости, замедляет опорожнение желудка и посылает сигналы в головной мозг о насыщении. Это приводит к значительному и безопасному снижению веса, улучшению липидного профиля крови и стабилизации уровня сахара.',
      en: 'Semaglutide is a selective GLP-1 (glucagon-like peptide-1) receptor agonist. It mimics the natural satiety hormone, slows gastric emptying, and transmits fullness signals to the brain. This yields substantial and safe weight reduction, optimizes blood lipid levels, and stabilizes glycemic indexes.'
    },
    indications: {
      ru: [
         'Избыточная масса тела (ИМТ > 27) с сопутствующими факторами',
         'Хроническое переедание и непреодолимая тяга к сладкому',
         'Инсулинорезистентность и метаболический синдром'
      ],
      en: [
         'Excess body weight (BMI > 27) with co-morbidities',
         'Chronic overeating and intense sweet cravings',
         'Insulin resistance and metabolic syndrome'
      ]
    },
    contraindications: {
      ru: [
         'Индивидуальная непереносимость семаглутида',
         'Медуллярный рак щитовидной железы в семейном анамнезе',
         'Период беременности и грудного вскармливания'
      ],
      en: [
         'Hypersensitivity to Semaglutide',
         'Personal or family history of medullary thyroid carcinoma',
         'Pregnancy and active lactation'
      ]
    },
    usage: {
      ru: 'Для подкожного введения в жировую складку живота или бедра 1 раз в неделю. Рекомендуется начинать с минимальной дозы 0.25 мг в неделю для минимизации побочных эффектов со стороны ЖКТ.',
      en: 'Subcutaneous injection into the abdomen or thigh adipose tissue once weekly. Recommended starter dose of 0.25mg per week to minimize initial gastrointestinal adaptation side effects.'
    },
    images: ['https://images.unsplash.com/photo-1579154204601-01588f351166?w=600&auto=format&fit=crop&q=80'],
    rating: 4.9,
    form: 'vial',
    mgPerUnit: 5,
    volumes: [{ mgPerUnit: 2, price: 9000, priceUsd: 30 }, { mgPerUnit: 5, price: 18500, priceUsd: 60 }, { mgPerUnit: 10, price: 32000, priceUsd: 105 }],
    dosageRules: {
      mgPerKgPerDay: 0.005,
      defaultDailyDoses: 1,
      defaultFrequency: 'weekly'
    }
  },
  {
    id: 'tirzepatide',
    type: 'peptide',
    unit: 'mg',
    name: {
      ru: 'Tirzepatide 10mg',
      en: 'Tirzepatide 10mg'
    },
    category: 'weightloss',
    description: {
      ru: 'Двойной агонист рецепторов GIP/GLP-1 для продвинутого сжигания жира, нормализации липидного профиля и выносливости.',
      en: 'Dual GIP/GLP-1 receptor agonist for advanced fat burning, lipid normalization, and stamina support.'
    },
    fullDescription: {
      ru: 'Тирзепатид — это первый в своем классе двойной агонист рецепторов глюкозозависимого инсулинотропного полипептида (GIP) и глюкагоноподобного пептида-1 (GLP-1). Синнергетический эффект двух гормонов обеспечивает беспрецедентный результат в сжигании висцерального жира, снижении чувства голода и оптимизации выработки собственного инсулина.',
      en: 'Tirzepatide is a first-in-class dual glucose-dependent insulinotropic polypeptide (GIP) and glucagon-like peptide-1 (GLP-1) receptor agonist. The synergistic action of both hormones yields unprecedented results in burning visceral fat and enhancing glycemic metabolic health.'
    },
    indications: {
      ru: [
         'Серьезные стадии ожирения (ИМТ > 30)',
         'Неэффективность монотерапии классическими агонистами ГПП-1',
         'Метаболический синдром, повышенный уровень триглицеридов'
      ],
      en: [
         'Severe obesity stages (BMI > 30)',
         'Ineffective response to classic single GLP-1 monotherapy',
         'Metabolic syndrome and highly elevated triglycerides'
      ]
    },
    contraindications: {
      ru: [
         'Медуллярная карцинома щитовидной железы в анамнезе',
         'Воспалительные заболевания кишечника в стадии обострения',
         'Возраст до 18 лет, период беременности'
      ],
      en: [
         'History of medullary thyroid carcinoma or MEN 2 syndrome',
         'Active inflammatory bowel disease / severe gastroparesis',
         'Age under 18 or pregnancy state'
      ]
    },
    usage: {
      ru: 'Подкожно в область живота или бедра раз в неделю. Начальная доза составляет 2.5 мг один раз в неделю в течение не менее 4 недель, затем доза может повышаться до 5 мг.',
      en: 'Subcutaneously in the abdomen or thigh once weekly. Initiated with 2.5mg once weekly for the first 4 weeks, then escalated to 5mg or more based on clinical tolerance.'
    },
    images: ['https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&auto=format&fit=crop&q=80'],
    rating: 4.95,
    form: 'vial',
    mgPerUnit: 10,
    volumes: [{ mgPerUnit: 5, price: 19500, priceUsd: 65 }, { mgPerUnit: 10, price: 32000, priceUsd: 105 }, { mgPerUnit: 15, price: 42000, priceUsd: 140 }],
    dosageRules: {
      mgPerKgPerDay: 0.007,
      defaultDailyDoses: 1,
      defaultFrequency: 'weekly'
    }
  },
  {
    id: 'bpc-157',
    type: 'peptide',
    unit: 'mg',
    name: {
      ru: 'BPC-157 5mg',
      en: 'BPC-157 5mg'
    },
    category: 'healing',
    description: {
      ru: 'Пептид экстремальной тканевой и органной регенерации: ускоряет заживление связок, сухожилий, мышц и слизистой оболочки желудка.',
      en: 'Extreme tissue and organ regeneration peptide. Promotes fast ligament, tendon, muscular, and gut lining healing.'
    },
    fullDescription: {
      ru: 'BPC-157 (Body Protection Compound) — это синтетический защитный пептид, состоящий из 15 аминокислот. Он ускоряет ангиогенез (формирование новых сосудов), увеличивает выработку коллагена и стимулирует фибробласты. Обладает высочайшим противовоспалительным и цитопротекторным потенциалом, спасая поврежденные соединительные ткани намного быстрее любого физиологического ритма.',
      en: 'BPC-157 (Body Protection Compound) is a synthetic pentadecapeptide containing 15 amino acids. It triggers cellular angiogenesis (vessel formation), significantly upregulates collagen expression, and boosts fibroblast migration. Possesses powerful anti-inflammatory and cytoprotective features to repair connective tissues.'
    },
    indications: {
      ru: [
         'Растяжения связок, разрывы сухожилий, воспаления суставов (эпикондилит, артрит)',
         'Регенерация после хирургических вмешательств на ОДА',
         'Синдром дырявого кишечника, язвы слизистой ЖКТ, гастрит'
      ],
      en: [
         'Sprained ligaments, tendon tears, joint inflammation (tennis elbow, arthritis)',
         'Post-surgical orthopedic rehabilitation processes',
         'Leaky gut syndrome, gastric ulcers, active gastritis mucosal lesions'
      ]
    },
    contraindications: {
      ru: [
         'Индивидуальная гиперчувствительность к пентадекапептиду',
         'Активный злокачественный неопластический процесс'
      ],
      en: [
         'Hypersensitivity to pentadecapeptide compounds',
         'Active malignant tumor and neoplastic cell growth'
      ]
    },
    usage: {
      ru: 'Подкожно или локально внутримышечно вблизи места травмы. Стандартная терапевтическая дозировка составляет от 250 мкг до 500 мкг один-два раза в день в течение 15-30 дней.',
      en: 'Subcutaneously in abdomen fat or locally intramuscularly close to injury site. Standard systemic dosing is 250 mcg to 500 mcg twice daily for 15-30 continuous days.'
    },
    images: ['https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?w=600&auto=format&fit=crop&q=80'],
    rating: 4.88,
    form: 'vial',
    mgPerUnit: 5,
    volumes: [{ mgPerUnit: 2, price: 8000, priceUsd: 25 }, { mgPerUnit: 5, price: 15000, priceUsd: 50 }, { mgPerUnit: 10, price: 26000, priceUsd: 85 }],
    dosageRules: {
      mgPerKgPerDay: 0.004,
      defaultDailyDoses: 2,
      defaultFrequency: 'twice_daily'
    }
  },
  {
    id: 'tb-500',
    type: 'peptide',
    unit: 'mg',
    name: {
      ru: 'TB-500 5mg',
      en: 'TB-500 5mg'
    },
    category: 'healing',
    description: {
      ru: 'Стимулятор клеточной подвижности для экстренного восстановления кровеносной системы, миокарда и эластичности мышечных волокон.',
      en: 'Cellular motility stimulator for cardiovascular tissue repair, skeletal muscles, and microvascular tissue health.'
    },
    fullDescription: {
      ru: 'TB-500 — синтетический аналог естественного пептида тимозина бета-4, который содержится практически во всех клетках человека. Он способствует быстрой регенерации поврежденных мышечных групп, повышает растяжимость связок, подавляет мышечные спазмы, улучшает транспорт кислорода к тканям и снижает фиброз (образование рубцов).',
      en: 'TB-500 is a bioactive synthetic model of natural thymosin beta-4 found inside almost all mammalian tissues. It upregulates cellular migration, coordinates myofibrillar expansion, limits fibrous adhesions (scars), and improves systemic oxygenated vascular pathways.'
    },
    indications: {
      ru: [
         'Мышечные забитости, надрывы, микроразрывы после тяжелых тренировок',
         'Утрата гибкости суставов, повреждения миокарда',
         'Хронические боли из-за старых зарубцованных спортивных травм'
      ],
      en: [
         'Muscle tears, micro-traumas, severe fatigue after workouts',
         'Decreased joint flexibility or ischemic cardiovascular support',
         'Chronic pain syndromes associated with older scarred trauma spots'
      ]
    },
    contraindications: {
      ru: [
         'Аллергические реакции на ацетилированные пептиды тимуса',
         'Наличие доброкачественных или злокачественных новообразований'
      ],
      en: [
         'Allergy to thymus-derived acetylated compounds',
         'Active tumor mutations or uncontrolled growth histories'
      ]
    },
    usage: {
      ru: 'Подкожно в жировую прослойку. Первая фаза (загрузка): 2-5 мг дважды в неделю на протяжении первых 4-6 недель. Поддерживающая фаза: 2-4 мг каждые 14 дней.',
      en: 'Subcutaneously in abdominal fat. Loading phase: 2-5mg twice weekly during first 4-6 weeks. Maintenance phase: 2-4mg single injection every 14 days.'
    },
    images: ['https://images.unsplash.com/photo-1576086213369-97a306d36557?w=600&auto=format&fit=crop&q=80'],
    rating: 4.82,
    form: 'vial',
    mgPerUnit: 5,
    volumes: [{ mgPerUnit: 2, price: 8500, priceUsd: 30 }, { mgPerUnit: 5, price: 16500, priceUsd: 55 }, { mgPerUnit: 10, price: 28000, priceUsd: 95 }],
    dosageRules: {
      mgPerKgPerDay: 0.005,
      defaultDailyDoses: 1,
      defaultFrequency: 'every_other_day'
    }
  },
  {
    id: 'melanotan-2',
    type: 'peptide',
    unit: 'mg',
    name: {
      ru: 'Melanotan II 10mg',
      en: 'Melanotan II 10mg'
    },
    category: 'antiaging',
    description: {
      ru: 'Пептид ровного глубокого загара без ожогов с сильным эффектом подавления аппетита и стимуляции либидо.',
      en: 'Deep safe tanning peptide without sunburn. Upregulates melanin, enhances libido, and diminishes appetite.'
    },
    fullDescription: {
      ru: 'Меланотан II — это синтетический аналог естественного меланокортина, пептидного гормона, стимулирующего выработку меланина. Он взаимодействует с рецепторами меланоцитов, заставляя кожу темнеть и приобретать глубокий шоколадный загар с минимальным облучением УФ-лучами. Также активно воздействует на рецепторы удовольствия в ЦНС, снижая аппетит и усиливая эректильную функцию.',
      en: 'Melanotan II is a peptide analog of alpha-melanocyte stimulating hormone (a-MSH). It triggers rapid and protective skin pigment darkening (melanogenesis) in human tissue, allowing elegant bronzing with minimal sun exposure. Also coordinates neurochemical triggers, reducing appetite and boosting libido.'
    },
    indications: {
      ru: [
         'Очень бледная кожа (I и II цветотипы), быстрое обгорание на солнце',
         'Профилактика меланомы и фотодерматитов',
         'Увеличение естественного либидо, коррекция эректильной дисфункции'
      ],
      en: [
         'Highly sensitive white skin (Types I & II), prone to immediate burns',
         'Sunburn prevention and safe tanning acceleration',
         'Libido enhancement and therapeutic erectile stimulation'
      ]
    },
    contraindications: {
      ru: [
         'Атипичные родинки в анамнезе, предрасположенность к дисплазии невусов',
         'Тяжелая запущенная гипертоническая болезнь',
         'Беременность и возраст до 18 лет'
      ],
      en: [
         'Atypical moles, family history of dysplastic nevi or melanoma',
         'Uncontrolled high blood pressure (hypertension)',
         'Pregnancy profiles or age below 18'
      ]
    },
    usage: {
      ru: 'Подкожно в живот. Схема загара состоит из фазы накопления (150-300 мкг ежедневно до достижения нужного оттенка) и поддерживающей фазы (300-500 мкг раз в неделю перед походом на солнце).',
      en: 'Subcutaneously in the abdomen. Regimen includes: Loading phase (150-300 mcg daily until target shade is reached) and Maintenance phase (300-500 mcg once weekly before tanning exposure).'
    },
    images: ['https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=600&auto=format&fit=crop&q=80'],
    rating: 4.79,
    form: 'vial',
    mgPerUnit: 10,
    volumes: [{ mgPerUnit: 5, price: 8500, priceUsd: 30 }, { mgPerUnit: 10, price: 14000, priceUsd: 45 }, { mgPerUnit: 15, price: 19500, priceUsd: 65 }],
    dosageRules: {
      mgPerKgPerDay: 0.003,
      defaultDailyDoses: 1
    }
  },
  {
    id: 'ipamorelin',
    type: 'peptide',
    unit: 'mg',
    name: {
      ru: 'Ipamorelin 5mg',
      en: 'Ipamorelin 5mg'
    },
    category: 'antiaging',
    description: {
      ru: 'Высокоселективный стимулятор выброса соматотропного гормона для омоложения кожи, укрепления суставов и прироста качественной мускулатуры.',
      en: 'Highly selective growth hormone secretagogue for skin collagen optimization, joint strength, and lean muscles.'
    },
    fullDescription: {
      ru: 'Ипаморелин — это пентапептид нового поколения, стимулирующий секрецию собственного гормона роста. В отличие от ГХРП-6 и ГХРП-2, он действует абсолютно селективно: не вызывает скачков аппетита (не активирует грелин), не повышает пролактин и кортизол. Обеспечивает прекрасный восстановительный сон, жиросжигание во время отдыха, уплотнение мышечных волокон и обновление коллагена кожи.',
      en: 'Ipamorelin is a modern highly selective pentapeptide that stimulates growth hormone secretion. Unlike older peptides (GHRP-6/2), it acts selectively without driving hunger (does not activate ghrelin receptors) or altering cortisol and prolactin. Enhances restorative sleep and skin cell matrix.'
    },
    indications: {
      ru: [
         'Возрастное замедление регенерации, дряблость кожи, мимические морщины',
         'Необходимость набора мышечной массы без лишнего жира и воды',
         'Бессонница, неглубокий прерывистый сон, хроническая усталость'
      ],
      en: [
         'Age-associated slow regeneration, skin laxity, visible wrinkles',
         'Need for lean vascular muscle accrual without extra water retention',
         'Insomnia, poor sleep pattern quality, systematic morning exhaustions'
      ]
    },
    contraindications: {
      ru: [
         'Острые инфекционные простудные заболевания в острой фазе',
         'Активный неопластический или онкологический процесс'
      ],
      en: [
         'Acute infectious systemic inflammatory situations',
         'Active oncology or cellular tumor history'
      ]
    },
    usage: {
      ru: 'Подкожно в область живота перед сном или за 40 минут до тренировки. Обычная средняя дозировка составляет от 100 мкг до 200 мкг до трех раз в день натощак.',
      en: 'Subcutaneously in abdominal fat. Taken prior to sleep or 40 minutes before workout sessions. Standard dosage is 100 mcg to 200 mcg up to three times per day on empty stomach.'
    },
    images: ['https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=600&auto=format&fit=crop&q=80'],
    rating: 4.85,
    form: 'vial',
    mgPerUnit: 5,
    volumes: [{ mgPerUnit: 2, price: 6500, priceUsd: 20 }, { mgPerUnit: 5, price: 12500, priceUsd: 40 }, { mgPerUnit: 10, price: 21000, priceUsd: 70 }],
    dosageRules: {
      mgPerKgPerDay: 0.003,
      defaultDailyDoses: 3
    }
  }
];

export const TRANSLATIONS: Record<string, Record<Language, string>> = {
  researchDisclaimerTitle: {
    ru: 'ВНИМАНИЕ!',
    en: 'WARNING!'
  },
  researchDisclaimerBody: {
    ru: 'Я подтверждаю, что достиг(-ла) 18 лет и обладаю необходимой квалификацией.\nСоглашаюсь, что вся информация на сайте носит образовательный характер, а приобретенные материалы будут использоваться для исследовательских целей — не для самостоятельного применения на людях, животных, перорального приема, а также не в качестве лекарств, БАДов, косметики или средств бытовой химии, а также не для коммерческих целей.\nПродолжая работу с сайтом, я принимаю указанные условия.',
    en: 'I confirm that I am 18 years of age or older and possess the necessary qualifications.\nI agree that all information on this site is educational in nature, and any purchased materials will be used strictly for research purposes — not for self-administration on humans or animals, oral consumption, or as drugs, dietary supplements, cosmetics, or household chemicals, and not for commercial purposes.\nBy continuing to use this site, I accept the stated terms.'
  },
  researchDisclaimerAgreeBtn: {
    ru: 'Я согласен, продолжить',
    en: 'I Agree, Continue'
  },
  appName: {
    ru: 'Nadeck',
    en: 'Nadeck'
  },
  appSubtitle: {
    ru: 'Премиальные сертифицированные пептиды и точный калькулятор разведения',
    en: 'Premium certified peptides and state-of-the-art dilution calculator'
  },
  homeTab: {
    ru: 'Каталог',
    en: 'Catalog'
  },
  calcTab: {
    ru: 'Калькулятор',
    en: 'Calculator'
  },
  ordersTab: {
    ru: 'Мои заказы',
    en: 'My Orders'
  },
  searchPlaceholder: {
    ru: 'Искать пептид по названию или активному веществу...',
    en: 'Search peptide by name or active compound...'
  },
  loginBtn: {
    ru: 'Войти',
    en: 'Sign In'
  },
  logoutBtn: {
    ru: 'Выйти',
    en: 'Sign Out'
  },
  registerBtn: {
    ru: 'Регистрация',
    en: 'Register'
  },
  categoriesAll: {
    ru: 'Все',
    en: 'All'
  },
  catWeightloss: {
    ru: 'Похудение & GLP-1',
    en: 'Fat Loss & GLP-1'
  },
  catHealing: {
    ru: 'Восстановление & Суставы',
    en: 'Recovery & Healing'
  },
  catAntiaging: {
    ru: 'Омоложение & BEAUTY',
    en: 'Anti-Aging & BEAUTY'
  },
  catPainkiller: {
    ru: 'Обезболивающие',
    en: 'Painkillers'
  },
  catVitamin: {
    ru: 'Витамины',
    en: 'Vitamins'
  },
  catAntiallergic: {
    ru: 'Противоаллергические',
    en: 'Antiallergic'
  },
  catDigestive: {
    ru: 'Пищеварение',
    en: 'Digestive'
  },
  catAdditional: {
    ru: 'Дополнительные товары',
    en: 'Additional Goods'
  },
  addToCart: {
    ru: 'В корзину',
    en: 'Add to Cart'
  },
  buyNowBtn: {
    ru: 'Купить',
    en: 'Buy now'
  },
  moreDetailsBtn: {
    ru: 'Подробнее',
    en: 'Details'
  },
  volumeLabel: {
    ru: 'Объём',
    en: 'Volume'
  },
  itemAdded: {
    ru: 'В корзине',
    en: 'In Cart'
  },
  outOfStock: {
    ru: 'Нет в наличии',
    en: 'Out of Stock'
  },
  priceLabel: {
    ru: 'Цена',
    en: 'Price'
  },
  currencySymbol: {
    ru: '₸',
    en: '$'
  },
  ratingLabel: {
    ru: 'Рейтинг',
    en: 'Rating'
  },
  backToCatalog: {
    ru: 'Вернуться в каталог',
    en: 'Back to Catalog'
  },
  aboutDrug: {
    ru: 'Описание',
    en: 'Profile'
  },
  indicationsTitle: {
    ru: 'Показания и эффекты',
    en: 'Indications & Benefits'
  },
  contraindicationsTitle: {
    ru: 'Противопоказания',
    en: 'Contraindications'
  },
  usageMethod: {
    ru: 'Инструкции по введению и разведению',
    en: 'Reconstitution & Administration Guide'
  },
  calculatorHeader: {
    ru: 'Калькулятор Разведения и Доз Пептидов',
    en: 'Peptide Dilution & Reconstitution Calculator'
  },
  calcIntro: {
    ru: 'Профессиональный инструмент расчета пептидного разведения. Рассчитайте, сколько микролитров или единиц инсулинового шприца (U100/U50) нужно набрать для точного получения желаемой дозировки активного вещества.',
    en: 'Professional peptide reconstitution planner. Choose your vial dosage, bacteriostatic water added, and targeted single dose to visually see exactly how many units on your insulin syringe to draw.'
  },
  selectMedicineLabel: {
    ru: 'Препарат для расчета',
    en: 'Target Peptide'
  },
  enterWeightLabel: {
    ru: 'Количество вещества во флаконе (мг)',
    en: 'Peptide Quantity in Vial (mg)'
  },
  enterDaysLabel: {
    ru: 'Объем воды для разведения (мл)',
    en: 'Bacteriostatic Water Added (ml)'
  },
  calcResultsTitle: {
    ru: 'Результаты планирования разведения',
    en: 'Dilution & Injection Planning Results'
  },
  recommendedDailyDose: {
    ru: 'Концентрация раствора',
    en: 'Diluted Concentration Factor'
  },
  dosesPerDay: {
    ru: 'Пептида в одной единице шприца',
    en: 'Active substance per 1 syringe unit'
  },
  dosePerIntake: {
    ru: 'Необходимый объем для дозы',
    en: 'Required volume for desired dose'
  },
  packsNeeded: {
    ru: 'Количество единиц инъекции',
    en: 'Total units (IU) to draw'
  },
  estimatedCost: {
    ru: 'Цена одного флакона',
    en: 'Vial Unit Price'
  },
  unitsTablets: {
    ru: 'U',
    en: 'U'
  },
  unitsCapsules: {
    ru: 'U',
    en: 'U'
  },
  btnAddToCartCalc: {
    ru: 'Добавить данный флакон в корзину',
    en: 'Add this Peptide Vial to Cart'
  },
  cartTitle: {
    ru: 'Ваша Корзина',
    en: 'Your Shopping Cart'
  },
  cartEmpty: {
    ru: 'Ваша корзина пока пуста. Загляните в каталог высококачественных пептидов!',
    en: 'Your shopping cart is empty. Feel free to explore our original peptide catalog!'
  },
  itemsTotal: {
    ru: 'Итого флаконов',
    en: 'Total vials'
  },
  deliveryFree: {
    ru: 'Доставка',
    en: 'Delivery'
  },
  freeStatus: {
    ru: 'Уточняется менеджером',
    en: 'Confirmed by manager'
  },
  totalToPay: {
    ru: 'Сумма к оплате',
    en: 'To Pay Total'
  },
  checkoutSectionHeader: {
    ru: 'Оформление экспресс доставки и оплаты',
    en: 'Express Delivery Details & Secure Checkout'
  },
  deliveryAddressLabel: {
    ru: 'Адрес быстрой доставки',
    en: 'Delivery Address'
  },
  cityLabel: {
    ru: 'Город / Населенный пункт',
    en: 'City'
  },
  streetLabel: {
    ru: 'Улица, дом, квартира',
    en: 'Street, House & Apt Number'
  },
  apartmentLabel: {
    ru: 'Подъезд, этаж, домофон (необязательно)',
    en: 'Entrance & Floor Info (optional)'
  },
  postalCodeLabel: {
    ru: 'Почтовый индекс',
    en: 'Postal Code'
  },
  phoneLabel: {
    ru: 'Контактный телефон с кодом',
    en: 'Contact Phone Number'
  },
  paymentMethodLabel: {
    ru: 'Выберите метод оплаты',
    en: 'Payment Method'
  },
  payViaWhatsApp: {
    ru: 'Оформление через WhatsApp',
    en: 'Order via WhatsApp'
  },
  payViaWhatsAppNote: {
    ru: 'После оформления заказа мы откроем WhatsApp с готовым сообщением — менеджер подтвердит наличие и способ оплаты.',
    en: 'After placing the order we will open WhatsApp with a ready message — our manager will confirm availability and payment.'
  },
  payViaWhatsAppFooterNote: {
    ru: 'Подтверждение и оплата — через WhatsApp',
    en: 'Confirmation & payment — via WhatsApp'
  },
  placeOrderBtn: {
    ru: 'Подтвердить заказ и перейти к оплате',
    en: 'Confirm & Pay Securely'
  },
  orderPlacedSuccess: {
    ru: 'Заказ успешно оформлен и передан в курьерскую службу!',
    en: 'Order Placed Successfully. Dispatched for Courier!'
  },
  orderEstimateMsg: {
    ru: 'Отправка производится в день заказа во все регионы. Наш менеджер пришлет трек-номер в СМС/Telegram.',
    en: 'Shipped immediately. Your manager will text you the tracking code on WhatsApp/Telegram.'
  },
  orderTrackNumber: {
    ru: 'Индификатор отправления (Трек)',
    en: 'Post Tracking Code'
  },
  authModalHeaderLogin: {
    ru: 'Вход в закрытый клуб покупателей',
    en: 'Sign In to Client Cabinet'
  },
  authModalHeaderReg: {
    ru: 'Регистрация премиум аккаунта',
    en: 'Create Certified Account'
  },
  fullNameLabel: {
    ru: 'Ваше ФИО',
    en: 'Full Name'
  },
  emailLabel: {
    ru: 'Электронный адрес',
    en: 'Email Address'
  },
  passwordLabel: {
    ru: 'Пароль доступа',
    en: 'Access Password'
  },
  authToggleRegMsg: {
    ru: 'Еще не зарегистрированы? Создать аккаунт',
    en: "First time here? Sign Up Now"
  },
  authToggleLoginMsg: {
    ru: 'Уже состоите в клубе? Войти',
    en: 'Already registered? Sign In'
  },
  submitLogin: {
    ru: 'Авторизоваться',
    en: 'Sign In Now'
  },
  submitReg: {
    ru: 'Зарегистрироваться',
    en: 'Create Account'
  },
  userProfileTitle: {
    ru: 'Личный профиль клиента',
    en: 'Client Profile'
  },
  userWelcome: {
    ru: 'Приветствуем в Nadeck,',
    en: 'Welcome to Nadeck,'
  },
  savedAddressLabel: {
    ru: 'Сохраненный адрес доставки',
    en: 'Saved Shipping Address'
  },
  historyEmpty: {
    ru: 'Вы еще не делали заказов в нашем магазине.',
    en: 'You have not placed any orders yet.'
  },
  historyHeader: {
    ru: 'Архив ваших доставок',
    en: 'Your Orders Archive'
  },
  statusPending: {
    ru: 'Обрабатывается',
    en: 'Preparing Shipment'
  },
  statusShipped: {
    ru: 'Передан в СДЭК / Казпочту',
    en: 'Shipped (Courier Dispatch)'
  },
  statusDelivered: {
    ru: 'Доставлен адресату',
    en: 'Delivered'
  },
  calcWeightError: {
    ru: 'Пожалуйста, введите корректные параметры.',
    en: 'Please fill with valid input parameters.'
  },
  calcSelectError: {
    ru: 'Пожалуйста, выберите целевой пептид.',
    en: 'Select the targeted peptide first.'
  },
  notifyMeBtn: {
    ru: 'Уведомить о поступлении',
    en: 'Notify Me'
  },
  notifySubscribedBtn: {
    ru: 'Вы подписаны',
    en: 'Subscribed'
  },
  notifySubscribedToast: {
    ru: 'Мы сообщим вам, как только товар появится в наличии!',
    en: 'We will notify you as soon as this item is back in stock!'
  },
  notifyLoginRequired: {
    ru: 'Войдите в аккаунт, чтобы подписаться на уведомления.',
    en: 'Please log in to subscribe for stock notifications.'
  },
  notificationsTitle: {
    ru: 'Уведомления',
    en: 'Notifications'
  },
  notificationsEmpty: {
    ru: 'Пока нет уведомлений',
    en: 'No notifications yet'
  },
  markAllReadBtn: {
    ru: 'Прочитать все',
    en: 'Mark all read'
  },
  newsletterTitle: {
    ru: 'Подпишитесь на нашу рассылку',
    en: 'Subscribe to our newsletter'
  },
  newsletterSubtitle: {
    ru: 'И узнавайте первыми о новых поступлениях пептидов',
    en: 'Be the first to know about new peptide arrivals'
  },
  newsletterPlaceholder: {
    ru: 'Ваша почта',
    en: 'Your email'
  },
  newsletterSubscribeBtn: {
    ru: 'Подписаться',
    en: 'Subscribe'
  },
  newsletterSuccess: {
    ru: 'Спасибо! Вы подписаны на рассылку.',
    en: 'Thanks! You are now subscribed.'
  },
  newsletterError: {
    ru: 'Не удалось подписаться. Проверьте email и попробуйте снова.',
    en: 'Could not subscribe. Check the email and try again.'
  },
  footerContactsTitle: {
    ru: 'Контакты',
    en: 'Contacts'
  },
  footerAddress: {
    ru: '📍 Астана',
    en: '📍 Astana'
  },
  footerLanguagesTitle: {
    ru: 'Языки сервиса',
    en: 'Supported Languages'
  },
  footerLicensingTitle: {
    ru: 'Безопасность',
    en: 'Licensing'
  },
  footerLicenseText: {
    ru: 'Лицензия №1044392 ФК Республики Казахстан.',
    en: 'License No. 1044392, Pharmacy Committee of the Republic of Kazakhstan.'
  },
  footerCopyright: {
    ru: 'Все права защищены © 2026.',
    en: 'All rights reserved © 2026.'
  },
  footerOtcGuidelines: {
    ru: 'Правила отпуска',
    en: 'OTC Guidelines'
  },
  footerPrivacyCode: {
    ru: 'Конфиденциальность',
    en: 'Privacy Code'
  }
};
