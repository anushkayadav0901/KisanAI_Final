/**
 * nationalGrid.js — national agricultural grid reference data
 *
 * States are placed on a hex tile cartogram of India: an approximate,
 * area-neutral layout rather than a geographic projection. A cartogram makes
 * no claim about boundaries, so the surveillance view stays focused on
 * agricultural signal.
 *
 * Agro-climatic zones follow the 15-zone NARP classification used by ICAR.
 * District names are real. Metrics layered on top are simulated — see
 * surveillance.js.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const cd = JSON.parse(
  fs.readFileSync(path.join(__dirname, "cityData.json"), "utf8"),
);

const DISTRICTS = {
  MH: cd["mahacities"] ?? [],
  AP: (cd["andra cities"] ?? []).slice(0, 26),
  PB: cd["punjab cities"] ?? [],
  KA: cd["karnataka cities"] ?? [],
  KL: cd["kerala cities"] ?? [],
  TN: cd["tamilnadu cities"] ?? [],
  TG: (cd["telangana cities"] ?? []).slice(0, 33),

  UP: [
    "Agra", "Aligarh", "Prayagraj", "Bareilly", "Ballia", "Bijnor", "Bulandshahr",
    "Deoria", "Etawah", "Ghazipur", "Gorakhpur", "Hardoi", "Jhansi", "Kanpur Nagar",
    "Lakhimpur Kheri", "Lucknow", "Mathura", "Meerut", "Mirzapur", "Moradabad",
    "Muzaffarnagar", "Pratapgarh", "Rae Bareli", "Saharanpur", "Shahjahanpur",
    "Sitapur", "Sultanpur", "Varanasi",
  ],
  MP: [
    "Betul", "Bhopal", "Chhindwara", "Damoh", "Dewas", "Dhar", "Guna", "Gwalior",
    "Harda", "Hoshangabad", "Indore", "Jabalpur", "Khandwa", "Khargone", "Mandsaur",
    "Morena", "Narsinghpur", "Neemuch", "Raisen", "Ratlam", "Rewa", "Sagar",
    "Satna", "Sehore", "Shajapur", "Shivpuri", "Ujjain", "Vidisha",
  ],
  RJ: [
    "Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Bharatpur", "Bhilwara",
    "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", "Ganganagar", "Hanumangarh",
    "Jaipur", "Jaisalmer", "Jalore", "Jhalawar", "Jhunjhunu", "Jodhpur", "Kota",
    "Nagaur", "Pali", "Sikar", "Tonk", "Udaipur",
  ],
  GJ: [
    "Ahmedabad", "Amreli", "Anand", "Banaskantha", "Bharuch", "Bhavnagar",
    "Dahod", "Gandhinagar", "Jamnagar", "Junagadh", "Kheda", "Kutch", "Mehsana",
    "Navsari", "Panchmahal", "Patan", "Rajkot", "Sabarkantha", "Surat",
    "Surendranagar", "Vadodara", "Valsad",
  ],
  BR: [
    "Araria", "Aurangabad", "Begusarai", "Bhagalpur", "Bhojpur", "Buxar",
    "Darbhanga", "Gaya", "Gopalganj", "Katihar", "Madhubani", "Muzaffarpur",
    "Nalanda", "Nawada", "Patna", "Purnia", "Rohtas", "Samastipur", "Saran",
    "Sitamarhi", "Siwan", "Vaishali", "West Champaran",
  ],
  WB: [
    "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur", "Darjeeling",
    "Hooghly", "Howrah", "Jalpaiguri", "Jhargram", "Malda", "Murshidabad",
    "Nadia", "North 24 Parganas", "Paschim Bardhaman", "Purba Bardhaman",
    "Purba Medinipur", "Purulia", "South 24 Parganas", "Uttar Dinajpur",
  ],
  OD: [
    "Angul", "Balangir", "Balasore", "Bargarh", "Bhadrak", "Cuttack", "Dhenkanal",
    "Ganjam", "Jajpur", "Kalahandi", "Kendrapara", "Keonjhar", "Khordha",
    "Koraput", "Mayurbhanj", "Nayagarh", "Puri", "Rayagada", "Sambalpur", "Sundargarh",
  ],
  HR: [
    "Ambala", "Bhiwani", "Faridabad", "Fatehabad", "Gurugram", "Hisar", "Jhajjar",
    "Jind", "Kaithal", "Karnal", "Kurukshetra", "Mahendragarh", "Panipat",
    "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar",
  ],
  CG: [
    "Balod", "Baloda Bazar", "Bastar", "Bilaspur", "Dhamtari", "Durg",
    "Janjgir-Champa", "Jashpur", "Kabirdham", "Kanker", "Korba", "Mahasamund",
    "Raigarh", "Raipur", "Rajnandgaon", "Surguja",
  ],
  JH: [
    "Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka", "Garhwa", "Giridih",
    "Godda", "Gumla", "Hazaribagh", "Khunti", "Latehar", "Lohardaga", "Palamu",
    "Ranchi", "Sahibganj", "Saraikela", "West Singhbhum",
  ],
  AS: [
    "Barpeta", "Bongaigaon", "Cachar", "Darrang", "Dhubri", "Dibrugarh",
    "Goalpara", "Golaghat", "Jorhat", "Kamrup", "Karbi Anglong", "Lakhimpur",
    "Nagaon", "Nalbari", "Sivasagar", "Sonitpur", "Tinsukia",
  ],
  HP: [
    "Bilaspur", "Chamba", "Hamirpur", "Kangra", "Kinnaur", "Kullu", "Mandi",
    "Shimla", "Sirmaur", "Solan", "Una",
  ],
  UK: [
    "Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar",
    "Nainital", "Pauri Garhwal", "Pithoragarh", "Rudraprayag", "Tehri Garhwal",
    "Udham Singh Nagar", "Uttarkashi",
  ],
  JK: [
    "Anantnag", "Baramulla", "Budgam", "Doda", "Ganderbal", "Jammu", "Kathua",
    "Kulgam", "Kupwara", "Pulwama", "Rajouri", "Samba", "Srinagar", "Udhampur",
  ],
  GA: ["North Goa", "South Goa"],
  TR: [
    "Dhalai", "Gomati", "Khowai", "North Tripura", "Sepahijala",
    "South Tripura", "Unakoti", "West Tripura",
  ],
  ML: [
    "East Garo Hills", "East Khasi Hills", "Jaintia Hills", "Ri-Bhoi",
    "West Garo Hills", "West Khasi Hills",
  ],
  MN: [
    "Bishnupur", "Chandel", "Churachandpur", "Imphal East", "Imphal West",
    "Thoubal", "Ukhrul",
  ],
  NL: [
    "Dimapur", "Kohima", "Mokokchung", "Mon", "Phek", "Tuensang", "Wokha",
    "Zunheboto",
  ],
  MZ: ["Aizawl", "Champhai", "Kolasib", "Lunglei", "Mamit", "Serchhip"],
  AR: [
    "Changlang", "East Siang", "Lohit", "Lower Subansiri", "Papum Pare",
    "Tirap", "West Kameng",
  ],
  SK: ["East Sikkim", "North Sikkim", "South Sikkim", "West Sikkim"],
};

export const STATE_NODES = [
  { code: "JK", name: "Jammu & Kashmir", col: 3, row: 0, zone: "Western Himalayan", crops: ["Rice", "Wheat", "Mustard"], farmHouseholdsLakh: 14, language: "Urdu", districts: DISTRICTS.JK },
  { code: "HP", name: "Himachal Pradesh", col: 4, row: 1, zone: "Western Himalayan", crops: ["Potato", "Wheat", "Maize"], farmHouseholdsLakh: 9, language: "Hindi", districts: DISTRICTS.HP },
  { code: "UK", name: "Uttarakhand", col: 5, row: 1, zone: "Western Himalayan", crops: ["Rice", "Wheat", "Potato"], farmHouseholdsLakh: 8, language: "Hindi", districts: DISTRICTS.UK },
  { code: "PB", name: "Punjab", col: 3, row: 2, zone: "Trans-Gangetic Plains", crops: ["Wheat", "Rice", "Cotton", "Potato"], farmHouseholdsLakh: 11, language: "Punjabi", districts: DISTRICTS.PB },
  { code: "HR", name: "Haryana", col: 4, row: 2, zone: "Trans-Gangetic Plains", crops: ["Wheat", "Rice", "Mustard"], farmHouseholdsLakh: 16, language: "Hindi", districts: DISTRICTS.HR },
  { code: "SK", name: "Sikkim", col: 8, row: 2, zone: "Eastern Himalayan", crops: ["Maize", "Rice"], farmHouseholdsLakh: 1, language: "Nepali", districts: DISTRICTS.SK },
  { code: "AR", name: "Arunachal Pradesh", col: 10, row: 2, zone: "Eastern Himalayan", crops: ["Rice", "Maize"], farmHouseholdsLakh: 2, language: "Assamese", districts: DISTRICTS.AR },
  { code: "RJ", name: "Rajasthan", col: 2, row: 3, zone: "Western Dry Region", crops: ["Mustard", "Millets", "Wheat", "Pulses"], farmHouseholdsLakh: 76, language: "Hindi", districts: DISTRICTS.RJ },
  { code: "UP", name: "Uttar Pradesh", col: 5, row: 3, zone: "Upper Gangetic Plains", crops: ["Wheat", "Rice", "Sugarcane", "Potato"], farmHouseholdsLakh: 233, language: "Hindi", districts: DISTRICTS.UP },
  { code: "BR", name: "Bihar", col: 6, row: 3, zone: "Middle Gangetic Plains", crops: ["Rice", "Wheat", "Maize"], farmHouseholdsLakh: 164, language: "Hindi", districts: DISTRICTS.BR },
  { code: "WB", name: "West Bengal", col: 8, row: 3, zone: "Lower Gangetic Plains", crops: ["Rice", "Potato", "Tea"], farmHouseholdsLakh: 96, language: "Bengali", districts: DISTRICTS.WB },
  { code: "AS", name: "Assam", col: 9, row: 3, zone: "Eastern Himalayan", crops: ["Rice", "Tea", "Mustard"], farmHouseholdsLakh: 27, language: "Assamese", districts: DISTRICTS.AS },
  { code: "NL", name: "Nagaland", col: 10, row: 3, zone: "Eastern Himalayan", crops: ["Rice", "Maize"], farmHouseholdsLakh: 2, language: "English", districts: DISTRICTS.NL },
  { code: "GJ", name: "Gujarat", col: 1, row: 4, zone: "Gujarat Plains & Hills", crops: ["Cotton", "Groundnut", "Wheat", "Banana"], farmHouseholdsLakh: 48, language: "Gujarati", districts: DISTRICTS.GJ },
  { code: "MP", name: "Madhya Pradesh", col: 4, row: 4, zone: "Central Plateau & Hills", crops: ["Soybeans", "Wheat", "Pulses", "Maize"], farmHouseholdsLakh: 98, language: "Hindi", districts: DISTRICTS.MP },
  { code: "CG", name: "Chhattisgarh", col: 6, row: 4, zone: "Eastern Plateau & Hills", crops: ["Rice", "Maize", "Pulses"], farmHouseholdsLakh: 37, language: "Hindi", districts: DISTRICTS.CG },
  { code: "JH", name: "Jharkhand", col: 7, row: 4, zone: "Eastern Plateau & Hills", crops: ["Rice", "Maize", "Pulses"], farmHouseholdsLakh: 28, language: "Hindi", districts: DISTRICTS.JH },
  { code: "ML", name: "Meghalaya", col: 9, row: 4, zone: "Eastern Himalayan", crops: ["Rice", "Maize"], farmHouseholdsLakh: 3, language: "English", districts: DISTRICTS.ML },
  { code: "MN", name: "Manipur", col: 10, row: 4, zone: "Eastern Himalayan", crops: ["Rice", "Maize"], farmHouseholdsLakh: 2, language: "English", districts: DISTRICTS.MN },
  { code: "MH", name: "Maharashtra", col: 2, row: 5, zone: "Western Plateau & Hills", crops: ["Cotton", "Sugarcane", "Soybeans", "Onion"], farmHouseholdsLakh: 137, language: "Marathi", districts: DISTRICTS.MH },
  { code: "TG", name: "Telangana", col: 4, row: 5, zone: "Southern Plateau & Hills", crops: ["Rice", "Cotton", "Maize"], farmHouseholdsLakh: 55, language: "Telugu", districts: DISTRICTS.TG },
  { code: "OD", name: "Odisha", col: 7, row: 5, zone: "East Coast Plains & Hills", crops: ["Rice", "Pulses", "Groundnut"], farmHouseholdsLakh: 48, language: "Odia", districts: DISTRICTS.OD },
  { code: "TR", name: "Tripura", col: 9, row: 5, zone: "Eastern Himalayan", crops: ["Rice", "Tea"], farmHouseholdsLakh: 4, language: "Bengali", districts: DISTRICTS.TR },
  { code: "MZ", name: "Mizoram", col: 10, row: 5, zone: "Eastern Himalayan", crops: ["Rice", "Maize"], farmHouseholdsLakh: 1, language: "English", districts: DISTRICTS.MZ },
  { code: "GA", name: "Goa", col: 1, row: 6, zone: "West Coast Plains & Ghats", crops: ["Rice", "Banana"], farmHouseholdsLakh: 1, language: "Konkani", districts: DISTRICTS.GA },
  { code: "KA", name: "Karnataka", col: 3, row: 6, zone: "Southern Plateau & Hills", crops: ["Millets", "Maize", "Sugarcane", "Coffee"], farmHouseholdsLakh: 78, language: "Kannada", districts: DISTRICTS.KA },
  { code: "AP", name: "Andhra Pradesh", col: 5, row: 6, zone: "East Coast Plains & Hills", crops: ["Rice", "Cotton", "Groundnut"], farmHouseholdsLakh: 60, language: "Telugu", districts: DISTRICTS.AP },
  { code: "TN", name: "Tamil Nadu", col: 4, row: 7, zone: "East Coast Plains & Hills", crops: ["Rice", "Sugarcane", "Banana", "Groundnut"], farmHouseholdsLakh: 79, language: "Tamil", districts: DISTRICTS.TN },
  { code: "KL", name: "Kerala", col: 3, row: 8, zone: "West Coast Plains & Ghats", crops: ["Rice", "Banana", "Tea"], farmHouseholdsLakh: 18, language: "Malayalam", districts: DISTRICTS.KL },
];

export const STATE_BY_CODE = Object.fromEntries(
  STATE_NODES.map((s) => [s.code, s]),
);

/** Crop to the pests and diseases that actually threaten it in Indian conditions. */
export const CROP_THREATS = {
  Rice: ["Bacterial Leaf Blight", "Rice Blast", "Brown Planthopper", "Sheath Blight", "False Smut"],
  Wheat: ["Yellow Rust", "Karnal Bunt", "Powdery Mildew", "Loose Smut", "Wheat Aphid"],
  Cotton: ["Pink Bollworm", "Whitefly", "Cotton Leaf Curl Virus", "Bacterial Blight"],
  Sugarcane: ["Red Rot", "Early Shoot Borer", "Woolly Aphid", "Sugarcane Smut"],
  Maize: ["Fall Armyworm", "Turcicum Leaf Blight", "Maize Stem Borer"],
  Soybeans: ["Yellow Mosaic Virus", "Girdle Beetle", "Soybean Rust"],
  Groundnut: ["Tikka Leaf Spot", "Collar Rot", "Groundnut Aphid"],
  Mustard: ["White Rust", "Alternaria Blight", "Mustard Aphid"],
  Potato: ["Late Blight", "Early Blight", "Black Scurf"],
  Onion: ["Purple Blotch", "Onion Thrips", "Stemphylium Blight"],
  Millets: ["Downy Mildew", "Millet Blast", "Shoot Fly"],
  Pulses: ["Pod Borer", "Fusarium Wilt", "Yellow Mosaic Virus"],
  Tea: ["Blister Blight", "Red Spider Mite"],
  Banana: ["Panama Wilt", "Sigatoka Leaf Spot"],
  Coffee: ["Coffee Leaf Rust", "White Stem Borer"],
};
