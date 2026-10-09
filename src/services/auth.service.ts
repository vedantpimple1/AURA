import { prisma } from '@/lib/prisma';
import { AuthenticationError, ValidationError } from '@/lib/errors';
import { comparePassword, setSession } from '@/lib/auth';

export class AuthService {
  /**
   * Validates credentials and generates a secure HTTP-only JWT cookie.
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

    // Creates the JWT and sets the Next.js cookie
    await setSession({
      userId: user.id,
      email: user.email,
      roles,
    });

    return { id: user.id, name: user.name, roles };
  }
}
