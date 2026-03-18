# Home Assistant REST Endpoints

## Read and discovery
- `GET /api/`
- `GET /api/config`
- `GET /api/components`
- `GET /api/services`
- `GET /api/states`
- `GET /api/states/<entity_id>`

## History and diagnostics
- `GET /api/history/period/<timestamp>`
- `GET /api/logbook/<timestamp>`
- `GET /api/error_log`

## Templates and validation
- `POST /api/template`
- `POST /api/config/core/check_config`

## Real actions
- `POST /api/services/<domain>/<service>`

## Important warning
`POST /api/states/<entity_id>` updates state representation only.
Do not use it for real device control.
