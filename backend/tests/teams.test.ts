import test from 'node:test';
import assert from 'node:assert/strict';
import { TeamService } from '../src/services/team.service';
import { prisma } from '../src/lib/prisma';
import { ValidationError, NotFoundError } from '../src/lib/errors';

/**
 * Team Management & Single-Team Rule Test Suite
 */
test('TeamService: createTeam starts with 0 members and 0 Aura', async () => {
  const admin = await prisma.user.findFirst({ where: { status: 'ACTIVE' } });
  assert.ok(admin, 'Active user must exist for testing');

  const teamName = `Test Alpha Squad ${Date.now()}`;
  const team = await TeamService.createTeam({
    name: teamName,
    description: 'Alpha mission squad for sprint',
    createdById: admin.id,
  });

  assert.equal(team.name, teamName);
  assert.equal(team.members.length, 0, 'New team must start with 0 members');

  // Verify getTeams returns 0 monthlyAura and 0 combinedAura for this newly created team
  const teams = await TeamService.getTeams();
  const created = teams.find((t) => t.id === team.id);
  assert.ok(created, 'Team must be retrievable');
  assert.equal(created.monthlyAura, 0, 'New team must have 0 monthly Aura');
  assert.equal(created.combinedAura, 0, 'New team must have 0 combined Aura');
  assert.equal(created.members.length, 0, 'New team must have 0 members in getTeams()');

  // Clean up
  await TeamService.deleteTeam(team.id);
});

test('TeamService: addMember, single-team rule enforcement, and removeMember', async () => {
  const testUser = await prisma.user.create({
    data: {
      employeeId: `EMP-${Date.now()}`,
      email: `test-member-${Date.now()}@kaiaura.local`,
      name: 'Test Member Single Team',
      status: 'ACTIVE',
    },
  });

  const team1 = await TeamService.createTeam({
    name: `Team One ${Date.now()}`,
    description: 'First team',
    createdById: testUser.id,
  });

  const team2 = await TeamService.createTeam({
    name: `Team Two ${Date.now()}`,
    description: 'Second team',
    createdById: testUser.id,
  });

  try {
    // 1. Add testUser to team1
    const member = await TeamService.addMember(team1.id, testUser.id, 'MEMBER');
    assert.equal(member.userId, testUser.id);

    // 2. Try adding testUser to team2 -> MUST FAIL with ValidationError (single-team constraint)
    await assert.rejects(
      async () => {
        await TeamService.addMember(team2.id, testUser.id, 'MEMBER');
      },
      (err: any) => {
        assert.ok(err instanceof ValidationError, 'Must throw ValidationError');
        assert.match(err.message, /already a member of team/i);
        assert.match(err.message, /cannot be assigned to more than one team/i);
        return true;
      }
    );

    // 3. Remove testUser from team1
    await TeamService.removeMember(team1.id, testUser.id);

    // 4. Now testUser is available again and can join team2
    const member2 = await TeamService.addMember(team2.id, testUser.id, 'MEMBER');
    assert.equal(member2.userId, testUser.id);
  } finally {
    // Clean up
    await TeamService.deleteTeam(team1.id).catch(() => {});
    await TeamService.deleteTeam(team2.id).catch(() => {});
    await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
  }
});
