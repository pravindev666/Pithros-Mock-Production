import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

export type SupportedLocale = 'en' | 'hi' | 'ta' | 'te' | 'kn' | 'ml' | 'bn' | 'gu' | 'pa';

export type IndicScript =
  | 'latin'
  | 'devanagari'
  | 'tamil'
  | 'telugu'
  | 'kannada'
  | 'malayalam'
  | 'bengali'
  | 'gujarati'
  | 'gurmukhi';

export interface LocaleMetadata {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  script: IndicScript;
  uiFontFamily: string;
  serifFontFamily: string;
  tagline: string;
}

export const SUPPORTED_LOCALES: Record<SupportedLocale, LocaleMetadata> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    script: 'latin',
    uiFontFamily: "'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    serifFontFamily: "'Noto Serif', Georgia, serif",
    tagline: 'Pan-India & Global',
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिंदी',
    script: 'devanagari',
    uiFontFamily: "'Noto Sans Devanagari UI', 'Noto Sans Devanagari', 'Noto Sans', sans-serif",
    serifFontFamily: "'Noto Serif Devanagari', 'Noto Serif', serif",
    tagline: 'Devanagari UI',
  },
  ta: {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    script: 'tamil',
    uiFontFamily: "'Noto Sans Tamil UI', 'Noto Sans Tamil', 'Noto Sans', sans-serif",
    serifFontFamily: "'Noto Serif Tamil', 'Noto Serif', serif",
    tagline: 'Tamil UI',
  },
  te: {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    script: 'telugu',
    uiFontFamily: "'Noto Sans Telugu UI', 'Noto Sans Telugu', 'Noto Sans', sans-serif",
    serifFontFamily: "'Noto Serif Telugu', 'Noto Serif', serif",
    tagline: 'Telugu UI',
  },
  kn: {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    script: 'kannada',
    uiFontFamily: "'Noto Sans Kannada UI', 'Noto Sans Kannada', 'Noto Sans', sans-serif",
    serifFontFamily: "'Noto Serif Kannada', 'Noto Serif', serif",
    tagline: 'Kannada UI',
  },
  ml: {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    script: 'malayalam',
    uiFontFamily: "'Noto Sans Malayalam UI', 'Noto Sans Malayalam', 'Noto Sans', sans-serif",
    serifFontFamily: "'Noto Serif Malayalam', 'Noto Serif', serif",
    tagline: 'Malayalam UI',
  },
  bn: {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    script: 'bengali',
    uiFontFamily: "'Noto Sans Bengali UI', 'Noto Sans Bengali', 'Noto Sans', sans-serif",
    serifFontFamily: "'Noto Serif Bengali', 'Noto Serif', serif",
    tagline: 'Bengali UI',
  },
  gu: {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    script: 'gujarati',
    uiFontFamily: "'Noto Sans Gujarati UI', 'Noto Sans Gujarati', 'Noto Sans', sans-serif",
    serifFontFamily: "'Noto Serif Gujarati', 'Noto Serif', serif",
    tagline: 'Gujarati UI',
  },
  pa: {
    code: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    script: 'gurmukhi',
    uiFontFamily: "'Noto Sans Gurmukhi UI', 'Noto Sans Gurmukhi', 'Noto Sans', sans-serif",
    serifFontFamily: "'Noto Serif Gurmukhi', 'Noto Serif', serif",
    tagline: 'Gurmukhi UI',
  },
};

// UI Dictionary for Navigation, Cards, Forms, Search, & Actions
const UI_TRANSLATIONS: Record<SupportedLocale, Record<string, string>> = {
  en: {
    nav_memorials: 'Memorials',
    nav_how_it_works: 'How It Works',
    nav_farewell_network: 'Farewell Network',
    nav_pricing: 'Pricing',
    nav_create: 'Create Memorial',
    nav_search: 'Search Registry',
    nav_sign_in: 'Sign In',
    nav_dashboard: 'Sanctuary',

    card_view_profile: 'View Profile',
    card_request_quote: 'Request Quote',
    card_starting_from: 'Starting from',
    card_response_time: 'Response time',
    card_verified_partner: 'Verified Partner',
    card_identity_reviewed: 'Identity Reviewed',
    card_reviews: 'reviews',
    card_browse_services: 'Browse Services',

    form_search_provider: 'Search provider, city, or service...',
    form_select_city: 'Select City',
    form_all_cities: 'All Cities',
    form_category: 'Category',
    form_full_name: 'Full Name',
    form_phone: 'Phone Number',
    form_description: 'Description or Special Requirements',
    form_submit: 'Submit Request',
    form_cancel: 'Cancel',
    form_urgency: 'Service Urgency',
    form_immediate: 'Immediate (Today/Tomorrow)',
    form_contact_pref: 'Preferred Contact Method',

    badge_active: 'Active',
    badge_verified: 'Verified',
  },
  hi: {
    nav_memorials: 'स्मृतियाँ',
    nav_how_it_works: 'यह कैसे काम करता है',
    nav_farewell_network: 'फेयरवेल नेटवर्क',
    nav_pricing: 'मूल्य योजनाएँ',
    nav_create: 'स्मृति बनाएं',
    nav_search: 'स्मृति रजिस्टर खोजें',
    nav_sign_in: 'साइन इन करें',
    nav_dashboard: 'परिवार अभयारण्य',

    card_view_profile: 'प्रोफ़ाइल देखें',
    card_request_quote: 'कोटेशन अनुरोध',
    card_starting_from: 'प्रारंभिक मूल्य',
    card_response_time: 'प्रतिक्रिया समय',
    card_verified_partner: 'सत्यापित सेवा प्रदाता',
    card_identity_reviewed: 'पहचान सत्यापित',
    card_reviews: 'समीक्षाएँ',
    card_browse_services: 'सेवाएँ ब्राउज़ करें',

    form_search_provider: 'प्रदाता, शहर या सेवा खोजें...',
    form_select_city: 'शहर चुनें',
    form_all_cities: 'सभी शहर',
    form_category: 'श्रेणी',
    form_full_name: 'पूरा नाम',
    form_phone: 'फ़ोन नंबर',
    form_description: 'विवरण या विशेष आवश्यकताएँ',
    form_submit: 'अनुरोध भेजें',
    form_cancel: 'रद्द करें',
    form_urgency: 'सेवा की तात्कालिकता',
    form_immediate: 'तत्काल (आज/कल)',
    form_contact_pref: 'संपर्क का पसंदीदा माध्यम',

    badge_active: 'सक्रिय',
    badge_verified: 'सत्यापित',
  },
  ta: {
    nav_memorials: 'நினைவுகள்',
    nav_how_it_works: 'எவ்வாறு செயல்படுகிறது',
    nav_farewell_network: 'ஃபேர்வெல் நெட்வொர்க்',
    nav_pricing: 'கட்டண விபரம்',
    nav_create: 'நினைவுப்பக்கம் உருவாக்க',
    nav_search: 'நினைவுப் பதிவேடு தேடு',
    nav_sign_in: 'உள்நுழைக',
    nav_dashboard: 'குடும்ப நினைவகம்',

    card_view_profile: 'விவரக்குறிப்பு காண்க',
    card_request_quote: 'விலைப்புள்ளி கோர',
    card_starting_from: 'தொடக்க விலை',
    card_response_time: 'பதில் நேரம்',
    card_verified_partner: 'சரிபார்க்கப்பட்ட கூட்டாளர்',
    card_identity_reviewed: 'அடையாளம் சரிபார்க்கப்பட்டது',
    card_reviews: 'மதிப்புரைகள்',
    card_browse_services: 'சேவைகளை உலாவவும்',

    form_search_provider: 'வழங்குநர், நகரம் அல்லது சேவையைத் தேடவும்...',
    form_select_city: 'நகரத்தைத் தேர்வுசெய்க',
    form_all_cities: 'அனைத்து நகரங்கள்',
    form_category: 'வகை',
    form_full_name: 'முழு பெயர்',
    form_phone: 'தொலைபேசி எண்',
    form_description: 'விவரம் அல்லது சிறப்புத் தேவைகள்',
    form_submit: 'கோரிக்கையை அனுப்பு',
    form_cancel: 'ரத்து செய்',
    form_urgency: 'சேவை அவசரம்',
    form_immediate: 'உடனடியாக (இன்று/நாளை)',
    form_contact_pref: 'விருப்பமான தொடர்பு முறை',

    badge_active: 'செயலில்',
    badge_verified: 'சரிபார்க்கப்பட்டது',
  },
  te: {
    nav_memorials: 'స్మృతులు',
    nav_how_it_works: 'ఎలా పనిచేస్తుంది',
    nav_farewell_network: 'ఫేర్‌వెల్ నెట్‌వర్క్',
    nav_pricing: 'ధరల వివరాలు',
    nav_create: 'స్మృతిని సృష్టించండి',
    nav_search: 'స్మృతి రిజిస్ట్రీ శోధించండి',
    nav_sign_in: 'సైన్ ఇన్',
    nav_dashboard: 'కుటుంబ స్మారకం',

    card_view_profile: 'ప్రొఫైల్ చూడండి',
    card_request_quote: 'కొటేషన్ అభ్యర్థించండి',
    card_starting_from: 'ప్రారంభ ధర',
    card_response_time: 'స్పందన సమయం',
    card_verified_partner: 'ధృవీకరించబడిన భాగస్వామి',
    card_identity_reviewed: 'గుర్తింపు సమీక్షించబడింది',
    card_reviews: 'సమీక్షలు',
    card_browse_services: 'సేవలను బ్రౌజ్ చేయండి',

    form_search_provider: 'సేవ లేదా ప్రొవైడర్‌ను శోధించండి...',
    form_select_city: 'నగరాన్ని ఎంచుకోండి',
    form_all_cities: 'అన్ని నగరాలు',
    form_category: 'వర్గం',
    form_full_name: 'పూర్తి పేరు',
    form_phone: 'ఫోన్ నంబర్',
    form_description: 'వివరాలు లేదా ప్రత్యేక అవసరాలు',
    form_submit: 'అభ్యర్థనను సమర్పించండి',
    form_cancel: 'రద్దు చేయండి',
    form_urgency: 'సేవ ఆవశ్యకత',
    form_immediate: 'తక్షణమే (ఈరోజు/రేపు)',
    form_contact_pref: 'ప్రాధాన్య సంప్రదింపు పద్ధతి',

    badge_active: 'క్రియాశీలకం',
    badge_verified: 'ధృవీకరించబడింది',
  },
  kn: {
    nav_memorials: 'ಸ್ಮೃತಿಗಳು',
    nav_how_it_works: 'ಹೇಗೆ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ',
    nav_farewell_network: 'ಫೇರ್‌ವೆಲ್ ನೆಟ್‌ವರ್ಕ್',
    nav_pricing: 'ಬೆಲೆ ಯೋಜನೆಗಳು',
    nav_create: 'ಸ್ಮರಣೆ ರಚಿಸಿ',
    nav_search: 'ಸ್ಮಾರಕ ನೋಂದಣಿ ಹುಡುಕಿ',
    nav_sign_in: 'ಸೈನ್ ಇನ್',
    nav_dashboard: 'ಕುಟುಂಬ ಅಭಯಾರಣ್ಯ',

    card_view_profile: 'ಪ್ರೊಫೈಲ್ ವೀಕ್ಷಿಸಿ',
    card_request_quote: 'ಉಲ್ಲೇಖ ಕೋರಿ',
    card_starting_from: 'ಆರಂಭಿಕ ಬೆಲೆ',
    card_response_time: 'ಪ್ರತಿಕ್ರಿಯೆ ಸಮಯ',
    card_verified_partner: 'ಪರಿಶೀಲಿಸಿದ ಪಾಲುದಾರ',
    card_identity_reviewed: 'ಗುರುತು ಪರಿಶೀಲಿಸಲಾಗಿದೆ',
    card_reviews: 'ವಿಮರ್ಶೆಗಳು',
    card_browse_services: 'ಸೇವೆಗಳನ್ನು ಬ್ರೌಸ್ ಮಾಡಿ',

    form_search_provider: 'ಪೂರೈಕೆದಾರ, ನಗರ ಅಥವಾ ಸೇವೆ ಹುಡುಕಿ...',
    form_select_city: 'ನಗರ ಆಯ್ಕೆಮಾಡಿ',
    form_all_cities: 'ಎಲ್ಲಾ ನಗರಗಳು',
    form_category: 'ವರ್ಗ',
    form_full_name: 'ಪೂರ್ಣ ಹೆಸರು',
    form_phone: 'ದೂರವಾಣಿ ಸಂಖ್ಯೆ',
    form_description: 'ವಿವರಣೆ ಅಥವಾ ವಿಶೇಷ ಅಗತ್ಯತೆಗಳು',
    form_submit: 'ವಿನಂತಿ ಸಲ್ಲಿಸಿ',
    form_cancel: 'ರದ್ದುಮಾಡಿ',
    form_urgency: 'ಸೇವೆಯ ತುರ್ತು',
    form_immediate: 'ತಕ್ಷಣ (ಇಂದು/ನಾಳೆ)',
    form_contact_pref: 'ಆದ್ಯತೆಯ ಸಂಪರ್ಕ ವಿಧಾನ',

    badge_active: 'ಸಕ್ರಿಯ',
    badge_verified: 'ಪರಿಶೀಲಿಸಲಾಗಿದೆ',
  },
  ml: {
    nav_memorials: 'സ്മരണകൾ',
    nav_how_it_works: 'പ്രവർത്തനരീതി',
    nav_farewell_network: 'ഫെയർവെൽ നെറ്റ്‌വർക്ക്',
    nav_pricing: 'നിരക്കുകൾ',
    nav_create: 'സ്മാരകം നിർമ്മിക്കുക',
    nav_search: 'രജിസ്ട്രി തിരയുക',
    nav_sign_in: 'സൈൻ ഇൻ',
    nav_dashboard: 'കുടുംബ സ്മാരകം',

    card_view_profile: 'പ്രൊഫൈൽ കാണുക',
    card_request_quote: 'ക്വട്ടേഷൻ ആവശ്യപ്പെടുക',
    card_starting_from: 'തുടക്ക വില',
    card_response_time: 'മറുപടി സമയം',
    card_verified_partner: 'പരിശോധിച്ചുറപ്പിച്ച പങ്കാളി',
    card_identity_reviewed: 'തിരിച്ചറിയൽ രേഖകൾ പരിശോധിച്ചു',
    card_reviews: 'അവലോകനങ്ങൾ',
    card_browse_services: 'സേവനങ്ങൾ കാണുക',

    form_search_provider: 'ദാതാവ്, നഗരം അല്ലെങ്കിൽ സേവനം തിരയുക...',
    form_select_city: 'നഗരം തിരഞ്ഞെടുക്കുക',
    form_all_cities: 'എല്ലാ നഗരങ്ങളും',
    form_category: 'വിഭാഗം',
    form_full_name: 'മുഴുവൻ പേര്',
    form_phone: 'ഫോൺ നമ്പർ',
    form_description: 'വിവരങ്ങൾ അല്ലെങ്കിൽ പ്രത്യേക ആവശ്യങ്ങൾ',
    form_submit: 'അപേക്ഷ അയക്കുക',
    form_cancel: 'റദ്ദാക്കുക',
    form_urgency: 'സേവന അടിയന്തിരാവസ്ഥ',
    form_immediate: 'ഉടനടി (ഇന്ന്/നാളെ)',
    form_contact_pref: 'ആശയവിനിമയ മാർഗ്ഗം',

    badge_active: 'സജീവം',
    badge_verified: 'സ്ഥിരീകരിച്ചു',
  },
  bn: {
    nav_memorials: 'স্মৃতিমালা',
    nav_how_it_works: 'এটি যেভাবে কাজ করে',
    nav_farewell_network: 'ফেয়ারওয়েল নেটওয়ার্ক',
    nav_pricing: 'মূল্য তালিকা',
    nav_create: 'স্মৃতিফলক তৈরি করুন',
    nav_search: 'স্মৃতি রেজিস্ট্রি খুঁজুন',
    nav_sign_in: 'সাইন ইন করুন',
    nav_dashboard: 'পারিবারিক স্মরণক্ষেত্র',

    card_view_profile: 'প্রোফাইল দেখুন',
    card_request_quote: 'কোটেশন অনুরোধ',
    card_starting_from: 'শুরু মূল্য',
    card_response_time: 'প্রতিক্রিয়া সময়',
    card_verified_partner: 'যাচাইকৃত অংশীদার',
    card_identity_reviewed: 'পরিচয় যাচাইকৃত',
    card_reviews: 'পর্যালোচনা',
    card_browse_services: 'পরিষেবা অন্বেষণ করুন',

    form_search_provider: 'পরিষেবা প্রদানকারী বা শহর খুঁজুন...',
    form_select_city: 'শহর নির্বাচন করুন',
    form_all_cities: 'সব শহর',
    form_category: 'বিভাগ',
    form_full_name: 'পূর্ণ নাম',
    form_phone: 'ফোন নম্বর',
    form_description: 'বিবরণ বা বিশেষ প্রয়োজনীয়তা',
    form_submit: 'অনুরোধ জমা দিন',
    form_cancel: 'বাতিল',
    form_urgency: 'জরুরী প্রয়োজন',
    form_immediate: 'অবিলম্বে (আজ/কাল)',
    form_contact_pref: 'যোগাযোগের মাধ্যম',

    badge_active: 'সক্রিয়',
    badge_verified: 'যাচাইকৃত',
  },
  gu: {
    nav_memorials: 'સ્મૃતિઓ',
    nav_how_it_works: 'આ કેવી રીતે કાર્ય કરે છે',
    nav_farewell_network: 'ફેયરવેલ નેટવર્ક',
    nav_pricing: 'કિંમત યોજનાઓ',
    nav_create: 'સ્મૃતિ રચો',
    nav_search: 'સ્મૃતિ રજિસ્ટ્રી શોધો',
    nav_sign_in: 'સાઇન ઇન',
    nav_dashboard: 'પારિવારિક અભયારણ્ય',

    card_view_profile: 'પ્રોફાઇલ જુઓ',
    card_request_quote: 'ભાવ મેળવો',
    card_starting_from: 'પ્રારંભિક ભાવ',
    card_response_time: 'પ્રતિસાદ સમય',
    card_verified_partner: 'ચકાસાયેલ પાર્ટનર',
    card_identity_reviewed: 'ઓળખ ચકાસાયેલ',
    card_reviews: 'સમીક્ષાઓ',
    card_browse_services: 'સેવાઓ જુઓ',

    form_search_provider: 'સેવા પ્રદાતા, શહેર અથવા સેવા શોધો...',
    form_select_city: 'શહેર પસંદ કરો',
    form_all_cities: 'તમામ શહેરો',
    form_category: 'શ્રેણી',
    form_full_name: 'પૂરું નામ',
    form_phone: 'ફોન નંબર',
    form_description: 'વિગત અથવા ખાસ જરૂરિયાતો',
    form_submit: 'વિનંતી મોકલો',
    form_cancel: 'રદ કરો',
    form_urgency: 'સેવાની તાકીદ',
    form_immediate: 'તરત જ (આજે/કાલે)',
    form_contact_pref: 'સંપર્ક પદ્ધતિ',

    badge_active: 'સક્રિય',
    badge_verified: 'ચકાસાયેલ',
  },
  pa: {
    nav_memorials: 'ਯਾਦਾਂ',
    nav_how_it_works: 'ਇਹ ਕਿਵੇਂ ਕੰਮ ਕਰਦਾ ਹੈ',
    nav_farewell_network: 'ਵਿਦਾਈ ਨੈੱਟਵਰਕ',
    nav_pricing: 'ਕੀਮਤਾਂ',
    nav_create: 'ਯਾਦਗਾਰ ਬਣਾਓ',
    nav_search: 'ਯਾਦਗਾਰ ਖੋਜੋ',
    nav_sign_in: 'ਸਾਈਨ ਇਨ',
    nav_dashboard: 'ਪਰਿਵਾਰਕ ਯਾਦਗਾਰ',

    card_view_profile: 'ਪ੍ਰੋਫਾਈਲ ਦੇਖੋ',
    card_request_quote: 'ਕੋਟੇਸ਼ਨ ਦੀ ਬੇਨਤੀ ਕਰੋ',
    card_starting_from: 'ਸ਼ੁਰੂਆਤੀ ਕੀਮਤ',
    card_response_time: 'ਜਵਾਬ ਦਾ ਸਮਾਂ',
    card_verified_partner: 'ਤਸਦੀਕਸ਼ੁਦਾ ਸਾਥੀ',
    card_identity_reviewed: 'ਪਛਾਣ ਤਸਦੀਕ ਕੀਤੀ ਗਈ',
    card_reviews: 'ਸਮੀਖਿਆਵਾਂ',
    card_browse_services: 'ਸੇਵਾਵਾਂ ਬ੍ਰਾਊਜ਼ ਕਰੋ',

    form_search_provider: 'ਸੇਵਾ ਪ੍ਰਦਾਤਾ, ਸ਼ਹਿਰ ਜਾਂ ਸੇਵਾ ਖੋਜੋ...',
    form_select_city: 'ਸ਼ਹਿਰ ਚੁਣੋ',
    form_all_cities: 'ਸਾਰੇ ਸ਼ਹਿਰ',
    form_category: 'ਸ਼੍ਰੇਣੀ',
    form_full_name: 'ਪੂਰਾ ਨਾਮ',
    form_phone: 'ਫ਼ੋਨ ਨੰਬਰ',
    form_description: 'ਵੇਰਵਾ ਜਾਂ ਵਿਸ਼ੇਸ਼ ਲੋੜਾਂ',
    form_submit: 'ਬੇਨਤੀ ਜਮ੍ਹਾਂ ਕਰੋ',
    form_cancel: 'ਰੱਦ ਕਰੋ',
    form_urgency: 'ਸੇਵਾ ਦੀ ਲੋੜ',
    form_immediate: 'ਤੁਰੰਤ (ਅੱਜ/ਕੱਲ੍ਹ)',
    form_contact_pref: 'ਸੰਪਰਕ ਦਾ ਤਰੀਕਾ',

    badge_active: 'ਸਰਗਰਮ',
    badge_verified: 'ਤਸਦੀਕਸ਼ੁਦਾ',
  },
};

interface LocaleContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  metadata: LocaleMetadata;
  script: IndicScript;
  uiFontFamily: string;
  serifFontFamily: string;
  t: (key: string, fallback?: string) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

const LOCALE_STORAGE_KEY = 'pithros-locale';

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => {
    if (typeof window === 'undefined') return 'en';
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as SupportedLocale | null;
      if (stored && SUPPORTED_LOCALES[stored]) {
        return stored;
      }
      // Check navigator.language prefix
      const navLang = navigator.language?.split('-')[0]?.toLowerCase();
      if (navLang && navLang in SUPPORTED_LOCALES) {
        return navLang as SupportedLocale;
      }
    } catch {
      // ignore
    }
    return 'en';
  });

  const metadata = useMemo(() => SUPPORTED_LOCALES[locale] || SUPPORTED_LOCALES.en, [locale]);

  // Synchronize document attributes, CSS variables, and font stacks dynamically
  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.setAttribute('data-locale', locale);
    root.setAttribute('data-script', metadata.script);

    // Dynamically update CSS custom properties for Noto Sans UI & Noto Serif script variants
    root.style.setProperty('--font-sans', metadata.uiFontFamily);
    root.style.setProperty('--font-ui', metadata.uiFontFamily);
    root.style.setProperty('--font-serif', metadata.serifFontFamily);
    root.style.setProperty('--font-display', metadata.serifFontFamily);
    root.style.setProperty('--font-editorial', metadata.serifFontFamily);

    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // ignore
    }
  }, [locale, metadata]);

  const setLocale = (newLocale: SupportedLocale) => {
    if (SUPPORTED_LOCALES[newLocale]) {
      setLocaleState(newLocale);
    }
  };

  const t = (key: string, fallback?: string): string => {
    const dict = UI_TRANSLATIONS[locale] || UI_TRANSLATIONS.en;
    if (dict[key]) return dict[key];
    const enDict = UI_TRANSLATIONS.en;
    if (enDict[key]) return enDict[key];
    return fallback || key;
  };

  return (
    <LocaleContext.Provider
      value={{
        locale,
        setLocale,
        metadata,
        script: metadata.script,
        uiFontFamily: metadata.uiFontFamily,
        serifFontFamily: metadata.serifFontFamily,
        t,
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};
