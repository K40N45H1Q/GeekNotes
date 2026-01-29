from fastapi import FastAPI, Request, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
import os

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
templates_path = os.path.join(BASE_DIR, "../templates")
templates = Jinja2Templates(directory=templates_path)

static_path = os.path.join(BASE_DIR, "../assets")
app.mount("/assets", StaticFiles(directory=static_path), name="assets")

VALID_USERNAME = "admin"
VALID_PASSWORD = "secret"


@app.post("/login")
async def login_api(login: str = Form(...), password: str = Form(...)):
    """
    Validate credentials and return JSON.
    """
    if login == VALID_USERNAME and password == VALID_PASSWORD:
        return JSONResponse({"ok": True, "message": "AUTHORIZED"}, status_code=200)

    return JSONResponse({"ok": False, "message": "ACCESS DENIED!"}, status_code=200)


@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})


@app.post("/chat", response_class=HTMLResponse)
async def chat_post(request: Request, password: str = Form(...)):
    """
    Render protected page only when correct password is POSTed.
    """
    if password == VALID_PASSWORD:
        return templates.TemplateResponse("chat.html", {"request": request})

    return RedirectResponse(url="/", status_code=302)


@app.get("/chat")
async def chat_get():
    """
    Disallow GET access to /chat — always redirect to root.
    """
    return RedirectResponse(url="/", status_code=302)