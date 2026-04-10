"""WebSocket gateway — v1 protocol in doc/specs/websocket-protocol.md."""

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.core.config import get_settings
from app.core.security import decode_token

router = APIRouter()


async def _reject_ws(websocket: WebSocket, *, reason: str) -> None:
    """Accept then close with 4401 so the client gets a proper WS close (not HTTP 403).

    Starlette/Uvicorn reject the upgrade with 403 if ``close()`` runs before ``accept()``.
    """
    await websocket.accept()
    await websocket.close(code=4401, reason=reason)


@router.websocket("/ws")
async def websocket_v1(
    websocket: WebSocket,
    token: str | None = Query(default=None, description="Access JWT"),
) -> None:
    settings = get_settings()
    if not token:
        await _reject_ws(websocket, reason="missing_token")
        return
    try:
        decode_token(settings, token, "access")
    except ValueError:
        await _reject_ws(websocket, reason="invalid_token")
        return

    await websocket.accept()
    await websocket.send_json({"type": "connected", "protocol": "dashflow-ws-v1"})
    try:
        while True:
            data = await websocket.receive_json()
            await websocket.send_json({"type": "echo", "payload": data})
    except WebSocketDisconnect:
        pass
