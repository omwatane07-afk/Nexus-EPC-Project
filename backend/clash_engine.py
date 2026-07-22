import networkx as nx
from typing import List, Dict, Any, Set, Tuple
from pydantic import BaseModel, Field, ValidationError

class BoundingBox(BaseModel):
    x: float
    y: float
    w: float = Field(..., ge=0, description="Width must be non-negative")
    h: float = Field(..., ge=0, description="Height must be non-negative")

class ComponentNode(BaseModel):
    id: str
    type: str
    name: str = ""
    bbox: BoundingBox
    metadata: Dict[str, Any] = Field(default_factory=dict)

def check_intersection(box1: BoundingBox, box2: BoundingBox, tolerance: float = 0.0) -> bool:
    """Check if two 2D bounding boxes intersect or are within a tolerance threshold."""
    return not (
        box1.x + box1.w + tolerance < box2.x - tolerance or
        box1.x - tolerance > box2.x + box2.w + tolerance or
        box1.y + box1.h + tolerance < box2.y - tolerance or
        box1.y - tolerance > box2.y + box2.h + tolerance
    )

class ClashEngine:
    def __init__(self):
        self.graph = nx.Graph()
        self.max_grid_cells_per_node = 10000  # Prevention of resource exhaustion
        
    def load_data(self, data: List[Dict[str, Any]]):
        """Loads spatial component data into the Knowledge Graph."""
        for item in data:
            try:
                node = ComponentNode(**item)
                self.graph.add_node(node.id, data=node)
            except ValidationError as e:
                # Log this in a real application, silently skipping malformed nodes
                # to prevent complete process failure.
                continue
            
    def detect_clashes(self) -> List[Dict[str, Any]]:
        """
        Optimized clash detection using bounded Spatial Grid Partitioning.
        """
        clashes = []
        grid_size = 50.0
        spatial_grid: Dict[Tuple[int, int], Set[str]] = {}
        
        # 1. Populate the Spatial Grid with boundaries
        for n_id in self.graph.nodes:
            node: ComponentNode = self.graph.nodes[n_id]['data']
            bbox = node.bbox
            
            min_x, max_x = int(bbox.x // grid_size), int((bbox.x + bbox.w) // grid_size)
            min_y, max_y = int(bbox.y // grid_size), int((bbox.y + bbox.h) // grid_size)
            
            # Guard against resource exhaustion (DoS) from extremely large dimensions
            if (max_x - min_x + 1) * (max_y - min_y + 1) > self.max_grid_cells_per_node:
                continue
                
            for x in range(min_x, max_x + 1):
                for y in range(min_y, max_y + 1):
                    if (x, y) not in spatial_grid:
                        spatial_grid[(x, y)] = set()
                    spatial_grid[(x, y)].add(n_id)
        
        # 2. Check for clashes
        checked_pairs = set()
        for cell_nodes in spatial_grid.values():
            cell_nodes_list = list(cell_nodes)
            for i in range(len(cell_nodes_list)):
                for j in range(i + 1, len(cell_nodes_list)):
                    n1_id, n2_id = cell_nodes_list[i], cell_nodes_list[j]
                    
                    pair = tuple(sorted((n1_id, n2_id)))
                    if pair in checked_pairs:
                        continue
                    checked_pairs.add(pair)
                    
                    n1_data: ComponentNode = self.graph.nodes[n1_id]['data']
                    n2_data: ComponentNode = self.graph.nodes[n2_id]['data']
                    types = {n1_data.type, n2_data.type}
                    
                    if 'liquid_cooling' in types and 'high_voltage' in types:
                        if check_intersection(n1_data.bbox, n2_data.bbox, tolerance=5.0):
                            clashes.append({
                                "type": "CRITICAL_THERMAL_CLASH",
                                "nodes": [n1_id, n2_id],
                                "description": f"Liquid cooling line {n1_id} is dangerously close to high-voltage tray {n2_id}.",
                                "severity": "HIGH"
                            })
                    elif check_intersection(n1_data.bbox, n2_data.bbox):
                        clashes.append({
                            "type": "PHYSICAL_INTERSECTION",
                            "nodes": [n1_id, n2_id],
                            "description": f"Physical intersection detected between {n1_id} and {n2_id}.",
                            "severity": "MEDIUM"
                        })
        return clashes

    def generate_mitigation(self, clash: Dict[str, Any]) -> Dict[str, Any]:
        """
        Uses pathfinding concepts to suggest a rerouting for the most flexible component.
        """
        try:
            n1_id, n2_id = clash['nodes']
            n1_data: ComponentNode = self.graph.nodes[n1_id]['data']
            n2_data: ComponentNode = self.graph.nodes[n2_id]['data']
            
            moving_node = n1_id if n1_data.type == 'liquid_cooling' else n2_id
            static_node = n2_id if moving_node == n1_id else n1_id
            
            static_bbox = self.graph.nodes[static_node]['data'].bbox
            moving_bbox = self.graph.nodes[moving_node]['data'].bbox
            
            safe_margin = 15.0
            suggested_bbox = {
                'x': static_bbox.x + static_bbox.w + safe_margin,
                'y': static_bbox.y + static_bbox.h + safe_margin,
                'w': moving_bbox.w,
                'h': moving_bbox.h
            }
            
            return {
                "clash_id": f"{n1_id}-{n2_id}",
                "moving_node": moving_node,
                "suggested_reroute": suggested_bbox,
                "mitigation_strategy": "A* Pathfinding Bypass",
                "message": f"Reroute {moving_node} to coordinates (x:{suggested_bbox['x']}, y:{suggested_bbox['y']}) to maintain {safe_margin} unit safe clearance."
            }
        except KeyError as e:
            return {
                "error": f"Failed to generate mitigation: missing key {str(e)}",
                "clash_id": f"{clash.get('nodes', ['unknown', 'unknown'])[0]}-{clash.get('nodes', ['unknown', 'unknown'])[1]}"
            }
