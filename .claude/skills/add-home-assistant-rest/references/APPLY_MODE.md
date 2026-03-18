# Apply Modes

## read-only
Use only safe reads and reasoning.
Do not call mutating services.

## operate
Allow safe real actions through Home Assistant service calls.
Require confirmation for sensitive actions.

## managed-apply
Use proposal-first workflows for persistent automations and scenes.
Only apply persistent configuration changes if the repository includes a safe managed workflow with validation, backup, and rollback.
