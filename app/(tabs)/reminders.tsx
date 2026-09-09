import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Plus, Calendar, CheckCircle, AlertCircle, Clock, MessageSquare } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePortfolio } from "@/hooks/portfolio-store";
import { REMINDER_TYPES } from "@/constants/categories";
import { parseStoredDate } from "@/lib/dates";

const parseReminderDate = parseStoredDate;

export default function RemindersScreen() {
  const { properties, reminders, updateReminder, isLoading } = usePortfolio();

  const groupedReminders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const overdue: typeof reminders = [];
    const upcoming: typeof reminders = [];
    const completed: typeof reminders = [];
    
    reminders.forEach(reminder => {
      if (reminder.completed) {
        completed.push(reminder);
      } else {
        const dueDate = parseReminderDate(reminder.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        if (dueDate < today) {
          overdue.push(reminder);
        } else {
          upcoming.push(reminder);
        }
      }
    });
    
    return {
      overdue: overdue.sort((a, b) => parseReminderDate(a.dueDate).getTime() - parseReminderDate(b.dueDate).getTime()),
      upcoming: upcoming.sort((a, b) => parseReminderDate(a.dueDate).getTime() - parseReminderDate(b.dueDate).getTime()),
      completed: completed.sort((a, b) => parseReminderDate(b.dueDate).getTime() - parseReminderDate(a.dueDate).getTime()),
    };
  }, [reminders]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const formatDate = (dateString: string) => {
    const date = parseReminderDate(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getReminderTypeColor = (type: string) => {
    const reminderType = REMINDER_TYPES.find(t => t.value === type);
    return reminderType?.color || '#6B7280';
  };

  const toggleComplete = async (reminderId: string, currentStatus: boolean) => {
    try {
      await updateReminder(reminderId, { completed: !currentStatus });
    } catch (error) {
      console.error('Error updating reminder completion:', error);
      const message = error instanceof Error ? error.message : 'Failed to update reminder. Please try again.';
      Alert.alert('Error', message);
    }
  };

  const openReminderEditor = (reminderId: string) => {
    router.push(`/edit-reminder/${reminderId}` as any);
  };

  const sendReminderSms = async (reminder: typeof reminders[0]) => {
    const targetPhone = reminder.recipientPhone?.trim();
    if (!targetPhone) {
      Alert.alert("Missing phone number", "This reminder does not have a recipient phone number.");
      return;
    }

    const property = properties.find(p => p.id === reminder.propertyId);
    const messageParts = [
      `Reminder: ${reminder.title}`,
      `Due: ${reminder.dueDate}`,
      property?.name ? `Property: ${property.name}` : "",
      reminder.notes?.trim() ? `Notes: ${reminder.notes.trim()}` : "",
    ].filter(Boolean);

    const body = encodeURIComponent(messageParts.join("\n"));
    const phone = encodeURIComponent(targetPhone);
    const smsUrl = Platform.OS === "ios"
      ? `sms:${phone}&body=${body}`
      : `sms:${phone}?body=${body}`;

    try {
      const canOpen = await Linking.canOpenURL(smsUrl);
      if (!canOpen) {
        Alert.alert("SMS unavailable", "Your device cannot open the SMS composer.");
        return;
      }

      await Linking.openURL(smsUrl);
    } catch (error) {
      console.error("Failed to open SMS composer:", error);
      Alert.alert("SMS unavailable", "Could not open the SMS composer.");
    }
  };

  const ReminderCard = ({ reminder }: { reminder: typeof reminders[0] }) => {
    const property = properties.find(p => p.id === reminder.propertyId);
    const typeColor = getReminderTypeColor(reminder.type);
    
    return (
      <TouchableOpacity
        style={[styles.reminderCard, reminder.completed && styles.reminderCardCompleted]}
        onPress={() => openReminderEditor(reminder.id)}
      >
        <View style={[styles.reminderIndicator, { backgroundColor: typeColor }]} />
        <View style={styles.reminderContent}>
          <View style={styles.reminderHeader}>
            <Text style={[styles.reminderTitle, reminder.completed && styles.reminderTitleCompleted]}>
              {reminder.title}
            </Text>
            <TouchableOpacity
              style={styles.statusToggleButton}
              onPress={() => toggleComplete(reminder.id, reminder.completed)}
            >
              {reminder.completed ? (
                <CheckCircle size={20} color="#10B981" />
              ) : (
                <View style={[styles.checkbox, { borderColor: typeColor }]} />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.reminderProperty}>{property?.name || 'Unknown Property'}</Text>
          <View style={styles.reminderFooter}>
            <View style={[styles.reminderTypeBadge, { backgroundColor: `${typeColor}15` }]}>
              <Text style={[styles.reminderType, { color: typeColor }]}>{reminder.type}</Text>
            </View>
            <Text style={[styles.reminderDate, reminder.completed && styles.reminderDateCompleted]}>
              {formatDate(reminder.dueDate)}
            </Text>
          </View>
          {!!reminder.notes && (
            <Text style={styles.reminderNotes}>{reminder.notes}</Text>
          )}
          {reminder.recipientPhone ? (
            <TouchableOpacity
              style={styles.sendNowButton}
              onPress={() => sendReminderSms(reminder)}
            >
              <MessageSquare size={14} color="#2563EB" />
              <Text style={styles.sendNowButtonText}>Send Message Now</Text>
            </TouchableOpacity>
          ) : null}
          <Text style={styles.editHintText}>Tap card to edit or delete</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
    <ScrollView 
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Add Button */}
      <View style={styles.headerSection}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/add-reminder' as any)}
        >
          <Plus size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Reminder</Text>
        </TouchableOpacity>
      </View>

      {/* Overdue Reminders */}
      {groupedReminders.overdue.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AlertCircle size={20} color="#EF4444" />
            <Text style={styles.sectionTitle}>Overdue ({groupedReminders.overdue.length})</Text>
          </View>
          {groupedReminders.overdue.map(reminder => (
            <ReminderCard key={reminder.id} reminder={reminder} />
          ))}
        </View>
      )}

      {/* Upcoming Reminders */}
      {groupedReminders.upcoming.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={20} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Upcoming ({groupedReminders.upcoming.length})</Text>
          </View>
          {groupedReminders.upcoming.map(reminder => (
            <ReminderCard key={reminder.id} reminder={reminder} />
          ))}
        </View>
      )}

      {/* Completed Reminders */}
      {groupedReminders.completed.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CheckCircle size={20} color="#10B981" />
            <Text style={styles.sectionTitle}>Completed ({groupedReminders.completed.length})</Text>
          </View>
          {groupedReminders.completed.slice(0, 5).map(reminder => (
            <ReminderCard key={reminder.id} reminder={reminder} />
          ))}
        </View>
      )}

      {/* Empty State */}
      {reminders.length === 0 && (
        <View style={styles.emptyState}>
          <Calendar size={48} color="#D1D5DB" />
          <Text style={styles.emptyStateText}>No reminders yet</Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => router.push('/add-reminder' as any)}
          >
            <Text style={styles.emptyStateButtonText}>Add Your First Reminder</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerSection: {
    padding: 16,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3B82F6",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600" as const,
  },
  section: {
    padding: 16,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#374151",
  },
  reminderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  reminderCardCompleted: {
    opacity: 0.7,
  },
  reminderIndicator: {
    width: 4,
  },
  reminderContent: {
    flex: 1,
    padding: 12,
  },
  reminderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  statusToggleButton: {
    padding: 4,
    marginLeft: 8,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#111827",
    flex: 1,
  },
  reminderTitleCompleted: {
    textDecorationLine: "line-through" as const,
    color: "#6B7280",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  reminderProperty: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 8,
  },
  reminderFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reminderTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reminderType: {
    fontSize: 11,
    fontWeight: "500" as const,
    textTransform: "capitalize" as const,
  },
  reminderDate: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  reminderDateCompleted: {
    textDecorationLine: "line-through" as const,
  },
  reminderNotes: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
    fontStyle: "italic" as const,
  },
  sendNowButton: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#2563EB",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#EFF6FF",
  },
  sendNowButtonText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#2563EB",
  },
  editHintText: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 8,
  },
  emptyState: {
    alignItems: "center",
    padding: 48,
    marginTop: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600" as const,
  },
});