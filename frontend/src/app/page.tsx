import { AuraApp } from "@/components/aura/aura-app";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUsersAction } from "@/actions/user.actions";
import { getAuraBalanceAction, getCumulativeAuraAction, getAuraHistoryAction } from "@/actions/aura.actions";
import { getTasksAction } from "@/actions/task.actions";
import { getStoreItemsAction, getAllRedemptionsAction, getUserRedemptionsAction } from "@/actions/store.actions";
import { getTeamsAction, getKudosAction } from "@/actions/team.actions";
import { getUserNotificationsAction, getUserPreferencesAction } from "@/actions/notification.actions";
import { getDeliverySummaryAction, getDeliveriesAction } from "@/actions/observability.actions";

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  // Resolve params first so we can use them in the login redirect URL
  const resolvedParams = searchParams ? await searchParams : {};
  const session = await getSession();

  if (!session) {
    const tab = resolvedParams?.tab ? `/?tab=${resolvedParams.tab}` : '/';
    redirect(`/login?redirect=${encodeURIComponent(tab)}`);
  }

  let rawTab = resolvedParams.tab || "home";

  let primaryRole = "Member";
  if (session.roles?.includes("SUPERADMIN")) {
    primaryRole = "Superadmin";
  } else if (session.roles?.includes("ADMIN")) {
    primaryRole = "Admin";
  }

  // Admin tabs (reviews, members, analytics, audit, deliveries) are restricted from Members.
  if (["reviews", "members", "analytics", "audit", "deliveries"].includes(rawTab) && primaryRole === "Member") {
    rawTab = "home";
  }
  const initialTab = rawTab;
  
  const usersRes = await getUsersAction();
  const realUsers = usersRes.success ? usersRes.data : [];

  const auraRes = await getAuraBalanceAction();
  const initialAuraBalance = auraRes.success && typeof auraRes.data === "number" ? auraRes.data : 0;

  const historyRes = await getAuraHistoryAction();
  const initialHistory = historyRes.success ? historyRes.data : [];

  const cumulativeRes = await getCumulativeAuraAction();
  let initialCumulativeAura = 0;
  if (cumulativeRes.success && typeof cumulativeRes.data === "number") {
    initialCumulativeAura = cumulativeRes.data;
  } else if (Array.isArray(initialHistory)) {
    initialCumulativeAura = initialHistory
      .filter((tx: any) => tx.amount > 0)
      .reduce((sum: number, tx: any) => sum + (Number(tx.amount) || 0), 0);
  }

  const tasksRes = await getTasksAction();
  const initialTasks = tasksRes.success ? tasksRes.data : [];

  const storeRes = await getStoreItemsAction();
  const initialStoreItems = storeRes.success ? storeRes.data : [];

  let initialRedemptions: any[] = [];
  if (primaryRole === "Admin" || primaryRole === "Superadmin") {
    const redemptionsRes = await getAllRedemptionsAction();
    if (redemptionsRes.success && redemptionsRes.data) {
      initialRedemptions = redemptionsRes.data;
    }
  } else {
    const redemptionsRes = await getUserRedemptionsAction();
    if (redemptionsRes.success && redemptionsRes.data) {
      initialRedemptions = redemptionsRes.data;
    }
  }

  const teamsRes = await getTeamsAction();
  const initialTeams = teamsRes.success ? teamsRes.data : [];

  const kudosRes = await getKudosAction();
  const initialKudos = kudosRes.success ? kudosRes.data : [];

  const notifRes = await getUserNotificationsAction();
  const initialNotifications = notifRes.success && notifRes.data ? notifRes.data : [];

  const prefRes = await getUserPreferencesAction();
  const initialPreferences = prefRes.success && prefRes.data ? prefRes.data : [];

  let initialDeliverySummary = null;
  let initialDeliveriesData = null;

  if (primaryRole === "Admin" || primaryRole === "Superadmin") {
    const [summaryRes, deliveriesRes] = await Promise.all([
      getDeliverySummaryAction(),
      getDeliveriesAction({ page: 1, pageSize: 20 }),
    ]);
    if (summaryRes.success && summaryRes.data) {
      initialDeliverySummary = summaryRes.data;
    }
    if (deliveriesRes.success && deliveriesRes.data) {
      initialDeliveriesData = deliveriesRes.data;
    }
  }

  return (
    <AuraApp
      initialRole={primaryRole}
      userName={(Array.isArray(realUsers) ? realUsers.find((u: any) => u.email === session!.email)?.name : undefined) || session!.email}
      initialUsers={realUsers}
      initialAuraBalance={initialAuraBalance}
      initialCumulativeAura={initialCumulativeAura}
      initialHistory={initialHistory}
      initialTasks={initialTasks}
      initialStoreItems={initialStoreItems}
      initialRedemptions={initialRedemptions}
      initialTeams={initialTeams}
      initialKudos={initialKudos}
      initialNotifications={initialNotifications}
      initialPreferences={initialPreferences}
      initialDeliverySummary={initialDeliverySummary}
      initialDeliveriesData={initialDeliveriesData}
      initialTab={initialTab}
    />
  );
}
