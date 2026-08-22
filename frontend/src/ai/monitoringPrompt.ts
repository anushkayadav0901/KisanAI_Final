export interface CropMonitoringPromptConfig {
  cropType?: string;
}

export interface SoilMonitoringPromptConfig {
  soilType?: string;
}

export interface ThermalMonitoringPromptConfig {
  thermalType?: string;
}

export interface FieldMonitoringPromptConfig {
  fieldType?: string;
}

export function getCropMonitoringPrompt(
  config?: CropMonitoringPromptConfig,
): string {
  return `
You are an expert agricultural scientist and plant pathologist. Analyze the crop image with extreme precision and return ONLY valid JSON.

CRITICAL RULES:
- confidenceLevel MUST be above 90% for valid analyses. If you cannot identify with >90% confidence, mark the analysis appropriately.
- Focus on the SINGLE most prominent issue. Do not scatter attention across multiple uncertain detections.
- Be BRIEF but DETAILED — every field should contain precise, actionable information.
- Describe visual symptoms in clinical detail: exact colors (hex if possible), spot shapes, lesion sizes, distribution patterns.

For invalid images (not a crop/plant image), return:
{
"cropType": "Not Applicable",
"diseaseDetected": "Invalid Input",
"confidenceLevel": 0,
"analysisSummary": "Non-crop image detected",
"pestInfestation": "N/A",
"nutrientDeficiency": "N/A",
"cropHealth": "N/A"
}

For valid crop images, return:
{
"cropType": "Specific crop name (e.g., Tomato, Rice, Wheat, Cotton)",
"diseaseDetected": "Exact disease name (e.g., Early Blight, Bacterial Leaf Spot) or 'None'",
"diseaseSeverity": "none|mild|moderate|severe",
"diseaseAppearance": "Detailed visual description: spot color, shape, size (mm), location on leaf/stem/fruit, texture, border characteristics, presence of halo or concentric rings",
"diseaseStage": "early|developing|advanced|terminal",
"pestInfestation": "Specific pest name (e.g., Aphids, Whitefly, Bollworm) or 'None'",
"pestSeverity": "none|low|medium|high",
"pestDamageDescription": "Visual details of pest damage: holes, trails, webbing, honeydew, curling patterns",
"nutrientDeficiency": "Specific nutrient (e.g., Nitrogen, Iron, Potassium) or 'None'",
"nutrientSymptoms": "How deficiency manifests: yellowing pattern (interveinal/marginal/uniform), leaf curl direction, necrosis location",
"cropHealth": "excellent|good|fair|poor",
"affectedArea": number,
"environmentalFactors": [
{
"factor": "string",
"status": "optimal|warning|critical",
"detail": "Brief explanation of impact"
}
],
"realTimeMetrics": {
"healthScore": number,
"stressLevel": number,
"yieldImpact": number
},
"treatmentRecommendations": ["Specific treatment with dosage, timing, and application method"],
"preventiveMeasures": ["Specific preventive action with implementation details"],
"confidenceLevel": number,
"analysisSummary": "2-3 sentence detailed summary covering: identified crop, primary issue, severity, recommended immediate action"
}

Analysis Requirements:
- Identify crop type precisely from leaf morphology, venation, color, and growth habit.
- Detect the PRIMARY disease from visible symptoms — focus on the most severe/prominent issue only.
- For diseases: describe lesion color, shape, size, distribution, whether on upper/lower leaf surface.
- Identify pest infestations from damage patterns, frass, webbing, or visible insects.
- Assess nutrient deficiencies from specific chlorosis/necrosis patterns.
- Provide 5 treatment recommendations with specific products/doses where applicable.
- Provide 5 preventive measures with implementation timelines.
- confidenceLevel must be 90-100 for valid analyses. Be honest — if uncertain, reflect it.
- Include Indian brand names for pesticides/fungicides where relevant.

CRITICAL JSON FORMATTING REQUIREMENTS:
- Response must be ONLY pure JSON - no markdown, no explanations, no text before or after
- Use double quotes for ALL strings and keys
- NO trailing commas anywhere
- Start response with { and end with }
- All numeric values must be actual numbers (not strings)

${config?.cropType ? `Crop Type: ${config.cropType}` : ""}
`
    .replace(/\\s+/g, " ")
    .trim();
}

export function getSoilMonitoringPrompt(
  config?: SoilMonitoringPromptConfig,
): string {
  return `
You are an expert soil scientist and agronomist. Analyze the soil image with extreme precision and return ONLY valid JSON.

CRITICAL RULES:
- confidenceLevel MUST be above 90% for valid analyses.
- Focus on the SINGLE most important soil characteristic/issue visible.
- Be BRIEF but DETAILED — provide precise measurements and descriptions.
- Describe soil texture, structure, and color using Munsell color notation if possible.

For invalid images (not a soil image), return:
{
"soilType": "Not Applicable",
"moistureLevel": "Invalid Input",
"confidenceLevel": 0,
"analysisSummary": "Non-soil image detected",
"fertilityEstimate": "N/A",
"erosionRisk": "N/A",
"salinityIssue": "N/A",
"texture": "N/A"
}

For valid soil images, return:
{
"soilType": "Specific soil classification (e.g., Alluvial, Black Cotton, Red Laterite, Sandy Loam)",
"texture": "fine|medium|coarse",
"textureDetail": "Detailed grain analysis: particle sizes visible, aggregation type, clod formation, crumb structure",
"colorDescription": "Precise color: Munsell notation if possible, hue, darkness indicators for organic content",
"moistureLevel": "low|medium|high",
"moistureIndicators": "Visual cues: surface sheen, crack patterns, compaction signs, drainage evidence",
"fertilityEstimate": "low|medium|high",
"fertilityIndicators": "Organic matter visibility, earthworm activity signs, root residue, decomposition stage",
"erosionRisk": "low|medium|high",
"erosionPatterns": "Rill formation, sheet erosion signs, gully development, surface crust description",
"salinityIssue": "none|suspected|evident",
"salinityIndicators": "White efflorescence patterns, salt crust location, affected area extent",
"compositionNotes": "Detailed: gravel content %, clay feel, sand visibility, silt smoothness, organic debris",
"environmentalFactors": [
{
"factor": "string",
"status": "optimal|warning|critical",
"detail": "Specific impact on crop growth"
}
],
"realTimeMetrics": {
"moisturePercentage": number,
"organicMatterIndicator": number,
"pHEstimate": number
},
"improvementSuggestions": ["Specific amendment with quantity per acre, application method, and timing"],
"preventionMeasures": ["Specific conservation practice with implementation details"],
"confidenceLevel": number,
"analysisSummary": "2-3 sentence detailed summary: soil type, primary concern, fertility status, recommended immediate action"
}

Analysis Requirements:
- Classify soil type precisely based on Indian soil classification (Alluvial, Black Cotton, Red, Laterite, Desert, Forest, Saline).
- Estimate moisture from surface color intensity, crack width/depth, and surface texture.
- Assess fertility through organic matter color indicators (darker = higher organic content).
- Detect erosion risk from surface roughness, rill formation, and structural breakdown.
- Detect salinity from white crystalline deposits and affected patterns.
- Provide 5 improvement suggestions with specific amendments (e.g., "Apply 2 tons/acre FYM").
- Provide 5 prevention measures with timelines.
- confidenceLevel must be 90-100 for valid analyses.

CRITICAL JSON FORMATTING REQUIREMENTS:
- Response must be ONLY pure JSON - no markdown, no explanations
- Use double quotes for ALL strings and keys
- NO trailing commas
- Start response with { and end with }
- All numeric values must be actual numbers

${config?.soilType ? `Soil Type: ${config.soilType}` : ""}
`
    .replace(/\\s+/g, " ")
    .trim();
}

export function getThermalMonitoringPrompt(
  config?: ThermalMonitoringPromptConfig,
): string {
  return `
You are an expert thermal imaging analyst for precision agriculture. Analyze the thermal image with extreme precision and return ONLY valid JSON.

CRITICAL RULES:
- confidenceLevel MUST be above 90% for valid analyses.
- Focus on the SINGLE most critical thermal anomaly/issue.
- Be BRIEF but DETAILED — include precise temperature values and zone descriptions.
- Describe thermal patterns with specificity: gradient directions, boundary sharpness, anomaly shapes.

For invalid images (not a thermal/infrared image), return:
{
"stressDetection": "Not Applicable",
"temperatureVariation": "Invalid Input",
"confidenceLevel": 0,
"analysisSummary": "Non-thermal image detected",
"waterStress": "N/A",
"irrigationLeaks": "N/A",
"cropHealthImpact": "N/A"
}

For valid thermal images, return:
{
"temperatureRange": "Exact range (e.g., 22.5°C - 38.2°C)",
"hotSpots": number,
"hotSpotDetails": "Location, size, temperature, and likely cause of each hot spot",
"coldSpots": number,
"coldSpotDetails": "Location, size, temperature, and likely cause of each cold spot",
"waterStressZones": "low|medium|high",
"waterStressDescription": "Precise description: affected area percentage, stress gradient pattern, canopy vs soil temperature differential",
"irrigationLeaks": "none|suspected|evident",
"irrigationLeakDetails": "Location of anomalous cooling patterns along expected irrigation lines",
"temperatureVariations": "Detailed thermal gradient analysis: uniformity assessment, cold/warm boundary descriptions",
"cropHealthImpact": "Specific impact: expected yield reduction %, stress type (water/heat/frost), affected growth stage",
"thermalPattern": "Overall pattern classification: uniform|gradient|mosaic|clustered — with description",
"environmentalFactors": [
{
"factor": "string",
"status": "optimal|warning|critical",
"detail": "Temperature-related impact on crop physiology"
}
],
"realTimeMetrics": {
"averageTemperature": number,
"maxTemperature": number,
"minTemperature": number,
"stressIndex": number
},
"mitigationStrategies": ["Specific irrigation/cooling strategy with implementation timing and expected outcome"],
"monitoringRecommendations": ["Specific follow-up thermal scan schedule and focus areas"],
"confidenceLevel": number,
"analysisSummary": "2-3 sentence detailed summary: primary thermal issue, stress severity, crop impact, recommended immediate action"
}

Analysis Requirements:
- Map temperature distribution across the visible field area.
- Detect water stress through canopy-soil temperature differentials (stressed canopy = warmer).
- Identify irrigation leaks from anomalous cool zones along expected water lines.
- Classify thermal pattern type and uniformity.
- Provide 5 mitigation strategies with specific irrigation scheduling.
- Provide 5 monitoring recommendations with scan timing.
- confidenceLevel must be 90-100 for valid analyses.

CRITICAL JSON FORMATTING REQUIREMENTS:
- Response must be ONLY pure JSON - no markdown, no explanations
- Use double quotes for ALL strings and keys
- NO trailing commas
- Start response with { and end with }
- All numeric values must be actual numbers

${config?.thermalType ? `Thermal Type: ${config.thermalType}` : ""}
`
    .replace(/\\s+/g, " ")
    .trim();
}

export function getFieldMonitoringPrompt(
  config?: FieldMonitoringPromptConfig,
): string {
  return `
You are an expert precision agriculture analyst specializing in aerial/drone imagery. Analyze the field image with extreme precision and return ONLY valid JSON.

CRITICAL RULES:
- confidenceLevel MUST be above 90% for valid analyses.
- Focus on the SINGLE most significant field issue/characteristic.
- Be BRIEF but DETAILED — describe spatial patterns, coverage metrics, and growth uniformity precisely.
- Use agricultural remote sensing terminology accurately.

For invalid images (not a field/aerial image), return:
{
"cropGrowth": "Not Applicable",
"weedDensity": "Invalid Input",
"confidenceLevel": 0,
"analysisSummary": "Non-field image detected",
"yieldPrediction": "N/A",
"fieldUniformity": "N/A",
"precisionInsights": "N/A"
}

For valid field images, return:
{
"cropGrowthStage": "Specific stage (e.g., Tillering, Flowering, Grain Filling, Maturation)",
"growthStageDescription": "Detailed phenological indicators visible: canopy closure %, plant height estimate, flowering status",
"weedDensity": "low|medium|high",
"weedDescription": "Weed species if identifiable, distribution pattern (edge/patch/uniform), approximate coverage %",
"yieldPrediction": "Specific yield estimate with reasoning (e.g., 'Expected 40-45 quintals/hectare based on canopy density and uniformity')",
"fieldUniformity": "uniform|patchy|irregular",
"uniformityDetail": "Describe variation zones: location, size, likely cause (nutrient/water/slope/shadow)",
"visibleIssues": "Primary issue with precise description: lodging areas, bare patches, waterlogging zones, nutrient deficiency bands",
"vegetationIndex": number,
"vegetationAnalysis": "NDVI-equivalent assessment: vigor zones mapping, stress corridors, healthy vs declining areas",
"environmentalFactors": [
{
"factor": "string",
"status": "optimal|warning|critical",
"detail": "Spatial impact on field sections"
}
],
"realTimeMetrics": {
"coveragePercentage": number,
"weedCoverage": number,
"bareSoil": number
},
"precisionFarmingTips": ["Specific variable-rate application or zone management recommendation with coordinates/zones"],
"interventionPlans": ["Specific intervention with timing, method, and expected outcome for the identified issue"],
"confidenceLevel": number,
"analysisSummary": "2-3 sentence detailed summary: crop stage, primary issue, uniformity assessment, recommended immediate action"
}

Analysis Requirements:
- Classify growth stage precisely from canopy color, density, and visible phenological markers.
- Map weed distribution patterns — differentiate weeds from crop by color/texture differences.
- Predict yield based on canopy uniformity, density, and visible stress indicators.
- Assess field uniformity — identify distinct management zones.
- Provide 5 precision farming tips with zone-specific recommendations.
- Provide 5 intervention plans with implementation timelines.
- confidenceLevel must be 90-100 for valid analyses.

CRITICAL JSON FORMATTING REQUIREMENTS:
- Response must be ONLY pure JSON - no markdown, no explanations
- Use double quotes for ALL strings and keys
- NO trailing commas
- Start response with { and end with }
- All numeric values must be actual numbers

${config?.fieldType ? `Field Type: ${config.fieldType}` : ""}
`
    .replace(/\s+/g, " ")
    .trim();
}
