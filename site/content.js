// Website content, written for this site in English and Arabic. Prices are starting prices; the team confirms each quote.
const contact = { phone: '+20 10 6666 3277', email: 'operation3@retagetravel.com', licence: '1603', since: '2010',
  instagram: 'https://www.instagram.com/retagetravel/', facebook: 'https://www.facebook.com/Retage.travel11' };

// key: [English name, Arabic name, English note, Arabic note]
const places = {
  arrive: ['Arrival in Cairo', 'الوصول إلى القاهرة', 'We meet you at the airport and take you to your hotel.', 'نستقبلك في المطار ونوصلك إلى الفندق.'],
  depart: ['Departure', 'المغادرة', 'Transfer to the airport for your flight home.', 'التوصيل إلى المطار لرحلة العودة.'],
  flycairo: ['Back to Cairo', 'العودة إلى القاهرة', 'A short flight or drive, then a free evening.', 'رحلة قصيرة بالطيران أو السيارة، ثم أمسية حرة.'],
  giza: ['Giza Pyramids', 'أهرامات الجيزة', 'The three great pyramids, with time on the plateau for the long view.', 'الأهرامات الثلاثة، مع وقت على الهضبة لرؤية المشهد كاملًا.'],
  sphinx: ['The Great Sphinx', 'أبو الهول', 'Carved from the bedrock at the foot of the plateau.', 'منحوت من صخر الهضبة نفسها.'],
  gem: ['Grand Egyptian Museum', 'المتحف المصري الكبير', 'The great staircase of statues and the collection beside the pyramids.', 'الدرج العظيم بتماثيله، والمجموعة المعروضة بجوار الأهرامات.'],
  museum: ['Egyptian Museum', 'المتحف المصري بالتحرير', 'The classic museum on Tahrir Square, still full of surprises.', 'المتحف العريق في ميدان التحرير، وما زال مليئًا بالمفاجآت.'],
  citadel: ['Citadel of Saladin', 'قلعة صلاح الدين', 'Cairo’s fortress on the hill, with a view across the whole city.', 'حصن القاهرة فوق التل، بإطلالة على المدينة كلها.'],
  khan: ['Khan el-Khalili', 'خان الخليلي', 'Lanes of lamps, spice and copper in the old bazaar.', 'أزقة الفوانيس والتوابل والنحاس في السوق القديم.'],
  islamic: ['Islamic Cairo', 'القاهرة الإسلامية', 'Mosques, gates and old houses along the medieval streets.', 'مساجد وبوابات وبيوت قديمة على امتداد شوارع العصور الوسطى.'],
  coptic: ['Coptic Cairo', 'القاهرة القبطية', 'The Hanging Church and the quiet lanes of the old quarter.', 'الكنيسة المعلقة وحارات الحي القديم الهادئة.'],
  memphis: ['Memphis', 'ميت رهينة (منف)', 'Egypt’s first capital, and the fallen colossus of Ramesses II.', 'أول عاصمة لمصر، وتمثال رمسيس الثاني الراقد.'],
  saqqara: ['Saqqara', 'سقارة', 'Djoser’s step pyramid and painted tombs of the Old Kingdom.', 'هرم زوسر المدرج ومقابر الدولة القديمة الملونة.'],
  dahshur: ['Dahshur', 'دهشور', 'The Bent and Red pyramids, with far fewer visitors.', 'الهرم المنحني والهرم الأحمر، بعيدًا عن الزحام.'],
  alex: ['Alexandria', 'الإسكندرية', 'Catacombs, Pompey’s Pillar and the modern library by the sea.', 'المقابر الأثرية وعمود السواري ومكتبة الإسكندرية على البحر.'],
  luxor: ['Luxor Temple', 'معبد الأقصر', 'In the middle of the city, and best when the lights come on.', 'في قلب المدينة، وأجمل ما يكون مع إضاءة المساء.'],
  karnak: ['Karnak Temples', 'معابد الكرنك', 'A forest of columns built over many centuries.', 'غابة من الأعمدة بُنيت على مدى قرون طويلة.'],
  kings: ['Valley of the Kings', 'وادي الملوك', 'Royal tombs cut deep into the Theban hills.', 'مقابر ملكية محفورة في عمق جبال طيبة.'],
  hatshepsut: ['Temple of Hatshepsut', 'معبد حتشبسوت', 'Terraces set against the cliffs of the west bank.', 'مدرجات أمام جرف البر الغربي.'],
  memnon: ['Colossi of Memnon', 'تمثالا ممنون', 'Two seated giants at the edge of the fields.', 'عملاقان جالسان على حافة الحقول.'],
  cruise: ['Nile cruise', 'رحلة نيلية', 'Board your boat and watch the banks go by.', 'الصعود إلى المركب ومتابعة ضفاف النيل.'],
  elkab: ['El Kab', 'الكاب', 'Rock-cut tombs where few boats stop.', 'مقابر منحوتة في الصخر لا تقف عندها مراكب كثيرة.'],
  edfu: ['Temple of Edfu', 'معبد إدفو', 'The falcon god’s temple, among the best preserved in Egypt.', 'معبد الإله حورس، من أفضل معابد مصر حفظًا.'],
  silsila: ['Gebel el-Silsila', 'جبل السلسلة', 'Sandstone quarries on a narrow stretch of the river.', 'محاجر الحجر الرملي عند مضيق في النهر.'],
  komombo: ['Kom Ombo', 'كوم أمبو', 'A double temple above a bend in the Nile.', 'معبد مزدوج فوق انحناءة النيل.'],
  philae: ['Philae Temple', 'معبد فيلة', 'Reached by boat, on its own island.', 'على جزيرة خاصة، ويُزار بالمركب.'],
  felucca: ['Felucca sail', 'رحلة بالفلوكة', 'An hour under sail around the islands.', 'ساعة بالشراع حول الجزر.'],
  nubian: ['Nubian village', 'القرية النوبية', 'Painted houses and tea with a local family.', 'بيوت ملونة وشاي مع أهل القرية.'],
  elephantine: ['Elephantine Island', 'جزيرة إلفنتين', 'Ruins and villages facing Aswan.', 'آثار وقرى في مواجهة أسوان.'],
  nobles: ['Tombs of the Nobles', 'مقابر النبلاء', 'High on the west bank, with a wide view of Aswan.', 'أعلى البر الغربي، بإطلالة واسعة على أسوان.'],
  botanic: ['Botanical Island', 'جزيرة النباتات', 'A shaded garden island in the river.', 'جزيرة حدائق ظليلة وسط النهر.'],
  abusimbel: ['Abu Simbel', 'أبو سمبل', 'The four giants of Ramesses II, moved stone by stone.', 'تماثيل رمسيس الثاني الأربعة، التي نُقلت حجرًا حجرًا.'],
  redsea: ['Red Sea', 'البحر الأحمر', 'Clear water, reefs and nothing on the schedule.', 'مياه صافية وشعاب مرجانية، من دون جدول.']
};

const dest = { cairo: ['Cairo & Giza', 'القاهرة والجيزة'], alexandria: ['Alexandria', 'الإسكندرية'], luxor: ['Luxor', 'الأقصر'], aswan: ['Aswan', 'أسوان'], abusimbel: ['Abu Simbel', 'أبو سمبل'], redsea: ['Red Sea', 'البحر الأحمر'] };

// [id, kind, days, price, scene, destinations, English title, Arabic title, stops (list) or itinerary (list of days)]
const T = [
  ['half-day-giza-pyramids', 'half', 1, 85, 'pyramids', ['cairo'], 'Half day: Giza Pyramids & Sphinx', 'نصف يوم: أهرامات الجيزة وأبو الهول', ['giza', 'sphinx']],
  ['half-day-egyptian-museum', 'half', 1, 85, 'museum', ['cairo'], 'Half day: Egyptian Museum', 'نصف يوم: المتحف المصري بالتحرير', ['museum']],
  ['half-day-grand-egyptian-museum', 'half', 1, 105, 'museum', ['cairo'], 'Half day: Grand Egyptian Museum', 'نصف يوم: المتحف المصري الكبير', ['gem']],
  ['half-day-memphis-saqqara', 'half', 1, 85, 'step', ['cairo'], 'Half day: Memphis & Saqqara', 'نصف يوم: منف وسقارة', ['memphis', 'saqqara']],
  ['half-day-dahshur', 'half', 1, 85, 'bent', ['cairo'], 'Half day: Dahshur pyramids', 'نصف يوم: أهرامات دهشور', ['dahshur']],
  ['pyramids-memphis-saqqara', 'day', 1, 185, 'step', ['cairo'], 'Pyramids, Memphis & Saqqara', 'الأهرامات ومنف وسقارة', ['giza', 'sphinx', 'memphis', 'saqqara']],
  ['pyramids-saqqara', 'day', 1, 185, 'pyramids', ['cairo'], 'Pyramids & Saqqara', 'الأهرامات وسقارة', ['giza', 'sphinx', 'saqqara']],
  ['memphis-saqqara-dahshur', 'day', 1, 185, 'bent', ['cairo'], 'Memphis, Saqqara & Dahshur', 'منف وسقارة ودهشور', ['memphis', 'saqqara', 'dahshur']],
  ['pyramids-egyptian-museum', 'day', 1, 200, 'pyramids', ['cairo'], 'Pyramids, Sphinx & Egyptian Museum', 'الأهرامات وأبو الهول والمتحف المصري', ['giza', 'sphinx', 'museum']],
  ['pyramids-grand-egyptian-museum', 'day', 1, 230, 'museum', ['cairo'], 'Pyramids & Grand Egyptian Museum', 'الأهرامات والمتحف المصري الكبير', ['giza', 'sphinx', 'gem']],
  ['pyramids-khan-el-khalili', 'day', 1, 180, 'bazaar', ['cairo'], 'Pyramids & Khan el-Khalili', 'الأهرامات وخان الخليلي', ['giza', 'sphinx', 'khan']],
  ['pyramids-islamic-cairo', 'day', 1, 180, 'minaret', ['cairo'], 'Pyramids & Islamic Cairo', 'الأهرامات والقاهرة الإسلامية', ['giza', 'sphinx', 'islamic']],
  ['egyptian-museum-citadel-bazaar', 'day', 1, 185, 'minaret', ['cairo'], 'Egyptian Museum, Citadel & bazaar', 'المتحف المصري والقلعة وخان الخليلي', ['museum', 'citadel', 'khan']],
  ['grand-egyptian-museum-khan', 'day', 1, 200, 'bazaar', ['cairo'], 'Grand Egyptian Museum & Khan el-Khalili', 'المتحف المصري الكبير وخان الخليلي', ['gem', 'khan']],
  ['coptic-islamic-cairo', 'day', 1, 145, 'minaret', ['cairo'], 'Coptic & Islamic Cairo', 'القاهرة القبطية والإسلامية', ['coptic', 'islamic']],
  ['islamic-cairo-khan', 'day', 1, 150, 'bazaar', ['cairo'], 'Islamic Cairo & Khan el-Khalili', 'القاهرة الإسلامية وخان الخليلي', ['islamic', 'khan']],
  ['alexandria-day', 'day', 1, 230, 'sea', ['alexandria'], 'A day in Alexandria', 'يوم في الإسكندرية', ['alex']],
  ['egypt-5-days', 'package', 5, 2060, 'columns', ['cairo', 'luxor'], 'Cairo & Luxor in 5 days', 'القاهرة والأقصر في 5 أيام', [['arrive'], ['giza', 'gem'], ['karnak', 'luxor'], ['kings', 'hatshepsut', 'memnon'], ['depart']]],
  ['egypt-7-days', 'package', 7, 3050, 'felucca', ['cairo', 'aswan', 'luxor'], 'Cairo, Aswan & Luxor in 7 days', 'القاهرة وأسوان والأقصر في 7 أيام', [['arrive'], ['gem', 'giza', 'sphinx'], ['philae', 'felucca'], ['komombo', 'luxor'], ['kings', 'hatshepsut', 'memnon'], ['flycairo', 'islamic'], ['depart']]],
  ['egypt-8-days', 'package', 8, 3140, 'felucca', ['cairo', 'aswan', 'luxor'], 'Cairo & a Nile cruise in 8 days', 'القاهرة ورحلة نيلية في 8 أيام', [['arrive'], ['giza', 'sphinx', 'gem'], ['saqqara', 'islamic'], ['cruise', 'philae', 'felucca'], ['komombo', 'edfu'], ['kings', 'hatshepsut', 'karnak', 'luxor'], ['flycairo', 'coptic'], ['depart']]],
  ['egypt-9-days', 'package', 9, 3850, 'colossi', ['cairo', 'luxor', 'aswan', 'abusimbel'], 'Cairo, the Nile & Abu Simbel in 9 days', 'القاهرة والنيل وأبو سمبل في 9 أيام', [['arrive'], ['giza', 'sphinx', 'gem'], ['saqqara', 'islamic'], ['cruise', 'karnak', 'luxor'], ['kings', 'hatshepsut'], ['edfu', 'komombo'], ['abusimbel', 'elephantine', 'nubian'], ['philae', 'flycairo'], ['depart']]],
  ['egypt-10-days', 'package', 10, 4150, 'colossi', ['cairo', 'luxor', 'aswan', 'abusimbel'], 'Egypt, unhurried: 10 days', 'مصر على مهل: 10 أيام', [['arrive'], ['giza', 'sphinx', 'gem'], ['saqqara', 'islamic'], ['cruise', 'karnak', 'luxor'], ['kings', 'hatshepsut'], ['edfu', 'komombo'], ['abusimbel', 'elephantine'], ['nobles', 'botanic', 'nubian'], ['philae', 'flycairo'], ['depart']]],
  ['cairo-nile-red-sea-11-days', 'package', 11, 4500, 'sea', ['cairo', 'abusimbel', 'aswan', 'luxor', 'redsea'], 'Cairo, the Nile & the Red Sea: 11 days', 'القاهرة والنيل والبحر الأحمر: 11 يومًا', [['arrive'], ['giza', 'sphinx', 'gem'], ['saqqara', 'islamic'], ['abusimbel'], ['philae', 'felucca', 'cruise'], ['komombo', 'edfu'], ['kings', 'hatshepsut', 'karnak', 'luxor'], ['redsea'], ['redsea'], ['redsea', 'flycairo'], ['depart']]],
  ['dahabiya-11-days', 'package', 11, 6195, 'felucca', ['luxor', 'aswan', 'cairo'], 'By dahabiya on the Nile: 11 days', 'بالدهبية على النيل: 11 يومًا', [['arrive'], ['karnak', 'luxor'], ['kings', 'hatshepsut'], ['elkab', 'edfu'], ['silsila'], ['komombo', 'philae'], ['flycairo'], ['saqqara', 'dahshur'], ['giza'], ['museum', 'islamic'], ['depart']]],
  ['cairo-nile-alexandria-12-days', 'package', 12, 5145, 'sea', ['cairo', 'luxor', 'aswan', 'abusimbel', 'alexandria'], 'Cairo, the Nile & Alexandria: 12 days', 'القاهرة والنيل والإسكندرية: 12 يومًا', [['arrive'], ['gem', 'giza', 'sphinx'], ['saqqara', 'islamic'], ['karnak', 'luxor', 'cruise'], ['kings', 'hatshepsut'], ['edfu', 'komombo'], ['philae', 'felucca'], ['abusimbel'], ['nubian'], ['flycairo'], ['alex'], ['depart']]]
];
const tours = T.map(([id, kind, days, price, scene, dests, en, ar, plan]) => ({ id, kind, days, price, scene, dests, title: [en, ar], plan: kind === 'package' ? plan : [plan] }));

// Interface text: [English, Arabic]
const ui = {
  brand: ['Retage Travel', 'ريتاج ترافل'], tours: ['Tours', 'الرحلات'], services: ['Services', 'الخدمات'], about: ['About', 'من نحن'], request: ['Plan a trip', 'خطط رحلتك'], other: ['العربية', 'English'], staff: ['Staff', 'الموظفين'], menu: ['Menu', 'القائمة'],
  heroT: ['Egypt, planned by people who live here.', 'مصر، بتخطيط أهلها.'],
  heroP: ['Tell us what you want to see. We answer with a route and a price.', 'قل لنا ماذا تريد أن ترى، ونرد عليك بمسار وسعر.'],
  mad: [['I’d like to see', 'for', 'days, with', 'people.'], ['أريد زيارة', 'لمدة', 'أيام، وعددنا', 'أشخاص.']], madGo: ['Start my request', 'ابدأ الطلب'], days: ['days', 'أيام'],
  kinds: { half: ['Half day', 'نصف يوم'], day: ['Full day', 'يوم كامل'], package: ['Several days', 'عدة أيام'] }, all: ['All', 'الكل'],
  pkT: ['Follow the river', 'على خط النهر'], pkP: ['Routes of several days, from Cairo to the far south and the sea.', 'مسارات لعدة أيام، من القاهرة إلى أقصى الجنوب والبحر.'],
  dyT: ['One day is enough for', 'يوم واحد يكفي لـ'], from: ['From', 'تبدأ من'], see: ['See the route', 'شاهد المسار'], allTours: ['All tours', 'كل الرحلات'],
  route: ['The route', 'المسار'], day: ['Day', 'اليوم'], ask: ['Ask for this tour', 'اطلب هذه الرحلة'],
  priceNote: ['Starting price in US dollars. Your quote confirms the final price and exactly what it includes.', 'سعر البداية بالدولار الأمريكي. عرض السعر يؤكد السعر النهائي وما يشمله بالضبط.'],
  like: ['Nearby ideas', 'أفكار قريبة'],
  svT: ['More than tours', 'أكثر من رحلات'],
  sv: [
    [['Airport meet & assist', 'استقبال ومساعدة في المطار'], ['Someone waiting for you, help with luggage and arrival procedures, and a car at the door.', 'من ينتظرك، ويساعدك في الحقائب وإجراءات الوصول، وسيارة عند الباب.']],
    [['Private transport', 'انتقالات خاصة'], ['Air-conditioned cars with drivers, between cities or by the day.', 'سيارات مكيفة بسائق، بين المدن أو باليوم.']],
    [['Hotels & Nile cruises', 'فنادق ورحلات نيلية'], ['Rooms and cabins booked together with the rest of your route.', 'حجز الغرف والكبائن مع باقي مسارك.']],
    [['Private jet', 'طائرات خاصة'], ['Quotes for private flights when the schedule is yours.', 'عروض أسعار للطيران الخاص حين يكون الموعد لك.']],
    [['Meetings & events', 'مؤتمرات وفعاليات'], ['Conferences, incentives and groups, with one team from start to finish.', 'مؤتمرات وحوافز ومجموعات، مع فريق واحد من البداية للنهاية.']]
  ],
  abT: ['A travel company in Egypt since 2010', 'شركة سياحة في مصر منذ 2010'],
  ab: [['Retage Travel is a licensed Egyptian travel company (licence no. 1603). We plan private trips for travellers, agencies and companies.', 'We keep it simple: you describe the trip, one of our team prepares the route with our hotels, drivers and guides, and you receive a clear quote before you pay anything.'],
    ['ريتاج ترافل شركة سياحة مصرية مرخصة (ترخيص رقم 1603). نخطط رحلات خاصة للمسافرين والوكالات والشركات.', 'طريقتنا بسيطة: تصف رحلتك، ويجهز أحد أفراد فريقنا المسار مع الفنادق والسائقين والمرشدين، ويصلك عرض سعر واضح قبل أي دفع.']],
  how: [[['You write to us', 'تكتب لنا'], ['Two minutes, no payment.', 'دقيقتان، من دون دفع.']], [['We plan the route', 'نخطط المسار'], ['A person from our team reads it and prepares options.', 'يقرأه فرد من فريقنا ويجهز الخيارات.']], [['You get a quote', 'يصلك عرض سعر'], ['Change it until it fits, then confirm.', 'عدّل فيه حتى يناسبك، ثم أكّد.']]], howT: ['How it works', 'كيف نعمل'],
  rqT: ['Tell us about your trip', 'حدثنا عن رحلتك'], rqP: ['No payment now. We reply with a route and a price.', 'لا دفع الآن. نرد عليك بمسار وسعر.'],
  f: { name: ['Your name', 'الاسم'], email: ['Email', 'البريد الإلكتروني'], phone: ['Phone or WhatsApp (optional)', 'الهاتف أو واتساب (اختياري)'], country: ['Country (optional)', 'الدولة (اختياري)'], tour: ['Tour', 'الرحلة'], none: ['Not sure yet', 'لم أقرر بعد'], date: ['Arrival date (optional)', 'تاريخ الوصول (اختياري)'], adults: ['Adults', 'البالغون'], children: ['Children', 'الأطفال'], msg: ['What would you like to see or do?', 'ماذا تريد أن ترى أو تفعل؟'], ok: ['I agree that Retage Travel uses these details to answer my request.', 'أوافق على استخدام ريتاج ترافل لهذه البيانات للرد على طلبي.'], send: ['Send request', 'أرسل الطلب'], sending: ['Sending…', 'جارٍ الإرسال…'] },
  done: ['We have your request.', 'وصلنا طلبك.'], doneP: ['Your reference is', 'رقم طلبك'], doneQ: ['We will write to you by email.', 'سنراسلك على البريد الإلكتروني.'],
  err: { name: ['Please write your name.', 'اكتب الاسم من فضلك.'], email: ['Please check the email address.', 'راجع البريد الإلكتروني.'], msg: ['Please tell us a little about the trip.', 'اكتب لنا قليلًا عن الرحلة.'], ok: ['Please tick the box so we may answer you.', 'ضع علامة الموافقة حتى نتمكن من الرد عليك.'], date: ['Please check the date.', 'راجع التاريخ.'], too_many: ['Too many requests. Please try again later.', 'طلبات كثيرة. حاول لاحقًا من فضلك.'], other: ['The request was not sent. Please try again, or write to us by email.', 'لم يُرسل الطلب. حاول مرة أخرى أو راسلنا بالبريد.'] },
  prT: ['Privacy', 'الخصوصية'],
  pr: [['When you send a request we keep the details you enter so our team can plan your trip and answer you.', 'Only our staff can see them. We share what is needed with the hotels, drivers and guides for your trip, and nothing for advertising.', 'This site uses no tracking and no advertising cookies. To see, correct or delete your details, write to us by email.'],
    ['عند إرسال طلب نحتفظ بالبيانات التي تكتبها حتى يخطط فريقنا رحلتك ويرد عليك.', 'لا يراها إلا موظفونا. نشارك اللازم فقط مع الفنادق والسائقين والمرشدين الخاصين برحلتك، ولا نشارك شيئًا للإعلانات.', 'لا يستخدم الموقع أدوات تتبع ولا ملفات إعلانية. للاطلاع على بياناتك أو تصحيحها أو حذفها، راسلنا بالبريد.']],
  nf: ['This page is not here.', 'هذه الصفحة غير موجودة.'], home: ['Home', 'الرئيسية'], licence: ['Licence no.', 'ترخيص رقم']
};

module.exports = { contact, places, dest, tours, ui };
