# Safety Rules

## Confirm before mutating sensitive targets
Require explicit user confirmation before actions involving:
- `lock.*`
- `alarm_control_panel.*`
- garage doors or gates under `cover.*`
- whole-home scenes
- broad multi-entity actions
- disabling automations related to security or access control

## Real control vs fake state writes
Never use `POST /api/states/<entity_id>` to simulate real device control.
Always use `POST /api/services/<domain>/<service>` for real-world actions.

## Revalidation before action
Before any mutating action:
1. Revalidate the target entity or scene.
2. Revalidate that the requested service exists.
3. Re-check whether the action is sensitive.

## Secret handling
- Never print `HA_TOKEN`.
- Never include authorization headers in exceptions.
- Redact sensitive values in logs.

## Automation and scene management
For persistent automations and scenes, prefer proposal mode first unless the repository already includes a managed apply workflow with backups and rollback.
