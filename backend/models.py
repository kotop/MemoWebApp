from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid

class Tag(BaseModel):
    name: str
    color: Optional[str] = None

class Note(BaseModel):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    content: str
    folder_id: Optional[str] = None
    parent_id: Optional[str] = None
    tags: List[Tag] = []
    date_added: Optional[str] = Field(default_factory=lambda: datetime.now().isoformat())

class Folder(BaseModel):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    parent_id: Optional[str] = None
    color: Optional[str] = None
    position: int = 0

class GraphNode(BaseModel):
    id: str
    name: str
    color: str = "#1E90FF"
    folder_id: Optional[str] = None

class GraphEdge(BaseModel):
    source: str
    target: str
    relation: str  # "parent" или "tag"
    color: str = "#888888"
    tag: Optional[str] = None

class GraphData(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]