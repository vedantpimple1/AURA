import test from 'node:test';
import assert from 'node:assert/strict';
import { AiService } from '@/services/ai.service';

/**
 * AI Boundary & Safety Rules Test Suite
 * 
 * Verifies rules.md (Sections 18 & 19):
 * 1. AI is strictly bounded and clamped.
 * 2. Suggested Aura is constrained between 50 and 500 Aura.
 * 3. Text output length is limited to prevent UI overflows.
 * 4. Empty inputs are strictly rejected.
 * 5. Deterministic fallback functions without external network/API keys.
 */

test('AiService rejects empty or whitespace-only objective', async () => {
  await assert.rejects(
    async () => {
      await AiService.breakdownTask('');
    },
    {
      name: 'Error',
      message: 'Objective text is required to generate task breakdown',
    }
  );

  await assert.rejects(
    async () => {
      await AiService.breakdownTask('   ');
    },
    {
      name: 'Error',
      message: 'Objective text is required to generate task breakdown',
    }
  );
});

test('AiService clamps suggested Aura between 50 and 500 in local fallback', async () => {
  const shortTask = await AiService.breakdownTask('Fix minor typo in README');
  assert.ok(shortTask.suggestedAura >= 50, 'Suggested Aura should be at least 50');
  assert.ok(shortTask.suggestedAura <= 500, 'Suggested Aura should not exceed 500');

  const complexTask = await AiService.breakdownTask('Architect high-availability database cluster with multi-region replication and automated failover pipelines');
  assert.ok(complexTask.suggestedAura >= 50, 'Suggested Aura should be at least 50');
  assert.ok(complexTask.suggestedAura <= 500, 'Suggested Aura should not exceed 500');
});

test('AiService enforces output length boundaries on title, description, and tags', async () => {
  const longPrompt = 'A'.repeat(600);
  const result = await AiService.breakdownTask(longPrompt);

  assert.ok(result.title.length <= 120, 'Title should be at most 120 characters');
  assert.ok(result.description.length <= 1000, 'Description should be at most 1000 characters');
  assert.ok(result.tags.length <= 3, 'Tags count should be at most 3');
  assert.ok(result.subtasks.length <= 5, 'Subtasks count should be at most 5');
});

test('AiService generates valid team insights with dynamic mood evaluation', async () => {
  const energeticInsight = await AiService.generateTeamInsights({
    totalTeams: 3,
    topTeamName: 'Alpha Squad',
    topTeamAura: 2500,
    totalKudosCount: 8,
    pendingTasksCount: 2,
  });

  assert.strictEqual(energeticInsight.mood, 'ENERGETIC');
  assert.ok(energeticInsight.headline.includes('Momentum'));
  assert.ok(energeticInsight.summary.includes('8 peer kudos'));

  const steadyInsight = await AiService.generateTeamInsights({
    totalTeams: 2,
    topTeamName: 'Beta Squad',
    topTeamAura: 800,
    totalKudosCount: 1,
    pendingTasksCount: 0,
  });

  assert.strictEqual(steadyInsight.mood, 'STEADY');
  assert.ok(steadyInsight.headline.length > 0);
  assert.ok(steadyInsight.summary.length > 0);
});
