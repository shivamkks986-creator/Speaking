from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import PlainTextResponse, HTMLResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

from ai_routes import router as ai_router
from system_routes import router as system_router

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

api_router.include_router(ai_router)
api_router.include_router(system_router)


# ---------------------------------------------------------------------------
# Fix-file delivery endpoint
# Serves the latest SpeakMateAI UI-fix source files so the local Windows
# PowerShell build script can `Invoke-WebRequest` the freshest copies without
# needing the user to git-pull. Each file is mapped to a short safe key so the
# server never exposes arbitrary filesystem paths.
# ---------------------------------------------------------------------------
SPEAKMATE_ROOT = Path("/app/SpeakMateAI")
FIX_FILES = {
    "app.json":                   SPEAKMATE_ROOT / "app.json",
    "package.json":               SPEAKMATE_ROOT / "package.json",
    "App.tsx":                    SPEAKMATE_ROOT / "App.tsx",
    "AuthContext.tsx":            SPEAKMATE_ROOT / "src/contexts/AuthContext.tsx",
    "withAndroidBuildFixes.js":   SPEAKMATE_ROOT / "plugins/withAndroidBuildFixes.js",
    "useScreenInsets.ts":         SPEAKMATE_ROOT / "src/hooks/useScreenInsets.ts",
    "aiService.ts":               SPEAKMATE_ROOT / "src/services/aiService.ts",
    "adsService.ts":              SPEAKMATE_ROOT / "src/services/adsService.ts",
    "billingService.ts":          SPEAKMATE_ROOT / "src/services/billingService.ts",
    "usageService.ts":            SPEAKMATE_ROOT / "src/services/usageService.ts",
    "UsageIndicator.tsx":         SPEAKMATE_ROOT / "src/components/common/UsageIndicator.tsx",
    "AdBanner.tsx":               SPEAKMATE_ROOT / "src/components/common/AdBanner.tsx",
    "LimitReachedModal.tsx":      SPEAKMATE_ROOT / "src/components/common/LimitReachedModal.tsx",
    "EvaluatingProgress.tsx":     SPEAKMATE_ROOT / "src/components/common/EvaluatingProgress.tsx",
    "ScreenContainer.tsx":        SPEAKMATE_ROOT / "src/components/common/ScreenContainer.tsx",
    "HomeScreen.tsx":             SPEAKMATE_ROOT / "src/screens/home/HomeScreen.tsx",
    "AITutorScreen.tsx":          SPEAKMATE_ROOT / "src/screens/tutor/AITutorScreen.tsx",
    "SpeakingPracticeScreen.tsx": SPEAKMATE_ROOT / "src/screens/speaking/SpeakingPracticeScreen.tsx",
    "InterviewCoachScreen.tsx":   SPEAKMATE_ROOT / "src/screens/interview/InterviewCoachScreen.tsx",
    "InterviewSessionScreen.tsx": SPEAKMATE_ROOT / "src/screens/interview/InterviewSessionScreen.tsx",
    "LiveInterviewScreen.tsx":    SPEAKMATE_ROOT / "src/screens/interview/LiveInterviewScreen.tsx",
    "PremiumScreen.tsx":          SPEAKMATE_ROOT / "src/screens/premium/PremiumScreen.tsx",
    "ResumeUploadScreen.tsx":     SPEAKMATE_ROOT / "src/screens/resume/ResumeUploadScreen.tsx",
    "ResumeInterviewScreen.tsx":  SPEAKMATE_ROOT / "src/screens/resume/ResumeInterviewScreen.tsx",
    "RoadmapScreen.tsx":          SPEAKMATE_ROOT / "src/screens/roadmap/RoadmapScreen.tsx",
    "CompanionsScreen.tsx":       SPEAKMATE_ROOT / "src/screens/companions/CompanionsScreen.tsx",
    "TmayTrainerScreen.tsx":      SPEAKMATE_ROOT / "src/screens/tmay/TmayTrainerScreen.tsx",
    "FlashcardsScreen.tsx":       SPEAKMATE_ROOT / "src/screens/vocabulary/FlashcardsScreen.tsx",
    "fix-overlap-and-build.ps1":  SPEAKMATE_ROOT / "fix-overlap-and-build.ps1",
    "push-ota-update.ps1":        SPEAKMATE_ROOT / "push-ota-update.ps1",
    "sync-ui-fix.ps1":            SPEAKMATE_ROOT / "sync-ui-fix.ps1",
    "auto-sync.ps1":              SPEAKMATE_ROOT / "auto-sync.ps1",
    "build-aab.ps1":              SPEAKMATE_ROOT / "build-aab.ps1",
    "SpeakMate-Sync.cmd":         SPEAKMATE_ROOT / "SpeakMate-Sync.cmd",
    "git-pull.ps1":               SPEAKMATE_ROOT / "git-pull.ps1",
}


@api_router.get("/fix-files/{name}", response_class=PlainTextResponse)
async def get_fix_file(name: str):
    """Serve a whitelisted SpeakMate source file as plain UTF-8 text.

    PowerShell files get a UTF-8 BOM so Windows PowerShell 5.1 parses them
    correctly (otherwise non-ASCII chars get mis-read as Windows-1252).
    """
    path = FIX_FILES.get(name)
    if path is None:
        raise HTTPException(status_code=404, detail=f"Unknown fix file: {name}")
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"File missing on server: {name}")
    text = path.read_text(encoding="utf-8")
    if name.endswith(".ps1"):
        # Prepend UTF-8 BOM so Windows PowerShell 5.1 reads the file as UTF-8.
        text = "\ufeff" + text
    return text


@api_router.get("/fix-files")
async def list_fix_files():
    """List all available fix files (handy debug endpoint)."""
    return {"files": sorted(FIX_FILES.keys())}


# ---------------------------------------------------------------------------
# Legal pages (Play Store compliance): Privacy Policy + Data Deletion
# Served as HTML at stable URLs so Play Console can reference them.
# ---------------------------------------------------------------------------
LEGAL_DIR = Path(__file__).parent / "legal"


@api_router.get("/legal/privacy", response_class=HTMLResponse)
@api_router.get("/legal/privacy-policy", response_class=HTMLResponse)
async def privacy_policy():
    path = LEGAL_DIR / "privacy-policy.html"
    if not path.exists():
        raise HTTPException(status_code=404, detail="privacy_policy_missing")
    return HTMLResponse(path.read_text(encoding="utf-8"))


@api_router.get("/legal/data-deletion", response_class=HTMLResponse)
@api_router.get("/legal/delete-account", response_class=HTMLResponse)
async def data_deletion():
    path = LEGAL_DIR / "data-deletion.html"
    if not path.exists():
        raise HTTPException(status_code=404, detail="data_deletion_missing")
    return HTMLResponse(path.read_text(encoding="utf-8"))


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()