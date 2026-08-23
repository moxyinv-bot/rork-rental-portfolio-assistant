import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { Reminder } from "@/types/property";

const REMINDER_NOTIFICATION_MAP_KEY = "portfolio_reminder_notification_map";

type NotificationMap = Record<string, string>;

type NotificationsModule = {
  setNotificationHandler: (handler: {
    handleNotification: () => Promise<{
      shouldShowAlert: boolean;
      shouldPlaySound: boolean;
      shouldSetBadge: boolean;
      shouldShowBanner?: boolean;
      shouldShowList?: boolean;
    }>;
  }) => void;
  requestPermissionsAsync: () => Promise<{ status: string }>;
  getPermissionsAsync: () => Promise<{ status: string }>;
  scheduleNotificationAsync: (request: {
    content: { title: string; body?: string; data?: Record<string, unknown> };
    trigger: { type: 'date'; date: Date };
  }) => Promise<string>;
  cancelScheduledNotificationAsync: (identifier: string) => Promise<void>;
};

let notificationsConfigured = false;

const parseReminderDate = (value: string): Date => {
  if (!value) return new Date(NaN);

  const normalized = value.replace(/\//g, "-");
  const parts = normalized.split("-");

  if (parts.length === 3) {
    const [a, b, c] = parts;
    const n1 = parseInt(a, 10);
    const n2 = parseInt(b, 10);
    const n3 = parseInt(c, 10);

    if (!Number.isNaN(n1) && !Number.isNaN(n2) && !Number.isNaN(n3)) {
      if (a.length <= 2) {
        const year = c.length === 2 ? n3 + 2000 : n3;
        return new Date(year, n1 - 1, n2);
      }

      if (a.length === 4) {
        return new Date(n1, n2 - 1, n3);
      }
    }
  }

  return new Date(value);
};

const getNotificationMap = async (): Promise<NotificationMap> => {
  const raw = await AsyncStorage.getItem(REMINDER_NOTIFICATION_MAP_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as NotificationMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const saveNotificationMap = async (map: NotificationMap): Promise<void> => {
  await AsyncStorage.setItem(REMINDER_NOTIFICATION_MAP_KEY, JSON.stringify(map));
};

const getNotificationsModule = (): NotificationsModule | null => {
  if (Platform.OS === "web") return null;

  try {
    // Lazy require avoids hard crashes when native module is unavailable.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("expo-notifications") as NotificationsModule;
  } catch {
    return null;
  }
};

const ensureNotificationPermissions = async (notifications: NotificationsModule): Promise<boolean> => {
  const current = await notifications.getPermissionsAsync();
  if (current.status === "granted") return true;

  const requested = await notifications.requestPermissionsAsync();
  return requested.status === "granted";
};

const ensureConfigured = (notifications: NotificationsModule): void => {
  if (notificationsConfigured) return;

  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  notificationsConfigured = true;
};

const buildTriggerDate = (dueDate: string): Date => {
  const parsed = parseReminderDate(dueDate);
  if (Number.isNaN(parsed.getTime())) return new Date(NaN);

  // Schedule for 9 AM local time on due date.
  return new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
    9,
    0,
    0,
    0
  );
};

const buildNotificationBody = (reminder: Reminder): string => {
  if (reminder.notes?.trim()) return reminder.notes.trim();
  return `Due ${reminder.dueDate}`;
};

export const scheduleLocalReminderNotification = async (reminder: Reminder): Promise<void> => {
  if (Platform.OS === "web") return;
  if (reminder.completed) return;

  const notifications = getNotificationsModule();
  if (!notifications) return;

  ensureConfigured(notifications);

  const permitted = await ensureNotificationPermissions(notifications);
  if (!permitted) return;

  const trigger = buildTriggerDate(reminder.dueDate);
  if (Number.isNaN(trigger.getTime())) return;

  if (trigger.getTime() <= Date.now()) {
    return;
  }

  const map = await getNotificationMap();
  const existingNotificationId = map[reminder.id];

  if (existingNotificationId) {
    try {
      await notifications.cancelScheduledNotificationAsync(existingNotificationId);
    } catch {
      // Ignore stale schedule IDs.
    }
  }

  const notificationId = await notifications.scheduleNotificationAsync({
    content: {
      title: reminder.title,
      body: buildNotificationBody(reminder),
      data: {
        reminderId: reminder.id,
        propertyId: reminder.propertyId,
      },
    },
    trigger: {
      type: 'date',
      date: trigger,
    },
  });

  map[reminder.id] = notificationId;
  await saveNotificationMap(map);
};

export const cancelLocalReminderNotification = async (reminderId: string): Promise<void> => {
  if (Platform.OS === "web") return;

  const notifications = getNotificationsModule();
  if (!notifications) return;

  const map = await getNotificationMap();
  const notificationId = map[reminderId];

  if (notificationId) {
    try {
      await notifications.cancelScheduledNotificationAsync(notificationId);
    } catch {
      // Ignore stale schedule IDs.
    }

    delete map[reminderId];
    await saveNotificationMap(map);
  }
};

export const syncLocalReminderNotification = async (reminder: Reminder): Promise<void> => {
  await cancelLocalReminderNotification(reminder.id);

  if (!reminder.completed) {
    await scheduleLocalReminderNotification(reminder);
  }
};
