# Component Usage Rules

## 1. Prefer Reuse

Do not create a new component if an existing component can support the use case.

## 2. Prefer Inspector Drawers for Object Details

Use InspectorDrawer for:

- viewing a member from roster
- viewing a campaign from dashboard
- viewing qualification details
- viewing event details

Use full pages only for workspaces.

## 3. Keep Tables Focused

A table should not try to show every field.

If extra information is needed, open a drawer.

## 4. Use Badges Consistently

Statuses must look consistent across the app.

Do not create one-off badge colors.

## 5. Actions Must Be Predictable

Primary actions belong in the page header, drawer header, or quick action bar.

Secondary actions belong in the action menu.

## 6. Empty States Must Be Useful

Every empty state should explain:

- what this area is for
- why it is empty
- what the user can do next

## 7. Loading Should Feel Smooth

Use skeletons for:

- dashboards
- tables
- profile drawers
- campaign pages

## 8. Permission-Aware, Not Permission-Trusted

Components may hide or disable actions based on permissions.

Server-side permission checks remain mandatory.

## 9. Mobile Must Be Usable

Tables should convert to cards or simplified lists on small screens.

Drawers should become full-screen sheets on mobile.

## 10. Discord Should Be Visible but Not Distracting

Show Discord status where relevant.

Do not make every page feel like a bot control panel.
