import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Plus, Calendar, CheckCircle, AlertCircle, Clock } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePortfolio } from "@/hooks/portfolio-store";
import { REMINDER_TYPES } from "@/constants/categories";

export default function RemindersScreen() {
  const insets = useSafeAreaInsets();
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
        const dueDate = new Date(reminder.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        if (dueDate < today) {
          overdue.push(reminder);
        } else {
          upcoming.push(reminder);
        }
      }
    });
    
    return {
      overdue: overdue.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
      upcoming: upcoming.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
      completed: completed.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()),
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
    const date = new Date(dateString);
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

  const toggleComplete = (reminderId: string, currentStatus: boolean) => {
    updateReminder(reminderId, { completed: !currentStatus });
  };

  const ReminderCard = ({ reminder }: { reminder: typeof reminders[0] }) => {
    const property = properties.find(p => p.id === reminder.propertyId);
    const typeColor = getReminderTypeColor(reminder.type);
    
    return (
      <TouchableOpacity
        style={[styles.reminderCard, reminder.completed && styles.reminderCardCompleted]}
        onPress={() => toggleComplete(reminder.id, reminder.completed)}
      >
        <View style={[styles.reminderIndicator, { backgroundColor: typeColor }]} />
        <View style={styles.reminderContent}>
          <View style={styles.reminderHeader}>
            <Text style={[styles.reminderTitle, reminder.completed && styles.reminderTitleCompleted]}>
              {reminder.title}
            </Text>
            {reminder.completed ? (
              <CheckCircle size={20} color="#10B981" />
            ) : (
              <View style={[styles.checkbox, { borderColor: typeColor }]} />
            )}
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
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
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