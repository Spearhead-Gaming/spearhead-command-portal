# Drawer, Modal, And Dialog Standards

Use drawers, modals, and dialogs according to workflow weight.

## Drawers

Use for:

- Entity inspection
- Review workspace
- Quick edit
- History inspection
- Diagnostics

Requirements:

- Title, subtitle, and status.
- Concise summary before tabs.
- Internal scroll.
- Focus trap and Escape close.
- Mobile full-screen behavior.
- Avoid nested drawers.

## Modals

Use for compact forms and focused actions.

Requirements:

- Header and description.
- Clear close control.
- Viewport-safe internal scroll.
- Predictable action footer.
- No complex multi-step workflow in a small modal.

## Confirmation Dialogs

Use for destructive or high-impact actions.

Requirements:

- State the action and consequence.
- Name the affected entity.
- Use destructive styling for destructive confirmation.
- Cancel is the safe default.

