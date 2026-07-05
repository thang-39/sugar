# Plan: Improve Unit UI Display & Consistency

## Context & Problem
We have identified two UI inconsistencies and layout issues regarding blood sugar unit selection:
1. **Settings Screen:** The `SegmentedControl` unit selector has a constrained width (`minWidth: 150`), forcing `mmol/L` to wrap into two lines (`mmol/` and `L`). This looks squeezed.
2. **Log Blood Sugar Screen:** The input card contains a redundant unit suffix text (`mmol/L` or `mg/dL`) next to the input field, while a full-width `SegmentedControl` toggle sits directly below it. Additionally, the input number is left-aligned instead of centered.

## Goals
- **Consistency:** Align the display of unit toggles across Settings and Log screens.
- **Aesthetics & Readability:**
  - Prevent text wrapping in `SegmentedControl` labels.
  - Remove redundant static labels.
  - Center the main input number on the Log screen to make it the hero element.
- **Flexibility:** Add custom styling support to `SegmentedControl` so we can make it larger and more prominent on key screens (like the Log screen).

---

## Proposed Changes

### 1. Update Segmented Control Primitive
**File:** [segmented-control.tsx](file:///Users/thang/Documents/sugar/src/ui/components/ui/segmented-control.tsx)

Extend `SegmentedControl` to prevent text wrapping and support custom styling for its segments:
- Add `numberOfLines={1}` and `adjustsFontSizeToFit` to the label text.
- Accept optional styling props:
  - `segmentStyle?: StyleProp<ViewStyle>`: Override style for each segment touchable (e.g., custom height/padding).
  - `activeSegmentStyle?: StyleProp<ViewStyle>`: Additional style for the active segment touchable.
  - `labelStyle?: StyleProp<TextStyle>`: Custom styles for the text labels.

```tsx
interface SegmentedControlProps<T extends string> {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  activeColor?: string;
  style?: StyleProp<ViewStyle>;
  segmentStyle?: StyleProp<ViewStyle>;
  activeSegmentStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}
```

Implement style composition in rendering:
```tsx
const isActive = segment.value === value;
return (
  <TouchableOpacity
    key={segment.value}
    style={[
      styles.segment,
      segmentStyle,
      isActive && { backgroundColor: activeColor },
      isActive && activeSegmentStyle,
    ]}
    ...
  >
    <AppText
      weight={isActive ? 'extrabold' : 'bold'}
      color={isActive ? colors.onPrimary : colors.textMuted}
      style={labelStyle}
      numberOfLines={1}
      adjustsFontSizeToFit
    >
      {segment.label}
    </AppText>
  </TouchableOpacity>
);
```

### 2. Adjust Settings Screen Segment Width
**File:** [index.tsx](file:///Users/thang/Documents/sugar/app/(tabs)/settings/index.tsx)

Increase the minimum width of the settings `SegmentedControl` components:
- Modify `styles.segment` to use `minWidth: 180` (increased from `150`).
- This affects both Unit and Language selectors, keeping them visually aligned and consistent.

```typescript
const styles = StyleSheet.create({
  // ...
  segment: {
    minWidth: 180,
  },
  // ...
});
```

### 3. Redesign Log Blood Sugar Input Card
**File:** [log-reading-form.tsx](file:///Users/thang/Documents/sugar/src/ui/components/log-reading-form.tsx)

- **Remove Static Suffix:** Remove the `<AppText style={styles.unitSuffix}>` rendering inside `valueRow`.
- **Center Input Field:**
  - Update `styles.valueRow` to center items:
    ```typescript
    valueRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: spacing.sm,
    }
    ```
  - Update `styles.valueInput` to center the text:
    ```typescript
    valueInput: {
      fontSize: fontSize.display,
      fontFamily: fontFamily.black,
      color: colors.text,
      textAlign: 'center',
      minWidth: 150,
      flexShrink: 1,
      paddingVertical: Platform.OS === 'ios' ? spacing.sm : 0,
    }
    ```
- **Make Toggle Larger:**
  - Increase the size of the unit toggle on this screen by passing custom segment styling:
    ```tsx
    <SegmentedControl
      value={preferredUnit}
      onChange={handleUnitChange}
      activeColor={colors.primaryButton}
      segments={[...]}
      style={styles.unitToggle}
      segmentStyle={styles.unitToggleSegment}
    />
    ```
  - Define `styles.unitToggleSegment` with a larger `minHeight: 52` (compared to default 44) to make it more prominent and easier to interact with.

---

## Impact Analysis
- **Aesthetic Alignment:** The settings row toggle will align perfectly without text wrapping. The log screen input field will look balanced, clean, and centered.
- **Onboarding Screen:** The onboarding screen's full-width segmented controls will benefit from the text-wrap prevention, but their layout will remain unchanged as they do not specify custom widths.

---

## Verification Plan
1. **Settings Screen Verification:**
   - Verify both "Unit" and "Language" toggles are the same width (`180`).
   - Confirm `mmol/L` displays on a single line and the active background is a proper capsule shape.
2. **Log Reading Screen Verification:**
   - Verify the input number is centered.
   - Verify there is no redundant `mmol/L` or `mg/dL` text next to the number.
   - Verify the toggle below it is larger (`52px` tall) and centered.
