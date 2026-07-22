import os
import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Dict, Any, List

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/nexusepc")

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def connect_to_mongo():
    db_instance.client = AsyncIOMotorClient(MONGO_URI)
    # Extract database name from connection string URI
    path_part = MONGO_URI.split("//")[-1]
    if "/" in path_part:
        db_name = path_part.split("/")[-1]
        if "?" in db_name:
            db_name = db_name.split("?")[0]
    else:
        db_name = "nexusepc"
    
    if not db_name:
        db_name = "nexusepc"
        
    db_instance.db = db_instance.client[db_name]
    print(f"Connected to MongoDB: {MONGO_URI} (DB: {db_name})")

async def close_mongo_connection():
    if db_instance.client:
        db_instance.client.close()
        print("MongoDB connection closed.")

async def save_analysis_record(payload: List[Dict[str, Any]], clashes: List[Dict[str, Any]], mitigations: List[Dict[str, Any]], graph_summary: Dict[str, Any]):
    if db_instance.db is None:
        return None
    
    record = {
        "timestamp": datetime.datetime.utcnow(),
        "input_payload": payload,
        "clashes": clashes,
        "mitigations": mitigations,
        "graph_summary": graph_summary
    }
    
    try:
        result = await db_instance.db.analyses.insert_one(record)
        return str(result.inserted_id)
    except Exception as e:
        print(f"Warning: Failed to save analysis to MongoDB (Is it running?). Error: {e}")
        return None

async def get_analysis_history(limit: int = 20) -> List[Dict[str, Any]]:
    if db_instance.db is None:
        return []
    
    try:
        cursor = db_instance.db.analyses.find().sort("timestamp", -1).limit(limit)
        history = []
        async for document in cursor:
            document["_id"] = str(document["_id"])
            if isinstance(document.get("timestamp"), datetime.datetime):
                document["timestamp"] = document["timestamp"].isoformat()
            history.append(document)
        return history
    except Exception as e:
        print(f"Warning: Failed to fetch history from MongoDB (Is it running?). Error: {e}")
        return []
