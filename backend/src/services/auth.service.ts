import { prisma } from '../lib/prisma';
import { AuthenticationError, ValidationError } from '../lib/errors';
import { comparePassword } from '../lib/auth';

export class AuthService {
  /**
   * Validates credentials and returns authenticated user identity.
   */
  static async login(email: string, password: string) {
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { roles: { include: { role: true } } }
    });

    if (!user || !user.passwordHash) {
      throw new AuthenticationError('Invalid credentials');
    }

    const isValid = await comparePassword(password, user.passwordHash);
    
    if (!isValid) {
      throw new AuthenticationError('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new AuthenticationError('Account is inactive');
    }

    const roles = user.roles.map(r => r.role.name);

    return { id: user.id, email: user.email, name: user.name, roles };
  }
}
