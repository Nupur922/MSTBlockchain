// Utility to map coordinates to Indian states and provide localized messages

export const INDIAN_STATES = [
  { name: 'Maharashtra', lang: 'mr-IN', langName: 'मराठी', langNameEn: 'Marathi', bounds: { minLat: 15.6, maxLat: 22.1, minLng: 72.6, maxLng: 80.9 } },
  { name: 'Gujarat', lang: 'gu-IN', langName: 'ગુજરાતી', langNameEn: 'Gujarati', bounds: { minLat: 20.1, maxLat: 24.7, minLng: 68.1, maxLng: 74.5 } },
  { name: 'Karnataka', lang: 'kn-IN', langName: 'ಕನ್ನಡ', langNameEn: 'Kannada', bounds: { minLat: 11.5, maxLat: 18.5, minLng: 74.0, maxLng: 78.6 } },
  { name: 'Tamil Nadu', lang: 'ta-IN', langName: 'தமிழ்', langNameEn: 'Tamil', bounds: { minLat: 8.0, maxLat: 13.5, minLng: 76.2, maxLng: 80.3 } },
  { name: 'Kerala', lang: 'ml-IN', langName: 'മലയാളം', langNameEn: 'Malayalam', bounds: { minLat: 8.2, maxLat: 12.8, minLng: 74.8, maxLng: 77.5 } },
  { name: 'West Bengal', lang: 'bn-IN', langName: 'বাংলা', langNameEn: 'Bengali', bounds: { minLat: 21.5, maxLat: 27.2, minLng: 85.8, maxLng: 89.8 } },
  { name: 'Odisha', lang: 'or-IN', langName: 'ଓଡ଼ିଆ', langNameEn: 'Odia', bounds: { minLat: 17.8, maxLat: 22.5, minLng: 81.3, maxLng: 87.5 } },
  { name: 'Andhra Pradesh', lang: 'te-IN', langName: 'తెలుగు', langNameEn: 'Telugu', bounds: { minLat: 12.6, maxLat: 19.1, minLng: 76.7, maxLng: 84.8 } },
  { name: 'Telangana', lang: 'te-IN', langName: 'తెలుగు', langNameEn: 'Telugu', bounds: { minLat: 15.8, maxLat: 19.9, minLng: 77.2, maxLng: 81.3 } },
  { name: 'Punjab', lang: 'pa-IN', langName: 'ਪੰਜਾਬੀ', langNameEn: 'Punjabi', bounds: { minLat: 29.5, maxLat: 32.5, minLng: 73.8, maxLng: 76.9 } },
  { name: 'Rajasthan', lang: 'hi-IN', langName: 'राजस्थानी', langNameEn: 'Rajasthani', bounds: { minLat: 23.0, maxLat: 30.2, minLng: 69.4, maxLng: 78.3 } },
  { name: 'Uttar Pradesh', lang: 'hi-IN', langName: 'हिंदी', langNameEn: 'Hindi', bounds: { minLat: 23.8, maxLat: 30.4, minLng: 77.0, maxLng: 84.6 } },
  { name: 'Madhya Pradesh', lang: 'hi-IN', langName: 'हिंदी', langNameEn: 'Hindi', bounds: { minLat: 21.0, maxLat: 26.8, minLng: 74.0, maxLng: 82.8 } },
  { name: 'Jharkhand', lang: 'hi-IN', langName: 'हिंदी', langNameEn: 'Hindi', bounds: { minLat: 21.9, maxLat: 25.3, minLng: 83.3, maxLng: 87.9 } },
  { name: 'Bihar', lang: 'hi-IN', langName: 'भोजपुरी', langNameEn: 'Bhojpuri', bounds: { minLat: 24.2, maxLat: 27.5, minLng: 83.3, maxLng: 88.3 } },
  { name: 'Assam', lang: 'hi-IN', langName: 'অসমীয়া', langNameEn: 'Assamese', bounds: { minLat: 24.1, maxLat: 27.9, minLng: 89.6, maxLng: 96.0 } },
];

export const detectStateFromCoords = (lat, lng) => {
  if (!lat || !lng) return INDIAN_STATES.find(s => s.name === 'Uttar Pradesh');
  
  for (const state of INDIAN_STATES) {
    if (lat >= state.bounds.minLat && lat <= state.bounds.maxLat && 
        lng >= state.bounds.minLng && lng <= state.bounds.maxLng) {
      return state;
    }
  }
  return INDIAN_STATES.find(s => s.name === 'Uttar Pradesh');
};

export const getPhoneticMessage = (stateName, payoutAmount, plotId) => {
  const amountStr = payoutAmount ? payoutAmount.toString() : '0.5';
  const idStr = plotId ? plotId.toString() : '1';
  
  switch(stateName) {
    case 'Maharashtra':
      return { lang: 'hi-IN', text: 'Namaskar. Tumchya shetat pur aala aahe. Satellite dware purachi pushti jhali aahe. Tumcha vima paratava taabadtob pathavla gela aahe. Krupaya javalchya post office madhye Aadhaar card gheun jaa aani paise kadha.' };
    case 'Gujarat':
      return { lang: 'hi-IN', text: 'Namaskar. Tamara khetarma pur aavyu chhe. Satellite dwara purnee pushti thai chhe. Tamaro vimo turant mokalvama aavyo chhe. Krupa karine najikna post office ma Aadhaar card lai jaao ane paisa upado.' };
    case 'Karnataka':
      return { lang: 'hi-IN', text: 'Namaskara. Nimma holadalli praavaha bandide. Satellite inda praavahada khachitapadiside. Nimma vima motti turtaagi kalsalagide. Dayavittu hattirada post office ge Aadhaar card tegedukondu hogi hana prapthi maadi.' };
    case 'Tamil Nadu':
      return { lang: 'hi-IN', text: 'Vanakam. Ungal vayalil vellam vandhullathu. Satellite moolam vellam uruthi seyyappattullathu. Ungal kaappeetu thogai udanadiyaga anuppappattullathu. Thayavuseithu arugil ulla post office ikku Aadhaar card udan sendru panathai pera vum.' };
    case 'Kerala':
      return { lang: 'hi-IN', text: 'Namaskaram. Ningalude krishibhoomiyil vellappokkam undayi. Satellite vazhi vellappokkam sthireekarichu. Ningalude insurance thuka udan thanne ayachittundu. Thayavayi aduthulla post office il Aadhaar card aayi poyi panam edukkuka.' };
    case 'West Bengal':
      return { lang: 'hi-IN', text: 'Namaskar. Apnar jamite bonna eseche. Satellite er maddhome bonnar nishchit kora hoyeche. Apnar bima takha sothe sothe pathano hoyeche. Onugroho kore kacher post office e Aadhaar card niye jan ebong taka tolen.' };
    case 'Odisha':
      return { lang: 'hi-IN', text: 'Namaskar. Apananka khetare banya asichi. Satellite dwara banyara pramaan heichi. Apananka bima tanka sanghe sanghe patha jaichi. Daya kari pakhare thiba post office ku Aadhaar card nei jaantu ebang tanka uthaantu.' };
    case 'Andhra Pradesh':
    case 'Telangana':
      return { lang: 'hi-IN', text: 'Namaskaram. Mee polamlo varada vachindi. Satellite dwara varada dhrveekarinchabidindi. Mee bima dabbu ventane pampabadindi. Dayachesi daggara unna post office ku Aadhaar card tho velli dabbu theesukondi.' };
    case 'Punjab':
      return { lang: 'hi-IN', text: 'Sat Sri Akal. Tuhade khet vich harh aa gaya hai. Satellite rahi harh di pushti hoyi hai. Tuhadi bima rakam turant bhej ditti gayi hai. Kirpa karke nede de post office vich Aadhaar card lai ke jao te paise kado.' };
    case 'Rajasthan':
      return { lang: 'hi-IN', text: 'Ram Ram sa. Aapke khet mein baadh aa gayi hai. Satellite se baadh ki pushti hui hai. Aapka bima bhugtan turant bhej diya gaya hai. Kripya apne nazdiki post office mein Aadhaar card lekar jayein.' };
    case 'Bihar':
      return { lang: 'hi-IN', text: 'Pranaam. Aapke khet mein baadh aa gail ba. Satellite se baadh ke pushti ho gail ba. Aapke muawza turant bhej diyala gail ba. Kripya apna nazdiki post office mein Aadhaar card leke jayi aur paisa nikaal li.' };
    case 'Assam':
      return { lang: 'hi-IN', text: 'Namaskar. Apunar khetit baanpaani ahise. Satellite radar e confirm korise. Apunar insurance claim automatically pass hoi goise. Anugrah kori osoror post office ot goi Aadhaar card di poisa tu uliai anibo.' };
    default:
      return { lang: 'hi-IN', text: 'AgriTrust AI aapatkalin suchna. Aapke khet mein baadh ki pushti hui hai. Aapka bima bhugtan turant bhej diya gaya hai. Kripya apne nazdiki post office mein Aadhaar card lekar jayein.' };
  }
};

export const getNativeTranscript = (stateName, payoutAmount, plotId) => {
  switch(stateName) {
    case 'Maharashtra':
      return { name: '🟢 मराठी (Marathi) — Primary', text: 'नमस्कार. तुमच्या शेतात पूर आला आहे. सॅटेलाइटद्वारे पुराची पुष्टी झाली आहे. तुमचा विमा परतावा त्वरित पाठवला गेला आहे. कृपया जवळच्या Post Office मध्ये Aadhaar Card घेऊन जा आणि पैसे काढा.' };
    case 'Gujarat':
      return { name: '🟢 ગુજરાતી (Gujarati) — Primary', text: 'નમસ્કાર. તમારા ખેતરમાં પૂર આવ્યું છે. સેટેલાઇટ દ્વારા પૂરની પુષ્ટિ થઈ છે. તમારો વીમો તરત જ મોકલવામાં આવ્યો છે. કૃપા કરીને નજીકની Post Office માં Aadhaar Card લઈ જાઓ અને પૈસા ઉપાડો.' };
    case 'Karnataka':
      return { name: '🟢 ಕನ್ನಡ (Kannada) — Primary', text: 'ನಮಸ್ಕಾರ. ನಿಮ್ಮ ಹೊಲದಲ್ಲಿ ಪ್ರವಾಹ ಬಂದಿದೆ. ಉಪಗ್ರಹದಿಂದ ಪ್ರವಾಹದ ಖಚಿತಪಡಿಸಿದೆ. ನಿಮ್ಮ ವಿಮಾ ಮೊತ್ತ ತಕ್ಷಣವೇ ಕಳುಹಿಸಲಾಗಿದೆ. ದಯವಿಟ್ಟು ಹತ್ತಿರದ Post Office ಗೆ Aadhaar Card ತೆಗೆದುಕೊಂಡು ಹೋಗಿ ಹಣ ಪಡೆಯಿರಿ.' };
    case 'Tamil Nadu':
      return { name: '🟢 தமிழ் (Tamil) — Primary', text: 'வணக்கம். உங்கள் வயலில் வெள்ளம் வந்துள்ளது. செயற்கைக்கோள் மூலம் வெள்ளம் உறுதி செய்யப்பட்டுள்ளது. உங்கள் காப்பீட்டு தொகை உடனடியாக அனுப்பப்பட்டுள்ளது. தயவுசெய்து அருகில் உள்ள Post Office க்கு Aadhaar Card உடன் சென்று பணத்தை பெறவும்.' };
    case 'Kerala':
      return { name: '🟢 മലയാളം (Malayalam) — Primary', text: 'നമസ്കാരം. നിങ്ങളുടെ കൃഷിഭൂമിയിൽ വെള്ളപ്പൊക്കം ഉണ്ടായി. സാറ്റലൈറ്റ് വഴി വെള്ളപ്പൊക്കം സ്ഥിരീകരിച്ചു. നിങ്ങളുടെ ഇൻഷുറൻസ് തുക ഉടൻ തന്നെ അയച്ചിട്ടുണ്ട്. ദയവായി അടുത്തുള്ള Post Office ൽ Aadhaar Card ആയി പോയി പണം എടുക്കുക.' };
    case 'West Bengal':
      return { name: '🟢 বাংলা (Bengali) — Primary', text: 'নমস্কার. আপনার জমিতে বন্যা এসেছে. স্যাটেলাইটের মাধ্যমে বন্যার নিশ্চিত করা হয়েছে. আপনার বিমা টাকা সাথে সাথে পাঠানো হয়েছে. অনুগ্রহ করে কাছের Post Office এ Aadhaar Card নিয়ে যান এবং টাকা তোলেন.' };
    case 'Odisha':
      return { name: '🟢 ଓଡ଼ିଆ (Odia) — Primary', text: 'ନମସ୍କାର. ଆପଣଙ୍କ କ୍ଷେତରେ ବନ୍ୟା ଆସିଛି. ସାଟେଲାଇଟ୍ ଦ୍ୱାରା ବନ୍ୟାର ପ୍ରମାଣ ହେଇଛି. ଆପଣଙ୍କ ବୀମା ଟଙ୍କା ସାଙ୍ଗେ ସାଙ୍ଗେ ପଠା ଯାଇଛି. ଦୟା କରି ପାଖରେ ଥିବା Post Office କୁ Aadhaar Card ନେଇ ଯାଆନ୍ତୁ ଏବଂ ଟଙ୍କା ଉଠାନ୍ତୁ.' };
    case 'Andhra Pradesh':
    case 'Telangana':
      return { name: '🟢 తెలుగు (Telugu) — Primary', text: 'నమస్కారం. మీ పొలంలో వరద వచ్చింది. ఉపగ్రహం ద్వారా వరద ధృవీకరించబడింది. మీ భీమా డబ్బు వెంటనే పంపబడింది. దయచేసి దగ్గర ఉన్న Post Office కు Aadhaar Card తో వెళ్లి డబ్బు తీసుకోండి.' };
    case 'Punjab':
      return { name: '🟢 ਪੰਜਾਬੀ (Punjabi) — Primary', text: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ. ਤੁਹਾਡੇ ਖੇਤ ਵਿੱਚ ਹੜ੍ਹ ਆ ਗਿਆ ਹੈ. ਸੈਟੇਲਾਈਟ ਰਾਹੀਂ ਹੜ੍ਹ ਦੀ ਪੁਸ਼ਟੀ ਹੋਈ ਹੈ. ਤੁਹਾਡੀ ਬੀਮਾ ਰਕਮ ਤੁਰੰਤ ਭੇਜ ਦਿੱਤੀ ਗਈ ਹੈ. ਕਿਰਪਾ ਕਰਕੇ ਨੇੜੇ ਦੇ Post Office ਵਿੱਚ Aadhaar Card ਲੈ ਕੇ ਜਾਓ ਤੇ ਪੈਸੇ ਕੱਢੋ.' };
    case 'Bihar':
      return { name: '🟢 भोजपुरी (Bhojpuri) — Primary', text: 'प्रणाम। आपके खेत में बाढ़ आ गइल बा। Satellite से बाढ़ के पुष्टि हो गइल बा। आपके मुआवज़ा तुरंत भेज दियल गइल बा। Post office जाके Aadhaar से पइसा निकाल लीं।' };
    case 'Assam':
      return { name: '🟢 অসমীয়া (Assamese) — Primary', text: 'নমস্কাৰ। আপোনাৰ খেতিপথাৰত বানপানী আহিছে। AgriTrust AI-এ স্বয়ংক্ৰিয়ভাৱে বীমাৰ টকা পঠাইছে। Aadhaar কাৰ্ড লৈ নিকটতম AePS কেন্দ্ৰলৈ যাওক।' };
    default:
      return { name: '🟢 हिंदी (Hindi) — Primary', text: 'AgriTrust AI आपातकालीन सूचना। आपके खेत में बाढ़ की पुष्टि हुई है। आपका बीमा भुगतान तुरंत भेज दिया गया है। कृपया अपने नज़दीकी Post Office में Aadhaar card लेकर जाएँ।' };
  }
};
