import { prisma } from '../lib/prisma';

export class AnalyticsService {
  static async getDashboardMetrics() {
    // 1. Active members
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({
      where: { status: 'ACTIVE' },
    });

    // 2. Completion rate
    const totalAssignments = await prisma.taskAssignment.count();
    const completedAssignments = await prisma.taskAssignment.count({
      where: { status: 'COMPLETED' },
    });
    const completionRate =
      totalAssignments === 0
        ? 0
        : Math.round((completedAssignments / totalAssignments) * 100);

    // 3. Average Aura
    const usersWithAura = await prisma.user.findMany({
      include: {
        auraTransactions: true,
      },
    });

    let totalAura = 0;
    let maxTasks = -1;
    let mostActiveUser = 'N/A';

    const memberStats = usersWithAura.map((user) => {
      const balance = user.auraTransactions.reduce((sum, t) => sum + t.amount, 0);
      totalAura += balance;
      return { id: user.id, name: user.name, balance };
    });

    const avgAura = totalUsers === 0 ? 0 : Math.round(totalAura / totalUsers);

    // Find most active user (by tasks completed)
    const activeStats = await prisma.user.findMany({
      select: {
        name: true,
        _count: {
          select: {
            taskAssignments: {
              where: { status: 'COMPLETED' },
            },
          },
        },
      },
    });

    for (const stat of activeStats) {
      if (stat._count.taskAssignments > maxTasks) {
        maxTasks = stat._count.taskAssignments;
        mostActiveUser = stat.name;
      }
    }

    // Aura earned this month per day for chart
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyTransactions = await prisma.auraTransaction.findMany({
      where: {
        amount: { gt: 0 },
        createdAt: { gte: monthStart },
      },
    });

    // Simple grouping by day
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const chartData = Array(daysInMonth).fill(0);

    monthlyTransactions.forEach((t) => {
      const day = t.createdAt.getDate() - 1; // 0-indexed
      chartData[day] += t.amount;
    });

    // normalize chart data to percentages (0-100) for the UI bar chart
    const maxDayAura = Math.max(...chartData, 1);
    const normalizedChartData = chartData.map((val) => Math.round((val / maxDayAura) * 100));

    return {
      activeMembers: `${activeUsers} / ${totalUsers}`,
      completionRate: `${completionRate}%`,
      averageAura: avgAura,
      mostActiveUser,
      monthlyChartData: normalizedChartData,
    };
  }

  static async getMemberAnalytics() {
    const users = await prisma.user.findMany({
      include: {
        roles: { include: { role: true } },
        auraTransactions: true,
        taskAssignments: {
          where: { status: 'COMPLETED' },
          orderBy: { completedAt: 'desc' },
          select: { completedAt: true, task: { select: { title: true } } },
        },
      },
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = users.map((u) => {
      const lifetimeAura = u.auraTransactions
        .filter((t) => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);

      const monthAura = u.auraTransactions
        .filter((t) => t.amount > 0 && new Date(t.createdAt) >= monthStart)
        .reduce((sum, t) => sum + t.amount, 0);

      const auraSpent = Math.abs(
        u.auraTransactions
          .filter((t) => t.amount < 0)
          .reduce((sum, t) => sum + t.amount, 0)
      );

      const availableAura = u.auraTransactions.reduce((sum, t) => sum + t.amount, 0);

      const lastTask = u.taskAssignments[0] || null;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        roles: u.roles.map((r) => r.role.name),
        lastLogin: u.updatedAt,
        lastTaskTitle: lastTask ? lastTask.task.title : 'None',
        lastTaskDate: lastTask?.completedAt || null,
        tasksCompleted: u.taskAssignments.length,
        currentMonthAura: monthAura,
        lifetimeAura,
        auraSpent,
        availableAura,
      };
    });

    return stats;
  }
}
