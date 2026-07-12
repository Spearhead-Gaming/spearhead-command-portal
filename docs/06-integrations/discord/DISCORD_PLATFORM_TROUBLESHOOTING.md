# Discord Platform Troubleshooting

| Symptom | Likely Cause | Action |
| --- | --- | --- |
| Slash command not visible | Command not registered or wrong guild scope | Run `npm run discord:commands:register` and confirm `DISCORD_REGISTER_MODE`. |
| Slash command interaction fails | Public endpoint unreachable or public key wrong | Check tunnel/HTTPS URL and `DISCORD_PUBLIC_KEY`. |
| Bot offline | Gateway disabled or worker stopped | Expected for webhook-only mode; start Gateway only for observation features. |
| Message delivery failed | Missing mapping or bot lacks channel permission | Review failed delivery and channel mapping. |
| Role automation failed | Missing Manage Roles or hierarchy issue | Move bot role above target role and retry preview. |
| Application review message missing | Missing `staff-alerts` mapping | Configure review channel mapping. |
| Duplicate member appears | Discord ID linking issue | Use Identity Sync diagnostics and merge exact Discord ID duplicates only. |
| AAR upload continuation failed | Session expired or storage unavailable | Start continuation again and verify storage path. |
