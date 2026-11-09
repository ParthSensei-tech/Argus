import base64
import json
import re
import time
from dataclasses import dataclass
from datetime import datetime, timezone

import httpx
from pydantic import BaseModel, ValidationError

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.usage import AIUsage

settings = get_settings()


class LLMError(Exception):
    pass


class BudgetExceeded(LLMError):
    pass


@dataclass
class StructuredResult:
    payload: dict
    model: str
    tokens_in: int
    tokens_out: int
    mode: str


_mode_cache: dict[str, str] = {}


def _check_budget() -> None:
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    db = SessionLocal()
    try:
        usage = db.get(AIUsage, day)
        if usage and usage.requests >= settings.LLM_DAILY_REQUEST_BUDGET:
            raise BudgetExceeded(
                f"Daily AI request budget reached ({settings.LLM_DAILY_REQUEST_BUDGET}). "
                "Retry tomorrow or raise LLM_DAILY_REQUEST_BUDGET."
            )
    finally:
        db.close()


def _record_usage(tokens_in: int, tokens_out: int) -> None:
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    db = SessionLocal()
    try:
        usage = db.get(AIUsage, day)
        if not usage:
            usage = AIUsage(day=day, requests=0, tokens_in=0, tokens_out=0)
            db.add(usage)
        usage.requests += 1
        usage.tokens_in += tokens_in
        usage.tokens_out += tokens_out
        db.commit()
    finally:
        db.close()


def _parse_json(content: str) -> dict:
    text = content.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        if start >= 0 and end > start:
            return json.loads(text[start : end + 1])
        raise


def _role_chain(role: str) -> tuple[str, str, list[str], int]:
    if role == "vision":
        return (
            settings.VISION_BASE_URL,
            settings.vision_key,
            [settings.VISION_MODEL, settings.VISION_FALLBACK_MODEL],
            settings.LLM_MAX_TOKENS_REASONING,
        )
    if role == "fast":
        return (
            settings.LLM_BASE_URL,
            settings.llm_key,
            [settings.LLM_FAST_MODEL, settings.LLM_REASONING_MODEL],
            settings.LLM_MAX_TOKENS_FAST,
        )
    return (
        settings.LLM_BASE_URL,
        settings.llm_key,
        [settings.LLM_REASONING_MODEL, settings.LLM_FAST_MODEL],
        settings.LLM_MAX_TOKENS_REASONING,
    )


def _build_messages(system: str, user: str, images: list[tuple[bytes, str]] | None):
    if not images:
        return [{"role": "system", "content": system}, {"role": "user", "content": user}]
    parts = [{"type": "text", "text": user}]
    for data, mime in images[:4]:
        b64 = base64.b64encode(data).decode()
        parts.append({"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}})
    return [{"role": "system", "content": system}, {"role": "user", "content": parts}]


def _call_model(
    base_url: str,
    key: str,
    model: str,
    system: str,
    user: str,
    schema: type[BaseModel],
    max_tokens: int,
    images: list[tuple[bytes, str]] | None,
) -> tuple[dict, int, int]:
    json_schema = schema.model_json_schema()
    modes = [_mode_cache[model]] if model in _mode_cache else ["json_schema", "tool", "prompt"]
    last_error: Exception | None = None
    for mode in modes:
        body = {
            "model": model,
            "messages": _build_messages(system, user, images),
            "max_tokens": max_tokens,
            "temperature": 0.2,
        }
        if mode == "json_schema":
            body["response_format"] = {
                "type": "json_schema",
                "json_schema": {"name": "result", "schema": json_schema},
            }
        elif mode == "tool":
            body["tools"] = [{
                "type": "function",
                "function": {"name": "emit_result", "description": "Emit the structured result", "parameters": json_schema},
            }]
            body["tool_choice"] = {"type": "function", "function": {"name": "emit_result"}}
        else:
            body["messages"][0]["content"] = (
                system + "\n\nRespond ONLY with a valid JSON object matching this JSON schema "
                f"(no markdown, no commentary):\n{json.dumps(json_schema)}"
            )
        try:
            r = httpx.post(
                f"{base_url}/chat/completions",
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json=body,
                timeout=settings.LLM_TIMEOUT_SECONDS,
            )
        except httpx.TransportError as exc:
            last_error = exc
            continue
        if r.status_code == 400 and mode != "prompt":
            last_error = LLMError(f"{model} rejected {mode} mode: {r.text[:300]}")
            continue
        r.raise_for_status()
        data = r.json()
        choice = data["choices"][0]["message"]
        try:
            if mode == "tool":
                calls = choice.get("tool_calls") or []
                if not calls:
                    raise LLMError(f"{model} returned no tool call")
                payload = json.loads(calls[0]["function"]["arguments"])
            else:
                content = choice.get("content") or ""
                if not content.strip():
                    raise LLMError(f"{model} returned empty content (reasoning may have exhausted max_tokens)")
                payload = _parse_json(content)
            schema.model_validate(payload)
        except (ValidationError, json.JSONDecodeError, LLMError) as exc:
            last_error = exc
            if mode != "prompt":
                continue
            raise LLMError(f"{model} output failed schema validation: {exc}") from exc
        _mode_cache[model] = mode
        usage = data.get("usage") or {}
        return payload, usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0)
    raise LLMError(f"All structured modes failed for {model}: {last_error}")


def chat_structured(
    *,
    role: str,
    system: str,
    user: str,
    schema: type[BaseModel],
    dev_default: dict | None = None,
    images: list[tuple[bytes, str]] | None = None,
) -> StructuredResult:
    if settings.AI_DEV_MODE:
        return StructuredResult(dev_default or {}, "dev-mode", 0, 0, "dev")
    base_url, key, chain, max_tokens = _role_chain(role)
    if not key:
        return StructuredResult(dev_default or {}, "dev-mode", 0, 0, "dev")
    _check_budget()
    last_error: Exception | None = None
    for model in chain:
        if not model:
            continue
        for attempt in range(settings.LLM_MAX_RETRIES):
            try:
                payload, tin, tout = _call_model(base_url, key, model, system, user, schema, max_tokens, images)
                _record_usage(tin, tout)
                return StructuredResult(payload, model, tin, tout, "live")
            except httpx.HTTPStatusError as exc:
                code = exc.response.status_code
                last_error = exc
                if code in (401, 402, 403):
                    raise LLMError(f"Provider auth/billing error ({code}): {exc.response.text[:300]}") from exc
                if code in (429, 500, 502, 503, 504):
                    time.sleep(min(2 ** attempt, 8))
                    continue
                break
            except (LLMError, httpx.TransportError) as exc:
                last_error = exc
                time.sleep(min(2 ** attempt, 8))
        # retries exhausted or non-retryable: fall through to next model in chain
    raise LLMError(f"All models in chain failed: {last_error}")