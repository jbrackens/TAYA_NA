from dataclasses import dataclass
from typing import List, Optional


@dataclass
class HealthCheckStatusRow:
    name: str
    status: bool
    details: Optional[str]


@dataclass
class HealthCheckStatus:
    details: List[HealthCheckStatusRow]
