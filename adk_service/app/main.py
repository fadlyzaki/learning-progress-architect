from __future__ import annotations

import os
import json
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field


class ReferencePayload(BaseModel):
    title: str
    url: str
    snippet: str | None = None
    source: str | None = None


class WorkflowTaskPayload(BaseModel):
    title: str
    description: str
    searchQuery: str
    references: list[ReferencePayload] = Field(default_factory=list)


class WorkflowPlanInput(BaseModel):
    goal: str
    level: str
    preferredStyle: str | None = None
    resourceMode: str
    resources: list[dict[str, Any]] = Field(default_factory=list)


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
    resources: list[dict[str, Any]] = Field(default_factory=list)


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


def internal_service_token() -> str:
    token = os.environ.get("INTERNAL_SERVICE_TOKEN", "").strip()
    if not token:
        raise HTTPException(status_code=503, detail="INTERNAL_SERVICE_TOKEN is not configured.")
    return token


@app.middleware("http")
async def require_internal_service_auth(request: Request, call_next):
    if request.url.path == "/healthz":
        return await call_next(request)

    expected_token = os.environ.get("INTERNAL_SERVICE_TOKEN", "").strip()
    if not expected_token:
        return JSONResponse(
            status_code=503,
            content={"detail": "INTERNAL_SERVICE_TOKEN is not configured."},
        )

    token = request.headers.get("x-internal-service-token", "").strip()
    if token != expected_token:
        return JSONResponse(
            status_code=401,
            content={"detail": "Internal service authentication failed."},
        )

    return await call_next(request)


def parse_streamable_http_payload(raw_text: str) -> dict[str, Any]:
    data_lines: list[str] = []
    for line in raw_text.splitlines():
        if line.startswith("data: "):
            data_lines.append(line[6:])

    for line in reversed(data_lines):
        try:
            return json.loads(line)
        except json.JSONDecodeError:
            continue

    raise HTTPException(status_code=502, detail="MCP returned an unreadable event stream response.")


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
        response = await client.post(
            f"{mcp_base_url()}/mcp",
            json=payload,
            headers={
                "Accept": "application/json, text/event-stream",
                "x-internal-service-token": internal_service_token(),
            },
        )
        response.raise_for_status()
        if "text/event-stream" in response.headers.get("content-type", ""):
            data = parse_streamable_http_payload(response.text)
        else:
            data = response.json()
        if "error" in data:
            raise HTTPException(status_code=502, detail=f"MCP tool call failed: {data['error']}")
        return data


def parse_mcp_payload(result: dict[str, Any]) -> Any:
    content = result.get("result", {}).get("content", [])
    if not content:
        return None

    text = content[0].get("text")
    if text is None:
        return None

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return text


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


async def enrich_workflow_references(tasks: list[WorkflowTaskPayload]) -> list[WorkflowTaskPayload]:
    enriched: list[WorkflowTaskPayload] = []
    for task in tasks:
        references: list[ReferencePayload] = []
        try:
            result = await call_mcp_tool(
                "search_learning_resources",
                {"query": task.searchQuery, "maxResults": 3},
            )
            payload = parse_mcp_payload(result) or []
            references = [ReferencePayload(**item) for item in payload]
        except Exception:
            references = []

        enriched.append(
            WorkflowTaskPayload(
                title=task.title,
                description=task.description,
                searchQuery=task.searchQuery,
                references=references,
            )
        )

    return enriched


def merge_quick_action_context(
    request: QuickActionRequest,
    task_context_payload: dict[str, Any] | None,
) -> QuickActionRequest:
    if not task_context_payload:
        return request

    task = task_context_payload.get("task") or {}
    goal = task_context_payload.get("goal") or {}
    resources = task_context_payload.get("resources") or []

    return QuickActionRequest(
        input=QuickActionInput(
            action=request.input.action,
            context=QuickActionContext(
                taskTitle=task.get("title") or request.input.context.taskTitle,
                taskDescription=task.get("description") or request.input.context.taskDescription,
                goalTitle=goal.get("title") or request.input.context.goalTitle,
                resources=resources if isinstance(resources, list) else request.input.context.resources,
            ),
        ),
        context=request.context,
    )


@app.get("/healthz")
async def healthcheck():
    return {"ok": True}


@app.post("/workflow/plan")
async def workflow_plan(request: WorkflowPlanRequest):
    tasks = fallback_workflow_plan(request)
    return await enrich_workflow_references(tasks)


@app.post("/study-coach/quick-action")
async def study_coach_quick_action(request: QuickActionRequest):
    cached_result = await call_mcp_tool(
        "get_cached_quick_action",
        {
            "userId": request.context.user["id"],
            "taskId": request.context.task["id"],
            "action": request.input.action,
        },
    )
    cached_payload = parse_mcp_payload(cached_result) or {}
    cached_quick_action = cached_payload.get("quickAction")
    if cached_quick_action:
        return {
            "content": cached_quick_action["content"],
            "source": "cache",
            "updatedAt": cached_quick_action.get("updated_at"),
            "persisted": True,
        }

    task_context_result = await call_mcp_tool(
        "get_task_context",
        {
            "userId": request.context.user["id"],
            "taskId": request.context.task["id"],
        },
    )
    task_context_payload = parse_mcp_payload(task_context_result)
    hydrated_request = merge_quick_action_context(request, task_context_payload)

    content = fallback_quick_action(hydrated_request)

    saved_result = await call_mcp_tool(
        "save_quick_action",
        {
            "userId": request.context.user["id"],
            "taskId": request.context.task["id"],
            "action": request.input.action,
            "content": content,
        },
    )
    saved_payload = parse_mcp_payload(saved_result) or {}
    return {
        "content": content,
        "source": "generated",
        "updatedAt": saved_payload.get("updated_at"),
        "persisted": True,
    }
