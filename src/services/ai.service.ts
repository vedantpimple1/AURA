/**
 * AI Service for KAI Aura App
 * 
 * BOUNDARY CONSTRAINTS (rules.md - Section 18 & 19):
 * 1. AI is used solely for natural-language interpretation, drafting, recommendations, and summarization.
 * 2. AI is NOT treated as a source of truth for authorization, financial ledger calculations, or RBAC.
 * 3. All outputs are strictly sanitized, type-validated, and validated against domain bounds.
 * 4. Fallback deterministic heuristic generation ensures offline robustness if no external LLM key is configured.
 */

export interface AiTaskDraft {
  title: string;
  description: string;
  suggestedAura: number;
  tags: string[];
  subtasks: string[];
}

export interface AiTeamInsight {
  headline: string;
  summary: string;
  highlight: string;
  recommendation: string;
  mood: 'ENERGETIC' | 'STEADY' | 'GROWING';
}

export class AiService {
  /**
   * Generates a structured task breakdown and recommended Aura reward based on an objective
   */
  static async breakdownTask(objective: string): Promise<AiTaskDraft> {
    const cleanObjective = (objective || '').trim().slice(0, 500);
    if (!cleanObjective) {
      throw new Error('Objective text is required to generate task breakdown');
    }

    // Check if an external LLM API key exists (e.g. GEMINI_API_KEY)
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

    if (apiKey && process.env.GEMINI_API_KEY) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `You are an AI assistant for team task breakdown in a team engagement platform called KAI Aura.
Break down this task objective into a clean, actionable task draft.
Format your response as pure JSON matching this TypeScript interface without markdown wrappers:
{
  "title": string (concise task title),
  "description": string (clear summary of expectations),
  "suggestedAura": number (between 50 and 500 Aura depending on complexity),
  "tags": string[] (up to 3 tags),
  "subtasks": string[] (3-5 checklist items)
}

Objective: "${cleanObjective}"`,
                    },
                  ],
                },
              ],
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            // Strict sanitization and boundary clamping
            return {
              title: String(parsed.title || cleanObjective).slice(0, 120),
              description: String(parsed.description || cleanObjective).slice(0, 1000),
              suggestedAura: Math.min(Math.max(Number(parsed.suggestedAura) || 100, 50), 500),
              tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 3) : ['Development'],
              subtasks: Array.isArray(parsed.subtasks) ? parsed.subtasks.map(String).slice(0, 5) : [],
            };
          }
        }
      } catch (err) {
        console.warn('External AI call failed, falling back to local heuristic drafting:', err);
      }
    }

    // High-quality local heuristic drafting (Zero external downtime, fully deterministic fallback)
    return AiService.generateHeuristicDraft(cleanObjective);
  }

  /**
   * Generates team momentum insights and natural-language summaries based on team metrics
   */
  static async generateTeamInsights(data: {
    totalTeams: number;
    topTeamName: string;
    topTeamAura: number;
    totalKudosCount: number;
    pendingTasksCount: number;
  }): Promise<AiTeamInsight> {
    const { totalTeams, topTeamName, topTeamAura, totalKudosCount, pendingTasksCount } = data;

    if (totalKudosCount >= 5) {
      return {
        headline: 'High Collaboration Momentum 🔥',
        summary: `The squads are actively sharing recognition with ${totalKudosCount} peer kudos pinned to the wall. ${topTeamName || 'Leading squad'} is setting the pace with ${topTeamAura.toLocaleString()} Aura.`,
        highlight: `Strong peer-to-peer engagement across ${totalTeams} active tag teams.`,
        recommendation: pendingTasksCount > 0 ? `Focus on clearing the ${pendingTasksCount} tasks currently in review to keep feedback cycles fast.` : 'Maintain momentum with a new weekend team milestone challenge!',
        mood: 'ENERGETIC',
      };
    }

    return {
      headline: 'Steady Team Rhythm ✦',
      summary: `${topTeamName || 'The squads'} have accumulated ${topTeamAura.toLocaleString()} Aura. Collaboration is steady with ${totalTeams} registered teams.`,
      highlight: `Recognition activity is developing steadily.`,
      recommendation: 'Encourage team leads to pin kudos on the Aura Wall for completed sprint deliverables.',
      mood: 'STEADY',
    };
  }

  /**
   * Deterministic local heuristic generator adhering to all safety rules
   */
  private static generateHeuristicDraft(objective: string): AiTaskDraft {
    const lower = objective.toLowerCase();
    let suggestedAura = 120;
    let tags = ['General'];
    const subtasks: string[] = [
      'Define scope and verify requirements with stakeholders',
      'Execute core implementation according to project guidelines',
      'Validate changes locally and submit proof of work',
    ];

    if (lower.includes('bug') || lower.includes('fix') || lower.includes('resolve')) {
      suggestedAura = 100;
      tags = ['Bugfix', 'Maintenance'];
      subtasks[0] = 'Reproduce the reported issue and identify root cause';
      subtasks[1] = 'Implement fix and verify regression test passes';
      subtasks[2] = 'Submit PR link for review with verification steps';
    } else if (lower.includes('design') || lower.includes('ui') || lower.includes('figma')) {
      suggestedAura = 150;
      tags = ['Design', 'UI/UX'];
      subtasks[0] = 'Draft component wireframe and color tokens in Figma';
      subtasks[1] = 'Ensure accessibility standards and responsive layouts';
      subtasks[2] = 'Present mockups to the team and collect feedback';
    } else if (lower.includes('api') || lower.includes('database') || lower.includes('backend')) {
      suggestedAura = 200;
      tags = ['Backend', 'Database'];
      subtasks[0] = 'Design schema migrations and query interfaces';
      subtasks[1] = 'Write server actions and unit tests';
      subtasks[2] = 'Audit performance and verify error handling';
    } else if (lower.includes('deploy') || lower.includes('ci') || lower.includes('infra')) {
      suggestedAura = 250;
      tags = ['DevOps', 'Infra'];
      subtasks[0] = 'Configure environment variables and deployment scripts';
      subtasks[1] = 'Run build test and verify health check endpoints';
      subtasks[2] = 'Document release notes and rollback procedure';
    }

    // Capitalize first letter for title
    const formattedTitle = objective.charAt(0).toUpperCase() + objective.slice(1);

    return {
      title: formattedTitle.slice(0, 90),
      description: `Structured task to accomplish: ${objective}. Ensure high code quality, test verification, and documentation.`,
      suggestedAura,
      tags,
      subtasks,
    };
  }
}
