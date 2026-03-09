# Spec Section UI Improvements

## Changes Made

### 1. Collapsible Section Summaries
Each spec section (Requirements, Design, Tasks) now shows a 2-3 line summary when collapsed:

- **Requirements**: Shows count of requirement categories and total items
  - Example: "3 requirement categories with 12 total items"
  
- **Design**: Shows what's included in the design
  - Example: "Includes architecture, data model, 5 API endpoints, 8 UI components"
  
- **Tasks**: Shows task breakdown by status
  - Example: "10 total tasks: 3 completed, 2 in progress, 5 pending"

### 2. Status Icons
Each section now displays a status icon on the right side:

- **Green checkmark** (CheckCircle2): Section has content
- **Gray circle** (Circle): Section is empty/not generated yet

### 3. Progress Calculation Update
The overall progress bar now reflects **task completion** instead of requirements/design approval:

- Calculates: `(completed tasks / total tasks) * 100`
- Shows task count below progress bar: "3 of 10 tasks completed"
- More accurate representation of actual implementation progress

## Files Modified

1. **app/(dashboard)/specs/[specId]/spec-sections.tsx**
   - Added summary generation functions for each section type
   - Added status icon logic (hasRequirements, hasDesign, hasTasks)
   - Passed summary and statusIcon props to CollapsibleSection

2. **components/ui/collapsible-section.tsx**
   - Added `summary` prop (string)
   - Added `statusIcon` prop (ReactNode)
   - Updated UI to show summary when collapsed, description when expanded
   - Status icon displays on the right side with badge

3. **app/(dashboard)/specs/[specId]/page.tsx**
   - Added `taskProgress` calculation based on completed tasks
   - Updated progress card to use `taskProgress` instead of `spec.progress`
   - Added task completion count display

## Visual Changes

### Collapsed State
```
┌─────────────────────────────────────────────────────┐
│ ▶ Requirements                              ✓       │
│   3 requirement categories with 12 total items      │
└─────────────────────────────────────────────────────┘
```

### Expanded State
```
┌─────────────────────────────────────────────────────┐
│ ▼ Requirements                              ✓       │
│   Functional and technical requirements             │
│                                                     │
│   [Full requirements content here]                  │
└─────────────────────────────────────────────────────┘
```

### Progress Bar
```
┌─────────────────────────────────────────────────────┐
│ Overall Progress                            30%     │
│ ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       │
│ 3 of 10 tasks completed                             │
└─────────────────────────────────────────────────────┘
```

## Benefits

1. **Better Information Density**: Users can see key info without expanding sections
2. **Clear Status Indicators**: Visual feedback on which sections are complete
3. **Accurate Progress**: Progress reflects actual work done (tasks) not just planning phases
4. **Improved UX**: Less clicking needed to understand spec status

---

## Specs List Page Enhancement

### Change Made

Added compact phase completion indicators to the specs list page (`/specs`).

### Visual Layout

Each spec card now shows a compact status row with three indicators:

```
┌─────────────────────────────────────────────────────┐
│ 📄 Spec Title                                       │
│ Description text here...                            │
│                                                     │
│ ✓ Requirements  ✓ Design  ○ Tasks                  │
│ 📁 Project Name • 🕐 Updated 2 hours ago           │
└─────────────────────────────────────────────────────┘
```

### Status Indicators

- **✓ Green checkmark**: Phase is complete (has content)
- **○ Gray circle**: Phase is incomplete (no content)

Shows status for:
1. **Requirements**: Checks if `spec.requirements` exists and has keys
2. **Design**: Checks if `spec.design` exists
3. **Tasks**: Checks if `spec.tasksDoc` exists or `spec.taskCount > 0`

### File Modified

- **app/(dashboard)/specs/page.tsx**
  - Added `CheckCircle2` and `Circle` icon imports
  - Added compact phase indicators between description and metadata
  - Uses same icon pattern as spec detail page for consistency

### Design Principles

- **Compact**: Uses small icons (3.5x3.5) and text-xs sizing
- **Consistent**: Same icons as spec detail page
- **Scannable**: Easy to see at a glance which specs are ready
- **Non-intrusive**: Doesn't add significant vertical space
