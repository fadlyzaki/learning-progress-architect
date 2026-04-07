from __future__ import annotations

import os
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


class ReferencePayload(BaseModel):
    title: str
    url: str
    snippet: str | None = None
    source: str | None = None


class WorkflowTaskPayload(BaseModel):
    title: str
    description: str
    searchQuery: str
    references: list[ReferencePayload] = []


class WorkflowPlanInput(BaseModel):
    goal: str
    level: str
    preferredStyle: str | None = None
    resourceMode: str
    resources: list[dict[str, Any]] = []


class WorkflowRequestContext(BaseModel):
    user: dict[str, Any]
    requestId: str


class WorkflowPlanRequest(BaseModel):
    input: WorkflowPlanInput
    context: WorkflowRequestContext


class QuickActionContext(BaseModel):
    taskTitle: str
    taskDescription: str
    goalTitle: str | None = None
    resources: list[dict[str, Any]] = []


class QuickActionInput(BaseModel):
    action: str
    context: QuickActionContext


class QuickActionRequestContext(BaseModel):
    user: dict[str, Any]
    task: dict[str, Any]
    requestId: str


class QuickActionRequest(BaseModel):
    input: QuickActionInput
    context: QuickActionRequestContext


app = FastAPI(title="Learning Progress Architect ADK Service")


def mcp_base_url() -> str:
    return os.environ.get("MCP_BASE_URL", "http://127.0.0.1:3101")


async def call_mcp_tool(name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    # This is a lightweight MCP-over-HTTP bridge for the internal tool layer.
    # It is intentionally simple for v1 so the Express app remains the trusted
    # source of business rules and persistence.
    payload = {
        "jsonrpc": "2.0",
        "id": "adk-tool-call",
        "method": "tools/call",
        "params": {
            "name": name,
            "arguments": arguments,
        },
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(f"{mcp_base_url()}/mcp", json=payload)
        response.raise_for_status()
        data = response.json()
        if "error" in data:
          raise HTTPException(status_code=502, detail=f"MCP tool call failed: {data['error']}")
        return data


def fallback_workflow_plan(request: WorkflowPlanRequest) -> list[WorkflowTaskPayload]:
    goal = request.input.goal
    return [
        WorkflowTaskPayload(
            title=f"Foundations of {goal}",
            description=f"Build the core mental model, vocabulary, and first principles for {goal}.",
            searchQuery=f"{goal} fundamentals documentation tutorial",
        ),
        WorkflowTaskPayload(
            title=f"Guided practice for {goal}",
            description=f"Use focused exercises to turn the core ideas of {goal} into repeatable habits.",
            searchQuery=f"{goal} exercises documentation example",
        ),
        WorkflowTaskPayload(
            title=f"Applied project for {goal}",
            description=f"Create one practical outcome that proves you can apply {goal} beyond passive study.",
            searchQuery=f"{goal} project example tutorial",
        ),
    ]


def fallback_quick_action(request: QuickActionRequest) -> str:
    task_title = request.input.context.taskTitle
    action = request.input.action
    if action == "example":
        return f"A practical example of {task_title}: imagine a real team using it in production to make work more reliable and easier to scale."
    if action == "analogy":
        return f"Think of {task_title} like a well-organized kitchen: the structure helps you find the right tool quickly and repeat the same recipe with less confusion."
    if action == "confused":
        return f"First, {task_title} is the main idea you are learning. Then, it helps you do one job more clearly. Finally, you use it again and again until it feels natural."
    return f"{task_title} is the concept for this step. Its purpose is to help the learner understand what problem this task solves and why it matters."


@app.get("/healthz")
async def healthcheck():
    return {"ok": True}


@app.post("/workflow/plan")
async def workflow_plan(request: WorkflowPlanRequest):
    # The Python ADK service is scaffolded as the future reasoning layer.
    # In this repo version we keep a deterministic fallback so the endpoint
    # remains usable even before full ADK orchestration is wired.
    return fallback_workflow_plan(request)


@app.post("/study-coach/quick-action")
async def study_coach_quick_action(request: QuickActionRequest):
    return {"content": fallback_quick_action(request)}
