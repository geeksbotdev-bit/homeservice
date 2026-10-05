import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type Lang = 'en' | 'ur' | 'roman';

export const LANGUAGES: { code: Lang; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ur', label: 'Urdu', native: 'اردو' },
  { code: 'roman', label: 'Roman Urdu', native: 'Roman Urdu' },
];

const KEY = 'hs_lang';
const isWeb = Platform.OS === 'web';

/**
 * English string → Urdu / Roman-Urdu. The English copy in the JSX *is* the key,
 * so the shared <Text> component can translate the whole app automatically
 * (see Text.tsx). Anything missing here simply renders in English, which keeps
 * new screens working before they are translated.
 */
const DICT: Record<string, { ur: string; roman: string }> = {
  // ── Tabs & navigation ────────────────────────────────────────────────
  'Home': { ur: 'ہوم', roman: 'Home' },
  'Bookings': { ur: 'بکنگز', roman: 'Bookings' },
  'Messages': { ur: 'پیغامات', roman: 'Messages' },
  'Profile': { ur: 'پروفائل', roman: 'Profile' },
  'Track': { ur: 'ٹریک', roman: 'Track' },
  'Jobs': { ur: 'جابز', roman: 'Jobs' },
  'Schedule': { ur: 'شیڈول', roman: 'Schedule' },
  'Earnings': { ur: 'کمائی', roman: 'Kamai' },
  'Reviews': { ur: 'ریویوز', roman: 'Reviews' },
  'Payment': { ur: 'ادائیگی', roman: 'Adaigi' },
  'Booking': { ur: 'بکنگ', roman: 'Booking' },
  'Job': { ur: 'جاب', roman: 'Job' },
  'Job Details': { ur: 'جاب کی تفصیل', roman: 'Job ki tafseel' },
  'Notifications': { ur: 'اطلاعات', roman: 'Notifications' },

  // ── Common actions ───────────────────────────────────────────────────
  'Continue': { ur: 'جاری رکھیں', roman: 'Jari rakhein' },
  'Cancel': { ur: 'منسوخ کریں', roman: 'Cancel karein' },
  'Save': { ur: 'محفوظ کریں', roman: 'Save karein' },
  'Save Changes': { ur: 'تبدیلیاں محفوظ کریں', roman: 'Changes save karein' },
  'Saving...': { ur: 'محفوظ ہو رہا ہے...', roman: 'Save ho raha hai...' },
  'Saving…': { ur: 'محفوظ ہو رہا ہے…', roman: 'Save ho raha hai…' },
  'Add': { ur: 'شامل کریں', roman: 'Add karein' },
  'Change': { ur: 'تبدیل کریں', roman: 'Tabdeel karein' },
  'Next': { ur: 'آگے', roman: 'Aagay' },
  'Retry': { ur: 'دوبارہ کوشش', roman: 'Dobara koshish' },
  'Try again': { ur: 'دوبارہ کوشش کریں', roman: 'Dobara koshish karein' },
  'See all': { ur: 'سب دیکھیں', roman: 'Sab dekhein' },
  'All': { ur: 'سب', roman: 'Sab' },
  'New': { ur: 'نیا', roman: 'Naya' },
  'Selected': { ur: 'منتخب', roman: 'Muntakhib' },
  'Unavailable': { ur: 'دستیاب نہیں', roman: 'Dastyab nahi' },
  'Available': { ur: 'دستیاب', roman: 'Dastyab' },
  'Clear filters': { ur: 'فلٹر ہٹائیں', roman: 'Filters hatayein' },
  'Processing…': { ur: 'کارروائی جاری…', roman: 'Process ho raha hai…' },
  'Submitting...': { ur: 'جمع ہو رہا ہے...', roman: 'Submit ho raha hai...' },
  'Setting up...': { ur: 'ترتیب دی جا رہی ہے...', roman: 'Set ho raha hai...' },
  'Something went wrong': { ur: 'کچھ غلط ہو گیا', roman: 'Kuch ghalat ho gaya' },
  'Status': { ur: 'اسٹیٹس', roman: 'Status' },
  'Today': { ur: 'آج', roman: 'Aaj' },
  'Recent': { ur: 'حالیہ', roman: 'Haaliya' },
  'Before': { ur: 'پہلے', roman: 'Pehle' },
  'After': { ur: 'بعد میں', roman: 'Baad mein' },
  'Method': { ur: 'طریقہ', roman: 'Tareeqa' },
  'Label': { ur: 'لیبل', roman: 'Label' },
  'Email': { ur: 'ای میل', roman: 'Email' },
  'Phone': { ur: 'فون', roman: 'Phone' },
  'Gender': { ur: 'جنس', roman: 'Jins' },
  'Date of birth': { ur: 'تاریخِ پیدائش', roman: 'Date of birth' },
  '(optional)': { ur: '(اختیاری)', roman: '(optional)' },
  'FREE': { ur: 'مفت', roman: 'FREE' },
  'TOTAL': { ur: 'کل', roman: 'TOTAL' },
  'Total': { ur: 'کل', roman: 'Total' },
  'Subtotal': { ur: 'ذیلی رقم', roman: 'Subtotal' },
  'Rating': { ur: 'ریٹنگ', roman: 'Rating' },
  'Range': { ur: 'فاصلہ', roman: 'Range' },
  'LIVE': { ur: 'لائیو', roman: 'LIVE' },
  'SOON': { ur: 'جلد', roman: 'SOON' },
  'DEFAULT': { ur: 'ڈیفالٹ', roman: 'DEFAULT' },
  'NOW': { ur: 'ابھی', roman: 'ABHI' },

  // ── Auth ─────────────────────────────────────────────────────────────
  'Get Started': { ur: 'شروع کریں', roman: 'Shuru karein' },
  'Log In': { ur: 'لاگ ان', roman: 'Log In' },
  'Log Out': { ur: 'لاگ آؤٹ', roman: 'Log Out' },
  'Welcome back.': { ur: 'خوش آمدید۔', roman: 'Khush aamdeed.' },
  'Send Code': { ur: 'کوڈ بھیجیں', roman: 'Code bhejein' },
  'Sending...': { ur: 'بھیجا جا رہا ہے...', roman: 'Bhej rahe hain...' },
  'Enter the code': { ur: 'کوڈ درج کریں', roman: 'Code darj karein' },
  'Resend code': { ur: 'کوڈ دوبارہ بھیجیں', roman: 'Code dobara bhejein' },
  'Verify & Continue': { ur: 'تصدیق کریں اور جاری رکھیں', roman: 'Verify karke jari rakhein' },
  'Verifying...': { ur: 'تصدیق ہو رہی ہے...', roman: 'Verify ho raha hai...' },
  'or continue with': { ur: 'یا اس سے جاری رکھیں', roman: 'ya is se jari rakhein' },
  'Continue with Google': { ur: 'گوگل سے جاری رکھیں', roman: 'Google se jari rakhein' },
  'Opening Google…': { ur: 'گوگل کھل رہا ہے…', roman: 'Google khul raha hai…' },
  'Mobile Number': { ur: 'موبائل نمبر', roman: 'Mobile number' },
  'Full name': { ur: 'پورا نام', roman: 'Poora naam' },
  'Full name *': { ur: 'پورا نام *', roman: 'Poora naam *' },
  'Email (optional)': { ur: 'ای میل (اختیاری)', roman: 'Email (optional)' },
  'City / Area (optional)': { ur: 'شہر / علاقہ (اختیاری)', roman: 'Sheher / ilaqa (optional)' },
  'City / Area': { ur: 'شہر / علاقہ', roman: 'Sheher / ilaqa' },
  'Your name': { ur: 'آپ کا نام', roman: 'Aap ka naam' },
  'HomeService will never call to ask for your code.': {
    ur: 'ہوم سروس کبھی آپ سے کوڈ نہیں پوچھے گی۔',
    roman: 'HomeService kabhi aap se code nahi poochay gi.',
  },
  'You can change these anytime in Profile.': {
    ur: 'آپ یہ کسی بھی وقت پروفائل میں تبدیل کر سکتے ہیں۔',
    roman: 'Aap ye kabhi bhi Profile mein badal sakte hain.',
  },

  // ── Customer home & services ─────────────────────────────────────────
  'Our Services': { ur: 'ہماری سروسز', roman: 'Hamari services' },
  'All Services': { ur: 'تمام سروسز', roman: 'Tamam services' },
  'Search services...': { ur: 'سروسز تلاش کریں...', roman: 'Services talash karein...' },
  'No services match your search.': { ur: 'آپ کی تلاش سے کوئی سروس نہیں ملی۔', roman: 'Aap ki search se koi service nahi mili.' },
  'Book Now': { ur: 'ابھی بک کریں', roman: 'Abhi book karein' },
  'Schedule Later': { ur: 'بعد کے لیے شیڈول کریں', roman: 'Baad ke liye schedule karein' },
  'Book in 60 sec': { ur: '60 سیکنڈ میں بک کریں', roman: '60 second mein book karein' },
  'Supplies included': { ur: 'سامان شامل ہے', roman: 'Saman shamil hai' },
  'Available today': { ur: 'آج دستیاب', roman: 'Aaj dastyab' },
  'New service': { ur: 'نئی سروس', roman: 'Nayi service' },
  "What's included": { ur: 'کیا شامل ہے', roman: 'Kya shamil hai' },
  'BASE PRICE': { ur: 'بنیادی قیمت', roman: 'BASE PRICE' },
  'Enhance your clean — tap to select': { ur: 'اپنی صفائی بہتر بنائیں — منتخب کرنے کے لیے دبائیں', roman: 'Apni cleaning behtar banayein — select karne ke liye tap karein' },
  'Browse services': { ur: 'سروسز دیکھیں', roman: 'Services dekhein' },
  'Verified cleaner': { ur: 'تصدیق شدہ کلینر', roman: 'Verified cleaner' },
  'Free cancellation': { ur: 'مفت منسوخی', roman: 'Free cancellation' },

  // ── Booking flow ─────────────────────────────────────────────────────
  'Schedule a Booking': { ur: 'بکنگ شیڈول کریں', roman: 'Booking schedule karein' },
  'Available Times': { ur: 'دستیاب اوقات', roman: 'Dastyab auqaat' },
  'No slots left on this day — try another date.': { ur: 'اس دن کوئی وقت باقی نہیں — دوسری تاریخ منتخب کریں۔', roman: 'Is din koi slot nahi bacha — dusri date chunein.' },
  'Tap a time slot above to continue': { ur: 'جاری رکھنے کے لیے اوپر سے وقت منتخب کریں', roman: 'Jari rakhne ke liye upar se time chunein' },
  'Service Summary': { ur: 'سروس کا خلاصہ', roman: 'Service ka khulasa' },
  'Service Address': { ur: 'سروس کا پتہ', roman: 'Service ka pata' },
  'Booking Time': { ur: 'بکنگ کا وقت', roman: 'Booking ka time' },
  'Price Breakdown': { ur: 'قیمت کی تفصیل', roman: 'Price ki tafseel' },
  'Payment Method': { ur: 'ادائیگی کا طریقہ', roman: 'Payment ka tareeqa' },
  'Confirm Booking': { ur: 'بکنگ کی تصدیق کریں', roman: 'Booking confirm karein' },
  'Confirm & Pay': { ur: 'تصدیق کریں اور ادائیگی کریں', roman: 'Confirm karke pay karein' },
  'Cancel Booking': { ur: 'بکنگ منسوخ کریں', roman: 'Booking cancel karein' },
  'Cancel booking': { ur: 'بکنگ منسوخ کریں', roman: 'Booking cancel karein' },
  'Cancel this booking?': { ur: 'کیا یہ بکنگ منسوخ کریں؟', roman: 'Ye booking cancel karein?' },
  'Change address': { ur: 'پتہ تبدیل کریں', roman: 'Pata tabdeel karein' },
  'Service fee': { ur: 'سروس فیس', roman: 'Service fee' },
  'HomeService fee (5%)': { ur: 'ہوم سروس فیس (5%)', roman: 'HomeService fee (5%)' },
  'within 1 hour': { ur: '1 گھنٹے کے اندر', roman: '1 ghante ke andar' },

  // ── Payment ──────────────────────────────────────────────────────────
  'Pay to start your booking': { ur: 'بکنگ شروع کرنے کے لیے ادائیگی کریں', roman: 'Booking shuru karne ke liye payment karein' },
  "We'll find you a nearby cleaner right after payment": { ur: 'ادائیگی کے فوراً بعد ہم قریبی کلینر تلاش کریں گے', roman: 'Payment ke foran baad hum qareebi cleaner dhoondein ge' },
  'AMOUNT DUE': { ur: 'قابلِ ادا رقم', roman: 'Qabil-e-ada raqam' },
  'Debit / Credit Card': { ur: 'ڈیبٹ / کریڈٹ کارڈ', roman: 'Debit / Credit Card' },
  'Visa / Mastercard · via Bank Alfalah': { ur: 'ویزا / ماسٹر کارڈ · بینک الفلاح کے ذریعے', roman: 'Visa / Mastercard · Bank Alfalah ke zariye' },
  'Opening secure checkout…': { ur: 'محفوظ چیک آؤٹ کھل رہا ہے…', roman: 'Secure checkout khul raha hai…' },
  'Opening secure checkout...': { ur: 'محفوظ چیک آؤٹ کھل رہا ہے...', roman: 'Secure checkout khul raha hai...' },
  'Secure Payment': { ur: 'محفوظ ادائیگی', roman: 'Mehfooz payment' },
  'Secure payment': { ur: 'محفوظ ادائیگی', roman: 'Mehfooz payment' },
  'Waiting for your payment': { ur: 'آپ کی ادائیگی کا انتظار ہے', roman: 'Aap ki payment ka intezar hai' },
  "The bank's secure card page opened in a new tab. Finish the payment there — this screen continues by itself.": {
    ur: 'بینک کا محفوظ کارڈ صفحہ نئے ٹیب میں کھل گیا ہے۔ ادائیگی وہاں مکمل کریں — یہ اسکرین خود آگے بڑھ جائے گی۔',
    roman: 'Bank ka secure card page naye tab mein khul gaya hai. Payment wahan mukammal karein — ye screen khud aage barh jaye gi.',
  },
  'Open the payment page again': { ur: 'ادائیگی کا صفحہ دوبارہ کھولیں', roman: 'Payment page dobara kholein' },
  'If nothing opened, allow pop-ups for this site and tap the button above.': {
    ur: 'اگر کچھ نہیں کھلا تو اس سائٹ کے لیے پاپ اپ کی اجازت دیں اور اوپر والا بٹن دبائیں۔',
    roman: 'Agar kuch nahi khula to is site ke liye pop-ups allow karein aur upar wala button dabayein.',
  },
  'Total paid': { ur: 'کل ادا شدہ', roman: 'Total ada shuda' },
  'Download Receipt': { ur: 'رسید ڈاؤن لوڈ کریں', roman: 'Receipt download karein' },

  // ── Dispatch / tracking ──────────────────────────────────────────────
  'Finding your cleaner…': { ur: 'آپ کا کلینر تلاش کیا جا رہا ہے…', roman: 'Aap ka cleaner dhoonda ja raha hai…' },
  'Finding you a cleaner…': { ur: 'آپ کے لیے کلینر تلاش کیا جا رہا ہے…', roman: 'Aap ke liye cleaner dhoonda ja raha hai…' },
  "We'll match you shortly": { ur: 'ہم جلد آپ کو کلینر سے ملائیں گے', roman: 'Hum jald aap ko cleaner se milayein ge' },
  'Sending to nearby cleaners…': { ur: 'قریبی کلینرز کو بھیجا جا رہا ہے…', roman: 'Qareebi cleaners ko bheja ja raha hai…' },
  'Matching progress': { ur: 'میچنگ کی پیش رفت', roman: 'Matching ki progress' },
  'CLEANERS NEARBY': { ur: 'قریبی کلینرز', roman: 'Qareebi cleaners' },
  'LIVE DISPATCH': { ur: 'لائیو ڈسپیچ', roman: 'LIVE DISPATCH' },
  'Cleaner matched!': { ur: 'کلینر مل گیا!', roman: 'Cleaner mil gaya!' },
  'No cleaner assigned': { ur: 'کوئی کلینر مقرر نہیں', roman: 'Koi cleaner assign nahi' },
  'Track your cleaner': { ur: 'اپنے کلینر کو ٹریک کریں', roman: 'Apne cleaner ko track karein' },
  'In progress now': { ur: 'ابھی جاری ہے', roman: 'Abhi jari hai' },
  'Service completed': { ur: 'سروس مکمل ہو گئی', roman: 'Service mukammal ho gayi' },
  'My Bookings': { ur: 'میری بکنگز', roman: 'Meri bookings' },
  'Track and manage your cleanings': { ur: 'اپنی صفائیوں کو ٹریک اور منظم کریں', roman: 'Apni cleanings track aur manage karein' },
  'Rate service': { ur: 'سروس کو ریٹ کریں', roman: 'Service ko rate karein' },
  'Re-book': { ur: 'دوبارہ بک کریں', roman: 'Dobara book karein' },
  'Rate your cleaner': { ur: 'اپنے کلینر کو ریٹ کریں', roman: 'Apne cleaner ko rate karein' },
  'Rate your experience': { ur: 'اپنے تجربے کو ریٹ کریں', roman: 'Apne tajurbe ko rate karein' },
  'What stood out?': { ur: 'کیا خاص اچھا لگا؟', roman: 'Kya khaas acha laga?' },
  'Add a review (optional)': { ur: 'ریویو لکھیں (اختیاری)', roman: 'Review likhein (optional)' },
  'Share details of your experience…': { ur: 'اپنے تجربے کی تفصیل بتائیں…', roman: 'Apne tajurbe ki tafseel batayein…' },
  'Submit Rating': { ur: 'ریٹنگ جمع کریں', roman: 'Rating submit karein' },
  'You rated this service': { ur: 'آپ نے اس سروس کو ریٹ کیا', roman: 'Aap ne is service ko rate kiya' },
  'WORK PHOTOS': { ur: 'کام کی تصاویر', roman: 'Kaam ki tasveerein' },

  // ── Chat ─────────────────────────────────────────────────────────────
  'Type a message…': { ur: 'پیغام لکھیں…', roman: 'Message likhein…' },
  'No messages yet': { ur: 'ابھی کوئی پیغام نہیں', roman: 'Abhi koi message nahi' },
  'Chat with your assigned cleaners': { ur: 'اپنے مقرر کردہ کلینرز سے بات کریں', roman: 'Apne assigned cleaners se baat karein' },
  'Chat with your customers': { ur: 'اپنے کسٹمرز سے بات کریں', roman: 'Apne customers se baat karein' },
  'Once a cleaner is assigned to your booking, your chat will appear here.': {
    ur: 'جب آپ کی بکنگ پر کلینر مقرر ہو جائے گا، آپ کی چیٹ یہاں نظر آئے گی۔',
    roman: 'Jab aap ki booking par cleaner assign ho jaye ga, chat yahan nazar aaye gi.',
  },
  'Message customer': { ur: 'کسٹمر کو پیغام بھیجیں', roman: 'Customer ko message karein' },
  'Mark all as read': { ur: 'سب کو پڑھا ہوا نشان زد کریں', roman: 'Sab ko read mark karein' },
  'No notifications yet': { ur: 'ابھی کوئی اطلاع نہیں', roman: 'Abhi koi notification nahi' },

  // ── Addresses & location ─────────────────────────────────────────────
  'Choose Location': { ur: 'مقام منتخب کریں', roman: 'Location chunein' },
  'Search your location': { ur: 'اپنا مقام تلاش کریں', roman: 'Apni location talash karein' },
  'Set location on map': { ur: 'نقشے پر مقام مقرر کریں', roman: 'Map par location set karein' },
  'Drag the pin on a real map': { ur: 'اصل نقشے پر پن کو حرکت دیں', roman: 'Asli map par pin ko move karein' },
  'Pin your location': { ur: 'اپنا مقام پن کریں', roman: 'Apni location pin karein' },
  'Confirm location': { ur: 'مقام کی تصدیق کریں', roman: 'Location confirm karein' },
  'SEARCH RESULTS': { ur: 'تلاش کے نتائج', roman: 'Search results' },
  'SAVED ADDRESSES': { ur: 'محفوظ پتے', roman: 'Mehfooz patay' },
  'SELECTED LOCATION': { ur: 'منتخب مقام', roman: 'Muntakhib location' },
  'POPULAR AREAS': { ur: 'مقبول علاقے', roman: 'Maqbool ilaqay' },
  'Saved Addresses': { ur: 'محفوظ پتے', roman: 'Mehfooz patay' },
  'Add Address': { ur: 'پتہ شامل کریں', roman: 'Pata add karein' },
  'Save Address': { ur: 'پتہ محفوظ کریں', roman: 'Pata save karein' },
  'Street address': { ur: 'گلی کا پتہ', roman: 'Street ka pata' },
  'Area / City': { ur: 'علاقہ / شہر', roman: 'Ilaqa / Sheher' },
  'Set as default address': { ur: 'ڈیفالٹ پتہ بنائیں', roman: 'Default pata banayein' },
  'No saved addresses yet — search above or tap Add.': {
    ur: 'ابھی کوئی محفوظ پتہ نہیں — اوپر تلاش کریں یا ایڈ دبائیں۔',
    roman: 'Abhi koi saved pata nahi — upar search karein ya Add dabayein.',
  },

  // ── Payment methods ──────────────────────────────────────────────────
  'Payment Methods': { ur: 'ادائیگی کے طریقے', roman: 'Payment ke tareeqay' },
  'Add Payment Method': { ur: 'ادائیگی کا طریقہ شامل کریں', roman: 'Payment method add karein' },
  'Save Payment Method': { ur: 'ادائیگی کا طریقہ محفوظ کریں', roman: 'Payment method save karein' },
  'Set as default payment method': { ur: 'ڈیفالٹ ادائیگی کا طریقہ بنائیں', roman: 'Default payment method banayein' },
  'Account holder name': { ur: 'اکاؤنٹ ہولڈر کا نام', roman: 'Account holder ka naam' },
  'Bank name': { ur: 'بینک کا نام', roman: 'Bank ka naam' },
  'Only the last 4 digits are stored for display. Full details stay secure.': {
    ur: 'صرف آخری 4 ہندسے دکھانے کے لیے محفوظ ہوتے ہیں۔ مکمل تفصیلات محفوظ رہتی ہیں۔',
    roman: 'Sirf aakhri 4 digits display ke liye store hote hain. Poori details mehfooz rehti hain.',
  },
  'No payment methods yet. Tap Add to add one.': {
    ur: 'ابھی کوئی ادائیگی کا طریقہ نہیں۔ شامل کرنے کے لیے ایڈ دبائیں۔',
    roman: 'Abhi koi payment method nahi. Add dabayein.',
  },

  // ── Profile (customer) ───────────────────────────────────────────────
  'Edit Profile': { ur: 'پروفائل میں تبدیلی', roman: 'Profile edit karein' },
  'Change photo': { ur: 'تصویر تبدیل کریں', roman: 'Tasveer badlein' },
  'Preferred Cleaners': { ur: 'پسندیدہ کلینرز', roman: 'Pasandeeda cleaners' },
  'Cleaners you favourite after a booking will appear here.': {
    ur: 'بکنگ کے بعد آپ جن کلینرز کو پسند کریں گے وہ یہاں نظر آئیں گے۔',
    roman: 'Booking ke baad jin cleaners ko pasand karein ge wo yahan nazar aayein ge.',
  },
  'Language': { ur: 'زبان', roman: 'Zaban' },
  'Choose Language': { ur: 'زبان منتخب کریں', roman: 'Zaban chunein' },
  'Select your preferred language': { ur: 'اپنی پسندیدہ زبان منتخب کریں', roman: 'Apni pasandeeda zaban chunein' },
  'Help & Support': { ur: 'مدد و معاونت', roman: 'Madad o muawanat' },
  'Terms & Privacy': { ur: 'شرائط و رازداری', roman: 'Shurait o raazdari' },
  'Terms & Conditions': { ur: 'شرائط و ضوابط', roman: 'Shurait o zawabit' },
  'Privacy Policy': { ur: 'رازداری کی پالیسی', roman: 'Raazdari ki policy' },
  'Cancellation & Refund Policy': { ur: 'منسوخی اور رقم کی واپسی کی پالیسی', roman: 'Cancellation aur refund ki policy' },
  'Switch to Cleaner mode': { ur: 'کلینر موڈ پر جائیں', roman: 'Cleaner mode par jayein' },
  'Switch to Customer mode': { ur: 'کسٹمر موڈ پر جائیں', roman: 'Customer mode par jayein' },
  'Switching…': { ur: 'تبدیل ہو رہا ہے…', roman: 'Switch ho raha hai…' },

  // ── Cleaner (pro) app ────────────────────────────────────────────────
  'Hello': { ur: 'ہیلو', roman: 'Hello' },
  'Your Jobs': { ur: 'آپ کی جابز', roman: 'Aap ki jobs' },
  'Active jobs': { ur: 'فعال جابز', roman: 'Active jobs' },
  'No active jobs right now': { ur: 'ابھی کوئی فعال جاب نہیں', roman: 'Abhi koi active job nahi' },
  'No past jobs yet': { ur: 'ابھی کوئی پرانی جاب نہیں', roman: 'Abhi koi purani job nahi' },
  'Accept this job': { ur: 'یہ جاب قبول کریں', roman: 'Ye job accept karein' },
  'Accept Job': { ur: 'جاب قبول کریں', roman: 'Job accept karein' },
  'Reject': { ur: 'مسترد کریں', roman: 'Reject karein' },
  'On My Way': { ur: 'میں راستے میں ہوں', roman: 'Main raaste mein hoon' },
  'Mark Arrived': { ur: 'پہنچ گیا نشان زد کریں', roman: 'Pohanch gaya mark karein' },
  'Arrived': { ur: 'پہنچ گیا', roman: 'Pohanch gaya' },
  'Start Job': { ur: 'جاب شروع کریں', roman: 'Job shuru karein' },
  'Complete Job': { ur: 'جاب مکمل کریں', roman: 'Job mukammal karein' },
  'Complete': { ur: 'مکمل', roman: 'Mukammal' },
  'Navigate': { ur: 'راستہ دکھائیں', roman: 'Rasta dikhayein' },
  'Job value': { ur: 'جاب کی مالیت', roman: 'Job ki maliyat' },
  "CUSTOMER'S PACKAGE": { ur: 'کسٹمر کا پیکیج', roman: 'Customer ka package' },
  'SCHEDULED · OPEN': { ur: 'شیڈولڈ · کھلا', roman: 'SCHEDULED · OPEN' },
  'SCHEDULED · PICK UP': { ur: 'شیڈولڈ · اٹھائیں', roman: 'SCHEDULED · PICK UP' },
  'INSTANT · FIRST TO ACCEPT': { ur: 'فوری · پہلے قبول کرنے والا', roman: 'INSTANT · PEHLE ACCEPT KARNE WALA' },
  'NEW REQUEST': { ur: 'نئی درخواست', roman: 'Nayi request' },
  'Your upcoming cleanings': { ur: 'آپ کی آنے والی صفائیاں', roman: 'Aap ki aane wali cleanings' },
  'No scheduled jobs': { ur: 'کوئی شیڈول جاب نہیں', roman: 'Koi scheduled job nahi' },
  'Available for jobs': { ur: 'جابز کے لیے دستیاب', roman: 'Jobs ke liye dastyab' },
  'Jobs done': { ur: 'مکمل شدہ جابز', roman: 'Mukammal jobs' },
  'Avg / job': { ur: 'اوسط / جاب', roman: 'Average / job' },
  'Gross earnings': { ur: 'مجموعی کمائی', roman: 'Total kamai' },
  'Already withdrawn': { ur: 'پہلے نکالی گئی', roman: 'Pehle nikali gayi' },
  'Available to withdraw': { ur: 'نکالنے کے لیے دستیاب', roman: 'Nikalne ke liye dastyab' },
  'Payout history': { ur: 'ادائیگیوں کی تاریخ', roman: 'Payout history' },
  'No payouts yet': { ur: 'ابھی کوئی ادائیگی نہیں', roman: 'Abhi koi payout nahi' },
  'Payout method': { ur: 'ادائیگی کا طریقہ', roman: 'Payout ka tareeqa' },
  'Add payout account': { ur: 'ادائیگی کا اکاؤنٹ شامل کریں', roman: 'Payout account add karein' },
  "No payout account yet. Add where you'd like to receive your earnings.": {
    ur: 'ابھی کوئی اکاؤنٹ نہیں۔ بتائیں آپ کمائی کہاں وصول کرنا چاہتے ہیں۔',
    roman: 'Abhi koi account nahi. Batayein aap kamai kahan lena chahte hain.',
  },
  'Bio / specialties': { ur: 'تعارف / مہارت', roman: 'Bio / maharat' },
  'Edit profile & availability': { ur: 'پروفائل اور دستیابی میں تبدیلی', roman: 'Profile aur availability edit karein' },
  'My Documents': { ur: 'میری دستاویزات', roman: 'Meri dastavezat' },
  'Welcome aboard! 🎉': { ur: 'خوش آمدید! 🎉', roman: 'Khush aamdeed! 🎉' },
  "Fastest — we'll detect where you are": { ur: 'سب سے تیز — ہم آپ کا مقام خود معلوم کر لیں گے', roman: 'Sab se tez — hum aap ki location khud maloom kar lein ge' },
  'Use current location': { ur: 'موجودہ مقام استعمال کریں', roman: 'Mojooda location istemal karein' },
  'No reviews yet. Complete jobs and your customer ratings will appear here.': {
    ur: 'ابھی کوئی ریویو نہیں۔ جابز مکمل کریں، کسٹمر کی ریٹنگز یہاں نظر آئیں گی۔',
    roman: 'Abhi koi review nahi. Jobs mukammal karein, customer ratings yahan nazar aayein gi.',
  },
  'VERIFIED PROFESSIONAL': { ur: 'تصدیق شدہ پروفیشنل', roman: 'Verified professional' },
  '✨ New professional': { ur: '✨ نیا پروفیشنل', roman: '✨ Naya professional' },
  'ABOUT': { ur: 'تعارف', roman: 'Taaruf' },

  // ── Verification ─────────────────────────────────────────────────────
  'Identity Verification': { ur: 'شناخت کی تصدیق', roman: 'Shanakht ki tasdeeq' },
  'CNIC Number': { ur: 'شناختی کارڈ نمبر', roman: 'CNIC number' },
  'CNIC — Front': { ur: 'شناختی کارڈ — سامنے', roman: 'CNIC — front' },
  'CNIC — Back': { ur: 'شناختی کارڈ — پیچھے', roman: 'CNIC — back' },
  'Selfie': { ur: 'سیلفی', roman: 'Selfie' },
  'Take a selfie': { ur: 'سیلفی لیں', roman: 'Selfie lein' },
  'Upload a photo': { ur: 'تصویر اپ لوڈ کریں', roman: 'Tasveer upload karein' },
  'Choose from gallery instead': { ur: 'گیلری سے منتخب کریں', roman: 'Gallery se chunein' },
  'Choose from gallery': { ur: 'گیلری سے منتخب کریں', roman: 'Gallery se chunein' },
  'Your identity is verified. You can accept jobs.': {
    ur: 'آپ کی شناخت تصدیق شدہ ہے۔ اب آپ جابز قبول کر سکتے ہیں۔',
    roman: 'Aap ki shanakht verified hai. Ab aap jobs accept kar sakte hain.',
  },
  'Submit for verification': { ur: 'تصدیق کے لیے بھیجیں', roman: 'Verification ke liye bhejein' },
  'Re-submit for review': { ur: 'دوبارہ جائزے کے لیے بھیجیں', roman: 'Dobara review ke liye bhejein' },

  // ── Job photos ───────────────────────────────────────────────────────
  'JOB PHOTOS': { ur: 'جاب کی تصاویر', roman: 'Job ki tasveerein' },
  'Take a photo': { ur: 'تصویر لیں', roman: 'Tasveer lein' },
  'Before you start': { ur: 'شروع کرنے سے پہلے', roman: 'Shuru karne se pehle' },
  'Finish the job': { ur: 'جاب مکمل کریں', roman: 'Job mukammal karein' },
  'Photo of the site': { ur: 'جگہ کی تصویر', roman: 'Jagah ki tasveer' },
  'Photo of your work': { ur: 'اپنے کام کی تصویر', roman: 'Apne kaam ki tasveer' },
  'Before — site on arrival': { ur: 'پہلے — پہنچنے پر جگہ', roman: 'Pehle — pohanchne par jagah' },
  'After — finished work': { ur: 'بعد میں — مکمل کام', roman: 'Baad mein — mukammal kaam' },
  'Required to continue': { ur: 'جاری رکھنے کے لیے ضروری', roman: 'Jari rakhne ke liye zaroori' },
  'Take a picture of the area as you found it. The customer sees this with the job.': {
    ur: 'جگہ کی تصویر لیں جیسے آپ نے اسے پایا۔ کسٹمر یہ جاب کے ساتھ دیکھے گا۔',
    roman: 'Jagah ki tasveer lein jaise aap ne usay paya. Customer ye job ke saath dekhe ga.',
  },
  'Take a picture of the area you cleaned. This is sent with the completed job.': {
    ur: 'جو جگہ آپ نے صاف کی اس کی تصویر لیں۔ یہ مکمل جاب کے ساتھ بھیجی جائے گی۔',
    roman: 'Jo jagah aap ne saaf ki us ki tasveer lein. Ye mukammal job ke saath bheji jaye gi.',
  },
  'Start Job asks for a photo of the site; Complete Job asks for a photo of the finished work.': {
    ur: 'جاب شروع کرنے پر جگہ کی تصویر اور مکمل کرنے پر کام کی تصویر مانگی جاتی ہے۔',
    roman: 'Job shuru karne par jagah ki tasveer aur mukammal karne par kaam ki tasveer mangi jati hai.',
  },

  // ── Phrases with values (used with tf) ───────────────────────────────
  '({n} reviews)': { ur: '({n} ریویوز)', roman: '({n} reviews)' },
  '{unit} · supplies included': { ur: '{unit} · سامان شامل ہے', roman: '{unit} · saman shamil hai' },
  'Number of {noun}s': { ur: '{noun} کی تعداد', roman: '{noun} ki tadaad' },
  '{price} per {noun}': { ur: '{price} فی {noun}', roman: '{price} per {noun}' },
  'Add-ons': { ur: 'اضافی سروسز', roman: 'Extra services' },

  // ── Service catalogue (names, taglines, categories) ──────────────────
  'Bathroom Cleaning': { ur: 'باتھ روم کی صفائی', roman: 'Bathroom ki safai' },
  'Kitchen Cleaning': { ur: 'کچن کی صفائی', roman: 'Kitchen ki safai' },
  'General Cleaning': { ur: 'عام صفائی', roman: 'Aam safai' },
  'Tiles, fixtures, deep scrub': { ur: 'ٹائلز، فٹنگز، گہری رگڑائی', roman: 'Tiles, fittings, gehri safai' },
  'Stove, counter, sink, cabinets': { ur: 'چولہا، کاؤنٹر، سنک، کیبنٹ', roman: 'Chulha, counter, sink, cabinets' },
  'All rooms, dusting, mopping': { ur: 'تمام کمرے، جھاڑ پونچھ، پوچا', roman: 'Tamam kamray, jhaar poonch, pocha' },
  'QUICK': { ur: 'فوری', roman: 'FORI' },
  'POPULAR': { ur: 'مقبول', roman: 'MAQBOOL' },
  'FULL HOME': { ur: 'پورا گھر', roman: 'POORA GHAR' },
  '1–2 hrs': { ur: '1–2 گھنٹے', roman: '1–2 ghante' },
  '2–3 hrs': { ur: '2–3 گھنٹے', roman: '2–3 ghante' },
  '3–4 hrs': { ur: '3–4 گھنٹے', roman: '3–4 ghante' },
  'per bathroom': { ur: 'فی باتھ روم', roman: 'per bathroom' },
  'per kitchen': { ur: 'فی کچن', roman: 'per kitchen' },
  'per home': { ur: 'فی گھر', roman: 'per ghar' },
  'bathroom': { ur: 'باتھ روم', roman: 'bathroom' },
  'kitchen': { ur: 'کچن', roman: 'kitchen' },
  'home': { ur: 'گھر', roman: 'ghar' },

  // Service descriptions
  'A thorough bathroom clean by our background-verified HomeService professionals — using eco-friendly, fragrance-free cleaning products safe for families and children.': {
    ur: 'ہمارے تصدیق شدہ پروفیشنلز کی جانب سے باتھ روم کی مکمل صفائی — ماحول دوست، بغیر خوشبو والے محفوظ کلیننگ پروڈکٹس کے ساتھ جو بچوں اور گھر والوں کے لیے محفوظ ہیں۔',
    roman: 'Hamare verified professionals ki taraf se bathroom ki mukammal safai — eco-friendly, khushbu ke baghair products jo bachon aur ghar walon ke liye mehfooz hain.',
  },
  'Complete kitchen deep-clean: degreased stove and hood, sanitised counters and sink, wiped cabinet fronts and appliances — leaving your kitchen spotless and hygienic.': {
    ur: 'کچن کی مکمل گہری صفائی: چولہا اور ہُڈ سے چکنائی صاف، کاؤنٹر اور سنک جراثیم سے پاک، کیبنٹ اور آلات کی صفائی — آپ کا کچن بالکل صاف اور محفوظ۔',
    roman: 'Kitchen ki mukammal gehri safai: chulhe aur hood se chiknai saaf, counter aur sink jaraseem se paak, cabinets aur appliances ki safai — aap ka kitchen bilkul saaf.',
  },
  'Full-home cleaning by a team of two: every room dusted, floors mopped, surfaces sanitised. Ideal for routine upkeep or pre-event preparation.': {
    ur: 'دو افراد کی ٹیم کے ذریعے پورے گھر کی صفائی: ہر کمرے کی جھاڑ پونچھ، فرش کا پوچا، سطحیں جراثیم سے پاک۔ معمول کی صفائی یا کسی تقریب سے پہلے بہترین۔',
    roman: 'Do afraad ki team ke zariye poore ghar ki safai: har kamre ki jhaar poonch, farsh ka pocha, surfaces jaraseem se paak. Routine safai ya kisi taqreeb se pehle behtareen.',
  },

  // What's included
  'Toilet scrub & disinfection': { ur: 'ٹوائلٹ کی رگڑائی اور جراثیم کشی', roman: 'Toilet ki safai aur jaraseem kushi' },
  'Tiles & grout deep cleaning': { ur: 'ٹائلز اور جوڑوں کی گہری صفائی', roman: 'Tiles aur joron ki gehri safai' },
  'Mirror & fixture polishing': { ur: 'آئینہ اور فٹنگز کی پالش', roman: 'Aaina aur fittings ki polish' },
  'Sink, countertop & vanity wipe-down': { ur: 'سنک، کاؤنٹر اور وینٹی کی صفائی', roman: 'Sink, counter aur vanity ki safai' },
  'Floor mopping & drain cleaning': { ur: 'فرش کا پوچا اور نالی کی صفائی', roman: 'Farsh ka pocha aur nali ki safai' },
  'All cleaning supplies provided': { ur: 'صفائی کا تمام سامان شامل', roman: 'Safai ka tamam saman shamil' },
  'Stove & hood degreasing': { ur: 'چولہا اور ہُڈ سے چکنائی کی صفائی', roman: 'Chulhe aur hood se chiknai ki safai' },
  'Countertop & backsplash cleaning': { ur: 'کاؤنٹر اور پچھلی دیوار کی صفائی', roman: 'Counter aur backsplash ki safai' },
  'Sink scrub & sanitisation': { ur: 'سنک کی رگڑائی اور جراثیم کشی', roman: 'Sink ki safai aur jaraseem kushi' },
  'Cabinet front wipe-down': { ur: 'کیبنٹ کے سامنے کی صفائی', roman: 'Cabinet ke samne ki safai' },
  'Appliance exterior cleaning': { ur: 'آلات کی بیرونی صفائی', roman: 'Appliances ki bahri safai' },
  'Floor mopping & all supplies provided': { ur: 'فرش کا پوچا اور تمام سامان شامل', roman: 'Farsh ka pocha aur tamam saman shamil' },
  'All rooms dusted & tidied': { ur: 'تمام کمروں کی جھاڑ پونچھ اور ترتیب', roman: 'Tamam kamron ki jhaar poonch aur tarteeb' },
  'Floor sweeping & mopping': { ur: 'فرش کی جھاڑو اور پوچا', roman: 'Farsh ki jharoo aur pocha' },
  'Surface sanitisation': { ur: 'سطحوں کی جراثیم کشی', roman: 'Surfaces ki jaraseem kushi' },
  'Bins emptied': { ur: 'کوڑے دان خالی', roman: 'Kooray daan khali' },
  'Skirting & switch wipe-down': { ur: 'اسکرٹنگ اور سوئچ کی صفائی', roman: 'Skirting aur switch ki safai' },
  'Team of 2 · all supplies provided': { ur: '2 افراد کی ٹیم · تمام سامان شامل', roman: '2 afraad ki team · tamam saman shamil' },

  // Add-ons
  'Toilet Deep Disinfection': { ur: 'ٹوائلٹ کی گہری جراثیم کشی', roman: 'Toilet ki gehri jaraseem kushi' },
  'Hospital-grade disinfectant used': { ur: 'ہسپتال معیار کا جراثیم کش استعمال', roman: 'Hospital grade disinfectant istemal' },
  'Window & Glass Cleaning': { ur: 'کھڑکیوں اور شیشوں کی صفائی', roman: 'Khirkiyon aur sheeshon ki safai' },
  'Interior windows & all mirrors': { ur: 'اندرونی کھڑکیاں اور تمام آئینے', roman: 'Androoni khirkiyan aur tamam aainay' },
  'Cabinet Interior Cleaning': { ur: 'کیبنٹ کی اندرونی صفائی', roman: 'Cabinet ki androoni safai' },
  'Inside all bathroom cabinets & shelves': { ur: 'باتھ روم کی تمام الماریوں اور شیلف کے اندر', roman: 'Bathroom ki tamam almariyon aur shelves ke andar' },
  'Inside all kitchen cabinets': { ur: 'کچن کی تمام الماریوں کے اندر', roman: 'Kitchen ki tamam almariyon ke andar' },
  'Refrigerator Interior': { ur: 'فریج کی اندرونی صفائی', roman: 'Fridge ki androoni safai' },
  'Inside fridge clean & deodorise': { ur: 'فریج کے اندر صفائی اور بو کا خاتمہ', roman: 'Fridge ke andar safai aur boo ka khatma' },
  'Oven Deep Clean': { ur: 'اوون کی گہری صفائی', roman: 'Oven ki gehri safai' },
  'Interior oven degrease': { ur: 'اوون کے اندر سے چکنائی کی صفائی', roman: 'Oven ke andar se chiknai ki safai' },
  'Balcony & Terrace': { ur: 'بالکونی اور چھت', roman: 'Balcony aur chhat' },
  'Sweep & wash outdoor areas': { ur: 'بیرونی حصوں کی جھاڑو اور دھلائی', roman: 'Bahri hisson ki jharoo aur dhulai' },
  'Windows & Glass': { ur: 'کھڑکیاں اور شیشے', roman: 'Khirkiyan aur sheeshay' },
  'All interior windows & mirrors': { ur: 'تمام اندرونی کھڑکیاں اور آئینے', roman: 'Tamam androoni khirkiyan aur aainay' },
  'Laundry & Ironing': { ur: 'کپڑے دھلائی اور استری', roman: 'Kapray dhulai aur istri' },
  'Up to 2 hours of laundry': { ur: '2 گھنٹے تک کپڑوں کا کام', roman: '2 ghante tak kapron ka kaam' },

  // ── Review tags ──────────────────────────────────────────────────────
  'Punctual': { ur: 'وقت کا پابند', roman: 'Waqt ka paband' },
  'Thorough': { ur: 'مکمل اور باریک بین', roman: 'Mukammal kaam' },
  'Friendly': { ur: 'خوش اخلاق', roman: 'Khush akhlaq' },
  'Professional': { ur: 'پیشہ ور', roman: 'Professional' },
  'Great value': { ur: 'پیسے کی اچھی قدر', roman: 'Paison ki achi qadar' },
  'Well equipped': { ur: 'مکمل سامان کے ساتھ', roman: 'Poore saman ke sath' },
};

/** The active language, also readable outside React (helpers, services). */
let current: Lang = 'en';
const listeners = new Set<(l: Lang) => void>();

export function getLang(): Lang { return current; }

/** Translate one English string. Unknown keys stay in English. */
export function translate(key: string, lang: Lang = current): string {
  if (lang === 'en') return key;
  const hit = DICT[key];
  if (hit) return hit[lang];
  // Tolerate surrounding whitespace, so "Add-ons " still matches "Add-ons".
  const m = /^(\s+)?([\s\S]*?)(\s+)?$/.exec(key);
  if (m && m[2] && (m[1] || m[3])) {
    const inner = DICT[m[2]];
    if (inner) return (m[1] ?? '') + inner[lang] + (m[3] ?? '');
  }
  return key;
}

/**
 * Translate a phrase that carries values: tf('{price} per {noun}', {...}).
 * The English phrase (placeholders and all) is the dictionary key, so word
 * order can differ per language.
 */
export function format(key: string, vars: Record<string, string | number>, lang: Lang = current): string {
  return translate(key, lang).replace(/\{(\w+)\}/g, (whole, name) =>
    (vars[name] !== undefined ? String(vars[name]) : whole));
}

function persist(l: Lang) {
  try {
    if (isWeb) { if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, l); }
    else AsyncStorage.setItem(KEY, l).catch(() => {});
  } catch { /* ignore */ }
}

/**
 * Load the saved language before the first render. Native storage is async, so
 * this must be awaited at startup (like the session) or the app flashes English.
 */
export async function restoreLang(): Promise<void> {
  try {
    const v = isWeb
      ? (typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null)
      : await AsyncStorage.getItem(KEY);
    if (v === 'en' || v === 'ur' || v === 'roman') current = v;
  } catch { /* keep English */ }
}

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  /** Translate a phrase with values: tf('Number of {noun}s', { noun }). */
  tf: (key: string, vars: Record<string, string | number>) => string;
}
const LangContext = createContext<Ctx>({ lang: 'en', setLang: () => {}, t: (k) => k, tf: (k, v) => format(k, v, 'en') });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(current);

  // Every <Text> subscribes through this context, so one change re-renders the
  // whole app in the new language.
  useEffect(() => {
    const fn = (l: Lang) => setLangState(l);
    listeners.add(fn);
    if (current !== lang) setLangState(current);
    return () => { listeners.delete(fn); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setLang = (l: Lang) => {
    current = l;
    persist(l);
    listeners.forEach((fn) => fn(l));
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t: (k) => translate(k, lang), tf: (k, v) => format(k, v, lang) }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() { return useContext(LangContext); }
