# app.py
from fastapi import FastAPI, Request, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
import os
import json

app = FastAPI()

origins = [
    "http://127.0.0.1:5500",
    "http://localhost:8000",
    "http://127.0.0.1:8000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "../templates"))
app.mount("/assets", StaticFiles(directory=os.path.join(BASE_DIR, "../assets")), name="assets")

# Два пользователя с одним паролем "secret"
VALID_USERS = {
    "admin": "secret",
    "user": "secret"
}

# История чата в памяти: список объектов {"user": "...", "text": "..."}
CHAT_HISTORY: list[dict] = []
MAX_HISTORY = 500

@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.post("/login")
async def login_api(request: Request, login: str = Form(None), password: str = Form(None)):
    form_data = {}
    try:
        form_data = dict(await request.form())
    except Exception:
        form_data = {}

    if not form_data:
        try:
            json_body = await request.json()
            if isinstance(json_body, dict):
                form_data = json_body
        except Exception:
            form_data = {}

    login_val = form_data.get("login") or login
    password_val = form_data.get("password") or password

    print("LOGIN CHECK:", {"login": login_val, "has_password": bool(password_val)})

    if login_val and password_val and login_val in VALID_USERS and VALID_USERS[login_val] == password_val:
        return JSONResponse({"ok": True})
    return JSONResponse({"ok": False})

@app.post("/chat", response_class=HTMLResponse)
async def chat_post(request: Request):
    form = {}
    try:
        form = dict(await request.form())
    except Exception:
        form = {}

    if not form:
        try:
            json_body = await request.json()
            if isinstance(json_body, dict):
                form = json_body
        except Exception:
            form = {}

    print("CHAT RAW FORM/JSON:", form)

    login = form.get("login")
    password = form.get("password")

    if login and password and login in VALID_USERS and password == VALID_USERS[login]:
        history = CHAT_HISTORY[-MAX_HISTORY:]
        return templates.TemplateResponse("chat.html", {"request": request, "username": login, "messages": history})

    return RedirectResponse("/", status_code=302)

@app.get("/chat")
async def chat_get():
    return RedirectResponse("/", 302)

# ---------- WEBSOCKET CHAT ----------
# Храним список подключений и маппинг WebSocket -> username
connections: list[WebSocket] = []
ws_user_map: dict[str, str] = {}  # key: id(ws) or str(ws) -> username

def ws_key(ws: WebSocket) -> str:
    # уникальный ключ для ws (строка)
    return str(id(ws))

async def broadcast(obj: dict):
    payload = json.dumps(obj)
    for conn in list(connections):
        try:
            await conn.send_text(payload)
        except Exception:
            pass

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    connections.append(ws)
    key = ws_key(ws)
    ws_user_map[key] = None  # пока неизвестно имя

    try:
        while True:
            data = await ws.receive_text()
            try:
                message = json.loads(data)
            except json.JSONDecodeError:
                continue

            # Ожидаем сообщения с полем type:
            # type: "join" -> клиент сообщает своё имя при подключении
            # type: "message" (или отсутствие type) -> обычное сообщение
            mtype = message.get("type")
            if mtype == "join":
                # клиент сообщает имя: создаём одно системное уведомление и сохраняем username
                name = message.get("user") or "unknown"
                ws_user_map[key] = name
                notice = {"user": "SYSTEM", "text": f" {name.upper()} CONNECTED!"}
                CHAT_HISTORY.append(notice)
                if len(CHAT_HISTORY) > MAX_HISTORY:
                    del CHAT_HISTORY[0: len(CHAT_HISTORY) - MAX_HISTORY]
                await broadcast(notice)
                continue

            # Обычное сообщение
            user = message.get("user") or ws_user_map.get(key) or "unknown"
            text = message.get("text", "")
            entry = {"user": user, "text": text}
            CHAT_HISTORY.append(entry)
            if len(CHAT_HISTORY) > MAX_HISTORY:
                del CHAT_HISTORY[0: len(CHAT_HISTORY) - MAX_HISTORY]
            await broadcast(entry)

    except WebSocketDisconnect:
        try:
            connections.remove(ws)
        except ValueError:
            pass
        # при отключении используем сохранённое имя, если есть
        name = ws_user_map.get(key) or "unknown"
        try:
            del ws_user_map[key]
        except KeyError:
            pass
        disconnect_notice = {"user": "SYSTEM", "text": f"{name.upper()} DISCONNECTED!"}
        CHAT_HISTORY.append(disconnect_notice)
        if len(CHAT_HISTORY) > MAX_HISTORY:
            del CHAT_HISTORY[0: len(CHAT_HISTORY) - MAX_HISTORY]
        await broadcast(disconnect_notice)
    except Exception:
        try:
            connections.remove(ws)
        except Exception:
            pass
        try:
            del ws_user_map[key]
        except Exception:
            pass