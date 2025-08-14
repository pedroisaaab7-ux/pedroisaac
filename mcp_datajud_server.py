import os
import json
import asyncio
from typing import Any, Dict, List, Optional

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse

# ===================== Config =====================
DATAJUD_API_KEY = os.getenv("DATAJUD_API_KEY", "").strip()
DATAJUD_BASE = "https://api-publica.datajud.cnj.jus.br"
DEFAULT_ALIAS = "api_publica_tjrj"  # TJ/RJ por padrão
TIMEOUT = httpx.Timeout(30.0, connect=15.0)

app = FastAPI(title="MCP DataJud Server", version="2.0.0")

# ===================== Helpers =====================
def _headers() -> Dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if DATAJUD_API_KEY:
        headers["Authorization"] = f"APIKey {DATAJUD_API_KEY}"
    return headers

async def _post_search(alias: str, body: Dict[str, Any]) -> Dict[str, Any]:
    url = f"{DATAJUD_BASE}/{alias}/_search"
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.post(url, headers=_headers(), content=json.dumps(body))
        if r.status_code >= 400:
            raise HTTPException(r.status_code, f"Erro DataJud: {r.text}")
        return r.json()

def _first_source(hits: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    items = hits.get("hits", {}).get("hits", [])
    return items[0].get("_source") if items else None

# ===================== TOOLS exigidas pelo ChatGPT =====================
# Somente as duas requeridas para Deep Research: search e fetch.
TOOLS: List[Dict[str, Any]] = [
    {
        "name": "search",
        "description": (
            "Procura processos no DataJud/TJ-RJ retornando IDs (numeroProcesso). "
            "Aceita qualquer string; tenta bater com numeroProcesso e com classe.descricao. "
            "Use o resultado para chamar 'fetch'."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Texto livre: número CNJ completo ou termos de busca."
                },
                "size": {"type": "integer", "default": 10},
                "alias": {
                    "type": "string",
                    "description": "Alias DataJud (padrão: api_publica_tjrj).",
                    "default": DEFAULT_ALIAS
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "fetch",
        "description": (
            "Obtém o registro completo de um processo pelo ID retornado em 'search' "
            "(numeroProcesso) a partir do DataJud/TJ-RJ."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "ID do processo (numeroProcesso) retornado por 'search'."
                },
                "alias": {
                    "type": "string",
                    "description": "Alias DataJud (padrão: api_publica_tjrj).",
                    "default": DEFAULT_ALIAS
                }
            },
            "required": ["id"]
        }
    }
]

# ===================== Implementação das tools =====================
@app.post("/invoke/search")
async def invoke_search(payload: Dict[str, Any]):
    args = payload.get("arguments", payload)
    query = str(args["query"]).strip()
    size = int(args.get("size", 10))
    alias = str(args.get("alias") or DEFAULT_ALIAS)

    # Busca flexível: bate em numeroProcesso e (de forma ampla) em classe.descricao
    body = {
        "query": {
            "bool": {
                "should": [
                    {"match": {"numeroProcesso": query}},
                    {"match_phrase": {"classe.descricao": query}}
                ]
            }
        },
        "_source": {"includes": ["numeroProcesso"]},
        "size": size
    }
    data = await _post_search(alias, body)
    hits = data.get("hits", {}).get("hits", [])
    ids = [h.get("_source", {}).get("numeroProcesso") for h in hits if h.get("_source")]
    # Resposta padrão esperada pelo cliente: lista de IDs
    return {"ok": True, "ids": [i for i in ids if i]}

@app.post("/invoke/fetch")
async def invoke_fetch(payload: Dict[str, Any]):
    args = payload.get("arguments", payload)
    proc_id = str(args["id"]).strip()
    alias = str(args.get("alias") or DEFAULT_ALIAS)

    body = {
        "query": {"match": {"numeroProcesso": proc_id}},
        "size": 1
    }
    data = await _post_search(alias, body)
    src = _first_source(data)
    if not src:
        return {"ok": True, "result": None}
    return {"ok": True, "result": src}

# (Opcional) Mantemos endpoints auxiliares para uso manual
@app.get("/health")
async def health():
    return JSONResponse({"status": "ok"})

# ===================== SSE (descoberta de tools) =====================
@app.get("/sse")
@app.get("/sse/")
async def sse(request: Request):
    async def gen():
        # 1) Catálogo de tools
        yield f"event: tools\ndata: {json.dumps({'tools': TOOLS})}\n\n"
        # 2) Keep-alive
        while True:
            if await request.is_disconnected():
                break
            await asyncio.sleep(10)
            yield "event: ping\ndata: {}\n\n"

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no"
    }
    return StreamingResponse(gen(), media_type="text/event-stream", headers=headers)
