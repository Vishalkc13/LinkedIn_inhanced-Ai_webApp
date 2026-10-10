import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Gemini client if key is provided
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasGeminiKey: Boolean(apiKey) });
});

// Endpoint: AI Search & Deep Analysis for any LinkedIn Profile URL or Bio
app.post('/api/ai/analyze-linkedin-profile', async (req, res) => {
  const { profileQuery, targetArchetype } = req.body;
  if (!profileQuery || typeof profileQuery !== 'string') {
    return res.status(400).json({ error: 'profileQuery is required' });
  }

  if (ai) {
    try {
      const prompt = `You are a world-class Executive Tech Recruiter and Hiring Bar Raiser for Tier-1 Tech (Google, Meta, Stripe, OpenAI).
A user wants to analyze a LinkedIn profile candidate to solve their career positioning and ATS visibility.
Input profile handle/URL/text:
"""
${profileQuery}
"""
Target Archetype: ${targetArchetype || 'Series B/C Hypergrowth Scaleups'}

Analyze this profile deeply. If it's a URL or name, deduce or synthesize the most realistic, high-signal profile based on the handle and career patterns.
Return a STRICT JSON object (NO markdown backticks, NO \`\`\`json tags, only raw parseable JSON):
{
  "candidate": {
    "name": "Candidate Full Name",
    "headline": "Current or reconstructed LinkedIn headline",
    "currentCompany": "Company Name",
    "currentRole": "Current Title",
    "experienceYears": 6,
    "location": "e.g. San Francisco Bay Area / Remote",
    "readinessScore": 82, // integer 65-95
    "resonanceFit": 79,   // integer 65-95
    "avatarSeed": "short lowercase identifier for avatar"
  },
  "evaluatorProfile": {
    "title": "Hiring Committee Assessment",
    "verdict": "Detailed summary of how hiring managers view this candidate",
    "tags": ["Tag 1", "Tag 2"]
  },
  "artifacts": [
    {
      "id": "artifact-1",
      "title": "Title of inspectable technical project",
      "badge": "e.g. Interactive Micro-SaaS",
      "rationale": "Why pre-IPO/Tier-1 hiring teams care about this specific proof",
      "tags": ["Tag1", "Tag2", "Tag3"],
      "metricsUplift": "+34% Recruiter Response Rate",
      "specMarkdown": "A complete markdown specification with architecture diagram and metrics."
    },
    {
      "id": "artifact-2",
      "title": "Title of teardown or commercial impact blueprint",
      "badge": "e.g. +22.4% CVR Uplift",
      "rationale": "How this proves commercial and systems intuition",
      "tags": ["Teardown", "Conversion Funnel", "Architecture"],
      "metricsUplift": "+40% Inbound Message Rate"
    }
  ],
  "posts": [
    {
      "id": "post-1",
      "tag": "High Intent Hook • Post Draft #1",
      "resonanceRate": "95% VP Resonance",
      "hook": "Compelling quoted opening hook for LinkedIn",
      "body": "2-3 dense sentences with metrics, technical insight, and architecture details",
      "calibratedFor": "VPs of Product & Engineering",
      "bestSlot": "Tuesday, 8:15 AM EST",
      "hashtags": ["#TechLeadership", "#ProductScale", "#Architecture"],
      "tone": "Quantitative & Technical Operator",
      "fullThread": [
        "Hook line",
        "Point 1 with metric",
        "Point 2 with architecture tradeoff",
        "Key takeaway for executive peers"
      ]
    },
    {
      "id": "post-2",
      "tag": "Architectural Contrarian • Draft #2",
      "resonanceRate": "Staff Lead Inbound",
      "hook": "Contrarian quoted opening hook challenging standard industry dogma",
      "body": "Body paragraph explaining the non-obvious failure mode",
      "calibratedFor": "Founders & Staff Engineers",
      "bestSlot": "Thursday, 9:00 AM EST",
      "hashtags": ["#DistributedSystems", "#EngineeringExcellence"],
      "tone": "Technical Founder & Senior Operator",
      "fullThread": [
        "Contrarian opening statement",
        "The real bottleneck behind standard advice",
        "How we solved it in production",
        "Rule of thumb for senior builders"
      ]
    }
  ],
  "skillGaps": [
    {
      "id": "gap-1",
      "title": "Name of critical missing skill or signal",
      "urgency": "Critical Urgency",
      "techStack": "Relevant technologies/methodologies",
      "demandStat": "e.g. 91% of target roles require this",
      "progressPercent": 30,
      "diagnosis": "Detailed diagnostic of why this is weak on profile",
      "actionText": "Fast 5-Day Remediation Project",
      "actionType": "prompt"
    },
    {
      "id": "gap-2",
      "title": "High value secondary skill",
      "urgency": "High Value",
      "techStack": "Complementary stack",
      "demandStat": "76% Match in Target JDs",
      "progressPercent": 65,
      "diagnosis": "Needs quantitative evidence in headline.",
      "actionText": "Add 3 Badges",
      "actionType": "badges"
    },
    {
      "id": "gap-3",
      "title": "Emerging differentiation signal",
      "urgency": "Emerging 2025",
      "techStack": "Modern differentiator",
      "demandStat": "+42% Profile Visibility",
      "progressPercent": 85,
      "diagnosis": "Strong alignment with modern scalability standards.",
      "actionText": "View Inbound Traces",
      "actionType": "view"
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      let text = response.text || '';
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(text);
      return res.json(parsed);
    } catch (err: any) {
      console.warn('Gemini LinkedIn profile analysis fallback triggered:', err?.message || err);
    }
  }

  // Heuristic extraction fallback
  const cleanName = profileQuery
    .replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, '')
    .replace(/[/?#].*$/, '')
    .replace(/[-_.]/g, ' ')
    .trim();
  const titleCased = cleanName.length > 2
    ? cleanName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'Candidate Profile';

  res.json({
    candidate: {
      name: titleCased,
      headline: `${titleCased} | Senior Product & Systems Lead | Scaled Core Platforms | Pre-IPO Tech`,
      currentCompany: 'Tier 1 Tech Scaleup',
      currentRole: 'Senior Product Manager',
      experienceYears: 7,
      location: 'San Francisco, CA / Remote',
      readinessScore: 79,
      resonanceFit: 76,
      avatarSeed: cleanName,
    },
    evaluatorProfile: {
      title: 'Hiring Committee Assessment (Series B/C & Tier 1):',
      verdict: `Values direct systems ownership, metrics-anchored case teardowns, and inspectable proof for ${titleCased}.`,
      tags: ['Proof Over Pedigree', 'Fast Delivery Cadence'],
    },
    artifacts: [
      {
        id: 'artifact-1',
        title: `${titleCased}'s Open-Source Micro-SaaS & Latency Benchmark`,
        badge: 'Interactive Micro-SaaS',
        rationale: 'Hiring teams prioritize inspectable cloud endpoints and GitHub repos over abstract resume statements.',
        tags: ['Live Architecture Graph', 'Public GitHub Repo', 'p99 Latency Logs'],
        metricsUplift: '+32% Recruiter Inbound',
        specMarkdown: `# ${titleCased}'s Technical Portfolio Artifact\n\n### 1. Executive Summary\nProduction-ready inspectable developer benchmark reproducing high-throughput event processing under 25ms p99 latency ceilings.`,
      },
      {
        id: 'artifact-2',
        title: 'Checkout Conversion Teardown & Friction Elimination Blueprint',
        badge: '+18.4% CVR Uplift',
        rationale: 'Demonstrates commercial product intuition with wireframe teardown slides that prove immediate commercial value.',
        tags: ['Teardown Slides', 'Conversion Funnel', 'Wireframe Spec'],
        metricsUplift: '+28% Interview Shortlist',
      },
    ],
    posts: [
      {
        id: 'post-1',
        tag: 'High Intent Hook • Post Draft #1',
        resonanceRate: '94% VP Resonance',
        hook: `"Why most Series B checkout funnels bleed $200k/mo in silent latency — and the 3 queries we used to catch it before our A/B test concluded."`,
        body: `Last quarter, 48% of drop-offs happened between cart tokenization and merchant settlement. Traditional analytics tagged it as user hesitation. It wasn't. It was thread pool exhaustion during third-party webhook handshakes...`,
        calibratedFor: 'VPs of Product & Eng at Stripe, Ramp, Brex',
        bestSlot: 'Tuesday, 8:15 AM EST',
        hashtags: ['#ProductGrowth', '#FintechEngineering', '#PlatformScale'],
        tone: 'Quantitative & Systems-Focused',
        fullThread: [
          `"Why most Series B checkout funnels bleed $200k/mo in silent latency — and the 3 queries we used to catch it before our A/B test concluded."`,
          `1/ Traditional analytics attributed funnel drops to UX friction. Datadog APM traces proved it was thread starvation.`,
          `2/ We introduced an asynchronous optimistic reservation ledger with idempotent retry queueing.`,
          `3/ Result: -88% network timeout, +18.4% gross checkout completion.`,
        ],
      },
      {
        id: 'post-2',
        tag: 'Architectural Contrarian • Draft #2',
        resonanceRate: 'Staff PM Inbound',
        hook: `"The unglamorous truth about migrating legacy monolith billing engines to event-driven architectures..."`,
        body: `Most teams celebrate decoupling microservices until idempotency keys start colliding across distributed partitions. Here is how we managed ledger reconciliation without locking customer carts...`,
        calibratedFor: 'Hiring Committees looking for Staff/Lead PMs',
        bestSlot: 'Thursday, 9:00 AM EST',
        hashtags: ['#ProductStrategy', '#TechLeadership', '#DistributedSystems'],
        tone: 'Technical Founder & Senior Operator',
        fullThread: [
          `"The unglamorous truth about migrating legacy monolith billing engines to event-driven architectures..."`,
          `1/ Event-driven architecture is not free. Dual-write consistency is notoriously tricky.`,
          `2/ We solved partition race conditions using deterministic sequence numbers.`,
        ],
      },
    ],
    skillGaps: [
      {
        id: 'gap-1',
        title: 'Distributed Systems Event Architecture',
        urgency: 'Critical Urgency',
        techStack: 'Kafka / RabbitMQ / CQRS',
        demandStat: '92% Scaleup JDs require this',
        progressPercent: 25,
        diagnosis: 'Implicit mention only on resume bullet #3; 0 direct LinkedIn skill badges or headline proof.',
        actionText: 'Fast 5-Day Remediation Project',
        actionType: 'prompt',
      },
      {
        id: 'gap-2',
        title: 'PLG Monetization Experimentation',
        urgency: 'High Value',
        techStack: 'Reverse Trials & Expansion Funnels',
        demandStat: '78% Match in Target JDs',
        progressPercent: 60,
        diagnosis: 'Needs quantitative metric proof in headline.',
        actionText: 'Add 3 Badges',
        actionType: 'badges',
      },
      {
        id: 'gap-3',
        title: 'OpenTelemetry & Datadog Profiling',
        urgency: 'Emerging 2025',
        techStack: 'High differentiation signal for FinTech roles',
        demandStat: '+45% Profile Visibility',
        progressPercent: 85,
        diagnosis: 'Strong alignment with observability and modern reliability standards.',
        actionText: 'View Inbound Traces',
        actionType: 'view',
      },
    ],
  });
});

// Endpoint: AI Recruiter Interactive Chat & Mock Screener
app.post('/api/ai/chat-recruiter', async (req, res) => {
  const { message, history, candidateName, candidateRole, targetCompany } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (ai) {
    try {
      const prompt = `You are a Senior Technical Recruiter & Hiring Bar Raiser at ${targetCompany || 'Stripe / Tier 1 Tech Scaleup'}.
You are screening candidate: ${candidateName || 'Sarah Jenkins'} (${candidateRole || 'Senior Product Manager'}).
Your personality: Sharp, analytical, empathetic but uncompromising on real technical depth and concrete business metrics.
You despise fluff, generic buzzwords ("cross-functional synergy", "facilitated meetings"), and want concrete 0-to-1 proof, trade-offs, and metrics.

Candidate's latest input:
"${message}"

Recent conversation history:
${Array.isArray(history) ? history.map((h: any) => `${h.role}: ${h.text}`).join('\n') : 'Initial screening interview'}

Respond to the candidate. Keep your response concise (2-4 paragraphs maximum).
Provide:
1. Honest recruiter assessment of their answer or query (what was strong, what raised a red flag).
2. A score on their STAR impact (e.g. "Signal: Strong 8.5/10" or "Signal: Needs More Concrete Metrics 5/10").
3. Either a sharp follow-up interview question or tactical career advice.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      return res.json({ reply: response.text });
    } catch (err: any) {
      console.warn('Gemini chat recruiter fallback:', err?.message || err);
    }
  }

  // Fallback response
  res.json({
    reply: `**Recruiter Assessment (Series B/C Bar Raiser):**\n\nThat answer has good foundational clarity, but here is what hiring committees will probe deeper: "You mentioned improving conversion, but what was the exact technical constraint that prevented engineering from doing this earlier?"\n\n**Signal Grade: 7.5/10 (Above Average)**\n• Strength: Clear commercial outcome.\n• Gap: Emphasize the architectural tradeoff (e.g. latency vs consistency).\n\n**Next Challenge Question:**\n"Walk me through a time when your engineering lead said an SLA was impossible to meet. How did you break down the telemetry to find a middle ground?"`,
  });
});

// Endpoint: AI Section Enhancer
app.post('/api/ai/enhance-section', async (req, res) => {
  const { sectionType, rawText, targetRole, tone } = req.body;

  if (ai) {
    try {
      const prompt = `You are an executive LinkedIn copywriter and ATS optimization expert.
Task: Rewrite the following LinkedIn ${sectionType || 'Headline'} for a candidate targeting "${targetRole || 'Senior Product Manager'}".
Tone: ${tone || 'High-Growth Scaleup Operator (Metrics-Heavy)'}
Candidate's current input:
"${rawText || 'Senior Product Manager looking for new opportunities'}"

Return a JSON object (strictly valid JSON, no markdown code fence):
{
  "optimized": "The primary polished version (punchy, high-signal, keyword-rich)",
  "metricsEquated": "Alternative version emphasizing exact quantitative impact",
  "atsKeywordsAdded": ["Keyword 1", "Keyword 2", "Keyword 3"],
  "scoreDelta": "+18% ATS Match"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      let text = response.text || '';
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(text);
      return res.json(parsed);
    } catch (err: any) {
      console.warn('Gemini section enhancer fallback:', err?.message || err);
    }
  }

  res.json({
    optimized: `Senior Product Manager | Scaled Core Platforms to 10M+ Users ($180M GMV) | Distributed Systems (Kafka/CQRS) & Sub-15ms Latency @ Pre-IPO Tech`,
    metricsEquated: `Senior Product Manager | +18.4% CVR Uplift Across 1.4M Transactions | -88% Webhook Timeouts Recovering $180k/mo | Platform Architecture`,
    atsKeywordsAdded: ['Distributed Systems', 'Kafka / Event-Driven', 'p99 Latency SLA'],
    scoreDelta: '+16% Search Visibility',
  });
});

// Endpoint: Analyze company manifesto or job description snippet
app.post('/api/ai/analyze-company', async (req, res) => {
  const { query, archetype } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query is required' });
  }

  if (ai) {
    try {
      const prompt = `You are an elite executive career strategist and hiring committee lead for top tech scaleups and tier-1 tech firms.
Analyze the following target company / sector manifesto / hiring post:
"${query}"

Context archetype: ${archetype || 'Series B/C Hypergrowth Scaleups'}

Return a JSON object (strictly valid JSON only, no markdown wrapping, no code block ticks) with these exact keys:
{
  "companyName": "Extracted or inferred company / sector name",
  "archetypeTag": "Short tier descriptor",
  "evaluatorProfile": "1 sentence describing hiring committee values (e.g. values concrete proof over slide decks...)",
  "resonanceFit": 82, // integer percentage between 70 and 96
  "keyCultureSignals": ["signal 1", "signal 2", "signal 3"],
  "recommendedArtifact": {
    "title": "Title of high-signal inspectable project proof",
    "badge": "e.g. Interactive Micro-SaaS or +24% Retention Uplift",
    "rationale": "Why this company's hiring committee cares",
    "tags": ["Tag1", "Tag2", "Tag3"]
  },
  "thoughtLeadershipHook": {
    "title": "Post hook title",
    "hook": "Full viral opening hook in quotation marks",
    "bodySnippet": "2-3 sentences explaining technical or operational depth",
    "calibratedFor": "e.g. VPs of Product & Engineering",
    "bestSlot": "e.g. Tuesday, 8:15 AM EST",
    "hashtags": ["#Tag1", "#Tag2", "#Tag3"]
  },
  "criticalSkillGap": {
    "skill": "Name of critical skill deficit for this specific company",
    "urgency": "Critical Urgency",
    "demandStat": "e.g. 94% of their PM/Eng JDs require this",
    "diagnosis": "Implicit mention only on resume bullet; needs tangible GitHub or public spec proof",
    "remediationAction": "Fast 5-Day Remediation Project"
  }
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      let text = response.text || '';
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(text);
      return res.json(parsed);
    } catch (err: any) {
      console.warn('Gemini company analysis fallback triggered:', err?.message || err);
    }
  }

  // High-fidelity calibrated fallback
  const normalized = query.toLowerCase();
  let result = {
    companyName: query.length > 25 ? query.slice(0, 25) + '...' : query,
    archetypeTag: 'Custom Calibrated Target',
    evaluatorProfile: `Values direct systems ownership, metrics-anchored case teardowns, and inspectable proof for ${query}.`,
    resonanceFit: Math.floor(Math.random() * 15) + 80,
    keyCultureSignals: [
      'Proof over pedigree: inspectable GitHub & live demos',
      'Radical velocity: zero-to-one execution cadence',
      'Direct commercial uplift over abstract roadmap decks',
    ],
    recommendedArtifact: {
      title: `${query} API Integration & Latency Benchmarking Hub`,
      badge: 'Interactive Micro-SaaS',
      rationale: `Targeting ${query}'s technical hiring committee by demonstrating deep understanding of their product architecture and developer experience.`,
      tags: ['Live Architecture Graph', 'Public GitHub Repo', 'p99 Latency Logs'],
    },
    thoughtLeadershipHook: {
      title: `High Intent Hook • Tailored for ${query}`,
      hook: `"Why most scaleups migrating to ${query}-like workflows bleed 24% conversion during edge handshakes — and how we patched it."`,
      bodySnippet: `Last quarter, we dissected 1.2M events across multi-region edge gateways. Traditional telemetry showed normal p50, but p99 tail latency was devastating cart conversions. Here is the architectural postmortem and idempotency fix...`,
      calibratedFor: `VPs of Product & Eng recruiting for ${query}`,
      bestSlot: 'Tuesday, 8:15 AM EST',
      hashtags: ['#ProductGrowth', '#EngineeringScale', '#SystemsDesign'],
    },
    criticalSkillGap: {
      skill: 'Distributed Edge Event Architecture & Observability',
      urgency: 'Critical Urgency',
      demandStat: `92% of target teams evaluate this signal`,
      diagnosis: 'Implicit mention only on resume bullet #3; 0 direct LinkedIn skill badges or headline proof.',
      remediationAction: 'Fast 5-Day Remediation Project',
    },
  };

  if (normalized.includes('stripe')) {
    result.companyName = 'Stripe (Infrastructure & Payments API)';
    result.archetypeTag = 'Enterprise Fintech & Developer Platforms';
    result.evaluatorProfile = 'Obsessed with developer ergonomics, 99.999% ledger reliability, and zero-downtime database migrations.';
    result.recommendedArtifact = {
      title: 'Idempotent Payment Webhook Dispatcher & Playground',
      badge: '+99.99% Reliability Spec',
      rationale: 'Stripe PMs must speak native distributed ledger semantics. Showing inspectable state machine code guarantees immediate interview callbacks.',
      tags: ['Kafka Partitioning', 'State Machine Repo', 'Sub-15ms Ingestion'],
    };
    result.thoughtLeadershipHook.hook = '"Why silent webhook drops silently destroy merchant trust — and the idempotency ledger we deployed to stop it."';
  } else if (normalized.includes('openai') || normalized.includes('anthropic') || normalized.includes('ai')) {
    result.companyName = 'OpenAI / Anthropic Ecosystem';
    result.archetypeTag = 'Frontier AI & Autonomous Systems';
    result.evaluatorProfile = 'Prioritizes reasoning evaluation benchmarks, LLM latency budget management, and pragmatic product-agent architectures.';
    result.recommendedArtifact = {
      title: 'LLM Agentic Tool-Use Evaluation Suite & Token Budget Simulator',
      badge: 'Frontier AI Artifact',
      rationale: 'Hiring teams receive 500+ generic PM resumes. An inspectable eval benchmark repository proves you build real AI systems, not prompt wrappers.',
      tags: ['Tool Calling Benchmark', 'Token Latency Trace', 'Evals Dataset'],
    };
    result.thoughtLeadershipHook.hook = '"Prompt engineering won’t save your unit economics: The truth about multi-agent latency spiraling at 10k concurrent users."';
  }

  res.json(result);
});

// Endpoint: Generate Full README and Architectural Spec for an Artifact
app.post('/api/ai/generate-spec', async (req, res) => {
  const { title, rationale, tags } = req.body;

  if (ai) {
    try {
      const prompt = `Generate a comprehensive, production-ready GitHub README.md markdown and Technical Project Spec for a senior tech portfolio project:
Title: "${title}"
Rationale: "${rationale}"
Technologies/Tags: ${Array.isArray(tags) ? tags.join(', ') : 'Cloud endpoints, architecture, metrics'}

Format as structured markdown including:
# Project Title & One-line Value Prop
## Executive Summary & Commercial Impact
## Architecture Overview (ASCII flow or mermaid description)
## Key Metrics & SLA Targets (p99 latency, throughput, error rates)
## Quick Start & Inspectable Endpoints
## Hiring Manager Interview Defense (Key questions & talking points)

Make it sound like an elite Staff Product Manager / Principal Engineer.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      return res.json({ spec: response.text });
    } catch (err: any) {
      console.warn('Gemini spec generation fallback triggered:', err?.message || err);
    }
  }

  const fallbackMarkdown = `# ${title || 'High-Impact Portfolio Artifact'}

> **Inspectable Execution Proof for Series B/C Hiring Committees & Technical Evaluators**

---

### 1. Executive Summary & Problem Space
Traditional product candidates present high-level slide decks that mask execution gaps. This artifact provides **end-to-end inspectable proof** of 0-to-1 system design, commercial impact, and engineering empathy:
- **Core Challenge**: Distributed transaction bottlenecks and silent user friction during critical conversion funnels.
- **Hypothesis**: Replacing batch-synchronized state with event-driven optimistic updates reduces abandonment by 18.4%.
- **Target Audience**: Technical Recruiters, VP of Product, and Staff Engineering Interviewers.

---

### 2. Live Architecture & Data Pipeline
\`\`\`
[ Client App / SDK ] 
        │ (JWT / Signed Session)
        ▼
[ Edge API Gateway (Cloudflare / Envoy) ] ── (p99 < 12ms)
        │ 
   ┌────┴──────────────────────────┐
   ▼                               ▼
[ Read Cache (Redis) ]   [ Event Ingestion (Kafka) ]
                                   │
                                   ▼
                         [ Ledger Consumer Worker ]
                                   │
                                   ▼
                       [ Postgres / TimescaleDB ]
\`\`\`

---

### 3. Quantitative Impact & Benchmarks
| Metric | Baseline | Optimized | Delta |
| :--- | :--- | :--- | :--- |
| **p99 Checkout Latency** | 380ms | 42ms | **-88.9%** |
| **Silent Drop-off Rate** | 8.2% | 1.1% | **-86.5%** |
| **Cart-to-Order Conversion** | 62.4% | 73.9% | **+18.4% CVR** |

---

### 4. Hiring Manager Interview Defense
- **Question**: *"Why build custom event queues instead of off-the-shelf SaaS?"*
  - **Answer**: "At scale, SaaS webhooks introduce uncontrolled jitter and third-party rate limit ceilings. Owning the partition key allows strict idempotency guarantees and deterministic retry backoffs."
`;

  res.json({ spec: fallbackMarkdown });
});

// Endpoint: Regenerate Thought Leadership Drafts
app.post('/api/ai/regenerate-posts', async (req, res) => {
  const { archetype, focus } = req.body;

  if (ai) {
    try {
      const prompt = `You are a viral LinkedIn ghostwriter for elite tech executives (Founders, VP of Product, Staff PMs).
Generate 2 viral, high-authority LinkedIn posts calibrated for:
Archetype: ${archetype || 'Series B/C Scaleups'}
Topic/Focus: ${focus || 'Systems architecture, product growth, metrics'}

Return strict JSON (no markdown formatting, no code ticks):
{
  "posts": [
    {
      "id": "draft-1",
      "tag": "High Intent Hook • Post Draft #1",
      "resonanceRate": "96% VP Resonance",
      "hook": "Opening hook in quotes",
      "body": "Body paragraph (concise, data-dense, technical)",
      "calibratedFor": "VPs of Product & Eng",
      "bestSlot": "Tuesday, 8:15 AM EST",
      "hashtags": ["#ProductGrowth", "#FintechEngineering", "#PlatformScale"],
      "tone": "Quantitative & Systems-Focused"
    },
    {
      "id": "draft-2",
      "tag": "Architectural Contrarian • Draft #2",
      "resonanceRate": "Staff PM Inbound",
      "hook": "Contrarian opening hook in quotes",
      "body": "Body paragraph with unconventional wisdom",
      "calibratedFor": "Hiring Managers & Founders",
      "bestSlot": "Thursday, 9:00 AM EST",
      "hashtags": ["#ProductStrategy", "#TechLeadership", "#ScaleupCulture"],
      "tone": "Technical Founder & Senior Operator"
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      let text = response.text || '';
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(text);
      return res.json(parsed);
    } catch (err: any) {
      console.warn('Gemini post regeneration fallback triggered:', err?.message || err);
    }
  }

  res.json({
    posts: [
      {
        id: 'draft-1',
        tag: 'High Intent Hook • Post Draft #1',
        resonanceRate: '95% VP Resonance',
        hook: `"Why most Series B checkout funnels bleed $200k/mo in silent latency — and the 3 queries we used to catch it before our A/B test concluded."`,
        body: `Last quarter, 48% of drop-offs happened between cart tokenization and merchant settlement. Traditional analytics tagged it as user hesitation. It wasn't. It was thread pool exhaustion during third-party webhook handshakes...`,
        calibratedFor: 'VPs of Product & Eng at Stripe, Ramp, Brex',
        bestSlot: 'Tuesday, 8:15 AM EST',
        hashtags: ['#ProductGrowth', '#FintechEngineering', '#PlatformScale'],
        tone: 'Quantitative & Systems-Focused',
      },
      {
        id: 'draft-2',
        tag: 'Architectural Contrarian • Draft #2',
        resonanceRate: 'Staff PM Inbound',
        hook: `"The unglamorous truth about migrating legacy monolith billing engines to event-driven architectures..."`,
        body: `Most teams celebrate decoupling microservices until idempotency keys start colliding across distributed partitions. Here is how we managed ledger reconciliation without locking customer carts...`,
        calibratedFor: 'Hiring Committees looking for Staff/Lead PMs',
        bestSlot: 'Thursday, 9:00 AM EST',
        hashtags: ['#ProductStrategy', '#TechLeadership', '#SystemsScale'],
        tone: 'Technical Founder & Senior Operator',
      },
    ],
  });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`JobReady AI Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
