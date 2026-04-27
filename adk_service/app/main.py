from __future__ import annotations

import os
import json
import re
from typing import Any

import httpx
from google import genai
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
    locale: str | None = None


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
    locale: str | None = None


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

DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"


def mcp_base_url() -> str:
    return os.environ.get("MCP_BASE_URL", "http://127.0.0.1:3101")


def internal_service_token() -> str:
    token = os.environ.get("INTERNAL_SERVICE_TOKEN", "").strip()
    if not token:
        raise HTTPException(status_code=503, detail="INTERNAL_SERVICE_TOKEN is not configured.")
    return token


def gemini_api_key() -> str:
    return os.environ.get("GEMINI_API_KEY", "").strip()


def gemini_client() -> genai.Client | None:
    api_key = gemini_api_key()
    if not api_key:
        return None

    return genai.Client(api_key=api_key)


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


def normalize_model_text(text: str) -> str:
    return (
        text.replace("\r\n", "\n")
        .removeprefix("```json")
        .removeprefix("```")
        .removesuffix("```")
        .strip()
    )


def humanize_level(level: str) -> str:
    normalized = level.strip().lower()
    if normalized in {"beginner", "intro"}:
        return "beginner"
    if normalized in {"advanced", "expert"}:
        return "advanced"
    return "intermediate"


def style_hint(preferred_style: str | None) -> str:
    if not preferred_style:
        return "Use a balanced mix of explanation and application."
    return f"Lean into this study preference: {preferred_style.strip()}."


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


def build_workflow_prompt(request: WorkflowPlanRequest) -> str:
    resource_context = "\n".join(
        [
            f"{index + 1}. [{resource.get('type', 'other')}] {resource.get('title', 'Untitled')}"
            + (
                f" | Ref: {resource.get('reference')}"
                if resource.get("reference")
                else ""
            )
            + (
                f" | Notes: {resource.get('notes')}"
                if resource.get("notes")
                else ""
            )
            for index, resource in enumerate(request.input.resources)
        ]
    )

    if not resource_context:
        resource_context = "No learner-supplied materials yet. Build a self-starting beginner-friendly path."

    return f"""
You are an expert curriculum architect for ambitious self-directed learners.

Create exactly 3 study tasks for this learner:
- Goal: {request.input.goal}
- Current level: {request.input.level}
- Preferred study style: {request.input.preferredStyle or "Mixed"}
- Resource mode: {request.input.resourceMode}
- Available resources:
{resource_context}

Requirements:
- Each task must sound concrete, useful, and motivating.
- Avoid generic labels like "Foundations of X" unless you add a more specific focus.
- The 3 tasks should move through: orientation, applied practice, real-world synthesis.
- Each description should explain what the learner will actually do and what outcome they should get.
- Each task needs a searchQuery optimized for official docs, credible tutorials, or high-quality references.
- Each object must contain: title, description, searchQuery.
{"CRITICAL INSTRUCTION: You MUST generate the task title and description entirely in Indonesian language. Only the searchQuery should remain in English if it helps find better technical resources." if request.input.locale == "id" else ""}
""".strip()


def build_quick_action_prompt(request: QuickActionRequest) -> str:
    context = request.input.context
    action_guidance = {
        "explain": """
Explain the concept clearly for a motivated adult learner.
Focus on:
- what this task is really about
- why it matters in practice
- what mental model the learner should hold onto
Avoid vague filler or just repeating the task title.
""".strip(),
        "example": """
Give one concrete, believable real-world example.
Include:
- who is using it
- what they are doing with it
- why it helps in practice
Avoid fake-sounding case studies or empty business fluff.
""".strip(),
        "analogy": """
Give one strong analogy that maps clearly to the concept.
The analogy should make the mechanism easier to picture, not just make it sound friendly.
After the analogy, briefly connect it back to the actual task.
""".strip(),
        "confused": """
Explain the lesson material as if you are explaining it to a 5-year-old.
Reset the idea in very simple, elementary language.
Break it into tiny steps using:
- first
- then
- finally
Use plain words, remove all jargon, and tell a simple story so the learner recovers confidence quickly.
""".strip(),
    }[request.input.action]

    resources = "\n".join(
        [
            f"{index + 1}. {resource.get('title', 'Untitled')} [{resource.get('type', 'other')}]"
            + (
                f" | Ref: {resource.get('reference')}"
                if resource.get("reference")
                else ""
            )
            + (
                f" | Notes: {resource.get('notes')}"
                if resource.get("notes")
                else ""
            )
            for index, resource in enumerate(context.resources)
        ]
    )
    if not resources:
        resources = "No linked resources."

    return f"""
You are a high-quality study coach helping a learner during an active learning session.

Learner goal: {context.goalTitle or "Not provided"}
Current task: {context.taskTitle}
Task description: {context.taskDescription}
Available resources:
{resources}

Action type: {request.input.action}
Instructions:
{action_guidance}

Output rules:
- Return plain study-ready text only.
- Be specific and useful, not generic.
- Write 2 short paragraphs or 3 short bullet points.
- Aim for roughly 120 to 220 words.
- End on a full sentence.
- Include at least one concrete detail tied to the task, goal, or resource context.
- Do not use markdown code fences or JSON.
{"CRITICAL INSTRUCTION: You MUST generate the response entirely in Indonesian language." if context.locale == "id" else ""}
""".strip()


def build_quick_action_repair_prompt(request: QuickActionRequest, previous_content: str) -> str:
    return f"""
Rewrite the study-coach response below because it is too short, incomplete, or too generic.

Current weak draft:
{previous_content}

Task context:
{build_quick_action_prompt(request)}

Rewrite requirements:
- Return plain study-ready text only.
- Write 2 short paragraphs or 3 short bullet points.
- Use 120 to 220 words.
- Fully answer the learner's action request.
- End with a complete sentence.
- Avoid generic filler and avoid repeating the task title without explanation.
""".strip()


async def generate_workflow_plan_with_gemini(request: WorkflowPlanRequest) -> list[WorkflowTaskPayload] | None:
    client = gemini_client()
    if client is None:
        return None

    try:
        response = await client.aio.models.generate_content(
            model=DEFAULT_GEMINI_MODEL,
            contents=build_workflow_prompt(request),
            config={
                "response_mime_type": "application/json",
                "temperature": 0.7,
            },
        )

        payload = json.loads(normalize_model_text(response.text or "[]"))
        if not isinstance(payload, list) or len(payload) < 3:
            return None

        tasks: list[WorkflowTaskPayload] = []
        for item in payload[:3]:
            if not isinstance(item, dict):
                return None

            title = str(item.get("title", "")).strip()
            description = str(item.get("description", "")).strip()
            search_query = str(item.get("searchQuery", "")).strip()
            if not title or not description or not search_query:
                return None

            tasks.append(
                WorkflowTaskPayload(
                    title=title,
                    description=description,
                    searchQuery=search_query,
                )
            )

        return tasks
    except Exception:
        return None


async def generate_quick_action_with_gemini(request: QuickActionRequest) -> str | None:
    client = gemini_client()
    if client is None:
        return None

    async def generate(prompt: str) -> str | None:
        try:
            response = await client.aio.models.generate_content(
                model=DEFAULT_GEMINI_MODEL,
                contents=prompt,
                config={
                    "temperature": 0.7,
                    "max_output_tokens": 1200,
                },
            )
            content = normalize_model_text(response.text or "")
            return content or None
        except Exception:
            return None

    content = await generate(build_quick_action_prompt(request))
    if content is None:
        return None

    if is_low_quality_quick_action(content, request.input.context.taskTitle):
        repaired = await generate(build_quick_action_repair_prompt(request, content))
        if repaired:
            return repaired
        return None

    return content


def fallback_workflow_plan(request: WorkflowPlanRequest) -> list[WorkflowTaskPayload]:
    goal = request.input.goal
    level = humanize_level(request.input.level)
    style = style_hint(request.input.preferredStyle)
    return [
        WorkflowTaskPayload(
            title=f"Map the core ideas behind {goal}",
            description=(
                f"Build a reliable mental model for {goal} at a {level} level. "
                f"Focus on the key vocabulary, the main workflow, and the problem this skill solves in practice. "
                f"{style}"
            ),
            searchQuery=f"{goal} fundamentals official guide tutorial",
        ),
        WorkflowTaskPayload(
            title=f"Practice {goal} on one realistic working example",
            description=(
                f"Apply the fundamentals through one concrete scenario tied to real work. "
                f"Turn the theory of {goal} into a repeatable step-by-step method you can explain and reuse."
            ),
            searchQuery=f"{goal} example walkthrough best practices",
        ),
        WorkflowTaskPayload(
            title=f"Create a reusable output that proves you can use {goal}",
            description=(
                f"Synthesize what you learned into a small but real deliverable, such as a checklist, playbook, template, "
                f"or mini project. The goal is to leave this phase with something practical you can use again."
            ),
            searchQuery=f"{goal} project template case study",
        ),
    ]


def fallback_quick_action(request: QuickActionRequest) -> str:
    context = request.input.context
    task_title = context.taskTitle
    goal_title = context.goalTitle or "your broader learning goal"
    task_description = context.taskDescription.strip() or "This task is meant to move you from theory into practical understanding."
    action = request.input.action
    if action == "example":
        return (
            f"A practical example of {task_title} would be a product team using it while preparing a new feature launch. "
            f"They would use the task to turn a vague goal into a repeatable workflow, test whether the output is actually useful, "
            f"and refine the result until it becomes something the team can reuse. In your case, the point is not just to understand the idea once, "
            f"but to see how it supports {goal_title} through a concrete, repeatable working example."
        )
    if action == "analogy":
        return (
            f"Think of {task_title} like setting up a reliable recipe card in a kitchen. The first time you cook, you are still figuring out the ingredients, "
            f"timing, and order. Once the recipe is clear, you stop improvising every step and start producing a better result more consistently. "
            f"That is the role of this task inside {goal_title}: it gives you a structure you can reuse instead of starting from scratch every time."
        )
    if action == "confused":
        return (
            f"First, this task is helping you understand one important part of {goal_title}. "
            f"Then, you use that part on a small real example so it stops feeling abstract. "
            f"Finally, you turn that example into a simple method you can repeat. "
            f"If the title feels big, focus on the task description: {task_description}"
        )
    return (
        f"This task is really about understanding what {task_title} means in practice, not just memorizing the term. "
        f"The important question is: what job does this help you do better while working toward {goal_title}? "
        f"In this step, you are building the mental model behind the task, learning where it fits in a real workflow, "
        f"and making the idea concrete enough that you can recognize when to use it again. {task_description}"
    )


def is_low_quality_quick_action(content: str, task_title: str) -> bool:
    trimmed = content.strip()
    normalized = trimmed.lower()
    words = re.findall(r"\S+", trimmed)
    known_weak_patterns = [
        f"{task_title.lower()} is the concept for this step",
        "imagine a real team using it in production",
        "well-organized kitchen",
        f"first, {task_title.lower()} is the main idea you are learning",
    ]

    has_terminal_punctuation = bool(re.search(r'[.!?]["\']?$', trimmed))
    ends_like_fragment = bool(
        re.search(
            r'(?:[,;:]|(?:\s|^)(and|or|but|because|so|then|with|for|to|of|in|on|at|from|as|that|which|where|when|while|like|into|through|by|about|the|a|an))$',
            trimmed,
            re.IGNORECASE,
        )
    )

    return (
        len(words) < 55
        or not has_terminal_punctuation
        or ends_like_fragment
        or any(pattern in normalized for pattern in known_weak_patterns)
    )


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
                locale=request.input.context.locale,
            ),
        ),
        context=request.context,
    )


@app.get("/healthz")
async def healthcheck():
    return {"ok": True}


@app.post("/workflow/plan")
async def workflow_plan(request: WorkflowPlanRequest):
    tasks = await generate_workflow_plan_with_gemini(request)
    if tasks is None:
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
    if cached_quick_action and not is_low_quality_quick_action(
        cached_quick_action["content"],
        request.input.context.taskTitle,
    ):
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

    content = await generate_quick_action_with_gemini(hydrated_request)
    if content is None:
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
