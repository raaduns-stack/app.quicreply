## Local OpenClaw: Switch Jennifer from Ollama to OpenAI

This keeps the same architecture:

- `QuicReply -> n8n -> OpenClaw -> OpenAI`

It does **not** make QuicReply call OpenAI directly.

### Model choice

Use:

- `openai/gpt-4.1-mini`

This is a good fit for the current Jennifer runtime path and is already referenced by the local OpenClaw codebase.

### Where to paste the API key

Copy the example env file:

```bash
cp config/openclaw-openai.env.example config/openclaw-openai.env
```

Then edit:

- `config/openclaw-openai.env`

and replace:

```bash
OPENAI_API_KEY=PASTE_YOUR_OPENAI_API_KEY_HERE
```

with the real key.

### Start local OpenClaw with OpenAI

Use:

```bash
bash scripts/start-openclaw-openai.sh
```

This starts the same local OpenClaw gateway on:

- `http://127.0.0.1:18789`

### What changes under the hood

- default OpenClaw model switches from `ollama/qwen2.5:3b` to `openai/gpt-4.1-mini`
- `openclaw/ai-test` also switches to `openai/gpt-4.1-mini`
- memory search provider switches from `ollama` to `openai`
- OpenClaw reads `OPENAI_API_KEY` from environment

### Restart order

1. Start OpenClaw:

```bash
bash scripts/start-openclaw-openai.sh
```

2. Keep local `n8n` running on `127.0.0.1:5678`

3. Start or restart the Wasp app if needed

### Verify

Check OpenClaw:

```bash
curl -i http://127.0.0.1:18789/v1/models \
  -H 'Authorization: Bearer qr-local-openclaw-token-20260607'
```

Then test:

- `http://localhost:3000/ai/test`

### Notes

- QuicReply `.env.server` does not need the OpenAI key for this path.
- The key belongs to the OpenClaw runtime, not the app backend.
