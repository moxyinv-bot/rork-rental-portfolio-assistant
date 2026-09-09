import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ContactRound, Mail, MapPin, Phone, Plus, Search, Share2, Tag, Trash2, X } from "lucide-react-native";
import { usePortfolio } from "@/hooks/portfolio-store";
import { ContactCategory, ContactPhoneNumber, PortfolioContact } from "@/types/property";

const CONTACT_CATEGORIES: { value: ContactCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "contractor", label: "Contractors" },
  { value: "insurance", label: "My Team" },
  { value: "tenant", label: "Tenants" },
  { value: "buyer-seller", label: "Buyers/Sellers" },
  { value: "lead", label: "Leads" },
  { value: "other", label: "Other" },
];

const EDIT_CATEGORIES = CONTACT_CATEGORIES.filter((category): category is { value: ContactCategory; label: string } => category.value !== "all");

const categoryLabels: Record<ContactCategory, string> = {
  contractor: "Contractor",
  insurance: "My Team",
  tenant: "Tenant",
  "buyer-seller": "Buyer/Seller",
  lead: "Property Lead",
  other: "Other",
};

const emptyPhoneNumber = (): ContactPhoneNumber => ({
  id: `phone_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  label: "Mobile",
  number: "",
});

const emptyContact = (): PortfolioContact => ({
  id: `contact_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  name: "",
  category: "contractor",
  phoneNumbers: [emptyPhoneNumber()],
  company: "",
  email: "",
  address: "",
  tags: [],
  notes: "",
});

const contactToShareText = (contact: PortfolioContact) => {
  const lines = [contact.name, `Category: ${categoryLabels[contact.category]}`];
  contact.phoneNumbers.forEach(phoneNumber => {
    lines.push(`${phoneNumber.label}: ${phoneNumber.number}`);
  });
  if (contact.company) lines.push(`Company: ${contact.company}`);
  if (contact.email) lines.push(`Email: ${contact.email}`);
  if (contact.address) lines.push(`Address: ${contact.address}`);
  if (contact.tags.length > 0) lines.push(`Tags: ${contact.tags.join(", ")}`);
  if (contact.notes) lines.push(`Notes: ${contact.notes}`);
  return lines.join("\n");
};

const parseTags = (value: string) => value.split(",").map(tag => tag.trim()).filter(Boolean);

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message || "Failed to save contact. Please try again.");
  }
  return "Failed to save contact. Please try again.";
};

export default function ContactsScreen() {
  const { contacts, addContact, updateContact, deleteContact, isLoading } = usePortfolio();
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ContactCategory | "all">("all");
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<PortfolioContact | null>(null);
  const [formData, setFormData] = useState<PortfolioContact>(emptyContact());
  const [tagsText, setTagsText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const filteredContacts = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    return contacts
      .filter(contact => selectedCategory === "all" || contact.category === selectedCategory)
      .filter(contact => {
        if (!normalizedSearch) return true;
        const haystack = [
          contact.name,
          categoryLabels[contact.category],
          contact.company,
          contact.email,
          contact.address,
          contact.notes,
          ...contact.tags,
          ...contact.phoneNumbers.flatMap(phoneNumber => [phoneNumber.label, phoneNumber.number]),
        ].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(normalizedSearch);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [contacts, searchText, selectedCategory]);

  const openAddModal = () => {
    const nextContact = emptyContact();
    setEditingContact(null);
    setFormData(nextContact);
    setTagsText("");
    setShowContactModal(true);
  };

  const openEditModal = (contact: PortfolioContact) => {
    setEditingContact(contact);
    setFormData({
      ...contact,
      phoneNumbers: contact.phoneNumbers.length > 0 ? contact.phoneNumbers : [emptyPhoneNumber()],
      company: contact.company || "",
      email: contact.email || "",
      address: contact.address || "",
      notes: contact.notes || "",
    });
    setTagsText(contact.tags.join(", "));
    setShowContactModal(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setEditingContact(null);
    setFormData(emptyContact());
    setTagsText("");
    setShowContactModal(false);
  };

  const updatePhoneNumber = (phoneId: string, updates: Partial<ContactPhoneNumber>) => {
    setFormData(prev => ({
      ...prev,
      phoneNumbers: prev.phoneNumbers.map(phoneNumber => phoneNumber.id === phoneId ? { ...phoneNumber, ...updates } : phoneNumber),
    }));
  };

  const addPhoneNumber = () => {
    setFormData(prev => ({ ...prev, phoneNumbers: [...prev.phoneNumbers, emptyPhoneNumber()] }));
  };

  const removePhoneNumber = (phoneId: string) => {
    setFormData(prev => ({ ...prev, phoneNumbers: prev.phoneNumbers.filter(phoneNumber => phoneNumber.id !== phoneId) }));
  };

  const cleanContact = (): PortfolioContact => ({
    ...formData,
    name: formData.name.trim(),
    phoneNumbers: formData.phoneNumbers
      .map(phoneNumber => ({ ...phoneNumber, label: phoneNumber.label.trim() || "Phone", number: phoneNumber.number.trim() }))
      .filter(phoneNumber => phoneNumber.number),
    company: formData.company?.trim() || undefined,
    email: formData.email?.trim() || undefined,
    address: formData.address?.trim() || undefined,
    tags: parseTags(tagsText),
    notes: formData.notes?.trim() || undefined,
  });

  const saveContact = async () => {
    if (isSaving) return;
    const cleanedContact = cleanContact();
    if (!cleanedContact.name) {
      Alert.alert("Name required", "Add a name before saving this contact.");
      return;
    }

    try {
      setIsSaving(true);
      if (editingContact) {
        await updateContact(editingContact.id, cleanedContact);
      } else {
        await addContact(cleanedContact);
      }
      closeModal();
    } catch (error) {
      console.error("Error saving contact:", error);
      Alert.alert("Error", getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteContact = () => {
    if (!editingContact) return;
    Alert.alert("Delete Contact", `Delete ${editingContact.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteContact(editingContact.id);
            closeModal();
          } catch (error) {
            console.error("Error deleting contact:", error);
            Alert.alert("Error", getErrorMessage(error));
          }
        },
      },
    ]);
  };

  const shareContact = async (contact: PortfolioContact) => {
    try {
      await Share.share({ message: contactToShareText(contact) });
    } catch (error) {
      console.error("Error sharing contact:", error);
      Alert.alert("Error", "Could not open sharing for this contact.");
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Contacts</Text>
            <Text style={styles.subtitle}>{filteredContacts.length} of {contacts.length} saved</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchInputContainer}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, category, phone, tags..."
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText ? (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <X size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRail}>
          {CONTACT_CATEGORIES.map(category => (
            <TouchableOpacity
              key={category.value}
              style={[styles.categoryChip, selectedCategory === category.value && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(category.value)}
            >
              <Text style={[styles.categoryChipText, selectedCategory === category.value && styles.categoryChipTextActive]}>{category.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filteredContacts.length === 0 ? (
          <View style={styles.emptyState}>
            <ContactRound size={48} color="#D1D5DB" />
            <Text style={styles.emptyStateText}>No contacts found</Text>
            <Text style={styles.emptyStateSubtext}>Add contractors, agents, tenants, leads, and deal contacts here.</Text>
          </View>
        ) : (
          <View style={styles.contactList}>
            {filteredContacts.map(contact => (
              <TouchableOpacity key={contact.id} style={styles.contactCard} onPress={() => openEditModal(contact)} activeOpacity={0.85}>
                <View style={styles.contactCardHeader}>
                  <View style={styles.contactAvatar}>
                    <Text style={styles.contactAvatarText}>{contact.name.slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={styles.contactSummary}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactCategory}>{contact.company || categoryLabels[contact.category]}</Text>
                  </View>
                  <TouchableOpacity style={styles.iconButton} onPress={() => shareContact(contact)}>
                    <Share2 size={18} color="#3B82F6" />
                  </TouchableOpacity>
                </View>

                {contact.phoneNumbers[0] ? (
                  <TouchableOpacity style={styles.contactLine} onPress={() => Linking.openURL(`tel:${contact.phoneNumbers[0].number}`)}>
                    <Phone size={15} color="#6B7280" />
                    <Text style={styles.contactLineText}>{contact.phoneNumbers[0].label}: {contact.phoneNumbers[0].number}</Text>
                  </TouchableOpacity>
                ) : null}
                {contact.company ? (
                  <View style={styles.contactLine}>
                    <ContactRound size={15} color="#6B7280" />
                    <Text style={styles.contactLineText}>{categoryLabels[contact.category]} • {contact.company}</Text>
                  </View>
                ) : null}
                {contact.email ? (
                  <TouchableOpacity style={styles.contactLine} onPress={() => Linking.openURL(`mailto:${contact.email}`)}>
                    <Mail size={15} color="#6B7280" />
                    <Text style={styles.contactLineText}>{contact.email}</Text>
                  </TouchableOpacity>
                ) : null}
                {contact.address ? (
                  <View style={styles.contactLine}>
                    <MapPin size={15} color="#6B7280" />
                    <Text style={styles.contactLineText} numberOfLines={1}>{contact.address}</Text>
                  </View>
                ) : null}
                {contact.tags.length > 0 ? (
                  <View style={styles.tagsRow}>
                    {contact.tags.slice(0, 4).map(tag => (
                      <View key={tag} style={styles.tagChip}>
                        <Tag size={11} color="#64748B" />
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                    {contact.tags.length > 4 ? <Text style={styles.moreTags}>+{contact.tags.length - 4}</Text> : null}
                  </View>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={showContactModal} animationType="slide" onRequestClose={closeModal}>
        <SafeAreaView style={styles.modalContainer} edges={["top", "bottom"]}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalKeyboard}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeModal} disabled={isSaving}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{editingContact ? "Edit Contact" : "Add Contact"}</Text>
              {editingContact ? (
                <TouchableOpacity onPress={confirmDeleteContact} disabled={isSaving}>
                  <Trash2 size={22} color="#EF4444" />
                </TouchableOpacity>
              ) : <View style={styles.headerSpacer} />}
            </View>

            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="Name or company"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.label}>Category</Text>
              <View style={styles.editCategoryGrid}>
                {EDIT_CATEGORIES.map(category => (
                  <TouchableOpacity
                    key={category.value}
                    style={[styles.editCategoryChip, formData.category === category.value && styles.editCategoryChipActive]}
                    onPress={() => setFormData(prev => ({ ...prev, category: category.value }))}
                  >
                    <Text style={[styles.editCategoryChipText, formData.category === category.value && styles.editCategoryChipTextActive]}>{category.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Company</Text>
              <TextInput
                style={styles.input}
                value={formData.company || ""}
                onChangeText={(text) => setFormData(prev => ({ ...prev, company: text }))}
                placeholder="Business, organization, or type of work"
                placeholderTextColor="#9CA3AF"
              />

              <View style={styles.phoneHeader}>
                <Text style={styles.label}>Phone Numbers</Text>
                <TouchableOpacity style={styles.addPhoneButton} onPress={addPhoneNumber}>
                  <Plus size={15} color="#3B82F6" />
                  <Text style={styles.addPhoneButtonText}>Add Phone</Text>
                </TouchableOpacity>
              </View>

              {formData.phoneNumbers.map((phoneNumber, index) => (
                <View key={phoneNumber.id} style={styles.phoneEditorRow}>
                  <View style={styles.phoneInputs}>
                    <TextInput
                      style={styles.input}
                      value={phoneNumber.label}
                      onChangeText={(text) => updatePhoneNumber(phoneNumber.id, { label: text })}
                      placeholder={`Phone label ${index + 1}`}
                      placeholderTextColor="#9CA3AF"
                    />
                    <TextInput
                      style={styles.input}
                      value={phoneNumber.number}
                      onChangeText={(text) => updatePhoneNumber(phoneNumber.id, { number: text })}
                      placeholder="Phone number"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="phone-pad"
                    />
                  </View>
                  {formData.phoneNumbers.length > 1 ? (
                    <TouchableOpacity style={styles.removePhoneButton} onPress={() => removePhoneNumber(phoneNumber.id)}>
                      <Trash2 size={18} color="#EF4444" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={formData.email || ""}
                onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                placeholder="email@example.com"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.label}>Address</Text>
              <TextInput
                style={[styles.input, styles.textAreaSmall]}
                value={formData.address || ""}
                onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
                placeholder="Mailing or business address"
                placeholderTextColor="#9CA3AF"
                multiline
              />

              <Text style={styles.label}>Tags</Text>
              <TextInput
                style={styles.input}
                value={tagsText}
                onChangeText={setTagsText}
                placeholder="roofing, closing, emergency"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={formData.notes || ""}
                onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                placeholder="Rates, availability, license info, relationship notes..."
                placeholderTextColor="#9CA3AF"
                multiline
              />
            </ScrollView>

            <View style={styles.modalActions}>
              {editingContact ? (
                <TouchableOpacity style={styles.shareButton} onPress={() => shareContact(cleanContact())} disabled={isSaving}>
                  <Share2 size={18} color="#3B82F6" />
                  <Text style={styles.shareButtonText}>Share</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.saveButton} onPress={saveContact} disabled={isSaving}>
                <Text style={styles.saveButtonText}>{isSaving ? "Saving..." : "Save Contact"}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
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
    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3B82F6",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: "#111827",
    fontSize: 16,
    paddingVertical: 12,
    marginLeft: 8,
  },
  categoryRail: {
    gap: 8,
    paddingBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryChipActive: {
    backgroundColor: "#1F2937",
    borderColor: "#1F2937",
  },
  categoryChipText: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "600" as const,
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
  },
  contactList: {
    gap: 12,
  },
  contactCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
  },
  contactCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  contactAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  contactAvatarText: {
    color: "#1D4ED8",
    fontSize: 18,
    fontWeight: "700" as const,
  },
  contactSummary: {
    flex: 1,
  },
  contactName: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "700" as const,
  },
  contactCategory: {
    color: "#6B7280",
    fontSize: 13,
    marginTop: 2,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  contactLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  contactLineText: {
    flex: 1,
    color: "#374151",
    fontSize: 14,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600" as const,
  },
  moreTags: {
    color: "#64748B",
    fontSize: 12,
    alignSelf: "center",
  },
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    alignItems: "center",
    padding: 32,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emptyStateText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700" as const,
    marginTop: 12,
  },
  emptyStateSubtext: {
    color: "#6B7280",
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  modalKeyboard: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "700" as const,
  },
  headerSpacer: {
    width: 24,
  },
  modalContent: {
    padding: 16,
    paddingBottom: 120,
  },
  label: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600" as const,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    color: "#111827",
    fontSize: 16,
    padding: 12,
    marginBottom: 14,
  },
  editCategoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  editCategoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  editCategoryChipActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  editCategoryChipText: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "600" as const,
  },
  editCategoryChipTextActive: {
    color: "#FFFFFF",
  },
  phoneHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  addPhoneButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addPhoneButtonText: {
    color: "#3B82F6",
    fontSize: 13,
    fontWeight: "700" as const,
  },
  phoneEditorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  phoneInputs: {
    flex: 1,
  },
  removePhoneButton: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  textAreaSmall: {
    minHeight: 76,
    textAlignVertical: "top",
  },
  notesInput: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  modalActions: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  shareButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#3B82F6",
    borderRadius: 8,
    paddingVertical: 14,
    gap: 6,
  },
  shareButtonText: {
    color: "#3B82F6",
    fontSize: 15,
    fontWeight: "700" as const,
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 14,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700" as const,
  },
});