export interface Medicine {
  id: string;
  name: Record<string, string>;
  category: string;
  activeSubstance: Record<string, string>;
  description: Record<string, string>;
  fullDescription: Record<string, string>;
  indications: Record<string, string[]>;
  contraindications: Record<string, string[]>;
  usage: Record<string, string>;
  price: number;
  image: string;
  rating: number;
  form: string;
  mgPerUnit: number;
  volumes: number[];
  dosageRules: { mgPerKgPerDay: number; defaultDailyDoses: number };
  inStock?: boolean;
}

export const MEDICINES_DATA: Medicine[] = [
  {
    id: 'semaglutide',
    name: { ru: 'Semaglutide 5mg', en: 'Semaglutide 5mg', ar: 'سيماجلوتايد 5 ملغ' },
    category: 'weightloss',
    activeSubstance: { ru: 'Semaglutide (Семаглутид)', en: 'Semaglutide', ar: 'سيماجلوتايد' },
    description: {
      ru: 'Революционный пептид для снижения аппетита, улучшения метаболизма и эффективного контроля веса.',
      en: 'Revolutionary peptide for appetite suppression, metabolic enhancement, and effective weight management.',
      ar: 'ببتيد ثوري لكبح الشهية وتحسين التمثيل الغذائي والتحكم الفعال في الوزن.'
    },
    fullDescription: {
      ru: 'Семаглутид — это селективный агонист рецепторов ГПП-1 (глюкагоноподобного пептида-1). Он имитирует действие естественного гормона сытости, замедляет опорожнение желудка и посылает сигналы в головной мозг о насыщении.',
      en: 'Semaglutide is a selective GLP-1 (glucagon-like peptide-1) receptor agonist. It mimics the natural satiety hormone, slows gastric emptying, and transmits fullness signals to the brain.',
      ar: 'سيماجلوتايد هو منبه انتقائي لمستقبلات هرمون الجلوكاجون الببتيد الشبيه بالببتيد-1 ويحاكي عمل هرمون الشبع الطبيعي.'
    },
    indications: {
      ru: ['Избыточная масса тела (ИМТ > 27)', 'Хроническое переедание', 'Инсулинорезистентность'],
      en: ['Excess body weight (BMI > 27)', 'Chronic overeating', 'Insulin resistance'],
      ar: ['زيادة الوزن (BMI > 27)', 'الإفراط في تناول الطعام', 'مقاومة الأنسولين']
    },
    contraindications: {
      ru: ['Индивидуальная непереносимость', 'Медуллярный рак щитовидной железы', 'Беременность'],
      en: ['Hypersensitivity to Semaglutide', 'Medullary thyroid carcinoma history', 'Pregnancy'],
      ar: ['حساسية من السيماجلوتايد', 'سرطان الغدة الدرقية النخاعي', 'الحمل']
    },
    usage: {
      ru: 'Подкожно 1 раз в неделю. Начинать с 0.25 мг в неделю.',
      en: 'Subcutaneous injection once weekly. Starter dose 0.25mg per week.',
      ar: 'للحقن تحت الجلد مرة أسبوعياً. يوصى بـ 0.25 ملغ أسبوعياً للبداية.'
    },
    price: 18500,
    image: 'https://images.unsplash.com/photo-1579154204601-01588f351166?w=600&auto=format&fit=crop&q=80',
    rating: 4.9,
    form: 'vial',
    mgPerUnit: 5,
    volumes: [2, 5, 10],
    dosageRules: { mgPerKgPerDay: 0.005, defaultDailyDoses: 1 }
  },
  {
    id: 'tirzepatide',
    name: { ru: 'Tirzepatide 10mg', en: 'Tirzepatide 10mg', ar: 'تيرزيباتايد 10 ملغ' },
    category: 'weightloss',
    activeSubstance: { ru: 'Tirzepatide (Тирзепатид)', en: 'Tirzepatide', ar: 'تيرزيباتايد' },
    description: {
      ru: 'Двойной агонист рецепторов GIP/GLP-1 для продвинутого сжигания жира и нормализации липидного профиля.',
      en: 'Dual GIP/GLP-1 receptor agonist for advanced fat burning and lipid normalization.',
      ar: 'منشط مزدوج لمستقبلات GIP / GLP-1 لحرق الدهون المتقدم.'
    },
    fullDescription: {
      ru: 'Тирзепатид — это первый в своем классе двойной агонист рецепторов GIP и GLP-1. Синергетический эффект двух гормонов обеспечивает беспрецедентный результат в сжигании висцерального жира.',
      en: 'Tirzepatide is a first-in-class dual GIP and GLP-1 receptor agonist. The synergistic action of both hormones yields unprecedented results in burning visceral fat.',
      ar: 'تيرزيباتايد هو منشط مزدوج لمستقبلات GIP و GLP-1.'
    },
    indications: {
      ru: ['Серьезные стадии ожирения (ИМТ > 30)', 'Неэффективность монотерапии GLP-1', 'Метаболический синдром'],
      en: ['Severe obesity (BMI > 30)', 'Ineffective single GLP-1 therapy', 'Metabolic syndrome'],
      ar: ['السمنة المتقدمة (BMI > 30)', 'عدم استجابة العلاجات الأحادية', 'المتلازمة الأيضية']
    },
    contraindications: {
      ru: ['Медуллярный рак щитовидной железы', 'ВЗК в стадии обострения', 'Беременность'],
      en: ['Medullary thyroid carcinoma', 'Active inflammatory bowel disease', 'Pregnancy'],
      ar: ['سرطان الغدة الدرقية', 'أمراض الأمعاء الالتهابية', 'الحمل']
    },
    usage: {
      ru: 'Подкожно раз в неделю. Начальная доза 2.5 мг на 4 недели, затем 5 мг.',
      en: 'Subcutaneously once weekly. Start with 2.5mg for 4 weeks, then escalate to 5mg.',
      ar: 'تحت الجلد مرة أسبوعياً. 2.5 ملغ لأول 4 أسابيع ثم 5 ملغ.'
    },
    price: 32000,
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&auto=format&fit=crop&q=80',
    rating: 4.95,
    form: 'vial',
    mgPerUnit: 10,
    volumes: [5, 10, 15],
    dosageRules: { mgPerKgPerDay: 0.007, defaultDailyDoses: 1 }
  },
  {
    id: 'bpc-157',
    name: { ru: 'BPC-157 5mg', en: 'BPC-157 5mg', ar: 'بي بي سي-157 5 ملغ' },
    category: 'healing',
    activeSubstance: { ru: 'Body Protection Compound (Пентадекапептид)', en: 'Pentadecapeptide BPC-157', ar: 'بي بي سي-157' },
    description: {
      ru: 'Пептид экстремальной тканевой регенерации: ускоряет заживление связок, сухожилий и слизистой ЖКТ.',
      en: 'Extreme tissue regeneration peptide. Promotes fast ligament, tendon, and gut lining healing.',
      ar: 'ببتيد لإعادة بناء الأنسجة المتضررة ويسرع التئام الأربطة والأوتار.'
    },
    fullDescription: {
      ru: 'BPC-157 — синтетический защитный пептид из 15 аминокислот. Ускоряет ангиогенез, увеличивает выработку коллагена, стимулирует фибробласты.',
      en: 'BPC-157 is a synthetic pentadecapeptide containing 15 amino acids. It triggers angiogenesis, upregulates collagen, and boosts fibroblast migration.',
      ar: 'مركب BPC-157 يتكون من 15 حمضاً أمينياً يساعد في إعادة تخليق الأوعية وتنشيط الكولاجين.'
    },
    indications: {
      ru: ['Растяжения связок, разрывы сухожилий', 'Регенерация после операций на ОДА', 'Язвы слизистой ЖКТ'],
      en: ['Ligament sprains, tendon tears', 'Post-surgical orthopedic rehabilitation', 'Gastric ulcers'],
      ar: ['تمزق الأوتار والأربطة', 'النقاهة بعد العمليات الجراحية', 'قرحة المعدة']
    },
    contraindications: {
      ru: ['Гиперчувствительность к пентадекапептиду', 'Активный злокачественный процесс'],
      en: ['Hypersensitivity to pentadecapeptide', 'Active malignant tumor growth'],
      ar: ['فرط الحساسية من الببتيد', 'نشاط الأورام السرطانية']
    },
    usage: {
      ru: 'Подкожно или локально внутримышечно. 250-500 мкг 1-2 раза в день, 15-30 дней.',
      en: 'Subcutaneously or intramuscularly near injury. 250-500 mcg twice daily for 15-30 days.',
      ar: 'تحت الجلد أو موضعياً 250-500 ميكروغرام مرتين يومياً لمدة 15-30 يوماً.'
    },
    price: 15000,
    image: 'https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?w=600&auto=format&fit=crop&q=80',
    rating: 4.88,
    form: 'vial',
    mgPerUnit: 5,
    volumes: [2, 5, 10],
    dosageRules: { mgPerKgPerDay: 0.004, defaultDailyDoses: 2 }
  },
  {
    id: 'tb-500',
    name: { ru: 'TB-500 5mg', en: 'TB-500 5mg', ar: 'تي بي-500 5 ملغ' },
    category: 'healing',
    activeSubstance: { ru: 'Thymosin Beta-4 Ac-SDKP', en: 'Thymosin Beta-4 active fragment', ar: 'تيموسين بيتا-4' },
    description: {
      ru: 'Стимулятор клеточной подвижности для восстановления кровеносной системы и мышечных волокон.',
      en: 'Cellular motility stimulator for cardiovascular tissue repair and skeletal muscle health.',
      ar: 'محفز حركية الخلايا لإعادة بناء الأوعية الدموية والأنسجة والعضلات.'
    },
    fullDescription: {
      ru: 'TB-500 — синтетический аналог тимозина бета-4. Способствует быстрой регенерации мышц, повышает растяжимость связок, снижает фиброз.',
      en: 'TB-500 is a bioactive synthetic model of thymosin beta-4. Upregulates cellular migration, limits fibrous adhesions, and improves vascular pathways.',
      ar: 'TB-500 هو ببتيد يحاكي تيموسين بيتا-4 لتسريع الشفاء العضلي والحد من الالتصاقات الليفية.'
    },
    indications: {
      ru: ['Мышечные разрывы после тренировок', 'Утрата гибкости суставов', 'Хронические боли от старых травм'],
      en: ['Muscle tears after workouts', 'Decreased joint flexibility', 'Chronic pain from old trauma'],
      ar: ['التمزق العضلي بعد التدريبات', 'انخفاض مرونة المفاصل', 'الآلام المزمنة من الإصابات القديمة']
    },
    contraindications: {
      ru: ['Аллергия на ацетилированные пептиды тимуса', 'Наличие новообразований'],
      en: ['Allergy to thymus-derived acetylated compounds', 'Active tumor growth'],
      ar: ['الحساسية من مستخلصات الغدة الزعترية', 'وجود أورام نشطة']
    },
    usage: {
      ru: 'Подкожно. Фаза загрузки: 2-5 мг дважды в неделю (4-6 недель). Поддержка: 2-4 мг каждые 14 дней.',
      en: 'Subcutaneously. Loading: 2-5mg twice weekly for 4-6 weeks. Maintenance: 2-4mg every 14 days.',
      ar: 'تحت الجلد. التحميل: 2-5 ملغ مرتين أسبوعياً لـ 4-6 أسابيع. الوقاية: 2-4 ملغ كل 14 يوماً.'
    },
    price: 16500,
    image: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=600&auto=format&fit=crop&q=80',
    rating: 4.82,
    form: 'vial',
    mgPerUnit: 5,
    volumes: [2, 5, 10],
    dosageRules: { mgPerKgPerDay: 0.005, defaultDailyDoses: 1 }
  },
  {
    id: 'melanotan-2',
    name: { ru: 'Melanotan II 10mg', en: 'Melanotan II 10mg', ar: 'ميلانوتان 2 10 ملغ' },
    category: 'antiaging',
    activeSubstance: { ru: 'Melanotan II (Меланотан 2)', en: 'Melanotan 2', ar: 'ميلانوتان 2' },
    description: {
      ru: 'Пептид глубокого загара без ожогов с эффектом подавления аппетита и стимуляции либидо.',
      en: 'Deep safe tanning peptide without sunburn. Upregulates melanin, enhances libido, and diminishes appetite.',
      ar: 'ببتيد للتلوين البرونزي العميق للجلد مع تثبيط الشهية وتنشيط الرغبة.'
    },
    fullDescription: {
      ru: 'Меланотан II — синтетический аналог меланокортина. Взаимодействует с рецепторами меланоцитов, заставляя кожу темнеть с минимальным облучением УФ.',
      en: 'Melanotan II is a peptide analog of alpha-melanocyte stimulating hormone. Triggers rapid protective skin pigment darkening with minimal sun exposure.',
      ar: 'ميلانوتان 2 هو نظير اصطناعي لهرمون ميلانوكورتين ينشط إنتاج الميلانين للحماية والبرونزية.'
    },
    indications: {
      ru: ['Очень бледная кожа (I-II цветотипы)', 'Профилактика меланомы', 'Коррекция либидо'],
      en: ['Highly sensitive white skin (Types I & II)', 'Sunburn prevention', 'Libido enhancement'],
      ar: ['البشرة الحساسة البيضاء جداً', 'منع الحروق الشمسية', 'زيادة الرغبة']
    },
    contraindications: {
      ru: ['Атипичные родинки, предрасположенность к меланоме', 'Гипертоническая болезнь', 'Беременность'],
      en: ['Atypical moles or melanoma history', 'Uncontrolled hypertension', 'Pregnancy'],
      ar: ['الشامات غير النمطية', 'ضغط الدم المرتفع', 'الحمل']
    },
    usage: {
      ru: 'Подкожно в живот. Фаза загрузки: 150-300 мкг ежедневно. Поддержка: 300-500 мкг раз в неделю.',
      en: 'Subcutaneously in abdomen. Loading phase: 150-300 mcg daily. Maintenance: 300-500 mcg once weekly.',
      ar: 'تحت الجلد في البطن. التراكم: 150-300 ميكروغرام يومياً. الوقاية: 300-500 ميكروغرام أسبوعياً.'
    },
    price: 14000,
    image: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=600&auto=format&fit=crop&q=80',
    rating: 4.79,
    form: 'vial',
    mgPerUnit: 10,
    volumes: [5, 10, 15],
    dosageRules: { mgPerKgPerDay: 0.003, defaultDailyDoses: 1 }
  },
  {
    id: 'ipamorelin',
    name: { ru: 'Ipamorelin 5mg', en: 'Ipamorelin 5mg', ar: 'إيباموريلين 5 ملغ' },
    category: 'antiaging',
    activeSubstance: { ru: 'Ipamorelin (Ипаморелин)', en: 'Ipamorelin', ar: 'إيباموريلين' },
    description: {
      ru: 'Высокоселективный стимулятор выброса гормона роста для омоложения кожи и прироста мускулатуры.',
      en: 'Highly selective growth hormone secretagogue for skin collagen optimization and lean muscles.',
      ar: 'محفز عالي الانتقائية لإفراز هرمون النمو لشد البشرة واستعادة مرونة الجلد.'
    },
    fullDescription: {
      ru: 'Ипаморелин — пентапептид нового поколения, стимулирующий выработку гормона роста. Не вызывает скачков аппетита и не повышает кортизол.',
      en: 'Ipamorelin is a highly selective pentapeptide stimulating growth hormone secretion without driving hunger or altering cortisol.',
      ar: 'إيباموريلين هو بنتابيبتيد حديث يعزز هرمون النمو بانتقائية تامة دون تحفيز هرمونات الجوع.'
    },
    indications: {
      ru: ['Возрастная дряблость кожи и морщины', 'Набор мышечной массы без жира', 'Бессонница и хроническая усталость'],
      en: ['Age-associated skin laxity and wrinkles', 'Lean muscle accrual without water retention', 'Insomnia and chronic fatigue'],
      ar: ['ترهل الجلد المرتبط بالعمر', 'زيادة الكتلة العضلية الصافية', 'الأرق والإجهاد المزمن']
    },
    contraindications: {
      ru: ['Острые инфекционные заболевания', 'Активный онкологический процесс'],
      en: ['Acute infectious systemic illness', 'Active oncology or tumor history'],
      ar: ['حالات العدوى الحادة', 'الأمراض السرطانية قيد النشاط']
    },
    usage: {
      ru: 'Подкожно в область живота перед сном или за 40 мин до тренировки. 100-200 мкг до 3 раз в день натощак.',
      en: 'Subcutaneously in abdomen before sleep or 40 min before workout. 100-200 mcg up to 3 times daily on empty stomach.',
      ar: 'تحت الجلد في البطن قبل النوم أو التدريب. 100-200 ميكروغرام حتى 3 مرات على معدة فارغة.'
    },
    price: 12500,
    image: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=600&auto=format&fit=crop&q=80',
    rating: 4.85,
    form: 'vial',
    mgPerUnit: 5,
    volumes: [2, 5, 10],
    dosageRules: { mgPerKgPerDay: 0.003, defaultDailyDoses: 3 }
  }
];
