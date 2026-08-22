/**
 * corpus.js — the advisory knowledge base that grounds AI answers
 *
 * PROVENANCE, STATED PLAINLY:
 * These entries are a curated draft written for this project. They are NOT
 * extracts from ICAR, KVK or state agricultural university publications, and
 * nothing here should be presented as such. Every document carries
 * `source.status: "curated-draft"` and a `verify_at` search link so a reader
 * can check the guidance against an official portal.
 *
 * The point of this file is to make the retrieval pipeline real and testable.
 * The pipeline does not care where passages come from — run
 * `node scripts/ingest.js <dir>` over genuine ICAR package-of-practices PDFs
 * and those replace this seed corpus, at which point `source.status` becomes
 * "official" and the citations become authoritative.
 *
 * Content is standard, widely published agronomy. Chemical recommendations are
 * indicative only; every advisory that surfaces one also surfaces the
 * instruction to confirm dosage against the product label and the local KVK,
 * because pesticide guidance varies by state, variety and season.
 */

const verifyUrl = (q) =>
  `https://www.google.com/search?q=${encodeURIComponent(
    `${q} site:icar.org.in OR site:farmer.gov.in OR site:kvk.icar.gov.in`,
  )}`;

/**
 * @typedef {Object} KnowledgeDoc
 * @property {string} id
 * @property {string} title
 * @property {string} crop
 * @property {string} topic
 * @property {{publisher:string, status:string, verify_at:string, updated:string}} source
 * @property {Array<{heading:string, text:string}>} sections
 */

/** @type {KnowledgeDoc[]} */
export const CORPUS = [
  {
    id: "kai-doc-wheat-yellow-rust",
    title: "Wheat Yellow Rust: identification and management",
    crop: "Wheat",
    topic: "disease",
    source: {
      publisher: "Kisan AI advisory corpus",
      status: "curated-draft",
      verify_at: verifyUrl("wheat yellow rust management package of practices"),
      updated: "2026-08",
    },
    sections: [
      {
        heading: "Identification",
        text: "Yellow rust, caused by Puccinia striiformis, appears as bright yellow to orange powdery pustules arranged in narrow stripes running parallel to the leaf veins. This striping is the distinguishing feature: brown rust produces scattered round pustules rather than stripes. Rub an affected leaf with a finger and yellow-orange spores come away easily. Infection starts on lower leaves and moves upward. On susceptible varieties whole fields can turn yellow within two weeks.",
      },
      {
        heading: "Conditions that favour it",
        text: "The pathogen needs cool, moist weather. Night temperatures between 8 and 15 degrees Celsius combined with dew, fog or light rain for several consecutive nights create ideal conditions. Risk is highest in the north-western plains during December to February. Dense canopies from high seed rate or heavy nitrogen hold moisture longer and raise risk. Fields near hills where the pathogen oversummers are usually affected first.",
      },
      {
        heading: "Scouting and action threshold",
        text: "Walk the field in a W pattern once a week from the tillering stage, examining ten plants at each of five points. Pay attention to shaded and border rows, where infection typically appears first. Intervention is generally advised when rust is found on more than five percent of leaves, or at the first appearance of any pustule where a susceptible variety is grown near a known hotspot. Early detection matters more than any single spray: a focus caught at one square metre can often be contained.",
      },
      {
        heading: "Management",
        text: "Growing a resistant variety is the primary control and costs nothing extra at sowing. Where a spray is warranted, propiconazole 25 EC or tebuconazole based fungicides are commonly recommended, applied at first appearance and repeated after fifteen to twenty days if conditions remain favourable. Confirm the product, dose and pre-harvest interval against the label and your local Krishi Vigyan Kendra before mixing, because approved formulations differ by state. Avoid a blanket spray across a whole holding when infection is confined to identifiable patches.",
      },
      {
        heading: "Prevention for next season",
        text: "Sow recommended resistant varieties, avoid very early sowing that exposes the crop to a longer cool period, keep nitrogen within the recommended dose rather than exceeding it, and remove volunteer wheat plants that carry the pathogen between seasons.",
      },
    ],
  },

  {
    id: "kai-doc-rice-brown-planthopper",
    title: "Rice Brown Planthopper: thresholds and resurgence risk",
    crop: "Rice",
    topic: "pest",
    source: {
      publisher: "Kisan AI advisory corpus",
      status: "curated-draft",
      verify_at: verifyUrl("rice brown planthopper ETL management"),
      updated: "2026-08",
    },
    sections: [
      {
        heading: "Identification",
        text: "Brown planthopper, Nilaparvata lugens, is a small brown insect that lives at the base of the tillers rather than on the leaves. Part the canopy and tap the stem base over water to see them. Damage shows as circular patches of yellowing and drying that spread outward, known as hopperburn. Because the insect sits low in the canopy it is frequently missed until hopperburn is already visible, by which point yield loss is substantial.",
      },
      {
        heading: "Economic threshold",
        text: "The commonly used economic threshold is five to ten hoppers per hill during the tillering stage, and around twenty per hill at the later panicle stage when the plant can tolerate more. Count by tapping the base of ten hills at five spots in the field. Presence of spiders and mirid bugs raises the effective threshold, because these natural enemies may bring the population down without any intervention.",
      },
      {
        heading: "Resurgence: the critical warning",
        text: "Synthetic pyrethroids and some broad-spectrum insecticides kill the natural enemies of brown planthopper more effectively than they kill the hopper itself, and are strongly associated with resurgence, where the population returns higher than before treatment. Repeated pyrethroid use is one of the main causes of severe outbreaks. If a previous spray was followed by a worse infestation, resurgence is the likely explanation and the response is to stop spraying that class of chemistry, not to increase the dose.",
      },
      {
        heading: "Management",
        text: "Drain the field for three to four days where irrigation allows, since continuous standing water favours the hopper. Widen plant spacing and avoid excessive nitrogen, both of which create the dense humid canopy the insect prefers. Where treatment is genuinely needed, select a product specifically recommended for planthopper and direct the spray at the base of the plants rather than the upper canopy, since that is where the insect lives. Confirm the choice with your local Krishi Vigyan Kendra.",
      },
    ],
  },

  {
    id: "kai-doc-cotton-pink-bollworm",
    title: "Cotton Pink Bollworm: monitoring and the end-of-season break",
    crop: "Cotton",
    topic: "pest",
    source: {
      publisher: "Kisan AI advisory corpus",
      status: "curated-draft",
      verify_at: verifyUrl("cotton pink bollworm management pheromone trap ETL"),
      updated: "2026-08",
    },
    sections: [
      {
        heading: "Identification",
        text: "Pink bollworm, Pectinophora gossypiella, feeds inside the boll, so external damage is easy to miss. The clearest early sign is the rosette flower: a flower whose petals are twisted and fail to open properly because a larva is feeding inside. Cut open suspect bolls to find pink larvae and damaged, stained lint. Exit holes on bolls indicate the larvae have already left.",
      },
      {
        heading: "Monitoring with pheromone traps",
        text: "Install pheromone traps at roughly five per acre from about forty-five days after sowing, and check them twice a week. A commonly used action threshold is eight moths per trap per night sustained across three consecutive nights, or five percent of bolls found damaged on inspection. Traps monitor the population and time an intervention; they do not control the pest on their own.",
      },
      {
        heading: "Breaking the life cycle",
        text: "The single most effective measure is denying the insect a continuous host. Uproot and destroy cotton stalks promptly after the final picking rather than leaving them standing, avoid extending the crop for a late additional picking, and do not stack unprocessed cotton near the field. Larvae carry over in stubble and stored material and start the next season early. This is a community measure: it works far better when neighbouring farms do it in the same window.",
      },
      {
        heading: "Management",
        text: "Follow the refuge planting requirement for Bt cotton, since refuge non-compliance accelerates resistance development. Where spraying is warranted, rotate chemical classes between applications rather than repeating one product, and confirm the recommendation with your local Krishi Vigyan Kendra. Late-season repeated sprays deliver poor returns because the larvae are protected inside the boll.",
      },
    ],
  },

  {
    id: "kai-doc-maize-fall-armyworm",
    title: "Maize Fall Armyworm: staged response",
    crop: "Maize",
    topic: "pest",
    source: {
      publisher: "Kisan AI advisory corpus",
      status: "curated-draft",
      verify_at: verifyUrl("fall armyworm maize management India advisory"),
      updated: "2026-08",
    },
    sections: [
      {
        heading: "Identification",
        text: "Fall armyworm, Spodoptera frugiperda, feeds in the whorl of young maize plants. Early damage looks like small translucent windows on the leaves, where the larva has scraped one surface away. Later the whorl fills with ragged holes and coarse sawdust-like frass. The larva has an inverted pale Y marking on the head and four dark spots arranged in a square on the second-last body segment, which distinguishes it from other caterpillars.",
      },
      {
        heading: "Threshold",
        text: "Intervention is generally advised at around five percent whorl damage in the early vegetative stage and ten to twenty percent later, assessed by examining plants at several points across the field. A single larva per whorl can cause visible damage without justifying a spray, because maize compensates well for early leaf loss.",
      },
      {
        heading: "Staged intervention ladder",
        text: "Start with the least aggressive measure that fits the infestation. At low incidence, hand-picking egg masses and larvae during regular scouting is effective on small holdings, particularly early in the morning. Applying dry sand or sand mixed with lime into the whorl kills larvae mechanically and costs nothing. Neem-based formulations work on early instars. Biological options including Bt and entomopathogenic fungi suit moderate infestations. Chemical control is the last step, not the first, and works only when directed into the whorl where the larva sits. Blanket spraying of a whole field for scattered damage wastes money and kills the parasitoids that suppress the next generation.",
      },
      {
        heading: "Cultural practices",
        text: "Early and uniform sowing across a village reduces the staggered host availability the pest depends on. Intercropping with legumes and maintaining field borders that host natural enemies both help. Deep ploughing after harvest exposes pupae in the soil.",
      },
    ],
  },

  {
    id: "kai-doc-potato-late-blight",
    title: "Potato Late Blight: forecasting and prophylactic timing",
    crop: "Potato",
    topic: "disease",
    source: {
      publisher: "Kisan AI advisory corpus",
      status: "curated-draft",
      verify_at: verifyUrl("potato late blight management advisory India"),
      updated: "2026-08",
    },
    sections: [
      {
        heading: "Identification",
        text: "Late blight, caused by Phytophthora infestans, begins as water-soaked pale green to brown lesions at leaf tips and margins, which enlarge rapidly. In humid conditions a white fluffy growth appears on the underside of the lesion. The disease moves extremely fast: a field can go from a few lesions to complete destruction within a week under favourable weather. Tubers develop firm brown-purple surface patches with rusty discoloration underneath.",
      },
      {
        heading: "Weather conditions",
        text: "The critical combination is temperature between 10 and 20 degrees Celsius with relative humidity above ninety percent for two or more consecutive days. Overcast skies, drizzle, prolonged dew and fog are the practical field indicators. Once these conditions are met the incubation period is only three to four days, which is why acting on the forecast rather than on visible symptoms is the whole strategy for this disease.",
      },
      {
        heading: "Prophylactic timing",
        text: "Because visible lesions mean the epidemic has already started, protective fungicide is applied before symptoms appear, timed to the weather forecast rather than to scouting. A contact protectant such as mancozeb is generally used before the favourable window opens, with systemic products reserved for when infection is confirmed. Confirm the specific product, dose and interval with your local Krishi Vigyan Kendra, since state recommendations and resistance status differ.",
      },
      {
        heading: "Other measures",
        text: "Plant certified disease-free seed tubers, earth up adequately so tubers are not exposed to spores washing down, avoid overhead irrigation during a high-risk window, and destroy cull piles and volunteer plants, which are the usual source of the first infection.",
      },
    ],
  },

  {
    id: "kai-doc-mustard-aphid",
    title: "Mustard Aphid: spray window and pollinator safety",
    crop: "Mustard",
    topic: "pest",
    source: {
      publisher: "Kisan AI advisory corpus",
      status: "curated-draft",
      verify_at: verifyUrl("mustard aphid Lipaphis erysimi ETL management"),
      updated: "2026-08",
    },
    sections: [
      {
        heading: "Identification and timing",
        text: "Mustard aphid, Lipaphis erysimi, forms dense greyish-green colonies on the central shoot, flower stalks and developing pods. Affected plants show curled leaves, stunted shoots and a sticky honeydew coating that later develops black sooty mould. Colonies typically build from late December through February, peaking when the crop is flowering and podding.",
      },
      {
        heading: "Threshold",
        text: "A commonly used threshold is twenty to twenty-five aphids per plant on the central shoot, or infestation on around ten percent of plants. Assess by examining the top ten centimetres of the central shoot on plants at several points. Ladybird beetles and syrphid larvae feeding within the colonies can bring populations down without intervention, so check for their presence before deciding to spray.",
      },
      {
        heading: "Pollinator safety",
        text: "Mustard is heavily visited by honeybees during flowering, and bee activity contributes materially to seed set. Any spray applied during peak flowering at midday risks killing pollinators and reducing yield through poor pollination, which can offset the benefit of controlling the aphid. Where a spray is unavoidable during flowering, applying in the late evening after foraging has stopped substantially reduces bee exposure.",
      },
      {
        heading: "Management",
        text: "Sow at the recommended time, since very late sowing exposes the crop to peak aphid build-up during its most vulnerable stage. Remove and destroy heavily infested terminal shoots at first appearance to slow colony spread. Confirm any chemical recommendation with your local Krishi Vigyan Kendra and follow the label pre-harvest interval.",
      },
    ],
  },

  {
    id: "kai-doc-soil-health-interpretation",
    title: "Reading a Soil Health Card",
    crop: "General",
    topic: "soil",
    source: {
      publisher: "Kisan AI advisory corpus",
      status: "curated-draft",
      verify_at: verifyUrl("Soil Health Card scheme interpretation parameters"),
      updated: "2026-08",
    },
    sections: [
      {
        heading: "What the card reports",
        text: "A Soil Health Card reports twelve parameters: pH, electrical conductivity, organic carbon, the three primary nutrients nitrogen, phosphorus and potassium, the secondary nutrient sulphur, and the micronutrients zinc, iron, manganese, copper and boron. Each is graded low, medium or high, and the card carries a crop-wise fertiliser recommendation derived from those readings. The card is issued free of charge under a central government scheme.",
      },
      {
        heading: "Organic carbon",
        text: "Organic carbon is the parameter most worth attention, because it governs water-holding capacity, nutrient availability and soil structure at once. Values below 0.5 percent are generally considered low and are common in intensively cropped irrigated areas. Raising it is slow work: farmyard manure, compost, green manuring with dhaincha or sunhemp, and retaining crop residue rather than burning it all contribute, but change is measured across seasons rather than within one.",
      },
      {
        heading: "pH and salinity",
        text: "Most crops perform best between pH 6.5 and 7.5. Strongly acidic soils lock up phosphorus and are usually corrected with lime; sodic and alkaline soils are treated with gypsum. Electrical conductivity above about 1 deciSiemens per metre indicates salinity that will start to affect sensitive crops. Both corrections are done on the basis of a laboratory recommendation rather than a standard rate, because the required quantity depends on soil texture and the severity of the problem.",
      },
      {
        heading: "Using the recommendation",
        text: "The value of the card lies in applying only what the soil is short of. Where phosphorus reads high, continuing a standard DAP dose adds cost without adding yield. Where zinc reads low, a small correction often produces a disproportionate response, particularly in rice and wheat. Getting the soil retested every two to three years shows whether practices are actually moving the numbers.",
      },
    ],
  },

  {
    id: "kai-doc-irrigation-scheduling",
    title: "Irrigation scheduling by critical growth stage",
    crop: "General",
    topic: "water",
    source: {
      publisher: "Kisan AI advisory corpus",
      status: "curated-draft",
      verify_at: verifyUrl("irrigation scheduling critical growth stages wheat rice"),
      updated: "2026-08",
    },
    sections: [
      {
        heading: "The principle",
        text: "Yield loss from water stress is not spread evenly across the season. Every crop has a small number of critical stages at which moisture stress causes disproportionate loss, and irrigation applied at those stages returns far more than the same water applied at another time. When water is limited, the decision is not how much to apply but when.",
      },
      {
        heading: "Wheat",
        text: "The crown root initiation stage, roughly twenty to twenty-five days after sowing, is the single most important irrigation for wheat and should not be missed. Flowering and grain filling follow in importance. Where only one irrigation is possible it goes to crown root initiation; where two are possible, the second goes to flowering.",
      },
      {
        heading: "Rice",
        text: "Continuous flooding is not required for most of the season. Alternate wetting and drying, where the field is allowed to dry until the water level falls a few centimetres below the surface before re-flooding, saves a substantial share of irrigation water without yield loss and reduces methane emissions. The panicle initiation and flowering stages should not be allowed to experience stress. Draining briefly also discourages brown planthopper.",
      },
      {
        heading: "Reading the crop",
        text: "Leaf rolling in the early afternoon that recovers by evening indicates mild stress; rolling that persists into the evening indicates the crop needs water now. Dark bluish-green discoloration in cereals often precedes visible wilting. These field indicators are more reliable than a fixed calendar interval, because the actual requirement depends on temperature, wind and soil type.",
      },
    ],
  },

  {
    id: "kai-doc-sugarcane-red-rot",
    title: "Sugarcane Red Rot: recognition and containment",
    crop: "Sugarcane",
    topic: "disease",
    source: {
      publisher: "Kisan AI advisory corpus",
      status: "curated-draft",
      verify_at: verifyUrl("sugarcane red rot Colletotrichum falcatum management"),
      updated: "2026-08",
    },
    sections: [
      {
        heading: "Identification",
        text: "Red rot, caused by Colletotrichum falcatum, is confirmed by splitting an affected cane lengthwise. The internal tissue is reddened and crossed by distinctive white patches running at right angles to the length of the cane, and the split cane gives off a sour alcoholic smell. Externally the crop shows drying of the third and fourth leaves from the top while lower leaves remain green, which is the earliest field symptom.",
      },
      {
        heading: "Why it spreads",
        text: "The pathogen is carried primarily in infected setts, which is why the disease often appears wherever seed cane was taken from an affected field. It also survives in crop debris and spreads through irrigation water moving down a slope. Waterlogged fields and monoculture of a susceptible variety over successive years increase severity considerably.",
      },
      {
        heading: "Containment",
        text: "There is no effective curative spray once a clump is infected, so management is preventive and sanitary. Use healthy setts from a disease-free nursery, treat setts before planting as recommended locally, uproot and burn affected clumps rather than leaving them in the field, avoid taking ratoon from an affected crop, and improve drainage. Replacing a susceptible variety is the durable answer where the disease recurs.",
      },
    ],
  },

  {
    id: "kai-doc-groundnut-tikka",
    title: "Groundnut Tikka Leaf Spot",
    crop: "Groundnut",
    topic: "disease",
    source: {
      publisher: "Kisan AI advisory corpus",
      status: "curated-draft",
      verify_at: verifyUrl("groundnut tikka leaf spot Cercospora management"),
      updated: "2026-08",
    },
    sections: [
      {
        heading: "Identification",
        text: "Tikka disease produces roughly circular dark brown spots on the leaflets. Early leaf spot spots carry a yellow halo, while late leaf spot spots are darker and usually lack the halo. Heavy infection causes severe defoliation, and because the pods fill on the strength of the leaf canopy, defoliation before pod filling translates directly into yield and oil content loss.",
      },
      {
        heading: "Conditions and timing",
        text: "Prolonged leaf wetness with warm humid weather favours the disease. It typically appears from about forty days after sowing and intensifies through the pod development stage. Continuous groundnut cropping in the same field builds inoculum in the residue and causes earlier and more severe outbreaks each season.",
      },
      {
        heading: "Management",
        text: "Rotate away from groundnut for at least one season where the disease is recurrent, and remove or incorporate crop residue after harvest. Where spraying is warranted it is generally started at first appearance and repeated at intervals through pod filling; confirm the product and interval with your local Krishi Vigyan Kendra. Resistant and tolerant varieties are available and are the cheapest long-term control.",
      },
    ],
  },

  {
    id: "kai-doc-diagnosis-limits",
    title: "What photo-based crop diagnosis can and cannot determine",
    crop: "General",
    topic: "method",
    source: {
      publisher: "Kisan AI advisory corpus",
      status: "curated-draft",
      verify_at: verifyUrl("crop disease diagnosis laboratory confirmation KVK"),
      updated: "2026-08",
    },
    sections: [
      {
        heading: "What a photograph supports",
        text: "A clear photograph of affected plant tissue supports recognition of characteristic visible symptoms: lesion shape and colour, pustule arrangement, feeding damage patterns, and insects large enough to resolve. For conditions with distinctive visual signatures, such as the striping of yellow rust or the window-paning of fall armyworm, a photograph is often sufficient for a confident working identification.",
      },
      {
        heading: "What it cannot support",
        text: "A photograph cannot measure soil nutrient status, and any nutrient figure derived from leaf colour alone is an inference rather than a measurement. It cannot produce a vegetation index such as NDVI, which requires near-infrared reflectance that an ordinary camera does not capture. It cannot distinguish between conditions whose visible symptoms overlap, including several wilts and virus complexes, and it cannot detect infection before symptoms appear. Nutrient deficiency, herbicide injury and early disease frequently look alike on a leaf.",
      },
      {
        heading: "When to seek confirmation",
        text: "Laboratory or extension confirmation is worth the delay when the recommended intervention is expensive or irreversible, when a whole field is affected rather than a patch, when symptoms do not match the suggested condition, or when a previous treatment based on the same identification did not work. Krishi Vigyan Kendras provide diagnostic support at district level, and soil testing laboratories issue Soil Health Cards free of charge.",
      },
    ],
  },
];

/** Convenience: every distinct crop the corpus covers. */
export const CORPUS_CROPS = [...new Set(CORPUS.map((d) => d.crop))];
