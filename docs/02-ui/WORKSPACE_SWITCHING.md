# Workspace Switching

The workspace switcher is a presentation control.

## Behavior

- Shows only when more than one workspace applies.
- Includes an `Automatic` option that follows the resolver's primary persona.
- Saves explicit selections in an HTTP-only cookie.
- Clears the cookie when Automatic is selected.
- Redirects to the selected workspace default route only after an explicit switch.

## Accessibility

- The switcher has an accessible form label.
- The current workspace is visible in the Top Bar and Sidebar context.
- It is keyboard-operable through a native select and submit button.
- Mobile users can access it from the Top Bar while the navigation sheet remains focus-trapped.

## Security

Workspace selection is validated server-side before persistence. Invalid selections fall back to the dashboard.
