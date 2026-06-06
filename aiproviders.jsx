/* ============================================================
   Draftwave — AI providers: bring-your-own engine
   Built-in Claude · Anthropic · OpenAI · xAI · Ollama (local)
   ============================================================ */

const PROVIDERS = {
  builtin: { label:"Built-in", brand:"Claude", sub:"Zero setup · ready now", accent:"#1fe3ff", needsKey:false },
  anthropic:{ label:"Anthropic", brand:"Claude", sub:"Your Anthropic API key", accent:"#d97757", needsKey:true,
    base:"https://api.anthropic.com/v1", keyHint:"sk-ant-…", keyUrl:"console.anthropic.com/settings/keys",
    models:["claude-sonnet-4-5","claude-opus-4-1","claude-haiku-4-5","claude-3-5-sonnet-latest"] },
  openai:  { label:"OpenAI", brand:"GPT", sub:"Your OpenAI API key", accent:"#19c37d", needsKey:true,
    base:"https://api.openai.com/v1", keyHint:"sk-…", keyUrl:"platform.openai.com/api-keys",
    models:["gpt-4o","gpt-4o-mini","gpt-4.1","gpt-4.1-mini","o3-mini"] },
  xai:     { label:"xAI", brand:"Grok", sub:"Your xAI API key", accent:"#9b6bff", needsKey:true,
    base:"https://api.x.ai/v1", keyHint:"xai-…", keyUrl:"console.x.ai",
    models:["grok-4","grok-3","grok-3-mini","grok-2-latest"] },
  ollama:  { label:"Ollama", brand:"Local", sub:"Runs on your machine · fully private", accent:"#1fe39a", needsKey:false, local:true,
    models:["llama3.2","qwen2.5:7b","mistral","phi3.5"] },
};

// curated models the user can download & run locally with Ollama
const LOCAL_LIBRARY = [
  { id:"llama3.2",      name:"Llama 3.2",     by:"Meta",      size:"2.0 GB", params:"3B",  note:"Fast, great default for a laptop" },
  { id:"llama3.1:8b",   name:"Llama 3.1",     by:"Meta",      size:"4.7 GB", params:"8B",  note:"Stronger reasoning, still light" },
  { id:"qwen2.5:7b",    name:"Qwen 2.5",      by:"Alibaba",   size:"4.7 GB", params:"7B",  note:"Excellent at structured / JSON output" },
  { id:"mistral",       name:"Mistral",       by:"Mistral AI",size:"4.1 GB", params:"7B",  note:"Snappy and efficient all-rounder" },
  { id:"phi3.5",        name:"Phi 3.5",       by:"Microsoft", size:"2.2 GB", params:"3.8B",note:"Tiny but punches above its weight" },
  { id:"gemma2:9b",     name:"Gemma 2",       by:"Google",    size:"5.4 GB", params:"9B",  note:"High quality, needs a bit more RAM" },
  { id:"deepseek-r1:7b",name:"DeepSeek R1",   by:"DeepSeek",  size:"4.7 GB", params:"7B",  note:"Step-by-step reasoning specialist" },
];

const AI = (() => {
  const KEY = "draftwave.ai.v1";
  const DEFAULTS = { provider:"builtin", keys:{anthropic:"",openai:"",xai:""},
    models:{anthropic:"claude-haiku-4-5",openai:"gpt-4o-mini",xai:"grok-3-mini",ollama:"llama3.2"},
    ollamaUrl:"http://localhost:11434" };
  const load = () => { try { return {...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY)||"{}")}; } catch(_){ return {...DEFAULTS}; } };
  const save = (c) => { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch(_){} };

  function engineLabel(c=load()){
    const P=PROVIDERS[c.provider];
    if(c.provider==="builtin") return "Claude · built-in";
    if(c.provider==="ollama") return (c.models.ollama||"local")+" · local";
    return (c.models[c.provider]||P.label);
  }

  async function listOllama(url){
    const r = await fetch((url||load().ollamaUrl).replace(/\/$/,"")+"/api/tags");
    if(!r.ok) throw new Error("Ollama not reachable");
    const j = await r.json(); return (j.models||[]).map(m=>m.name);
  }

  async function ask({ system, user }){
    const c = load(); const P = PROVIDERS[c.provider]; const max = 1024;

    const askOllama = async () => {
      const url=(c.ollamaUrl||DEFAULTS.ollamaUrl).replace(/\/$/,"");
      const r = await fetch(url+"/api/chat",{ method:"POST", headers:{"content-type":"application/json"},
        body: JSON.stringify({ model:c.models.ollama||DEFAULTS.models.ollama, stream:false, options:{temperature:0.7},
          messages:[{role:"system",content:system},{role:"user",content:user}] }) });
      if(!r.ok) throw new Error("Ollama "+r.status+" - is it running? ("+url+")");
      const j = await r.json(); return j.message?.content || "";
    };

    try {
      if(c.provider==="builtin"){
        if(!window.claude || !window.claude.complete) throw new Error("Built-in unavailable");
        return await window.claude.complete({ messages:[{ role:"user", content: system + "\n\nUser: " + user }] });
      }

      if(c.provider==="anthropic"){
        const key=c.keys.anthropic; if(!key) throw new Error("Add your Anthropic API key in settings");
        const r = await fetch(P.base+"/messages",{ method:"POST", headers:{
          "content-type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01",
          "anthropic-dangerous-direct-browser-access":"true" },
          body: JSON.stringify({ model:c.models.anthropic, max_tokens:max, system, messages:[{role:"user",content:user}] }) });
        if(!r.ok) throw new Error("Anthropic "+r.status+": "+(await r.text()).slice(0,120));
        const j = await r.json(); return (j.content||[]).map(b=>b.text||"").join("");
      }

      if(c.provider==="openai" || c.provider==="xai"){
        const key=c.keys[c.provider]; if(!key) throw new Error("Add your "+P.label+" API key in settings");
        const r = await fetch(P.base+"/chat/completions",{ method:"POST", headers:{
          "content-type":"application/json","authorization":"Bearer "+key },
          body: JSON.stringify({ model:c.models[c.provider], max_tokens:max, temperature:0.7,
            messages:[{role:"system",content:system},{role:"user",content:user}] }) });
        if(!r.ok) throw new Error(P.label+" "+r.status+": "+(await r.text()).slice(0,120));
        const j = await r.json(); return j.choices?.[0]?.message?.content || "";
      }

      if(c.provider==="ollama") return await askOllama();
      throw new Error("Unknown provider");
    } catch(primaryError) {
      if(c.provider!=="ollama"){
        try { return await askOllama(); }
        catch(fallbackError) {
          throw new Error(`${String(primaryError.message||primaryError)}; Ollama fallback unavailable: ${String(fallbackError.message||fallbackError)}`);
        }
      }
      throw primaryError;
    }
  }

  return { load, save, ask, listOllama, engineLabel };
})();

Object.assign(window, { PROVIDERS, LOCAL_LIBRARY, AI });
