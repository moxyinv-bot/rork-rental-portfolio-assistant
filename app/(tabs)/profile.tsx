import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { useHousehold } from "@/hooks/useHousehold";
import {
  User,
  LogOut,
  Users,
  Plus,
  Copy,
  UserMinus,
  Crown,
  Mail,
  ChevronRight,
  Home,
} from "lucide-react-native";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const {
    household,
    members,
    isLoading,
    error,
    createHousehold,
    joinHousehold,
    leaveHousehold,
    removeMember,
    clearError,
  } = useHousehold();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCreateHousehold = async () => {
    if (!householdName.trim()) return;
    setIsProcessing(true);
    const result = await createHousehold(householdName.trim());
    setIsProcessing(false);
    if (result) {
      setShowCreateModal(false);
      setHouseholdName("");
    }
  };

  const handleJoinHousehold = async () => {
    if (!inviteCode.trim()) return;
    setIsProcessing(true);
    const result = await joinHousehold(inviteCode.trim());
    setIsProcessing(false);
    if (result) {
      setShowJoinModal(false);
      setInviteCode("");
    }
  };

  const handleShareInvite = async () => {
    if (!household) return;
    try {
      await Share.share({
        message: `Join my rental portfolio on Rental Portfolio Assistant! Use invite code: ${household.invite_code}`,
      });
    } catch (err) {
      console.error("Share failed:", err);
    }
  };

  const handleLeaveHousehold = () => {
    if (!household) return;
    Alert.alert(
      "Leave Household?",
      `Are you sure you want to leave "${household.name}"? You'll lose access to all shared properties and data.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => leaveHousehold(household.id),
        },
      ]
    );
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    Alert.alert(
      "Remove Member?",
      `Remove ${memberName} from this household? They'll lose access to all shared data.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeMember(memberId),
        },
      ]
    );
  };

  const copyInviteCode = () => {
    if (!household) return;
    Share.share({ message: household.invite_code }).catch(() => {});
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            {user?.picture ? (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {(user?.name || user?.email || "?").charAt(0).toUpperCase()}
                </Text>
              </View>
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {(user?.name || user?.email || "?").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.userName}>{user?.name || "User"}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={clearError}>
              <Text style={styles.errorDismiss}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Household Section */}
        {household ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Household</Text>
            <View style={styles.householdCard}>
              <View style={styles.householdHeader}>
                <Home size={24} color="#3B82F6" />
                <View style={styles.householdInfo}>
                  <Text style={styles.householdName}>{household.name}</Text>
                  <Text style={styles.householdMembers}>
                    {members.length} member{members.length !== 1 ? "s" : ""}
                  </Text>
                </View>
              </View>

              {/* Invite Code */}
              <View style={styles.inviteCodeSection}>
                <Text style={styles.inviteLabel}>Invite Code</Text>
                <TouchableOpacity
                  style={styles.inviteCodeRow}
                  onPress={copyInviteCode}
                  activeOpacity={0.7}
                >
                  <Text style={styles.inviteCode}>{household.invite_code}</Text>
                  <View style={styles.copyButton}>
                    <Copy size={16} color="#3B82F6" />
                    <Text style={styles.copyText}>Copy</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.shareInviteButton}
                  onPress={handleShareInvite}
                  activeOpacity={0.7}
                >
                  <Plus size={18} color="#3B82F6" />
                  <Text style={styles.shareInviteText}>Invite Family Member</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Members List */}
            <Text style={styles.subsectionTitle}>Members</Text>
            {members.map((member) => (
              <View key={member.id} style={styles.memberCard}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>
                    {(member.profile?.name || member.profile?.email || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>
                    {member.profile?.name || "Unknown"}
                  </Text>
                  <Text style={styles.memberEmail}>
                    {member.profile?.email}
                  </Text>
                </View>
                {member.role === "owner" ? (
                  <View style={styles.ownerBadge}>
                    <Crown size={14} color="#F59E0B" />
                    <Text style={styles.ownerText}>Owner</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() =>
                      handleRemoveMember(
                        member.id,
                        member.profile?.name || "this member"
                      )
                    }
                    style={styles.removeButton}
                  >
                    <UserMinus size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <TouchableOpacity
              style={styles.leaveButton}
              onPress={handleLeaveHousehold}
              activeOpacity={0.7}
            >
              <LogOut size={18} color="#EF4444" />
              <Text style={styles.leaveText}>Leave Household</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Set Up Sharing</Text>
            <Text style={styles.sectionDescription}>
              Create a household to share your rental portfolio with family members or
              partners. Everyone you invite will see the same properties and can make
              changes that sync across all devices.
            </Text>

            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowCreateModal(true)}
              activeOpacity={0.8}
            >
              <Users size={20} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create a Household</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => setShowJoinModal(true)}
              activeOpacity={0.8}
            >
              <Plus size={20} color="#3B82F6" />
              <Text style={styles.joinButtonText}>Join with Invite Code</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sign Out */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={signOut}
            activeOpacity={0.7}
          >
            <LogOut size={20} color="#EF4444" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Create Household Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Household</Text>
            <Text style={styles.modalDescription}>
              Give your household a name — this helps identify your shared portfolio.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Smith Family Properties"
              placeholderTextColor="#9CA3AF"
              value={householdName}
              onChangeText={setHouseholdName}
              autoFocus
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowCreateModal(false);
                  setHouseholdName("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  !householdName.trim() && styles.modalButtonDisabled,
                ]}
                onPress={handleCreateHousehold}
                disabled={!householdName.trim() || isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Join Household Modal */}
      <Modal
        visible={showJoinModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowJoinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Join Household</Text>
            <Text style={styles.modalDescription}>
              Enter the 6-character invite code shared by a household member.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. AB12CD"
              placeholderTextColor="#9CA3AF"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              maxLength={6}
              autoFocus
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowJoinModal(false);
                  setInviteCode("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  !inviteCode.trim() && styles.modalButtonDisabled,
                ]}
                onPress={handleJoinHousehold}
                disabled={!inviteCode.trim() || isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Join</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  profileHeader: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  avatar: {
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  userName: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: "#111827",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 15,
    color: "#6B7280",
  },
  errorBanner: {
    marginHorizontal: 16,
    backgroundColor: "#FEE2E2",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 14,
    flex: 1,
  },
  errorDismiss: {
    color: "#DC2626",
    fontWeight: "600" as const,
    marginLeft: 8,
  },
  section: {
    padding: 16,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#111827",
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 22,
    marginBottom: 20,
  },
  householdCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  householdHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  householdInfo: {
    flex: 1,
  },
  householdName: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#111827",
  },
  householdMembers: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  inviteCodeSection: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 16,
  },
  inviteLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500" as const,
    marginBottom: 8,
    textTransform: "uppercase" as const,
  },
  inviteCodeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  inviteCode: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "#111827",
    letterSpacing: 4,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  copyText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "500" as const,
  },
  shareInviteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    paddingVertical: 12,
  },
  shareInviteText: {
    fontSize: 15,
    color: "#3B82F6",
    fontWeight: "500" as const,
  },
  subsectionTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#374151",
    marginTop: 20,
    marginBottom: 10,
  },
  memberCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E0E7FF",
    justifyContent: "center",
    alignItems: "center",
  },
  memberAvatarText: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#3B82F6",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#111827",
  },
  memberEmail: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  ownerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ownerText: {
    fontSize: 12,
    color: "#92400E",
    fontWeight: "600" as const,
  },
  removeButton: {
    padding: 8,
  },
  leaveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
  },
  leaveText: {
    fontSize: 15,
    color: "#EF4444",
    fontWeight: "500" as const,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#3B82F6",
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  createButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600" as const,
  },
  joinButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#3B82F6",
    paddingVertical: 16,
    borderRadius: 14,
  },
  joinButtonText: {
    fontSize: 16,
    color: "#3B82F6",
    fontWeight: "600" as const,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
  },
  signOutText: {
    fontSize: 16,
    color: "#EF4444",
    fontWeight: "500" as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#111827",
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 22,
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#111827",
    marginBottom: 20,
  },
  modalButtonRow: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500" as const,
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#3B82F6",
    alignItems: "center",
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalConfirmText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600" as const,
  },
});
