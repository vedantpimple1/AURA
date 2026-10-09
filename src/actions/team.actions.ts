'use server';

import { TeamService } from '@/services/team.service';
import { KudosService } from '@/services/kudos.service';
import { handleError } from '@/lib/errors';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getTeamsAction() {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const teams = await TeamService.getTeams();
    return { success: true, data: teams };
  } catch (error) {
    return { success: false, ...handleError(error) };
  }
}

export async function createTeamAction(formData: FormData) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const name = formData.get('name') as string;
    const description = (formData.get('description') as string) || '';

    const team = await TeamService.createTeam({
      name,
      description,
      createdById: session.userId,
    });

    revalidatePath('/');
    return { success: true, data: team };
  } catch (error) {
    return { success: false, ...handleError(error) };
  }
}

export async function joinTeamAction(formData: FormData) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const teamId = formData.get('teamId') as string;
    const member = await TeamService.addMember(teamId, session.userId);

    revalidatePath('/');
    return { success: true, data: member };
  } catch (error) {
    return { success: false, ...handleError(error) };
  }
}

export async function getKudosAction() {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const kudos = await KudosService.getRecentKudos(20);
    return { success: true, data: kudos };
  } catch (error) {
    return { success: false, ...handleError(error) };
  }
}

export async function sendKudosAction(formData: FormData) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const receiverId = formData.get('receiverId') as string;
    const message = formData.get('message') as string;

    const kudos = await KudosService.sendKudos({
      senderId: session.userId,
      receiverId,
      message,
    });

    revalidatePath('/');
    return { success: true, data: kudos };
  } catch (error) {
    return { success: false, ...handleError(error) };
  }
}
