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
  'Delete my account': { ur: 'میرا اکاؤنٹ ڈیلیٹ کریں', roman: 'Mera account delete karein' },
  'Deleting…': { ur: 'ڈیلیٹ ہو رہا ہے…', roman: 'Delete ho raha hai…' },
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
  'WithUrooj will never call to ask for your code.': {
    ur: 'ہوم سروس کبھی آپ سے کوڈ نہیں پوچھے گی۔',
    roman: 'WithUrooj kabhi aap se code nahi poochay gi.',
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
  'WithUrooj fee (5%)': { ur: 'WithUrooj فیس (5%)', roman: 'WithUrooj fee (5%)' },
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
  'A thorough bathroom clean by our background-verified WithUrooj professionals — using eco-friendly, fragrance-free cleaning products safe for families and children.': {
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

  // ── Dialogs, toasts and input placeholders (via src/i18n.ts) ────────
  'Permission needed': { ur: 'اجازت درکار ہے', roman: 'Ijazat darkar hai' },
  'Allow camera access to add the photo': { ur: 'تصویر شامل کرنے کے لیے کیمرے کی اجازت دیں', roman: 'Tasveer add karne ke liye camera ki ijazat dein' },
  'Allow photo access to continue': { ur: 'جاری رکھنے کے لیے تصاویر تک رسائی دیں', roman: 'Jari rakhne ke liye photos ki ijazat dein' },
  'Please allow photo access to set a profile picture.': { ur: 'پروفائل تصویر لگانے کے لیے تصاویر تک رسائی دیں۔', roman: 'Profile picture lagane ke liye photos ki ijazat dein.' },
  'Are you sure?': { ur: 'کیا آپ کو یقین ہے؟', roman: 'Kya aap ko yaqeen hai?' },
  'This is your last chance to cancel.': { ur: 'منسوخ کرنے کا یہ آخری موقع ہے۔', roman: 'Cancel karne ka ye aakhri mauqa hai.' },
  'Log out?': { ur: 'لاگ آؤٹ کریں؟', roman: 'Log out karein?' },
  'You will need to sign in again to book.': { ur: 'بکنگ کے لیے آپ کو دوبارہ سائن اِن کرنا ہوگا۔', roman: 'Booking ke liye dobara sign in karna hoga.' },
  'You will need to sign in again.': { ur: 'آپ کو دوبارہ سائن اِن کرنا ہوگا۔', roman: 'Aap ko dobara sign in karna hoga.' },
  'Delete your account?': { ur: 'اپنا اکاؤنٹ ڈیلیٹ کریں؟', roman: 'Apna account delete karein?' },
  'Could not delete the account': { ur: 'اکاؤنٹ ڈیلیٹ نہیں ہو سکا', roman: 'Account delete nahi ho saka' },
  'Could not send code': { ur: 'کوڈ نہیں بھیجا جا سکا', roman: 'Code nahi bheja ja saka' },
  'Could not update the job': { ur: 'جاب اپ ڈیٹ نہیں ہو سکی', roman: 'Job update nahi ho saki' },
  'Could not upload the image': { ur: 'تصویر اپ لوڈ نہیں ہو سکی', roman: 'Tasveer upload nahi ho saki' },
  'Could not generate receipt': { ur: 'رسید نہیں بن سکی', roman: 'Receipt nahi ban saki' },
  'Upload failed': { ur: 'اپ لوڈ ناکام', roman: 'Upload nakaam' },
  'Submission failed': { ur: 'جمع کرانے میں ناکامی', roman: 'Submit karne mein nakami' },
  'Submitted': { ur: 'جمع ہو گیا', roman: 'Jama ho gaya' },
  'Receipt saved': { ur: 'رسید محفوظ ہو گئی', roman: 'Receipt mehfooz ho gayi' },
  'Refund initiated': { ur: 'رقم کی واپسی شروع', roman: 'Refund shuru ho gaya' },
  'Limit reached': { ur: 'حد پوری ہو گئی', roman: 'Had poori ho gayi' },
  'Coming soon': { ur: 'جلد آ رہا ہے', roman: 'Jald aa raha hai' },
  'Google sign-in': { ur: 'گوگل سائن اِن', roman: 'Google sign-in' },
  'Signed in to your existing account': { ur: 'آپ کے موجودہ اکاؤنٹ میں سائن اِن', roman: 'Aap ke mojooda account mein sign in' },
  'Verify your identity': { ur: 'اپنی شناخت کی تصدیق کریں', roman: 'Apni shanakht verify karein' },
  'Complete verification to accept jobs': { ur: 'جابز قبول کرنے کے لیے تصدیق مکمل کریں', roman: 'Jobs accept karne ke liye verification mukammal karein' },
  'Invalid CNIC': { ur: 'غلط شناختی کارڈ نمبر', roman: 'Ghalat CNIC number' },
  'Enter a valid 13-digit CNIC number': { ur: '13 ہندسوں کا درست شناختی کارڈ نمبر درج کریں', roman: '13 digit ka sahi CNIC number darj karein' },
  'Missing documents': { ur: 'دستاویزات نامکمل', roman: 'Dastavezat namukammal' },
  'CNIC front photo and a selfie are required': { ur: 'شناختی کارڈ کے سامنے کی تصویر اور سیلفی ضروری ہے', roman: 'CNIC front ki tasveer aur selfie zaroori hai' },
  'We’ll review your documents shortly': { ur: 'ہم جلد آپ کی دستاویزات کا جائزہ لیں گے', roman: 'Hum jald aap ki dastavezat ka jaiza lein ge' },
  'Search services…': { ur: 'سروسز تلاش کریں…', roman: 'Services talash karein…' },
  'Search area, street, landmark…': { ur: 'علاقہ، گلی یا نشانی تلاش کریں…', roman: 'Ilaqa, gali ya nishani talash karein…' },
  'Search area, street or landmark…': { ur: 'علاقہ، گلی یا نشانی تلاش کریں…', roman: 'Ilaqa, gali ya nishani talash karein…' },
  'e.g. Specialist in bathroom & kitchen deep cleans': { ur: 'مثلاً باتھ روم اور کچن کی گہری صفائی کے ماہر', roman: 'Masalan bathroom aur kitchen ki gehri safai ke mahir' },

  // ── Screen copy: onboarding, errors, tracking, cleaner app ─────────
  'Trusted home cleaning,\non demand.': { ur: 'قابلِ اعتماد گھریلو صفائی،\nجب چاہیں۔', roman: 'Qabil-e-etemad ghar ki safai,\njab chahein.' },
  'Background-verified, trained professionals — booked in minutes, right from your phone.': { ur: 'تصدیق شدہ، تربیت یافتہ پروفیشنلز — چند منٹ میں آپ کے فون سے بک کریں۔', roman: 'Verified, trained professionals — chand minute mein aap ke phone se book karein.' },
  'Verified pros you\ncan trust.': { ur: 'ایسے پروفیشنلز جن پر\nآپ بھروسہ کر سکیں۔', roman: 'Aise professionals jin par\naap bharosa kar sakein.' },
  'Every cleaner is background-checked, trained, and rated by customers across Pakistan.': { ur: 'ہر کلینر کی جانچ پڑتال، تربیت اور کسٹمرز کی طرف سے ریٹنگ ہوتی ہے۔', roman: 'Har cleaner ki janch partal, training aur customers ki rating hoti hai.' },
  'Book now, or\nschedule later.': { ur: 'ابھی بک کریں، یا\nبعد کے لیے شیڈول کریں۔', roman: 'Abhi book karein, ya\nbaad ke liye schedule karein.' },
  'Track your cleaner live on the map and pay securely in PKR after the job is done.': { ur: 'نقشے پر اپنے کلینر کو لائیو دیکھیں اور کام کے بعد محفوظ طریقے سے روپے میں ادائیگی کریں۔', roman: 'Map par apne cleaner ko live dekhein aur kaam ke baad mehfooz tareeqe se PKR mein payment karein.' },
  'Your phone number,\nplease.': { ur: 'اپنا موبائل نمبر\nدرج کریں۔', roman: 'Apna mobile number\ndarj karein.' },
  'We\'ll send a one-time code to verify it\'s you. No password needed.': { ur: 'تصدیق کے لیے ہم ایک بار کا کوڈ بھیجیں گے۔ پاس ورڈ کی ضرورت نہیں۔', roman: 'Tasdeeq ke liye hum ek baar ka code bhejein ge. Password ki zaroorat nahi.' },
  'Enter your number and we\'ll send a one-time code to log you in.': { ur: 'اپنا نمبر درج کریں، ہم لاگ اِن کے لیے ایک بار کا کوڈ بھیجیں گے۔', roman: 'Apna number darj karein, hum log in ke liye ek baar ka code bhejein ge.' },
  'Standard SMS rates may apply. Valid Pakistani number required.': { ur: 'عام ایس ایم ایس چارجز لاگو ہو سکتے ہیں۔ درست پاکستانی نمبر ضروری ہے۔', roman: 'Aam SMS charges lag sakte hain. Sahi Pakistani number zaroori hai.' },
  'Choose your account type. You can use the same number for either.': { ur: 'اپنا اکاؤنٹ ٹائپ منتخب کریں۔ دونوں کے لیے ایک ہی نمبر استعمال ہو سکتا ہے۔', roman: 'Apna account type chunein. Dono ke liye ek hi number istemal ho sakta hai.' },
  'Just a couple of details to set up your account.': { ur: 'اکاؤنٹ بنانے کے لیے چند تفصیلات درکار ہیں۔', roman: 'Account banane ke liye chand tafseelat darkar hain.' },
  'Verified cleaners': { ur: 'تصدیق شدہ کلینرز', roman: 'Verified cleaners' },
  'Secure & encrypted': { ur: 'محفوظ اور خفیہ', roman: 'Mehfooz aur khufiya' },
  'PKR payments': { ur: 'روپے میں ادائیگی', roman: 'PKR mein payment' },
  'Incorrect code. Please check and try again.': { ur: 'کوڈ غلط ہے۔ دوبارہ چیک کر کے کوشش کریں۔', roman: 'Code ghalat hai. Dobara check kar ke koshish karein.' },
  'This code has expired. Tap Resend to get a new one.': { ur: 'یہ کوڈ ختم ہو چکا ہے۔ نیا کوڈ لینے کے لیے ری سینڈ دبائیں۔', roman: 'Ye code khatam ho chuka hai. Naya code lene ke liye Resend dabayein.' },
  'Too many attempts. Please wait a moment and try again.': { ur: 'بہت زیادہ کوششیں۔ تھوڑی دیر بعد دوبارہ کوشش کریں۔', roman: 'Bohat zyada koshishein. Thori dair baad dobara koshish karein.' },
  'Verification failed. Please try again.': { ur: 'تصدیق ناکام۔ دوبارہ کوشش کریں۔', roman: 'Tasdeeq nakaam. Dobara koshish karein.' },
  'Could not resend the code. Please try again.': { ur: 'کوڈ دوبارہ نہیں بھیجا جا سکا۔ دوبارہ کوشش کریں۔', roman: 'Code dobara nahi bheja ja saka. Dobara koshish karein.' },
  'Could not sign in with Google.': { ur: 'گوگل سے سائن اِن نہیں ہو سکا۔', roman: 'Google se sign in nahi ho saka.' },
  'Could not start payment. Please try again.': { ur: 'ادائیگی شروع نہیں ہو سکی۔ دوبارہ کوشش کریں۔', roman: 'Payment shuru nahi ho saki. Dobara koshish karein.' },
  'Payment was cancelled or failed. Please try again.': { ur: 'ادائیگی منسوخ ہوئی یا ناکام رہی۔ دوبارہ کوشش کریں۔', roman: 'Payment cancel hui ya nakaam rahi. Dobara koshish karein.' },
  'Session expired — please sign in again.': { ur: 'سیشن ختم ہو گیا — دوبارہ سائن اِن کریں۔', roman: 'Session khatam ho gaya — dobara sign in karein.' },
  'No internet connection. Please check your network and try again.': { ur: 'انٹرنیٹ کنکشن نہیں ہے۔ اپنا نیٹ ورک چیک کر کے دوبارہ کوشش کریں۔', roman: 'Internet connection nahi hai. Apna network check kar ke dobara koshish karein.' },
  'Could not upload the photo': { ur: 'تصویر اپ لوڈ نہیں ہو سکی', roman: 'Tasveer upload nahi ho saki' },
  'Please try again': { ur: 'دوبارہ کوشش کریں', roman: 'Dobara koshish karein' },
  'Please try again.': { ur: 'دوبارہ کوشش کریں۔', roman: 'Dobara koshish karein.' },
  'Please try again, or contact support.': { ur: 'دوبارہ کوشش کریں، یا سپورٹ سے رابطہ کریں۔', roman: 'Dobara koshish karein, ya support se rabta karein.' },
  'Please wait…': { ur: 'براہِ کرم انتظار کریں…', roman: 'Barae meherbani intezar karein…' },
  'Withdrawal failed. Please try again.': { ur: 'رقم نکالنے میں ناکامی۔ دوبارہ کوشش کریں۔', roman: 'Raqam nikalne mein nakami. Dobara koshish karein.' },
  'Booking confirmed': { ur: 'بکنگ کی تصدیق ہو گئی', roman: 'Booking confirm ho gayi' },
  'Booking cancelled': { ur: 'بکنگ منسوخ ہو گئی', roman: 'Booking cancel ho gayi' },
  'Cleaner on the way': { ur: 'کلینر راستے میں ہے', roman: 'Cleaner raaste mein hai' },
  'Cleaning in progress': { ur: 'صفائی جاری ہے', roman: 'Safai jari hai' },
  'Live tracking begins when the cleaner sets off': { ur: 'کلینر کے روانہ ہوتے ہی لائیو ٹریکنگ شروع ہو جائے گی', roman: 'Cleaner ke rawana hote hi live tracking shuru ho jaye gi' },
  'This will cancel your booking. This action cannot be undone.': { ur: 'اس سے آپ کی بکنگ منسوخ ہو جائے گی۔ یہ عمل واپس نہیں ہو سکتا۔', roman: 'Is se aap ki booking cancel ho jaye gi. Ye amal wapas nahi ho sakta.' },
  'Sending your request to cleaners nearby…': { ur: 'آپ کی درخواست قریبی کلینرز کو بھیجی جا رہی ہے…', roman: 'Aap ki request qareebi cleaners ko bheji ja rahi hai…' },
  'Waiting for a cleaner to accept…': { ur: 'کلینر کے قبول کرنے کا انتظار ہے…', roman: 'Cleaner ke accept karne ka intezar hai…' },
  'Notifying available cleaners…': { ur: 'دستیاب کلینرز کو اطلاع دی جا رہی ہے…', roman: 'Dastyab cleaners ko ittela di ja rahi hai…' },
  'Payment complete · Your cleaner is on the way': { ur: 'ادائیگی مکمل · آپ کا کلینر راستے میں ہے', roman: 'Payment mukammal · Aap ka cleaner raaste mein hai' },
  'You\'ll be notified the moment a cleaner accepts. They\'ll arrive within about an hour.': { ur: 'کلینر کے قبول کرتے ہی آپ کو اطلاع مل جائے گی۔ وہ تقریباً ایک گھنٹے میں پہنچ جائیں گے۔', roman: 'Cleaner ke accept karte hi aap ko ittela mil jaye gi. Wo taqreeban ek ghante mein pohanch jayein ge.' },
  'Pick a date above': { ur: 'اوپر سے تاریخ منتخب کریں', roman: 'Upar se date chunein' },
  'Select a time to continue': { ur: 'جاری رکھنے کے لیے وقت منتخب کریں', roman: 'Jari rakhne ke liye time chunein' },
  'Confirm Schedule': { ur: 'شیڈول کی تصدیق کریں', roman: 'Schedule confirm karein' },
  'Instant booking': { ur: 'فوری بکنگ', roman: 'Fori booking' },
  'Immediate booking': { ur: 'فوری بکنگ', roman: 'Fori booking' },
  'Card payments are processed securely by Bank Alfalah. An invoice is generated after payment.': { ur: 'کارڈ ادائیگیاں بینک الفلاح کے ذریعے محفوظ طریقے سے ہوتی ہیں۔ ادائیگی کے بعد رسید بن جاتی ہے۔', roman: 'Card payments Bank Alfalah ke zariye mehfooz tareeqe se hoti hain. Payment ke baad invoice ban jati hai.' },
  'Debit Card': { ur: 'ڈیبٹ کارڈ', roman: 'Debit Card' },
  'Your location': { ur: 'آپ کا مقام', roman: 'Aap ki location' },
  'Current location': { ur: 'موجودہ مقام', roman: 'Mojooda location' },
  'Detecting your location…': { ur: 'آپ کا مقام معلوم کیا جا رہا ہے…', roman: 'Aap ki location maloom ki ja rahi hai…' },
  'Could not get your location. Please pick an area below.': { ur: 'آپ کا مقام معلوم نہیں ہو سکا۔ نیچے سے علاقہ منتخب کریں۔', roman: 'Aap ki location maloom nahi ho saki. Neeche se ilaqa chunein.' },
  'Location permission denied. Please allow access or pick an area below.': { ur: 'مقام کی اجازت نہیں ملی۔ اجازت دیں یا نیچے سے علاقہ منتخب کریں۔', roman: 'Location ki ijazat nahi mili. Ijazat dein ya neeche se ilaqa chunein.' },
  'Location access is blocked in your browser/phone settings.': { ur: 'آپ کی براؤزر یا فون سیٹنگز میں مقام کی اجازت بند ہے۔', roman: 'Aap ki browser ya phone settings mein location band hai.' },
  'Use my current location': { ur: 'میرا موجودہ مقام استعمال کریں', roman: 'Mera mojooda location istemal karein' },
  'Move the pin to your location': { ur: 'پن کو اپنے مقام پر لے جائیں', roman: 'Pin ko apni location par le jayein' },
  'Set location': { ur: 'مقام مقرر کریں', roman: 'Location set karein' },
  'You are online — receiving job requests': { ur: 'آپ آن لائن ہیں — جاب کی درخواستیں آ رہی ہیں', roman: 'Aap online hain — job requests aa rahi hain' },
  'You are offline — no new jobs': { ur: 'آپ آف لائن ہیں — نئی جابز نہیں', roman: 'Aap offline hain — nayi jobs nahi' },
  'Receiving new job requests': { ur: 'نئی جاب درخواستیں موصول ہو رہی ہیں', roman: 'Nayi job requests mil rahi hain' },
  'Not receiving new jobs': { ur: 'نئی جابز موصول نہیں ہو رہیں', roman: 'Nayi jobs nahi mil rahin' },
  'Address shared after you accept': { ur: 'قبول کرنے کے بعد پتہ ظاہر ہوگا', roman: 'Accept karne ke baad pata zahir hoga' },
  'No address provided': { ur: 'کوئی پتہ فراہم نہیں کیا گیا', roman: 'Koi pata faraham nahi kiya gaya' },
  'Upload your CNIC and a selfie to start accepting jobs.': { ur: 'جابز قبول کرنے کے لیے اپنا شناختی کارڈ اور سیلفی اپ لوڈ کریں۔', roman: 'Jobs accept karne ke liye apna CNIC aur selfie upload karein.' },
  'Verification under review': { ur: 'تصدیق زیرِ غور ہے', roman: 'Verification zer-e-ghaur hai' },
  'Verification rejected': { ur: 'تصدیق مسترد ہو گئی', roman: 'Verification mustarad ho gayi' },
  'Tap to review and re-submit your documents.': { ur: 'دستاویزات دوبارہ دیکھنے اور بھیجنے کے لیے دبائیں۔', roman: 'Dastavezat dobara dekhne aur bhejne ke liye dabayein.' },
  'We’re reviewing your documents. You’ll be notified once approved.': { ur: 'ہم آپ کی دستاویزات کا جائزہ لے رہے ہیں۔ منظوری پر آپ کو اطلاع دی جائے گی۔', roman: 'Hum aap ki dastavezat ka jaiza le rahe hain. Manzoori par aap ko ittela di jaye gi.' },
  'Verification was rejected. Please re-submit clear documents.': { ur: 'تصدیق مسترد ہو گئی۔ واضح دستاویزات دوبارہ بھیجیں۔', roman: 'Verification mustarad ho gayi. Wazeh dastavezat dobara bhejein.' },
  'Under review — you’ll be notified once approved. You can resubmit below if needed.': { ur: 'زیرِ غور — منظوری پر اطلاع دی جائے گی۔ ضرورت ہو تو نیچے سے دوبارہ بھیجیں۔', roman: 'Zer-e-ghaur — manzoori par ittela di jaye gi. Zaroorat ho to neeche se dobara bhejein.' },
  'Verify your identity to start accepting jobs. Upload a clear photo of your CNIC and a selfie. Your documents are private and used only for verification.': { ur: 'جابز قبول کرنے کے لیے اپنی شناخت کی تصدیق کریں۔ شناختی کارڈ کی واضح تصویر اور سیلفی اپ لوڈ کریں۔ آپ کی دستاویزات نجی ہیں اور صرف تصدیق کے لیے استعمال ہوتی ہیں۔', roman: 'Jobs accept karne ke liye apni shanakht verify karein. CNIC ki wazeh tasveer aur selfie upload karein. Aap ki dastavezat niji hain aur sirf verification ke liye istemal hoti hain.' },
  'No balance': { ur: 'کوئی رقم نہیں', roman: 'Koi raqam nahi' },
  'Nothing to withdraw': { ur: 'نکالنے کے لیے کچھ نہیں', roman: 'Nikalne ke liye kuch nahi' },
  'No balance available to withdraw yet.': { ur: 'ابھی نکالنے کے لیے کوئی رقم دستیاب نہیں۔', roman: 'Abhi nikalne ke liye koi raqam dastyab nahi.' },
  'Add a payout method first (Profile → Payout method).': { ur: 'پہلے ادائیگی کا طریقہ شامل کریں (پروفائل → ادائیگی کا طریقہ)۔', roman: 'Pehle payout method add karein (Profile → Payout method).' },
  'Payouts go to your saved account · manage in Profile → Payout method': { ur: 'ادائیگی آپ کے محفوظ اکاؤنٹ میں جائے گی · پروفائل → ادائیگی کا طریقہ', roman: 'Payout aap ke saved account mein jaye ga · Profile → Payout method' },
  'Your earnings are transferred to the account you add here. Add your bank, Easypaisa or JazzCash.': { ur: 'آپ کی کمائی اسی اکاؤنٹ میں بھیجی جائے گی جو آپ یہاں شامل کریں گے۔ بینک، ایزی پیسہ یا جاز کیش شامل کریں۔', roman: 'Aap ki kamai usi account mein bheji jaye gi jo aap yahan add karein ge. Bank, Easypaisa ya JazzCash add karein.' },
  'No payout account yet. Add where you’d like to receive your earnings.': { ur: 'ابھی کوئی اکاؤنٹ نہیں۔ بتائیں آپ کمائی کہاں وصول کرنا چاہتے ہیں۔', roman: 'Abhi koi account nahi. Batayein aap kamai kahan lena chahte hain.' },
  'Job started': { ur: 'جاب شروع ہو گئی', roman: 'Job shuru ho gayi' },
  'Job completed': { ur: 'جاب مکمل ہو گئی', roman: 'Job mukammal ho gayi' },
  'Good luck!': { ur: 'بہترین!', roman: 'Behtareen!' },
  'Nice work — the customer has been notified': { ur: 'شاباش — کسٹمر کو اطلاع دے دی گئی ہے', roman: 'Shabash — customer ko ittela de di gayi hai' },
  'To customer': { ur: 'کسٹمر کی طرف', roman: 'Customer ki taraf' },
  'Keep my account': { ur: 'میرا اکاؤنٹ رہنے دیں', roman: 'Mera account rehne dein' },
  'Delete for ever': { ur: 'ہمیشہ کے لیے ڈیلیٹ کریں', roman: 'Hamesha ke liye delete karein' },
  'This permanently deletes your account, bookings, addresses and payment methods. It cannot be undone.': { ur: 'اس سے آپ کا اکاؤنٹ، بکنگز، پتے اور ادائیگی کے طریقے ہمیشہ کے لیے ختم ہو جائیں گے۔ یہ واپس نہیں ہو سکتا۔', roman: 'Is se aap ka account, bookings, patay aur payment methods hamesha ke liye khatam ho jayein ge. Ye wapas nahi ho sakta.' },
  'This permanently deletes your cleaner account, your identity documents and your job history. It cannot be undone.': { ur: 'اس سے آپ کا کلینر اکاؤنٹ، شناختی دستاویزات اور جاب کی تاریخ ہمیشہ کے لیے ختم ہو جائے گی۔ یہ واپس نہیں ہو سکتا۔', roman: 'Is se aap ka cleaner account, shanakhti dastavezat aur job history hamesha ke liye khatam ho jaye gi. Ye wapas nahi ho sakta.' },
  'This number is registered as a cleaner': { ur: 'یہ نمبر کلینر کے طور پر رجسٹرڈ ہے', roman: 'Ye number cleaner ke tor par registered hai' },
  'This number is registered as a customer': { ur: 'یہ نمبر کسٹمر کے طور پر رجسٹرڈ ہے', roman: 'Ye number customer ke tor par registered hai' },
  'This account is registered as a cleaner': { ur: 'یہ اکاؤنٹ کلینر کے طور پر رجسٹرڈ ہے', roman: 'Ye account cleaner ke tor par registered hai' },
  'This account is registered as a customer': { ur: 'یہ اکاؤنٹ کسٹمر کے طور پر رجسٹرڈ ہے', roman: 'Ye account customer ke tor par registered hai' },
  'New message': { ur: 'نیا پیغام', roman: 'Naya message' },
  'You have a new message': { ur: 'آپ کے لیے نیا پیغام ہے', roman: 'Aap ke liye naya message hai' },
  'No services available yet.': { ur: 'ابھی کوئی سروس دستیاب نہیں۔', roman: 'Abhi koi service dastyab nahi.' },
  'Finding your cleaner': { ur: 'آپ کا کلینر تلاش کیا جا رہا ہے', roman: 'Aap ka cleaner dhoonda ja raha hai' },
  'Say hello': { ur: 'سلام کہیں', roman: 'Salam kahein' },
  'Account number / IBAN': { ur: 'اکاؤنٹ نمبر / آئی بین', roman: 'Account number / IBAN' },
  'Mobile number': { ur: 'موبائل نمبر', roman: 'Mobile number' },
  'Card number': { ur: 'کارڈ نمبر', roman: 'Card number' },
  'Very good': { ur: 'بہت اچھا', roman: 'Bohat acha' },
  'On my way!': { ur: 'میں راستے میں ہوں!', roman: 'Main raaste mein hoon!' },
  'The gate is open': { ur: 'گیٹ کھلا ہے', roman: 'Gate khula hai' },
  'Please call me': { ur: 'براہِ کرم مجھے کال کریں', roman: 'Mujhe call karein' },
  'Thank you!': { ur: 'شکریہ!', roman: 'Shukriya!' },
  'Where are you?': { ur: 'آپ کہاں ہیں؟', roman: 'Aap kahan hain?' },
  'How long will it take?': { ur: 'کتنا وقت لگے گا؟', roman: 'Kitna waqt lage ga?' },

  'Already have an account?': { ur: 'پہلے سے اکاؤنٹ ہے؟', roman: 'Pehle se account hai?' },
  'New to WithUrooj?': { ur: 'WithUrooj پر نئے ہیں؟', roman: 'WithUrooj par naye hain?' },
  'By continuing, you agree to our': { ur: 'جاری رکھنے سے آپ ہماری', roman: 'Jari rakhne se aap hamari' },
  'Terms of Service': { ur: 'سروس کی شرائط', roman: 'Service ki shurait' },
  'and': { ur: 'اور', roman: 'aur' },
  // ── Status badges, category chips and row labels ───────────────────
  'Cleaning': { ur: 'صفائی', roman: 'Safai' },
  'Laundry': { ur: 'کپڑے دھلائی', roman: 'Kapray dhulai' },
  'Plumbing': { ur: 'پلمبنگ', roman: 'Plumbing' },
  'Electrician': { ur: 'الیکٹریشن', roman: 'Electrician' },
  'AC Service': { ur: 'اے سی سروس', roman: 'AC service' },
  'Pest Control': { ur: 'کیڑے مار سروس', roman: 'Pest control' },
  'Upcoming': { ur: 'آنے والی', roman: 'Aane wali' },
  'Past': { ur: 'گزشتہ', roman: 'Guzishta' },
  'Payment pending': { ur: 'ادائیگی باقی', roman: 'Payment baqi' },
  'Confirmed': { ur: 'تصدیق شدہ', roman: 'Confirm ho gayi' },
  'On the Way': { ur: 'راستے میں', roman: 'Raaste mein' },
  'In Progress': { ur: 'جاری ہے', roman: 'Jari hai' },
  'Completed': { ur: 'مکمل', roman: 'Mukammal' },
  'Cancelled': { ur: 'منسوخ', roman: 'Mansookh' },
  'Default': { ur: 'ڈیفالٹ', roman: 'Default' },
  'Bank Transfer': { ur: 'بینک ٹرانسفر', roman: 'Bank transfer' },
  'Office': { ur: 'دفتر', roman: 'Daftar' },
  'Online': { ur: 'آن لائن', roman: 'Online' },
  'Offline': { ur: 'آف لائن', roman: 'Offline' },
  'Company service fee (30%)': { ur: 'کمپنی سروس فیس (30%)', roman: 'Company service fee (30%)' },
  'jobs completed': { ur: 'مکمل شدہ جابز', roman: 'mukammal jobs' },
  'Withdraw': { ur: 'رقم نکالیں', roman: 'Raqam nikalein' },
  'Available balance': { ur: 'دستیاب رقم', roman: 'Dastyab raqam' },
  'Available jobs ({n})': { ur: 'دستیاب جابز ({n})', roman: 'Dastyab jobs ({n})' },
  'New requests ({n})': { ur: 'نئی درخواستیں ({n})', roman: 'Nayi requests ({n})' },
  'Active jobs ({n})': { ur: 'فعال جابز ({n})', roman: 'Active jobs ({n})' },
  'How will you use WithUrooj?': { ur: 'آپ WithUrooj کیسے استعمال کریں گے؟', roman: 'Aap WithUrooj kaise use karenge?' },
  'I\'m a Customer': { ur: 'میں کسٹمر ہوں', roman: 'Main customer hoon' },
  'I\'m a Cleaner': { ur: 'میں کلینر ہوں', roman: 'Main cleaner hoon' },
  'Book trusted cleaners for your home — pay after the job.': { ur: 'اپنے گھر کے لیے بھروسہ مند کلینر بک کریں — کام کے بعد ادائیگی کریں۔', roman: 'Apne ghar ke liye bharosamand cleaner book karein — kaam ke baad payment karein.' },
  'Get job requests near you, track work, and earn in PKR.': { ur: 'اپنے قریب جاب کی درخواستیں حاصل کریں، کام ٹریک کریں اور روپے میں کمائیں۔', roman: 'Apne qareeb job requests hasil karein, kaam track karein aur rupay mein kamayein.' },
  'Resend code in': { ur: 'کوڈ دوبارہ بھیجیں', roman: 'Code dobara bhejein' },
  'No conversations yet. Chats appear once you accept a job.': { ur: 'ابھی کوئی گفتگو نہیں۔ جاب قبول کرنے پر چیٹ یہاں آئے گی۔', roman: 'Abhi koi guftagu nahi. Job accept karne par chat yahan aayegi.' },
  'Couldn\'t load services. Check your connection.': { ur: 'سروسز لوڈ نہیں ہو سکیں۔ اپنا انٹرنیٹ چیک کریں۔', roman: 'Services load nahi ho sakin. Apna internet check karein.' },
  'Your booking session was reset. Please pick a service to start again.': { ur: 'آپ کا بکنگ سیشن ری سیٹ ہو گیا۔ دوبارہ شروع کرنے کے لیے سروس منتخب کریں۔', roman: 'Aapka booking session reset ho gaya. Dobara shuru karne ke liye service select karein.' },
  'Posted for': { ur: 'اس وقت کے لیے', roman: 'Is waqt ke liye' },
  'of confirmation': { ur: 'تصدیق کے بعد', roman: 'Tasdeeq ke baad' },
  'Your cleaner will arrive': { ur: 'آپ کا کلینر پہنچے گا', roman: 'Aapka cleaner pohnchega' },
  'Supplies incl.': { ur: 'سامان شامل', roman: 'Saman shamil' },
  'Refund of': { ur: 'رقم کی واپسی', roman: 'Raqam ki wapsi' },
  'What’s included': { ur: 'کیا شامل ہے', roman: 'Kya shamil hai' },
  'e.g. Ahmed Ali': { ur: 'مثلاً احمد علی', roman: 'Misal ke taur par Ahmed Ali' },
  'e.g. Fatima Ahmed': { ur: 'مثلاً فاطمہ احمد', roman: 'Misal ke taur par Fatima Ahmed' },
  'e.g. Meezan Bank': { ur: 'مثلاً میزان بینک', roman: 'Misal ke taur par Meezan Bank' },
  'House 42, Street 7, Block D': { ur: 'مکان 42، گلی 7، بلاک ڈی', roman: 'Makan 42, Gali 7, Block D' },
  'DHA Phase 5, Lahore': { ur: 'ڈی ایچ اے فیز 5، لاہور', roman: 'DHA Phase 5, Lahore' },
  'WithUrooj v1.0 · Pakistan': { ur: 'WithUrooj v1.0 · پاکستان', roman: 'WithUrooj v1.0 · Pakistan' },
  'WithUrooj Pro v1.0 · Pakistan': { ur: 'WithUrooj Pro v1.0 · پاکستان', roman: 'WithUrooj Pro v1.0 · Pakistan' },
  'Billed To': { ur: 'بل وصول کنندہ', roman: 'Bill wasool kuninda' },
  'Total Paid': { ur: 'کل ادا شدہ', roman: 'Kul ada shuda' },
  'Transaction ID': { ur: 'ٹرانزیکشن آئی ڈی', roman: 'Transaction ID' },
  'Thank you for choosing WithUrooj. This is a computer-generated receipt.': { ur: 'WithUrooj کو منتخب کرنے کا شکریہ۔ یہ کمپیوٹر سے تیار کردہ رسید ہے۔', roman: 'WithUrooj ko muntakhib karne ka shukriya. Yeh computer se tayar karda raseed hai.' },
  'is being processed to your payment method — arrives within 1 week (30% cancellation fee applied).': { ur: 'آپ کے پیمنٹ طریقے پر بھیجی جا رہی ہے — ایک ہفتے میں پہنچ جائے گی (30% کینسلیشن فیس کاٹی گئی)۔', roman: 'aapke payment tareeqe par bheji ja rahi hai — aik hafte mein pohnch jayegi (30% cancellation fee kaati gayi).' },
  'Cleaner': { ur: 'کلینر', roman: 'Cleaner' },
  'Gulshan-e-Iqbal, Karachi': { ur: 'گلشنِ اقبال، کراچی', roman: 'Gulshan-e-Iqbal, Karachi' },
  'House 12, Street 4, Block B': { ur: 'مکان 12، گلی 4، بلاک بی', roman: 'Makan 12, Gali 4, Block B' },
  'My services': { ur: 'میری سروسز', roman: 'Meri services' },
  'PAID': { ur: 'ادا شدہ', roman: 'Ada shuda' },
  'Invoice': { ur: 'انوائس', roman: 'Invoice' },
  'Date': { ur: 'تاریخ', roman: 'Tareekh' },
  'Currency': { ur: 'کرنسی', roman: 'Currency' },
  'Proprietor': { ur: 'مالک', roman: 'Malik' },
  'NTN': { ur: 'این ٹی این', roman: 'NTN' },
  'Description': { ur: 'تفصیل', roman: 'Tafseel' },
  'Amount': { ur: 'رقم', roman: 'Raqam' },
  'Service provided by': { ur: 'سروس فراہم کنندہ', roman: 'Service faraham kuninda' },
  'Thank you for choosing WithUrooj. This is a computer-generated receipt and needs no signature.': { ur: 'WithUrooj کو منتخب کرنے کا شکریہ۔ یہ کمپیوٹر سے تیار کردہ رسید ہے، دستخط کی ضرورت نہیں۔', roman: 'WithUrooj ko muntakhib karne ka shukriya. Yeh computer se tayar karda raseed hai, dastkhat ki zaroorat nahi.' },
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

/**
 * The language belongs to the account, not the handset: it is cached under a
 * per-user key so two people sharing a phone don't inherit each other's choice,
 * and signed-out screens (welcome, sign-up, OTP) always stay English.
 */
let currentUserId: string | null = null;
const userKey = (id: string) => `${KEY}:${id}`;
const isLang = (v: unknown): v is Lang => v === 'en' || v === 'ur' || v === 'roman';

async function read(k: string): Promise<string | null> {
  try {
    return isWeb
      ? (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null)
      : await AsyncStorage.getItem(k);
  } catch { return null; }
}

function write(k: string, v: string) {
  try {
    if (isWeb) { if (typeof localStorage !== 'undefined') localStorage.setItem(k, v); }
    else AsyncStorage.setItem(k, v).catch(() => {});
  } catch { /* ignore */ }
}

function persist(l: Lang) {
  if (currentUserId) write(userKey(currentUserId), l);
}

const LAST_USER = `${KEY}:last-user`;

/**
 * Startup. Someone who is not signed in always sees English, so a first run and
 * the whole sign-up flow are in English no matter what the last person on this
 * device chose.
 *
 * For a signed-in user we apply the cached choice straight away — `/me` may be
 * slow or offline, and waiting for it would flash English first. The server
 * answer then confirms (or corrects) it through adoptUserLang.
 */
export async function restoreLang(authed = false): Promise<void> {
  current = 'en';
  currentUserId = null;
  if (!authed) return;
  const id = await read(LAST_USER);
  if (!id) return;
  currentUserId = id;
  const cached = await read(userKey(id));
  if (isLang(cached)) current = cached;
}

/**
 * Called once the session is known. `serverLang` is what the account carries
 * (authoritative, follows the user across devices); the per-user cache covers
 * the offline case. Either way an unknown value means English.
 */
export async function adoptUserLang(userId: string, serverLang?: string): Promise<Lang> {
  currentUserId = userId;
  write(LAST_USER, userId);   // lets the next launch apply it before /me answers
  let next: Lang = 'en';
  if (isLang(serverLang)) {
    next = serverLang;
    write(userKey(userId), next);           // refresh the offline cache
  } else {
    const cached = await read(userKey(userId));
    if (isLang(cached)) next = cached;
  }
  if (next !== current) {
    current = next;
    listeners.forEach((fn) => fn(next));
  }
  return next;
}

let syncToAccount: ((l: Lang) => void) | null = null;
/** The root layout supplies the "save to account" call (avoids an import cycle). */
export function setLangSync(fn: ((l: Lang) => void) | null) { syncToAccount = fn; }

/** Signing out returns the app to English for the next person on this device. */
export function resetLang(): void {
  currentUserId = null;
  if (current !== 'en') {
    current = 'en';
    listeners.forEach((fn) => fn('en'));
  }
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
    // Save it on the account too, so the choice follows the user to any device.
    // Registered by the root layout to keep this store free of API imports.
    if (currentUserId) syncToAccount?.(l);
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t: (k) => translate(k, lang), tf: (k, v) => format(k, v, lang) }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() { return useContext(LangContext); }
