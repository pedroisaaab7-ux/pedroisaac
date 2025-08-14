import os
import json
import asyncio
from typing import Any, Dict, List, Optional

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse

# ========= Config =========
DATAJUD_API_KEY = os.getenv("DATAJUD_API_KEY", "").strip()
if not DATAJUD_API_KEY:
    # No deploy (Render/Railway) você definirá essa variável.
    # Evite commitar chaves no GitHub.
    pass

DATAJUD_BASE = "https://api-publica.datajud.cnj.jus.br"
DEFAULT_ALIAS = "api_publica_tjrj"   # TJ/RJ
TIMEOUT = httpx.Timeout(30.0, connect=15.0)

# ========= Catálogo de Ferramentas (MCP) =========
TOOLS: List[Dict[str, Any]] = [
    {
        "name": "buscar_por_numero",
        "description": "Busca 1 processo pelo número CNJ (numeroProcesso) no TJ/RJ.",
        "input_schema": {
            "type": "object",
            "properties": {
                "numero_cnj": {"type": "string", "description": "Número único CNJ sem máscara."},
                "alias": {"type": "string", "description": "Alias DataJud (padrão: api_publica_tjrj).", "default": DEFAULT_ALIAS},
            },
            "required": ["numero_cnj"]
        }
    },
    {
        "name": "buscar_por_classe",
        "description": "Lista processos por código de classe (classe.codigo) no TJ/RJ.",
        "input_schema": {
            "type": "object",
            "properties": {
                "classe_codigo": {"type": "integer"},
                "size": {"type": "integer", "default": 10},
                "alias": {"type": "string", "default": DEFAULT_ALIAS}
            },
            "required": ["classe_codigo"]
        }
    },
    {
        "name": "movimentacoes",
        "description": "Retorna a lista de movimentos (movimentos[]) de um processo pelo número CNJ.",
        "input_schema": {
            "type": "object",
            "properties": {
                "numero_cnj": {"type": "string"},
                "alias": {"type": "string", "default": DEFAULT_ALIAS}
            },
            "required": ["numero_cnj"]
        }
    }
]

app = FastAPI(title="MCP DataJud Server", version="1.0.0")

# ========= Helpers =========
def _headers() -> Dict[str, str]:
    if not DATAJUD_API_KEY:
        # Mesmo sem a chave aqui, o endpoint responderá erro claro ao chamar a API.
        return {"Content-Type": "application/json"}
    return {
        "Authorization": f"APIKey {DATAJUD_API_KEY}",
        "Content-Type": "application/json",
    }

async def _post_search(alias: str, body: Dict[str, Any]) -> Dict[str, Any]:
    url = f"{DATAJUD_BASE}/{alias}/_search"
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.post(url, headers=_headers(), content=json.dumps(body))
        if r.status_code >= 400:
            raise HTTPException(r.status_code, f"Erro DataJud: {r.text}")
        return r.json()

def _first_hit(hits: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    items = hits.get("hits", {}).get("hits", [])
    return items[0].get("_source") if items else None

# ========= Invocação das ferramentas =========
@app.post("/invoke/buscar_por_numero")
async def invoke_buscar_por_numero(payload: Dict[str, Any]):
    args = payload.get("arguments", payload)
    numero = str(args["numero_cnj"]).strip()
    alias = str(args.get("alias") or DEFAULT_ALIAS)

    body = {"query": {"match": {"numeroProcesso": numero}}, "size": 1}
    data = await _post_search(alias, body)
    src = _first_hit(data)
    if not src:
        return {"ok": True, "result": None}
    return {"ok": True, "result": src}

@app.post("/invoke/buscar_por_classe")
async def invoke_buscar_por_classe(payload: Dict[str, Any]):
    args = payload.get("arguments", payload)
    classe = int(args["classe_codigo"])
    size = int(args.get("size", 10))
    alias = str(args.get("alias") or DEFAULT_ALIAS)

    body = {"query": {"term": {"classe.codigo": classe}}, "size": size}
    data = await _post_search(alias, body)
    hits = data.get("hits", {}).get("hits", [])
    results = [h.get("_source") for h in hits if "_source" in h]
    return {"ok": True, "count": len(results), "results": results}

@app.post("/invoke/movimentacoes")
async def invoke_movimentacoes(payload: Dict[str, Any]):
    args = payload.get("arguments", payload)
    numero = str(args["numero_cnj"]).strip()
    alias = str(args.get("alias") or DEFAULT_ALIAS)

    body = {
        "query": {"match": {"numeroProcesso": numero}},
        "size": 1,
        "_source": {"includes": ["numeroProcesso", "movimentos", "classe", "orgaoJulgador", "tribunal"]}
    }
    data = await _post_search(alias, body)
    src = _first_hit(data)
    movimentos = src.get("movimentos", []) if src else []
    return {"ok": True, "numeroProcesso": numero, "movimentos": movimentos}

# ========= Endpoint SSE (exigido pelo conector) =========
@app.get("/sse")
async def sse(request: Request):
    async def gen():
        # 1) Descoberta das ferramentas
        yield f"event: tools\ndata: {json.dumps({'tools': TOOLS})}\n\n"
        # 2) Keep‑alive
        while True:
            if await request.is_disconnected():
                break
            await asyncio.sleep(15)
            yield "event: ping\ndata: {}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream")

# ========= Saúde =========
@app.get("/health")
async def health():
    return JSONResponse({"status": "ok"})
