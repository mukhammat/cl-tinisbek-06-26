/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Medicine, Language } from './types';

export const MEDICINES_DATA: Medicine[] = [
  {
    id: 'semaglutide',
    name: {
      ru: 'Semaglutide 5mg',
      en: 'Semaglutide 5mg',
      ar: 'سيماجلوتايد 5 ملغ'
    },
    category: 'weightloss',
    activeSubstance: {
      ru: 'Semaglutide (Семаглутид)',
      en: 'Semaglutide',
      ar: 'سيماجلوتايد'
    },
    description: {
      ru: 'Революционный пептид для снижения аппетита, улучшения метаболизма и эффективного контроля веса.',
      en: 'Revolutionary peptide for appetite suppression, metabolic enhancement, and effective weight management.',
      ar: 'ببتيد ثوري لكبح الشهية وتحسين التمثيل الغذائي والتحكم الفعال في الوزن.'
    },
    fullDescription: {
      ru: 'Семаглутид — это селективный агонист рецепторов ГПП-1 (глюкагоноподобного пептида-1). Он имитирует действие естественного гормона сытости, замедляет опорожнение желудка и посылает сигналы в головной мозг о насыщении. Это приводит к значительному и безопасному снижению веса, улучшению липидного профиля крови и стабилизации уровня сахара.',
      en: 'Semaglutide is a selective GLP-1 (glucagon-like peptide-1) receptor agonist. It mimics the natural satiety hormone, slows gastric emptying, and transmits fullness signals to the brain. This yields substantial and safe weight reduction, optimizes blood lipid levels, and stabilizes glycemic indexes.',
      ar: 'سيماجلوتايد هو منبه انتقائي لمستقبلات هرمون الجلوكاجون الببتيد الشبيه بالببتيد-1 ويحاكي عمل هرمون الشبع الطبيعي مما يساعد على تنظيم كمية الطعام المتناولة بكفاءة عالية وأمان.'
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
      ],
      ar: [
         'زيادة الوزن الإجمالية ومؤشر كتلة الجسم الأكبر من 27',
         'الإفراط في تناول الطعام والرغبة السريعة بالسكريات',
         'حالات مقاومة الأنسولين والمتلازمات الأيضية'
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
      ],
      ar: [
         'حساسية فردية أو تفاعلية تجاه السيماجلوتايد',
         'تاريخ وراثي لسرطان الغدة الدرقية النخاعي',
         'أثناء فترات الحمل أو الرضاعة الطبيعية'
      ]
    },
    usage: {
      ru: 'Для подкожного введения в жировую складку живота или бедра 1 раз в неделю. Рекомендуется начинать с минимальной дозы 0.25 мг в неделю для минимизации побочных эффектов со стороны ЖКТ.',
      en: 'Subcutaneous injection into the abdomen or thigh adipose tissue once weekly. Recommended starter dose of 0.25mg per week to minimize initial gastrointestinal adaptation side effects.',
      ar: 'للحقن تحت الجلد في البطن أو الفخذ مرة واحدة في الأسبوع. يوصى بجرعات علاجية تدريجية تبدأ من 0.25 ملغ في المرة لتجنب أي مشاكل.'
    },
    price: 18500,
    image: 'https://images.unsplash.com/photo-1579154204601-01588f351166?w=600&auto=format&fit=crop&q=80',
    rating: 4.9,
    form: 'vial',
    mgPerUnit: 5,
    dosageRules: {
      mgPerKgPerDay: 0.005,
      defaultDailyDoses: 1
    }
  },
  {
    id: 'tirzepatide',
    name: {
      ru: 'Tirzepatide 10mg',
      en: 'Tirzepatide 10mg',
      ar: 'تيرزيباتايد 10 ملغ'
    },
    category: 'weightloss',
    activeSubstance: {
      ru: 'Tirzepatide (Тирзепатид)',
      en: 'Tirzepatide',
      ar: 'تيرزيباتايد'
    },
    description: {
      ru: 'Двойной агонист рецепторов GIP/GLP-1 для продвинутого сжигания жира, нормализации липидного профиля и выносливости.',
      en: 'Dual GIP/GLP-1 receptor agonist for advanced fat burning, lipid normalization, and stamina support.',
      ar: 'منشط مزدوج لمستقبلات GIP / GLP-1 لحرق الدهون المتقدم، تنشيط التمثيل الغذائي وتحسين القدرة على التحمل.'
    },
    fullDescription: {
      ru: 'Тирзепатид — это первый в своем классе двойной агонист рецепторов глюкозозависимого инсулинотропного полипептида (GIP) и глюкагоноподобного пептида-1 (GLP-1). Синнергетический эффект двух гормонов обеспечивает беспрецедентный результат в сжигании висцерального жира, снижении чувства голода и оптимизации выработки собственного инсулина.',
      en: 'Tirzepatide is a first-in-class dual glucose-dependent insulinotropic polypeptide (GIP) and glucagon-like peptide-1 (GLP-1) receptor agonist. The synergistic action of both hormones yields unprecedented results in burning visceral fat and enhancing glycemic metabolic health.',
      ar: 'تيرزيباتايد هو منشط مزدوج لمستقبلات GIP و GLP-1، يوفر تأثيراً متناغماً لحرق الدهون الحشوية العنيدة وتنظيم الأنسولين والسكر بكفاءة واضحة.'
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
      ],
      ar: [
         'مراحل السمنة المتقدمة (مؤشر كتلة الجسم > 30)',
         'عدم استجابة الجسم للعلاجات الأحادية الكلاسيكية',
         'المتلازمة الأيضية وارتفاع مستويات الدهون الثلاثية'
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
      ],
      ar: [
         'تاريخ شخصي أو عائلي للإصابة بسرطان الغدة الدرقية',
         'أمراض القولون والتهابات الأمعاء الحادة قيد النشاط',
         'أقل من 18 عاماً أو أثناء فترات الحمل'
      ]
    },
    usage: {
      ru: 'Подкожно в область живота или бедра раз в неделю. Начальная доза составляет 2.5 мг один раз в неделю в течение не менее 4 недель, затем доза может повышаться до 5 мг.',
      en: 'Subcutaneously in the abdomen or thigh once weekly. Initiated with 2.5mg once weekly for the first 4 weeks, then escalated to 5mg or more based on clinical tolerance.',
      ar: 'يحقن تحت الجلد في منطقة البطن أو الفخذ مرة واحدة أسبوعياً بقوة بداية 2.5 ملغ لأول 4 أسابيع ثم يمكن رفعها إلى 5 ملغ.'
    },
    price: 32000,
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&auto=format&fit=crop&q=80',
    rating: 4.95,
    form: 'vial',
    mgPerUnit: 10,
    dosageRules: {
      mgPerKgPerDay: 0.007,
      defaultDailyDoses: 1
    }
  },
  {
    id: 'bpc-157',
    name: {
      ru: 'BPC-157 5mg',
      en: 'BPC-157 5mg',
      ar: 'بي بي سي-157 5 ملغ'
    },
    category: 'healing',
    activeSubstance: {
      ru: 'Body Protection Compound (Пентадекапептид)',
      en: 'Pentadecapeptide BPC-157',
      ar: 'بي بي سي-157 (مركب حماية الجسم)'
    },
    description: {
      ru: 'Пептид экстремальной тканевой и органной регенерации: ускоряет заживление связок, сухожилий, мышц и слизистой оболочки желудка.',
      en: 'Extreme tissue and organ regeneration peptide. Promotes fast ligament, tendon, muscular, and gut lining healing.',
      ar: 'ببتيد ريادي لإعادة البناء وإصلاح الأنسجة المتضررة، يسرع التئام الأربطة والأوتار والعضلات جراحياً وصحياً.'
    },
    fullDescription: {
      ru: 'BPC-157 (Body Protection Compound) — это синтетический защитный пептид, состоящий из 15 аминокислот. Он ускоряет ангиогенез (формирование новых сосудов), увеличивает выработку коллагена и стимулирует фибробласты. Обладает высочайшим противовоспалительным и цитопротекторным потенциалом, спасая поврежденные соединительные ткани намного быстрее любого физиологического ритма.',
      en: 'BPC-157 (Body Protection Compound) is a synthetic pentadecapeptide containing 15 amino acids. It triggers cellular angiogenesis (vessel formation), significantly upregulates collagen expression, and boosts fibroblast migration. Possesses powerful anti-inflammatory and cytoprotective features to repair connective tissues.',
      ar: 'مركب حماية الجسم BPC-157 يتكون من 15 حمضاً أمينياً؛ يساعد في إعادة تخليق الأوعية الدموية وتنشيط الكولاجين بشكل فعال وسريع لاستشفاء المفاصل والأنسجة.'
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
      ],
      ar: [
         'تمزق الأوتار والتواء الأربطة والتهاب المفاصل الرياضي',
         'دعم وسرعة النقاهة بعد العمليات الجراحية للعظام والعضلات',
         'متلازمة تسرب الأمعاء وقرحة المعدة والتهاب جدار الجهاز الهضمي'
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
      ],
      ar: [
         'فرط الحساسية من مركب الببتيد البنتا-ديكابيتبيد',
         'نشاط الأورام السرطانية ونمو الخلايا الغير مستقرة'
      ]
    },
    usage: {
      ru: 'Подкожно или локально внутримышечно вблизи места травмы. Стандартная терапевтическая дозировка составляет от 250 мкг до 500 мкг один-два раза в день в течение 15-30 дней.',
      en: 'Subcutaneously in abdomen fat or locally intramuscularly close to injury site. Standard systemic dosing is 250 mcg to 500 mcg twice daily for 15-30 continuous days.',
      ar: 'يحقن تحت الجلد في البطن أو موضعياً قرب العضلة المصابة بجرعات تبدأ من 250 إلى 500 ميكروغرام مرتين باليوم لمدة 15-30 يوماً.'
    },
    price: 15000,
    image: 'https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?w=600&auto=format&fit=crop&q=80',
    rating: 4.88,
    form: 'vial',
    mgPerUnit: 5,
    dosageRules: {
      mgPerKgPerDay: 0.004,
      defaultDailyDoses: 2
    }
  },
  {
    id: 'tb-500',
    name: {
      ru: 'TB-500 5mg',
      en: 'TB-500 5mg',
      ar: 'تي بي-500 5 ملغ'
    },
    category: 'healing',
    activeSubstance: {
      ru: 'Thymosin Beta-4 Ac-SDKP (Тимозин Бета-4)',
      en: 'Thymosin Beta-4 active fragment',
      ar: 'تيموسين بيتا-4'
    },
    description: {
      ru: 'Стимулятор клеточной подвижности для экстренного восстановления кровеносной системы, миокарда и эластичности мышечных волокон.',
      en: 'Cellular motility stimulator for cardiovascular tissue repair, skeletal muscles, and microvascular tissue health.',
      ar: 'محفز حركية الخلايا لإعادة بناء الأوعية الدموية وعضلة القلب ومرونة الأنسجة والعضلات.'
    },
    fullDescription: {
      ru: 'TB-500 — синтетический аналог естественного пептида тимозина бета-4, который содержится практически во всех клетках человека. Он способствует быстрой регенерации поврежденных мышечных групп, повышает растяжимость связок, подавляет мышечные спазмы, улучшает транспорт кислорода к тканям и снижает фиброз (образование рубцов).',
      en: 'TB-500 is a bioactive synthetic model of natural thymosin beta-4 found inside almost all mammalian tissues. It upregulates cellular migration, coordinates myofibrillar expansion, limits fibrous adhesions (scars), and improves systemic oxygenated vascular pathways.',
      ar: 'TB-500 هو ببتيد يحاكي تيموسين بيتا-4 الطبيعي ويحفز الانتقال والهجرة الخلوية لتسريع الشفاء العضلي والحد من الالتصاقات الليفية الضارة.'
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
      ],
      ar: [
         'التمزق الميكروي وإجهاد العضلات والتهابها بعد التدريبات الحادة',
         'انخفاض مرونة المفاصل أو مشاكل تغذية عضلة القلب وعروق الدم',
         'الآلام المزمنة المرتبطة بالندوب القديمة والالتصاقات الليفية'
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
      ],
      ar: [
         'الحساسية من مستخلصات بروتين الغدة الزعترية المزدوجة',
         'وجود أورام نشطة أو تاريخ طبي للتغيرات الخلوية الغير منتظمة'
      ]
    },
    usage: {
      ru: 'Подкожно в жировую прослойку. Первая фаза (загрузка): 2-5 мг дважды в неделю на протяжении первых 4-6 недель. Поддерживающая фаза: 2-4 мг каждые 14 дней.',
      en: 'Subcutaneously in abdominal fat. Loading phase: 2-5mg twice weekly during first 4-6 weeks. Maintenance phase: 2-4mg single injection every 14 days.',
      ar: 'حقن تحت الجلد في دهون البطن. مرحلة التحميل: 2-5 ملغ مرتين أسبوعياً لأول 4-6 أسابيع ثم للوقاية 2-4 ملغ كل 14 يوماً.'
    },
    price: 16500,
    image: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=600&auto=format&fit=crop&q=80',
    rating: 4.82,
    form: 'vial',
    mgPerUnit: 5,
    dosageRules: {
      mgPerKgPerDay: 0.005,
      defaultDailyDoses: 1
    }
  },
  {
    id: 'melanotan-2',
    name: {
      ru: 'Melanotan II 10mg',
      en: 'Melanotan II 10mg',
      ar: 'ميلانوتان 2 10 ملغ'
    },
    category: 'antiaging',
    activeSubstance: {
      ru: 'Melanotan II (Меланотан 2)',
      en: 'Melanotan 2',
      ar: 'ميلانوتان 2'
    },
    description: {
      ru: 'Пептид ровного глубокого загара без ожогов с сильным эффектом подавления аппетита и стимуляции либидо.',
      en: 'Deep safe tanning peptide without sunburn. Upregulates melanin, enhances libido, and diminishes appetite.',
      ar: 'ببتيد رائد للتلوين والبرونزية العميقة للجلد وحماية خلايا البشرة مع تثبيط الشهية وتنشيط الرغبة.'
    },
    fullDescription: {
      ru: 'Меланотан II — это синтетический аналог естественного меланокортина, пептидного гормона, стимулирующего выработку меланина. Он взаимодействует с рецепторами меланоцитов, заставляя кожу темнеть и приобретать глубокий шоколадный загар с минимальным облучением УФ-лучами. Также активно воздействует на рецепторы удовольствия в ЦНС, снижая аппетит и усиливая эректильную функцию.',
      en: 'Melanotan II is a peptide analog of alpha-melanocyte stimulating hormone (a-MSH). It triggers rapid and protective skin pigment darkening (melanogenesis) in human tissue, allowing elegant bronzing with minimal sun exposure. Also coordinates neurochemical triggers, reducing appetite and boosting libido.',
      ar: 'ميلانوتان 2 هو نظير اصطناعي لهرمون ميلانوكورتين الطبيعي، الذي ينشط إنتاج الميلانين لحماية البشرة وإضفاء زينة برونزية متألقة بجلسات عرض شمس طفيفة.'
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
      ],
      ar: [
         'البشرة الحساسة البيضاء جداً والتعرض الفوري لضربات الشمس الحارقة',
         'منع تضرر الخلايا السطحية بفعل الضوء المحفز والوقاية من المشاكل',
         'زيادة الرغبة وتحسين الطاقة الجنسية والكفاءة الذاتية'
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
      ],
      ar: [
         'علامات شامة غير نمطية وقابلية عائلية لمشاكل الجلد',
         'أزمات ضغط الدم المرتفع أو الشديدة الغير منضبطة',
         'الحمل وفترات الرضاعة وأقل من الثامنة عشر عاماً'
      ]
    },
    usage: {
      ru: 'Подкожно в живот. Схема загара состоит из фазы накопления (150-300 мкг ежедневно до достижения нужного оттенка) и поддерживающей фазы (300-500 мкг раз в неделю перед походом на солнце).',
      en: 'Subcutaneously in the abdomen. Regimen includes: Loading phase (150-300 mcg daily until target shade is reached) and Maintenance phase (300-500 mcg once weekly before tanning exposure).',
      ar: 'حقن تحت الجلد في منطقة البطن. مرحلة البناء والتراكم الحبيبي: 150-300 ميكروغرام يومياً، وللوقاية 300-500 ميكروغرام أسبوعياً.'
    },
    price: 14000,
    image: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=600&auto=format&fit=crop&q=80',
    rating: 4.79,
    form: 'vial',
    mgPerUnit: 10,
    dosageRules: {
      mgPerKgPerDay: 0.003,
      defaultDailyDoses: 1
    }
  },
  {
    id: 'ipamorelin',
    name: {
      ru: 'Ipamorelin 5mg',
      en: 'Ipamorelin 5mg',
      ar: 'إيباموريلين 5 ملغ'
    },
    category: 'antiaging',
    activeSubstance: {
      ru: 'Ipamorelin (Ипаморелин)',
      en: 'Ipamorelin',
      ar: 'إيباموريلين'
    },
    description: {
      ru: 'Высокоселективный стимулятор выброса соматотропного гормона для омоложения кожи, укрепления суставов и прироста качественной мускулатуры.',
      en: 'Highly selective growth hormone secretagogue for skin collagen optimization, joint strength, and lean muscles.',
      ar: 'محفز عالي الانتقائية لإفراز هرمون النمو وصناعته الطبيعية لشد البشرة واستعادة مرونة الجلد المفقودة وعمر الشباب.'
    },
    fullDescription: {
      ru: 'Ипаморелин — это пентапептид нового поколения, стимулирующий секрецию собственного гормона роста. В отличие от ГХРП-6 и ГХРП-2, он действует абсолютно селективно: не вызывает скачков аппетита (не активирует грелин), не повышает пролактин и кортизол. Обеспечивает прекрасный восстановительный сон, жиросжигание во время отдыха, уплотнение мышечных волокон и обновление коллагена кожи.',
      en: 'Ipamorelin is a modern highly selective pentapeptide that stimulates growth hormone secretion. Unlike older peptides (GHRP-6/2), it acts selectively without driving hunger (does not activate ghrelin receptors) or altering cortisol and prolactin. Enhances restorative sleep and skin cell matrix.',
      ar: 'إيباموريلين هو بنتابيبتيد حديث يعزز مستويات هرمون النمو الداخلي بانتقائية تامة، دون تحفيز هرمونات الجوع المفرطة (الغيريلين) أو التأثير على كورتيزول الجسم.'
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
      ],
      ar: [
         'بطء الاستشفاء المرتبط بزيادة العمر وفقدان نضارة الجلد والتجاعيد التعبييرية',
         'الرغبة في زيادة الكتلة العضلية الصافية دون تراكم مفرط للمياه وسوائل الجلد',
         'الأرق والتقطع المستمر في دورة النوم وصعوبة الحصول على قسط كاف من الراحة'
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
      ],
      ar: [
         'حالات العدوى الموسمية والالتهابات الحادة قيد النشاط الجسدي',
         'الأمراض السرطانية قيد النشاط أو المشتبه بها في خلايا الجسم'
      ]
    },
    usage: {
      ru: 'Подкожно в область живота перед сном или за 40 минут до тренировки. Обычная средняя дозировка составляет от 100 мкг до 200 мкг до трех раз в день натощак.',
      en: 'Subcutaneously in abdominal fat. Taken prior to sleep or 40 minutes before workout sessions. Standard dosage is 100 mcg to 200 mcg up to three times per day on empty stomach.',
      ar: 'يحقن تحت الجلد في منطقة البطن قبل النوم أو قبل التدريب بـ 40 دقيقة بجرعات 100-200 ميكروغرام على معدة فارغة.'
    },
    price: 12500,
    image: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=600&auto=format&fit=crop&q=80',
    rating: 4.85,
    form: 'vial',
    mgPerUnit: 5,
    dosageRules: {
      mgPerKgPerDay: 0.003,
      defaultDailyDoses: 3
    }
  }
];

export const TRANSLATIONS: Record<string, Record<Language, string>> = {
  appName: {
    ru: 'Peptide Pharma',
    en: 'Peptide Pharma',
    ar: 'ببتيد فارما'
  },
  appSubtitle: {
    ru: 'Премиальные сертифицированные пептиды и точный калькулятор разведения',
    en: 'Premium certified peptides and state-of-the-art dilution calculator',
    ar: 'الببتيدات المعتمدة الممتازة وحاسبة التخفيف المتقدمة'
  },
  homeTab: {
    ru: 'Каталог',
    en: 'Catalog',
    ar: 'الكتالوج'
  },
  calcTab: {
    ru: 'Калькулятор разведения',
    en: 'Dilution Calculator',
    ar: 'حاسبة التخفيف'
  },
  ordersTab: {
    ru: 'Мои заказы',
    en: 'My Orders',
    ar: 'طلباتي'
  },
  searchPlaceholder: {
    ru: 'Искать пептид по названию или активному веществу...',
    en: 'Search peptide by name or active compound...',
    ar: 'ابحث عن الببتيد بالاسم أو المادة الفعالة...'
  },
  loginBtn: {
    ru: 'Войти',
    en: 'Sign In',
    ar: 'تسجيل الدخول'
  },
  logoutBtn: {
    ru: 'Выйти',
    en: 'Sign Out',
    ar: 'تسجيل الخروج'
  },
  registerBtn: {
    ru: 'Регистрация',
    en: 'Register',
    ar: 'تسجيل جديد'
  },
  categoriesAll: {
    ru: 'Все пептиды',
    en: 'All Peptides',
    ar: 'جميع الببتيدات'
  },
  catWeightloss: {
    ru: 'Похудение & GLP-1',
    en: 'Fat Loss & GLP-1',
    ar: 'تخسيس الوزن & GLP-1'
  },
  catHealing: {
    ru: 'Восстановление & Суставы',
    en: 'Recovery & Healing',
    ar: 'الاستشفاء & المفاصل'
  },
  catAntiaging: {
    ru: 'Омоложение & BEAUTY',
    en: 'Anti-Aging & BEAUTY',
    ar: 'مкосметика & الجمال'
  },
  addToCart: {
    ru: 'Добавить в корзину',
    en: 'Add to Cart',
    ar: 'إضافة إلى السلة'
  },
  itemAdded: {
    ru: 'В корзине',
    en: 'In Cart',
    ar: 'في السلة'
  },
  outOfStock: {
    ru: 'Нет в наличии',
    en: 'Out of Stock',
    ar: 'غير متوفر'
  },
  priceLabel: {
    ru: 'Цена',
    en: 'Price',
    ar: 'السعر'
  },
  currencySymbol: {
    ru: '₸',
    en: '$',
    ar: '₸'
  },
  activeSubstanceLabel: {
    ru: 'Активное вещество',
    en: 'Active Substance',
    ar: 'المادة الفعالة'
  },
  ratingLabel: {
    ru: 'Рейтинг',
    en: 'Rating',
    ar: 'التقييم'
  },
  backToCatalog: {
    ru: '← Вернуться в каталог',
    en: '← Back to Catalog',
    ar: '← العودة إلى الكتالوج'
  },
  aboutDrug: {
    ru: 'Описание пептида',
    en: 'Peptide Profile',
    ar: 'تفاصيل الببتيد'
  },
  indicationsTitle: {
    ru: 'Показания и эффекты',
    en: 'Indications & Benefits',
    ar: 'دواعي الاستعمال والفوائد'
  },
  contraindicationsTitle: {
    ru: 'Противопоказания',
    en: 'Contraindications',
    ar: 'موانع الاستعمال'
  },
  usageMethod: {
    ru: 'Инструкции по введению и разведению',
    en: 'Reconstitution & Administration Guide',
    ar: 'دليل تخفيف وحقن الدواء'
  },
  calculatorHeader: {
    ru: 'Калькулятор Разведения и Доз Пептидов',
    en: 'Peptide Dilution & Reconstitution Calculator',
    ar: 'حاسبة تخفيف وجرعات الببتيدات السريرية'
  },
  calcIntro: {
    ru: 'Профессиональный инструмент расчета пептидного разведения. Рассчитайте, сколько микролитров или единиц инсулинового шприца (U100/U50) нужно набрать для точного получения желаемой дозировки активного вещества.',
    en: 'Professional peptide reconstitution planner. Choose your vial dosage, bacteriostatic water added, and targeted single dose to visually see exactly how many units on your insulin syringe to draw.',
    ar: 'أداة احترافية لحساب تركيب وتخفيف الببتيد. حدد حجم المادة الفعالة، والماء المضاف، والجرعة المطلوبة لعرض وحدات حقنة الأنسولين اللازمة للسحب بالضبط بشكل مرئي.'
  },
  selectMedicineLabel: {
    ru: 'Препарат для расчета',
    en: 'Target Peptide',
    ar: 'الببتيد المستهدف للحساب'
  },
  enterWeightLabel: {
    ru: 'Количество вещества во флаконе (мг)',
    en: 'Peptide Quantity in Vial (mg)',
    ar: 'كمية المادة الفعالة في القارورة (ملغ)'
  },
  enterDaysLabel: {
    ru: 'Объем воды для разведения (мл)',
    en: 'Bacteriostatic Water Added (ml)',
    ar: 'كمية ماء التخفيف المعقم (مل)'
  },
  calcResultsTitle: {
    ru: 'Результаты планирования разведения',
    en: 'Dilution & Injection Planning Results',
    ar: 'نتائج تخطيط التخفيف والحقن'
  },
  recommendedDailyDose: {
    ru: 'Концентрация раствора',
    en: 'Diluted Concentration Factor',
    ar: 'تركيز المحلول المخفف'
  },
  dosesPerDay: {
    ru: 'Пептида в одной единице шприца',
    en: 'Active substance per 1 syringe unit',
    ar: 'كمية الببتيد في كل وحدة تفصيلية'
  },
  dosePerIntake: {
    ru: 'Необходимый объем для дозы',
    en: 'Required volume for desired dose',
    ar: 'الحجم المطلوب للجرعة المحددة'
  },
  packsNeeded: {
    ru: 'Количество единиц инъекции',
    en: 'Total units (IU) to draw',
    ar: 'عدد وحدات حقنة الأنسولين (U)'
  },
  estimatedCost: {
    ru: 'Цена одного флакона',
    en: 'Vial Unit Price',
    ar: 'سعر القارورة الواحدة'
  },
  unitsTablets: {
    ru: 'U',
    en: 'U',
    ar: 'وحدة'
  },
  unitsCapsules: {
    ru: 'U',
    en: 'U',
    ar: 'وحدة'
  },
  btnAddToCartCalc: {
    ru: 'Добавить данный флакон в корзину',
    en: 'Add this Peptide Vial to Cart',
    ar: 'إضافة هذه القارورة إلى السلة'
  },
  cartTitle: {
    ru: 'Ваша Корзина',
    en: 'Your Shopping Cart',
    ar: 'سلة المشتريات الخاصة بك'
  },
  cartEmpty: {
    ru: 'Ваша корзина пока пуста. Загляните в каталог высококачественных пептидов!',
    en: 'Your shopping cart is empty. Feel free to explore our original peptide catalog!',
    ar: 'سلتك فارغة حالياً. ندعوك لاستكشاف كتالوج الببتيدات الأصلية عالية الجودة لدينا!'
  },
  itemsTotal: {
    ru: 'Итого флаконов',
    en: 'Total vials',
    ar: 'إجمالي القوارير'
  },
  deliveryFree: {
    ru: 'Доставка',
    en: 'Delivery',
    ar: 'الشحن والتوصيل'
  },
  freeStatus: {
    ru: 'Бесплатно (от 15000 ₸)',
    en: 'Free (over $30)',
    ar: 'توصيل مجاني (فوق 15000 ₸)'
  },
  totalToPay: {
    ru: 'Сумма к оплате',
    en: 'To Pay Total',
    ar: 'المبلغ الإجمالي للدفع'
  },
  checkoutSectionHeader: {
    ru: 'Оформление экспресс доставки и оплаты',
    en: 'Express Delivery Details & Secure Checkout',
    ar: 'تفاصيل التوصيل السريع والدفع الآمن'
  },
  deliveryAddressLabel: {
    ru: 'Адрес быстрой доставки',
    en: 'Delivery Address',
    ar: 'عنوان التوصيل'
  },
  cityLabel: {
    ru: 'Город / Населенный пункт',
    en: 'City',
    ar: 'المدينة / المنطقة'
  },
  streetLabel: {
    ru: 'Улица, дом, квартира',
    en: 'Street, House & Apt Number',
    ar: 'الشارع، رقم البناء والشقة'
  },
  apartmentLabel: {
    ru: 'Подъезд, этаж, домофон (необязательно)',
    en: 'Entrance & Floor Info (optional)',
    ar: 'ملاحظات إضافية (اختياري)'
  },
  postalCodeLabel: {
    ru: 'Почтовый индекс',
    en: 'Postal Code',
    ar: 'الرمز البريدي'
  },
  phoneLabel: {
    ru: 'Контактный телефон с кодом',
    en: 'Contact Phone Number',
    ar: 'رقم هاتف الاتصال'
  },
  paymentMethodLabel: {
    ru: 'Выберите метод оплаты',
    en: 'Payment Method',
    ar: 'اختر طريقة الدفع'
  },
  payCardOnline: {
    ru: 'Копирование реквизитов или Картой онлайн',
    en: 'Credit Card (Stripe/Online)',
    ar: 'بطاقة ائتمان عبر الإنترنت'
  },
  payCashOnDelivery: {
    ru: 'Оплата курьеру при получении',
    en: 'Cash on Delivery (Courier)',
    ar: 'الدفع نقداً عند الاستلام'
  },
  cardHolderLabel: {
    ru: 'Имя владельца карты',
    en: 'Cardholder Name',
    ar: 'اسم صاحب البطاقة'
  },
  cardNumberLabel: {
    ru: 'Номер карты (16 цифр)',
    en: 'Card Number',
    ar: 'رقم البطاقة (16 رقماً)'
  },
  cardExpiryLabel: {
    ru: 'Срок действия (ММ/ГГ)',
    en: 'Expiry Date',
    ar: 'تاريخ انتهاء الصلاحية (MM/YY)'
  },
  cardCvvLabel: {
    ru: 'Код CVV / CVC',
    en: 'CVV / CVC Code',
    ar: 'رمز التحقق الرقمي CVV / CVC'
  },
  placeOrderBtn: {
    ru: 'Подтвердить заказ и перейти к оплате',
    en: 'Confirm & Pay Securely',
    ar: 'تأكيد وشراء الطلب بشكل آمن'
  },
  orderPlacedSuccess: {
    ru: 'Заказ успешно оформлен и передан в курьерскую службу!',
    en: 'Order Placed Successfully. Dispatched for Courier!',
    ar: 'تم تسجيل الطلب بنجاح وهو الآن قيد التسليم مع خدمة التوصيل!'
  },
  orderEstimateMsg: {
    ru: 'Отправка производится в день заказа во все регионы. Наш менеджер пришлет трек-номер в СМС/Telegram.',
    en: 'Shipped immediately. Your manager will text you the tracking code on WhatsApp/Telegram.',
    ar: 'يتم الشحن فوراً في نفس اليوم لجميع المناطق. سيرسل لك المندوب رمز التتبع عبر SMS أو تلغرام.'
  },
  orderTrackNumber: {
    ru: 'Индификатор отправления (Трек)',
    en: 'Post Tracking Code',
    ar: 'رمز تتبع الشحنة البريدي'
  },
  authModalHeaderLogin: {
    ru: 'Вход в закрытый клуб покупателей',
    en: 'Sign In to Client Cabinet',
    ar: 'تسجيل الدخول إلى نادي العملاء المغلق'
  },
  authModalHeaderReg: {
    ru: 'Регистрация премиум аккаунта',
    en: 'Create Certified Account',
    ar: 'إنشاء حساب مميز معتمد'
  },
  fullNameLabel: {
    ru: 'Ваше ФИО',
    en: 'Full Name',
    ar: 'الاسم الكامل الثلاثي'
  },
  emailLabel: {
    ru: 'Электронный адрес',
    en: 'Email Address',
    ar: 'البريد الإلكتروني'
  },
  passwordLabel: {
    ru: 'Пароль доступа',
    en: 'Access Password',
    ar: 'كلمة مرور الدخول'
  },
  authToggleRegMsg: {
    ru: 'Еще не зарегистрированы? Создать аккаунт',
    en: "First time here? Sign Up Now",
    ar: 'ليس لديك حساب بعد؟ سجل الآن'
  },
  authToggleLoginMsg: {
    ru: 'Уже состоите в клубе? Войти',
    en: 'Already registered? Sign In',
    ar: 'المشترك بالفعل في النادي؟ تسجيل الدخول'
  },
  submitLogin: {
    ru: 'Авторизоваться',
    en: 'Sign In Now',
    ar: 'تفويض الدخول'
  },
  submitReg: {
    ru: 'Зарегистрироваться',
    en: 'Create Account',
    ar: 'تسجيل الحساب الفوري'
  },
  userProfileTitle: {
    ru: 'Личный профиль клиента',
    en: 'Client Profile',
    ar: 'الملف الشخصي للعميل'
  },
  userWelcome: {
    ru: 'Приветствуем в Peptide Pharma,',
    en: 'Welcome to Peptide Pharma,',
    ar: 'مرحباً بك في ببتيد فارما،'
  },
  savedAddressLabel: {
    ru: 'Сохраненный адрес доставки',
    en: 'Saved Shipping Address',
    ar: 'عنوان الشحن المحفوظ'
  },
  historyEmpty: {
    ru: 'Вы еще не делали заказов в нашем магазине.',
    en: 'You have not placed any orders yet.',
    ar: 'لم تقم بإجراء أي طلبات في متجرنا حتى الآن.'
  },
  historyHeader: {
    ru: 'Архив ваших доставок',
    en: 'Your Orders Archive',
    ar: 'أرشيف طلباتك السابقة'
  },
  statusPending: {
    ru: 'Обрабатывается',
    en: 'Preparing Shipment',
    ar: 'قيد التحضير والمعالجة'
  },
  statusShipped: {
    ru: 'Передан в СДЭК / Казпочту',
    en: 'Shipped (Courier Dispatch)',
    ar: 'تم تسليم الشحنة للبريد / خدمة النقل'
  },
  statusDelivered: {
    ru: 'Доставлен адресату',
    en: 'Delivered',
    ar: 'مستلم من قبل المشتري'
  },
  calcWeightError: {
    ru: 'Пожалуйста, введите корректные параметры.',
    en: 'Please fill with valid input parameters.',
    ar: 'يرجى إدخال المدخلات والمعايير الصحيحة.'
  },
  calcSelectError: {
    ru: 'Пожалуйста, выберите целевой пептид.',
    en: 'Select the targeted peptide first.',
    ar: 'يرجى اختيار الببتيد المستهدف أولاً.'
  }
};
