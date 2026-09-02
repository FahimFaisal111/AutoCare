/**
 * AutoCare AI - OpenRouter Diagnostic Service
 * Interfaces with OpenRouter OpenAI-compatible Chat Completions API
 */

class OpenRouterService {
  constructor() {
    this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
  }

  /**
   * Get configured model slug or default.
   */
  getModel() {
    return (process.env.OPENROUTER_MODEL || 'z-ai/glm-5.2:free').trim();
  }

  /**
   * Build structured diagnostic prompt with strict context boundaries.
   */
  buildPrompt(context) {
    const { vehicle, currentProblem, serviceHistory, previousReports, activeReminders } = context;

    const vehicleSection = `--- VEHICLE SPECIFICATIONS ---
Year: ${vehicle.year || 'Unknown'}
Make: ${vehicle.make || 'Unknown'}
Model: ${vehicle.model || 'Unknown'}
Odometer: ${vehicle.odometer ? `${vehicle.odometer.toLocaleString()} miles` : 'Not recorded'}
VIN: ${vehicle.vin || 'Not provided'}`;

    const problemSection = `--- CURRENT REPORTED PROBLEM ---
Description: "${currentProblem.description}"
Reported At: ${currentProblem.createdAt || new Date().toISOString()}`;

    let historySection = '--- CONFIRMED SERVICE HISTORY ---\n';
    if (serviceHistory && serviceHistory.length > 0) {
      historySection += serviceHistory
        .map((s, idx) => `[${idx + 1}] Date: ${s.scheduledStart} | Description: ${s.serviceDescription || 'General Service'}`)
        .join('\n');
    } else {
      historySection += 'No previous completed service history on record for this vehicle.';
    }

    let previousAssessmentsSection = '--- PREVIOUS PROBLEM REPORTS & AI ASSESSMENTS ---\n';
    if (previousReports && previousReports.length > 0) {
      previousAssessmentsSection += previousReports
        .map(
          (r, idx) =>
            `[${idx + 1}] Date: ${r.createdAt} | Reported: "${r.description}" | Previous AI Suggestion: "${r.probableCause || 'None'}" (Advisory Suggestion Only)`
        )
        .join('\n');
    } else {
      previousAssessmentsSection += 'No previous problem reports on record for this vehicle.';
    }

    let remindersSection = '--- ACTIVE MAINTENANCE REMINDERS ---\n';
    if (activeReminders && activeReminders.length > 0) {
      remindersSection += activeReminders
        .map((rem, idx) => `[${idx + 1}] Type: ${rem.reminderType} | Due: ${rem.dueDate} | Message: ${rem.message || 'Scheduled maintenance due'}`)
        .join('\n');
    } else {
      remindersSection += 'No active maintenance reminders for this vehicle.';
    }

    const rulesSection = `--- REASONING INSTRUCTIONS & CONSTRAINTS ---
1. Base your diagnostic analysis strictly on the supplied facts and current symptoms.
2. Treat previous AI suggestions as advisory suggestions, NOT confirmed mechanical facts.
3. Treat confirmed service records as factual historical work.
4. Do NOT invent missing vehicle history, previous repairs, or parts replacements.
5. If the vehicle has no prior history, acknowledge that.
6. Clearly communicate mechanical uncertainty and recommend physical inspection.
7. Return ONLY a single raw JSON object matching the exact schema below, with no code fences or markdown.

SCHEMA:
{
  "overall_summary": "Concise 2-3 sentence overview of the symptom and assessment",
  "probable_cause": "The most plausible mechanical or electrical cause(s)",
  "recommended_action": "Numbered, actionable diagnostic/inspection steps for technician",
  "urgency": "HIGH" | "MEDIUM" | "LOW",
  "confidence_score": 0.85,
  "keywords": ["specific keyword 1", "specific keyword 2"]
}`;

    return `${vehicleSection}\n\n${problemSection}\n\n${historySection}\n\n${previousAssessmentsSection}\n\n${remindersSection}\n\n${rulesSection}`;
  }

  /**
   * Send chat completion request to OpenRouter API.
   */
  async generateDiagnosis(context) {
    const apiKey = (process.env.OPENROUTER_API_KEY || '').trim();
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured in backend environment.');
    }

    const model = this.getModel();
    const promptContent = this.buildPrompt(context);

    const messages = [
      {
        role: 'system',
        content:
          'You are AutoCare AI, an expert master automotive diagnostic reasoning assistant. You provide grounded, structured vehicle diagnostic assessments based strictly on real vehicle data, reported symptoms, and maintenance history. You always respond in valid JSON matching the requested schema.'
      },
      {
        role: 'user',
        content: promptContent
      }
    ];

    const bodyPayload = {
      model,
      messages,
      temperature: 0.2,
      response_format: { type: 'json_object' }
    };

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AutoCare AI Diagnostic Engine'
      },
      body: JSON.stringify(bodyPayload),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`OpenRouter API request failed with HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent) {
      throw new Error('OpenRouter returned an empty completion response.');
    }

    return this.parseAndValidateResponse(rawContent);
  }

  /**
   * Parse and validate structured output from OpenRouter.
   */
  parseAndValidateResponse(rawContent) {
    let parsed;
    try {
      // Remove code fences if model returned any
      const cleaned = rawContent
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      throw new Error(`Failed to parse OpenRouter JSON output: ${parseErr.message}`);
    }

    let overallSummary = parsed.overall_summary || parsed.description || parsed.summary;
    let probableCause = parsed.probable_cause || parsed.probableCause;
    let recommendedAction = parsed.recommended_action || parsed.recommendedAction;

    if (Array.isArray(overallSummary)) overallSummary = overallSummary.join(' ');
    if (Array.isArray(probableCause)) probableCause = probableCause.join('\n');
    if (Array.isArray(recommendedAction)) recommendedAction = recommendedAction.join('\n');
    let urgency = (parsed.urgency || 'MEDIUM').toUpperCase().trim();
    if (!['HIGH', 'MEDIUM', 'LOW'].includes(urgency)) {
      urgency = 'MEDIUM';
    }

    let confidenceScore = parseFloat(parsed.confidence_score !== undefined ? parsed.confidence_score : parsed.confidenceScore);
    if (isNaN(confidenceScore) || confidenceScore < 0 || confidenceScore > 1) {
      confidenceScore = 0.85;
    }

    let keywords = parsed.keywords;
    if (!Array.isArray(keywords) || keywords.length === 0) {
      keywords = ['diagnostic inspection'];
    } else {
      keywords = keywords.map((k) => String(k).toLowerCase().trim()).filter((k) => k.length > 0);
    }

    if (!overallSummary || !probableCause || !recommendedAction) {
      throw new Error('OpenRouter response is missing required diagnostic fields (overall_summary, probable_cause, or recommended_action).');
    }

    return {
      overallSummary,
      probableCause,
      recommendedAction,
      urgency,
      confidenceScore: parseFloat(confidenceScore.toFixed(3)),
      keywords
    };
  }
}

module.exports = new OpenRouterService();
