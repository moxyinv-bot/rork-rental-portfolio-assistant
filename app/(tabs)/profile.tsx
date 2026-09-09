import React, { useEffect, useState } from "react";
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
  Platform,
  Linking,
} from "react-native";
import Constants from "expo-constants";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { useHousehold } from "@/hooks/useHousehold";
import { supabase } from "@/lib/supabase";
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
  CheckCircle,
  AlertCircle,
  Info,
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
  const [latestRelease, setLatestRelease] = useState<{
    version_name: string;
    version_code: number;
    minimum_supported_code: number;
  } | null>(null);
  const [versionCheckFailed, setVersionCheckFailed] = useState(false);

  const installedVersion = Constants.expoConfig?.version ?? "unknown";
  const installedBuild = Constants.expoConfig?.android?.versionCode ?? 0;
  const updateAvailable = latestRelease ? installedBuild < latestRelease.version_code : false;
  const unsupportedBuild = latestRelease ? installedBuild < latestRelease.minimum_supported_code : false;

  useEffect(() => {
    let active = true;

    const loadReleaseStatus = async () => {
      const { data, error: releaseError } = await supabase
        .from('app_releases')
        .select('version_name, version_code, minimum_supported_code')
        .eq('platform', Platform.OS)
        .maybeSingle();

      if (!active) return;
      if (releaseError) {
        setVersionCheckFailed(true);
        return;
      }

      setLatestRelease(data);
      setVersionCheckFailed(false);
    };

    void loadReleaseStatus();
    return () => {
      active = false;
    };
  }, []);

  const memberDisplayName = (member: (typeof members)[number]) => {
    const explicitName = member.profile?.name?.trim();
    if (explicitName) return explicitName;

    const email = member.profile?.email?.trim();
    if (email) {
      const localPart = email.split("@")[0]?.trim();
      if (localPart) return localPart;
    }

    if (member.user_id === "guest" || member.user_id.startsWith("guest_")) {
      return "Guest Member";
    }

    if (member.user_id.startsWith("usr_")) {
      return "Household Member";
    }

    return "Member";
  };

  const memberSecondaryText = (member: (typeof members)[number]) => {
    const email = member.profile?.email?.trim();
    if (email) return email;
    if (member.user_id === "guest" || member.user_id.startsWith("guest_")) {
      return "Guest account";
    }
    return "No email shared";
  };

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
        message: `Join my PadCommand household. Open PadCommand, sign in, and enter invite code ${household.invite_code}.`,
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

  const handleSwitchAccount = () => {
    Alert.alert(
      "Switch Account",
      "Sign out of this account so you can log in with a different one.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Switch Account",
          style: "destructive",
          onPress: () => signOut(),
        },
      ]
    );
  };

  const contactBuilder = () => {
    const emailUrl = "mailto:moxyinv@gmail.com?subject=PadCommand%20question%20or%20suggestion";
    Linking.openURL(emailUrl).catch(() => {
      Alert.alert("Email unavailable", "Please email moxyinv@gmail.com with your question or suggestion.");
    });
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
          <Text style={styles.userEmail}>
            {user?.email}
          </Text>
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
            {members.map((member) => {
              const displayName = memberDisplayName(member);
              const secondaryText = memberSecondaryText(member);

              return (
              <View key={member.id} style={styles.memberCard}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>
                    {(displayName || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>
                    {displayName}
                  </Text>
                  <Text style={styles.memberEmail}>
                    {secondaryText}
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
                        displayName || "this member"
                      )
                    }
                    style={styles.removeButton}
                  >
                    <UserMinus size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            )})}

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
            <Text style={styles.sectionTitle}>Set Up PadCommand</Text>
            <Text style={styles.sectionDescription}>
              Create a new household for the properties you manage, or join an existing
              household with a six-character invite code.
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Version</Text>
          <View style={styles.versionCard}>
            <View style={styles.versionHeader}>
              <Info size={20} color="#3B82F6" />
              <View style={styles.versionDetails}>
                <Text style={styles.versionName}>PadCommand {installedVersion}</Text>
                <Text style={styles.versionBuild}>Build {installedBuild || "unknown"}</Text>
              </View>
            </View>

            {latestRelease ? (
              <View style={[
                styles.versionStatus,
                updateAvailable ? styles.versionStatusWarning : styles.versionStatusCurrent,
              ]}>
                {updateAvailable ? (
                  <AlertCircle size={18} color="#B45309" />
                ) : (
                  <CheckCircle size={18} color="#15803D" />
                )}
                <View style={styles.versionStatusText}>
                  <Text style={updateAvailable ? styles.versionWarningText : styles.versionCurrentText}>
                    {unsupportedBuild ? "Update required" : updateAvailable ? "Update available" : "Up to date"}
                  </Text>
                  <Text style={styles.latestVersionText}>
                    Latest: {latestRelease.version_name} (build {latestRelease.version_code})
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.versionUnavailableText}>
                {versionCheckFailed ? "Latest-version check unavailable" : "Checking latest version..."}
              </Text>
            )}

            <TouchableOpacity style={styles.contactBuilderButton} onPress={contactBuilder} activeOpacity={0.7}>
              <View style={styles.contactBuilderIcon}>
                <Mail size={18} color="#2563EB" />
              </View>
              <View style={styles.contactBuilderTextContainer}>
                <Text style={styles.contactBuilderTitle}>Questions or suggestions?</Text>
                <Text style={styles.contactBuilderEmail}>moxyinv@gmail.com</Text>
              </View>
              <ChevronRight size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

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

          <TouchableOpacity
            style={styles.switchAccountButton}
            onPress={handleSwitchAccount}
            activeOpacity={0.7}
          >
            <User size={20} color="#3B82F6" />
            <Text style={styles.switchAccountText}>Switch Account</Text>
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
              Choose a recognizable name for your shared PadCommand workspace.
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
              Sign in with your own Google account, then enter the six-character code
              shared by a household member.
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
  versionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  versionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  versionDetails: {
    flex: 1,
  },
  versionName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#111827",
  },
  versionBuild: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  versionStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    padding: 12,
    borderRadius: 8,
  },
  versionStatusCurrent: {
    backgroundColor: "#F0FDF4",
  },
  versionStatusWarning: {
    backgroundColor: "#FFFBEB",
  },
  versionStatusText: {
    flex: 1,
  },
  versionCurrentText: {
    color: "#15803D",
    fontWeight: "600" as const,
  },
  versionWarningText: {
    color: "#B45309",
    fontWeight: "600" as const,
  },
  latestVersionText: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 2,
  },
  versionUnavailableText: {
    color: "#6B7280",
    fontSize: 13,
    marginTop: 12,
  },
  contactBuilderButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  contactBuilderIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  contactBuilderTextContainer: {
    flex: 1,
  },
  contactBuilderTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  contactBuilderEmail: {
    color: "#2563EB",
    fontSize: 13,
    marginTop: 2,
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
  switchAccountButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  switchAccountText: {
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "600" as const,
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
