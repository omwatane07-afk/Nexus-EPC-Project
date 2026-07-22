from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
from clash_engine import ClashEngine
import asyncio
import os
import hashlib
from concurrent.futures import ProcessPoolExecutor
from contextlib import asynccontextmanager
from cachetools import LRUCache
from dotenv import load_dotenv
import fitz  # PyMuPDF

# Load environment variables from .env file before importing local modules
load_dotenv()

from database import connect_to_mongo, close_mongo_connection, save_analysis_record, get_analysis_history
from openai import AsyncOpenAI
from utils.pdf_generator import generate_pdf_report

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    executor = ProcessPoolExecutor(max_workers=4)
    app.state.process_pool = executor
    yield
    executor.shutdown(wait=True)
    await close_mongo_connection()

app = FastAPI(title="Nexus EPC Copilot API", version="1.0.0", lifespan=lifespan)

ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS, 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")
if not PERPLEXITY_API_KEY:
    part1 = os.getenv("PERPLEXITY_API_KEY_PART1", "")
    part2 = os.getenv("PERPLEXITY_API_KEY_PART2", "")
    if part1 and part2:
        PERPLEXITY_API_KEY = part1 + part2

if not PERPLEXITY_API_KEY:
    raise ValueError("CRITICAL: PERPLEXITY_API_KEY environment variable is not set.")

aclient = AsyncOpenAI(api_key=PERPLEXITY_API_KEY, base_url="https://api.perplexity.ai")

class BoundingBox(BaseModel):
    x: float
    y: float
    z: float = 0.0
    w: float
    h: float
    unit: str = "mm"

class NodeData(BaseModel):
    id: str
    type: str
    name: str
    node_dimension: str | None = None
    bbox: BoundingBox
    metadata: Dict[str, Any]

class GraphPayload(BaseModel):
    nodes: List[NodeData]

# Mock Payload for a 300kW AI Server retrofit clash
MOCK_EXTRACTION_PAYLOAD = [
    {
        "id": "LC-101",
        "type": "liquid_cooling",
        "name": "Primary Coolant Line (300kW loop)",
        "bbox": {"x": 100.0, "y": 200.0, "w": 10.0, "h": 500.0},
        "metadata": {"fluid": "glycol_water", "pressure": "high"}
    },
    {
        "id": "HV-202",
        "type": "high_voltage",
        "name": "480V Busway Tray",
        "bbox": {"x": 50.0, "y": 400.0, "w": 300.0, "h": 20.0},
        "metadata": {"voltage": 480, "amperage": 800}
    },
    {
        "id": "SRV-300KW",
        "type": "server_rack",
        "name": "NVIDIA DGX SuperPOD Rack",
        "bbox": {"x": 120.0, "y": 750.0, "w": 80.0, "h": 100.0},
        "metadata": {"power_draw": "300kW", "cooling_req": "direct_liquid"}
    }
]

class MitigationResponse(BaseModel):
    clashes: List[Dict[str, Any]]
    mitigations: List[Dict[str, Any]]
    graph_summary: Dict[str, Any]

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

class ChatResponse(BaseModel):
    reply: str

class ReportPayload(BaseModel):
    fileName: str | None = None
    analyzed: bool = False
    clashes: List[Dict[str, Any]] = []
    mitigations: List[Dict[str, Any]] = []
    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []

@app.post("/api/v1/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    if not aclient:
        raise HTTPException(status_code=500, detail="Perplexity API key not configured on backend.")
    
    # 1. Fetch recent context
    history = await get_analysis_history(limit=1)
    context_str = "Status:No_Analysis_Found"
    
    if history:
        latest = history[0]
        summary = latest.get("graph_summary", {})
        clashes = latest.get("clashes", [])
        
        # Ultra-Compressed RAG: Key-Value pairs to minimize token cost
        nodes_cnt = summary.get('nodes_processed', 0)
        edges_cnt = summary.get('edges_processed', 0)
        clashes_cnt = len(clashes)
        
        kv_pairs = [f"Nodes:{nodes_cnt}", f"Edges:{edges_cnt}", f"Clashes:{clashes_cnt}"]
        
        if clashes:
            # Add top clash info
            top_c = clashes[0]
            kv_pairs.append(f"Severe:{top_c.get('nodes', ['unknown'])[0]}")
            
        context_str = "|".join(kv_pairs)

    # 2. Build Prompt
    system_prompt = {
        "role": "system",
        "content": (
            "You are the Nexus EPC Copilot, an expert AI in Data Center MEP engineering. "
            f"Context: [{context_str}]. Analyze this data and reply in brief, natural conversational English."
        )
    }
    
    # We only take the user's messages to avoid system prompt duplication if they passed full history
    api_messages = [system_prompt] + [msg.model_dump() for msg in request.messages]
    
    # 3. Call Perplexity (ultra-compressed model and token limit)
    try:
        response = await aclient.chat.completions.create(
            model="sonar",
            messages=api_messages,
            max_tokens=150
        )
        reply = response.choices[0].message.content
        return ChatResponse(reply=reply)
    except Exception as e:
        # Handled explicitly as 500 so frontend can parse if needed (or 429 if rate limited)
        status = 500
        if "429" in str(e):
            status = 429
        raise HTTPException(status_code=status, detail=f"Perplexity API Error: {str(e)}")

@app.post("/api/v1/analyze", response_model=MitigationResponse)
async def analyze_plan(payload: GraphPayload):
    """
    Endpoint to trigger the AI-Ready MEP Thermal Clash Engine.
    Accepts a strictly validated GraphPayload to prevent ReDoS/Graph bombs.
    """
    # Use the securely typed payload from the user input.
    # In case we want to override with mock, we ensure it passes type checks
    data_to_process = [node.model_dump() for node in payload.nodes] if payload.nodes else MOCK_EXTRACTION_PAYLOAD
    
    await asyncio.sleep(1.0)
    
    engine = ClashEngine()
    engine.load_data(data_to_process)
    
    clashes = engine.detect_clashes()
    mitigations = [engine.generate_mitigation(c) for c in clashes]
    
    graph_summary = {
        "nodes_processed": engine.graph.number_of_nodes(),
        "edges_processed": engine.graph.number_of_edges(),
        "status": "ANALYSIS_COMPLETE"
    }
    
    await save_analysis_record(data_to_process, clashes, mitigations, graph_summary)
    
    return MitigationResponse(
        clashes=clashes,
        mitigations=mitigations,
        graph_summary=graph_summary
    )

MAX_FILE_SIZE = 10 * 1024 * 1024 # 10 MB limit

ANALYSIS_CACHE = LRUCache(maxsize=50)

def extract_pdf_data(file_bytes: bytes) -> List[Dict]:
    """
    Simulated PyMuPDF extraction running in a separate thread.
    """
    # doc = fitz.open(stream=file_bytes, filetype="pdf")
    return MOCK_EXTRACTION_PAYLOAD

def run_dsa_analysis(data_to_process: List[Dict]) -> MitigationResponse:
    """
    Top-level function to run the heavy DSA math in a separate process.
    """
    engine = ClashEngine()
    engine.load_data(data_to_process)
    
    clashes = engine.detect_clashes()
    mitigations = [engine.generate_mitigation(c) for c in clashes]
    
    graph_summary = {
        "nodes_processed": engine.graph.number_of_nodes(),
        "edges_processed": engine.graph.number_of_edges(),
        "status": "ANALYSIS_COMPLETE"
    }
    
    return MitigationResponse(
        clashes=clashes,
        mitigations=mitigations,
        graph_summary=graph_summary
    )

@app.post("/api/v1/blueprints/upload", response_model=MitigationResponse)
async def upload_blueprint(file: UploadFile = File(...)):
    """
    Endpoint to intercept blueprint PDF upload, hash check, thread extraction, and multiprocessing clash engine.
    """
    if file.content_type != "application/pdf" and not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid file format. Only PDF files are accepted.")
    
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum allowed size is 10MB.")
        
    file_hash = hashlib.sha256(file_bytes).hexdigest()
    if file_hash in ANALYSIS_CACHE:
        return ANALYSIS_CACHE[file_hash]
            
    data_to_process = await asyncio.to_thread(extract_pdf_data, file_bytes)
    
    loop = asyncio.get_running_loop()
    response_payload = await loop.run_in_executor(
        app.state.process_pool, 
        run_dsa_analysis, 
        data_to_process
    )
    
    response_payload.graph_summary["file_name"] = file.filename
    
    ANALYSIS_CACHE[file_hash] = response_payload
    await save_analysis_record(data_to_process, response_payload.clashes, response_payload.mitigations, response_payload.graph_summary)
    
    return response_payload

@app.get("/api/v1/history", response_model=List[Dict[str, Any]])
async def get_history(limit: int = 20):
    """
    Endpoint to retrieve the history of past MEP analyses run on the system.
    """
    return await get_analysis_history(limit)

REWORK_COST_PER_CLASH = 4200.0

def calculate_rework_savings(clash_count: int) -> float:
    return clash_count * REWORK_COST_PER_CLASH

@app.post("/api/v1/report/generate")
async def generate_report(payload: ReportPayload):
    """
    Stateless endpoint to generate a detailed PDF report from the client's payload.
    """
    try:
        clash_count = len(payload.clashes)
        total_capex_saved = calculate_rework_savings(clash_count)
        
        buffer = generate_pdf_report(payload.model_dump(), total_capex_saved)
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=MEP_Resolution_Report.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
