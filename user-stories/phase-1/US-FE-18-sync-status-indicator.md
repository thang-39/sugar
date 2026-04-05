# US-FE-18 — Sync Status Indicator

## Parent Phase
Phase 1 — Scaffold + Core Logging (Guest Mode)

## Backend / Frontend
**Frontend**

## User Story (from PRD)
- US 19: Clear indicator of sync status (✓ synced / 🔄 syncing / ⏳ N pending / 🚫 offline). Tap for popover with last synced time, pending count, and "Sync Now" button.

## Goal
Add a sync status icon to the header of each tab. Tap → show a popover/modal with sync details and a "Sync Now" button.

---

## Steps

### 1. Create SyncStatusBadge Component

**`src/ui/components/SyncStatusBadge.tsx`**

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useAppStore, useSyncStatus } from '../../data/stores/useAppStore';
import { formatDateTime } from '../../utils/dateUtils';
import { syncEngine } from '../../data/supabase/syncEngine';

const STATUS_CONFIG = {
  synced:   { icon: '✓', color: '#388E3C', label: 'Synced' },
  syncing:  { icon: '🔄', color: '#1976D2', label: 'Syncing…' },
  pending:  { icon: '⏳', color: '#FFA000', label: 'N pending' },
  offline:  { icon: '🚫', color: '#757575', label: 'Offline' },
};

export default function SyncStatusBadge() {
  const syncStatus = useSyncStatus();
  const pendingCount = useAppStore(s => s.pendingCount);
  const lastSyncedAt = useAppStore(s => s.lastSyncedAt);
  const [visible, setVisible] = React.useState(false);

  const config = STATUS_CONFIG[syncStatus];
  const displayLabel = syncStatus === 'pending'
    ? `⏳ ${pendingCount} pending`
    : config.label;

  const handleSyncNow = async () => {
    setVisible(false);
    await syncEngine.triggerManualSync();
  };

  return (
    <>
      <TouchableOpacity
        style={styles.badge}
        onPress={() => setVisible(true)}
        accessibilityLabel={`Sync status: ${displayLabel}. Tap for details.`}
        accessibilityRole="button"
      >
        <Text style={[styles.badgeIcon, { color: config.color }]}>{config.icon}</Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.popover}>
            <Text style={styles.popoverTitle}>Sync Status</Text>

            {/* Status row */}
            <View style={styles.popoverRow}>
              <Text style={styles.popoverLabel}>Status</Text>
              <Text style={[styles.popoverValue, { color: config.color }]}>
                {config.label}
              </Text>
            </View>

            {/* Last synced */}
            <View style={styles.popoverRow}>
              <Text style={styles.popoverLabel}>Last synced</Text>
              <Text style={styles.popoverValue}>
                {lastSyncedAt ? formatDateTime(lastSyncedAt) : 'Never'}
              </Text>
            </View>

            {/* Pending */}
            <View style={styles.popoverRow}>
              <Text style={styles.popoverLabel}>Pending</Text>
              <Text style={styles.popoverValue}>{pendingCount} reading{pendingCount !== 1 ? 's' : ''}</Text>
            </View>

            {/* Sync Now button */}
            <TouchableOpacity
              style={[
                styles.syncButton,
                syncStatus === 'offline' && styles.syncButtonDisabled,
              ]}
              onPress={handleSyncNow}
              disabled={syncStatus === 'offline'}
              accessibilityLabel="Sync now"
              accessibilityRole="button"
            >
              <Text style={styles.syncButtonText}>Sync Now</Text>
            </TouchableOpacity>

            {syncStatus === 'offline' && (
              <Text style={styles.offlineNote}>
                Sync not available while offline. Your readings are saved locally.
              </Text>
            )}

            {/* Close */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setVisible(false)}
              accessibilityLabel="Close"
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  badgeIcon: { fontSize: 20 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  popover: {
    backgroundColor: '#FFFFFF', borderRadius: 12,
    padding: 24, width: 300,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8,
    elevation: 8,
  },
  popoverTitle: { fontSize: 18, fontWeight: 'bold', color: '#212121', marginBottom: 16 },
  popoverRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  popoverLabel: { fontSize: 14, color: '#757575' },
  popoverValue: { fontSize: 14, color: '#212121', fontWeight: '500' },
  syncButton: { backgroundColor: '#2196F3', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  syncButtonDisabled: { backgroundColor: '#BDBDBD' },
  syncButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  offlineNote: { fontSize: 12, color: '#757575', textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
  closeButton: { alignItems: 'center', paddingVertical: 12, marginTop: 8 },
  closeButtonText: { fontSize: 14, color: '#757575' },
});
```

### 2. Add to Tab Headers

Update `AppNavigator.tsx` to add `SyncStatusBadge` to the header of each tab stack:

```tsx
// In each tab screen's options:
screenOptions={{
  headerRight: () => <SyncStatusBadge />,
  headerStyle: { backgroundColor: '#FFFFFF' },
  headerShadowVisible: false,
}}
```

Example for the Log tab:

```tsx
<Tab.Screen
  name="Log"
  component={LogStack}
  options={{
    headerRight: () => <SyncStatusBadge />,
    headerTitle: 'Log',
    headerStyle: { backgroundColor: '#FFFFFF' },
    headerShadowVisible: false,
  }}
/>
```

Do the same for History, Trends, and Settings tabs.

---

## Behavior Summary

| Status | Icon | Color | Popover shows |
|---|---|---|---|
| `synced` | ✓ | Green | Last synced time, pending count |
| `syncing` | 🔄 | Blue | "Syncing…" |
| `pending` | ⏳ | Orange | N pending readings |
| `offline` | 🚫 | Gray | "Offline — readings saved locally" |

**"Sync Now" button:**
- Enabled in `synced` and `pending` states
- Disabled (grayed out) in `offline` state
- Phase 1: just logs / simulates. Phase 5: actually syncs.

---

## Verification

- [ ] Sync status icon visible in header of each tab
- [ ] Icon updates when connectivity changes
- [ ] Tapping icon → popover shows with correct values
- [ ] Last synced time shown correctly
- [ ] Pending count shown correctly
- [ ] "Sync Now" button is disabled when offline
- [ ] Tapping "Sync Now" → triggers sync engine

---

## Dependencies
- **US-FE-16** (sync engine with `triggerManualSync`) must be complete first.
