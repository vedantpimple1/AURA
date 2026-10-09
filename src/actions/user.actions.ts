'use server'

import { UserService } from '@/services/user.service';
import { handleError } from '@/lib/errors';

export async function getUserAction(userId: string) {
  try {
    const user = await UserService.getUserById(userId);
    return { success: true, data: user };
  } catch (error) {
    return { success: false, ...handleError(error) };
  }
}

export async function getUsersAction() {
  try {
    const users = await UserService.getUsers();
    return { success: true, data: users };
  } catch (error) {
    return { success: false, ...handleError(error) };
  }
}

export async function createUserAction(formData: FormData) {
  try {
    const data = {
      email: formData.get('email') as string,
      name: formData.get('name') as string,
      employeeId: formData.get('employeeId') as string,
      roleName: formData.get('roleName') as string,
      teamId: formData.get('teamId') as string | undefined,
    };
    
    const user = await UserService.createUser(data);
    return { success: true, data: user };
  } catch (error) {
    return { success: false, ...handleError(error) };
  }
}
