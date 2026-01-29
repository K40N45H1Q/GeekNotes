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
    No cookies are set. Client must POST to /index to open the page.
    """
    if login == VALID_USERNAME and password == VALID_PASSWORD:
        return JSONResponse({"ok": True, "message": "AUTHORIZED"}, status_code=200)

    return JSONResponse({"ok": False, "message": "ACCESS DENIED!"}, status_code=200)


@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})


@app.post("/index", response_class=HTMLResponse)
async def index_post(request: Request, password: str = Form(...)):
    """
    Render the protected page only when the correct password is POSTed.
    No cookies or sessions are used.
    """
    if password == VALID_PASSWORD:
        return templates.TemplateResponse("index.html", {"request": request})
    return RedirectResponse(url="/")


@app.get("/index")
async def index_get():
    # Disallow GET access to /index — require POST with password every time
    return RedirectResponse(url="/")
