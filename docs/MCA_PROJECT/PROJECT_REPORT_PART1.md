# Voicory: AI-Powered Voice Agent Platform with Relationship Memory

## Full Project Report

---

# CHAPTER 1: INTRODUCTION

## 1.1 Background of the Study

The evolution of customer communication has undergone a dramatic transformation over the past decade. From traditional call centers with human agents to Interactive Voice Response (IVR) systems, and now to AI-powered conversational agents, businesses are constantly seeking ways to improve customer experience while reducing operational costs. The global conversational AI market was valued at USD 10.7 billion in 2023 and is projected to reach USD 49.9 billion by 2030, growing at a CAGR of 24.9% (Grand View Research, 2024).

Despite these advances, a critical limitation persists in existing voice AI platforms: the inability to maintain persistent memory of customer interactions. When a customer calls a business multiple times, traditional AI systems treat each call as a completely new interaction, requiring customers to repeat their information and context. This leads to frustrating experiences and diminishes the value proposition of AI automation.

**Voicory** addresses this fundamental gap by introducing the first voice AI platform with built-in relationship memory. The platform not only conducts intelligent conversations but remembers every interaction, extracts insights, tracks sentiment over time, and uses this accumulated knowledge to provide truly personalized experiences.

## 1.2 Problem Statement

Current voice AI platforms suffer from the following critical limitations:

1. **Stateless Interactions:** Each conversation starts from scratch with no memory of previous interactions, forcing customers to repeat themselves.

2. **Limited Language Support:** Most platforms focus on English and major European languages, neglecting the 1.4 billion population of India with 22 official languages.

3. **Single-Channel Deployment:** Businesses must manage separate solutions for voice calls and messaging platforms like WhatsApp.

4. **Complex Integration:** Existing platforms require significant technical expertise to deploy and maintain.

5. **High Costs:** US-based platforms charge $0.10-0.20 per minute, making them unaffordable for Indian SMBs.

## 1.3 Objectives of the Study

### Primary Objectives:

1. To design and develop a production-ready AI voice assistant platform with persistent customer memory capabilities.

2. To implement a scalable multi-tenant SaaS architecture using modern cloud technologies.

3. To integrate multiple communication channels (Voice, WhatsApp) under a unified AI framework.

### Secondary Objectives:

1. To implement RAG (Retrieval-Augmented Generation) for domain-specific knowledge retrieval.

2. To develop a comprehensive voice library supporting 15+ Indian languages.

3. To achieve enterprise-grade security with Row Level Security and encryption.

4. To create an intuitive no-code interface for AI assistant configuration.

5. To establish a cost-effective pricing model for the Indian market.

## 1.4 Scope of the Study

### In Scope:

- AI Assistant Builder with no-code interface
- Customer Memory System with conversation history and insights
- Knowledge Base with RAG implementation
- Voice calls via Twilio, Vonage, and Telnyx
- WhatsApp Business API integration
- Voice library with 30+ voices in 15+ languages
- Multi-tenant architecture with RLS
- Billing system with Stripe and Razorpay
- Admin dashboard with analytics

### Out of Scope:

- On-premise deployment (planned for future)
- Custom voice cloning (planned for future)
- Video calling capabilities
- SMS/Email automation
- CRM integrations (Salesforce, HubSpot)

## 1.5 Significance of the Study

### Academic Significance:

This research contributes to the field of conversational AI by:
- Proposing a novel architecture for persistent memory in voice agents
- Demonstrating practical implementation of RAG in low-latency voice applications
- Establishing security patterns for multi-tenant AI platforms

### Industry Significance:

For businesses, Voicory offers:
- 40-60% reduction in customer service costs
- 24/7 availability without staffing constraints
- Improved customer satisfaction through personalized interactions
- Scalability to handle peak loads automatically

### Social Significance:

- Democratizing access to AI technology for Indian SMBs
- Creating employment opportunities in AI/ML domain
- Supporting vernacular languages often ignored by global platforms

## 1.6 Organization of the Report

This report is organized into the following chapters:

- **Chapter 1: Introduction** - Background, problem statement, objectives, and scope
- **Chapter 2: Literature Review** - Review of existing research and technologies
- **Chapter 3: System Analysis** - Requirements analysis and feasibility study
- **Chapter 4: System Design** - Architecture, database design, and UI design
- **Chapter 5: Implementation** - Development methodology and code implementation
- **Chapter 6: Testing** - Testing strategies and results
- **Chapter 7: Results and Discussion** - Performance metrics and analysis
- **Chapter 8: Conclusion** - Summary, limitations, and future work

---

# CHAPTER 2: LITERATURE REVIEW

## 2.1 Evolution of Conversational AI

### 2.1.1 Historical Background

The journey of conversational AI began in 1966 with ELIZA, a program developed by Joseph Weizenbaum at MIT that simulated a Rogerian psychotherapist using simple pattern matching (Weizenbaum, 1966). While primitive by today's standards, ELIZA demonstrated that computers could engage in human-like dialogue.

The 1990s saw the emergence of statistical approaches with Hidden Markov Models (HMMs) for speech recognition. IBM's speech recognition systems achieved significant improvements in accuracy, paving the way for commercial applications.

The 2010s marked the deep learning revolution. Google's neural network-based speech recognition (Hinton et al., 2012) reduced word error rates by 25%, making voice interfaces practical for consumer applications. Apple's Siri (2011), Google Assistant (2016), and Amazon Alexa (2014) brought voice AI to mainstream consumers.

### 2.1.2 The Transformer Revolution

The introduction of the Transformer architecture by Vaswani et al. (2017) fundamentally changed natural language processing. The self-attention mechanism allowed models to process entire sequences in parallel, enabling training on unprecedented scales.

Key milestones:
- **GPT-1 (2018):** Demonstrated transfer learning for NLP
- **BERT (2018):** Bidirectional understanding revolutionized comprehension tasks
- **GPT-3 (2020):** 175 billion parameters, emergent few-shot learning capabilities
- **ChatGPT (2022):** RLHF alignment made LLMs conversationally capable
- **GPT-4 (2023):** Multi-modal capabilities, improved reasoning

### 2.1.3 Current State of Voice AI

Modern voice AI systems combine multiple components:

| Component | Technology | Latency Target |
|-----------|------------|----------------|
| Speech-to-Text | Whisper, Deepgram, AssemblyAI | < 200ms |
| Language Model | GPT-4, Claude, Llama | < 500ms |
| Text-to-Speech | ElevenLabs, PlayHT, Azure | < 200ms |
| Orchestration | VAPI, Bland.ai, Retell | < 100ms |

Total round-trip latency must be under 1 second for natural conversation flow.

## 2.2 Large Language Models in Production

### 2.2.1 Challenges in Voice Applications

Brown et al. (2020) demonstrated GPT-3's remarkable capabilities, but production voice applications face unique challenges:

**Latency Constraints:**
Skantze (2021) established that human turn-taking in conversation operates within 200-500ms windows. Delays beyond this threshold feel unnatural and break conversational flow.

**Context Management:**
Liu et al. (2023) showed that LLMs struggle with "lost in the middle" phenomenon, where information in the middle of long contexts is often ignored. This is critical for memory systems that need to recall earlier conversation points.

**Hallucination:**
Ji et al. (2023) surveyed hallucination in NLG systems, categorizing them as intrinsic (contradicting source) and extrinsic (unverifiable claims). For business applications, hallucinations can have serious consequences.

### 2.2.2 Mitigation Strategies

Research has proposed several approaches:

1. **RAG (Retrieval-Augmented Generation):** Lewis et al. (2020) showed that retrieving relevant documents before generation reduces hallucinations and improves factual accuracy.

2. **Chain-of-Thought Prompting:** Wei et al. (2022) demonstrated that encouraging step-by-step reasoning improves accuracy on complex tasks.

3. **Constitutional AI:** Bai et al. (2022) introduced self-critique mechanisms to align model outputs with specified principles.

## 2.3 Retrieval-Augmented Generation (RAG)

### 2.3.1 Foundational Work

Lewis et al. (2020) introduced RAG as a paradigm combining parametric (LLM) and non-parametric (retrieval) memory. The architecture:

1. **Encoding:** Documents are converted to dense vectors using embedding models
2. **Indexing:** Vectors are stored in efficient similarity search structures
3. **Retrieval:** Query embedding is compared against document embeddings
4. **Generation:** Retrieved context is prepended to the LLM prompt

### 2.3.2 Vector Databases

Several specialized databases have emerged:

| Database | Indexing | Latency | Scale |
|----------|----------|---------|-------|
| Pinecone | HNSW | ~10ms | Billions |
| Weaviate | HNSW | ~15ms | Millions |
| Milvus | IVF_FLAT | ~20ms | Billions |
| pgvector | IVFFlat/HNSW | ~30ms | Millions |

For our implementation, we chose pgvector to minimize infrastructure complexity by using PostgreSQL's native extension.

### 2.3.3 Chunking Strategies

Gao et al. (2023) reviewed chunking approaches:

- **Fixed-size chunking:** Simple but may split semantic units
- **Sentence-based:** Preserves meaning but variable sizes
- **Semantic chunking:** Groups by topic using embedding similarity
- **Document-aware:** Respects headers, paragraphs, lists

Our implementation uses 500-1000 token chunks with 100-token overlap to balance context and retrieval precision.

## 2.4 Multi-Tenant SaaS Architecture

### 2.4.1 Tenancy Models

Chong et al. (2006) defined three multi-tenancy patterns:

1. **Separate Databases:** Each tenant has isolated database
   - Pros: Maximum isolation, easy backup/restore
   - Cons: High cost, complex maintenance

2. **Shared Database, Separate Schemas:** One database, separate schemas per tenant
   - Pros: Good isolation, moderate cost
   - Cons: Schema migrations complex

3. **Shared Database, Shared Schema:** All tenants in same tables
   - Pros: Lowest cost, simple maintenance
   - Cons: Requires application-level isolation

### 2.4.2 Row Level Security

PostgreSQL's Row Level Security (RLS) enables the shared schema approach with database-enforced isolation:

```sql
CREATE POLICY tenant_isolation ON table_name
    USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

Krebs et al. (2022) demonstrated that RLS adds minimal overhead (<5%) while providing strong security guarantees equivalent to separate databases.

### 2.4.3 Supabase Implementation

Supabase (2024) extends PostgreSQL with:
- Built-in authentication with JWT tokens
- Automatic RLS policy generation
- Real-time subscriptions via WebSockets
- Edge functions for serverless compute

The `auth.uid()` function in RLS policies automatically extracts the user ID from JWT tokens, enabling zero-trust data access.

## 2.5 Voice User Interface Design

### 2.5.1 Conversational Design Principles

Porcheron et al. (2018) identified key factors for natural voice interfaces:

1. **Turn-taking:** Clear signals for when the AI should speak vs. listen
2. **Grounding:** Confirming understanding before proceeding
3. **Repair:** Graceful recovery from misunderstandings
4. **Context:** Maintaining conversation state across turns

### 2.5.2 Prosody and Emotion

Research shows that voice quality significantly impacts user perception:
- **Pitch variation:** Monotone voices perceived as robotic
- **Speaking rate:** 150-180 words/minute optimal for comprehension
- **Pauses:** Strategic pauses improve understanding

Modern TTS systems like ElevenLabs incorporate emotion and prosody control.

## 2.6 Gap Analysis

### 2.6.1 Competitor Analysis

| Feature | Vapi.ai | Bland.ai | Retell AI | Voicory |
|---------|---------|----------|-----------|---------|
| Memory Persistence | ❌ | ❌ | ❌ | ✅ |
| Indian Languages | 3 | 0 | 2 | 15+ |
| WhatsApp Integration | ❌ | ❌ | ❌ | ✅ |
| RAG Knowledge Base | Limited | ❌ | Limited | Full |
| No-Code Builder | ✅ | ✅ | ✅ | ✅ |
| Pricing (per min) | $0.10 | $0.12 | $0.10 | ₹1.50 |

### 2.6.2 Research Gaps Addressed

1. **Memory in Voice AI:** No academic literature on implementing persistent customer memory in production voice systems. Our work provides the first practical implementation.

2. **RAG for Voice:** Limited research on RAG optimization for latency-sensitive voice applications. We contribute benchmarks and implementation patterns.

3. **Multi-Tenant AI Security:** Sparse literature on data isolation in AI/ML SaaS platforms. We demonstrate RLS patterns for AI workloads.

## 2.7 Theoretical Framework

Our implementation is guided by the following theoretical foundations:

1. **Design Science Research (Hevner et al., 2004):** Artifact creation combined with rigorous evaluation
2. **Technology Acceptance Model (Davis, 1989):** Perceived usefulness and ease of use drive adoption
3. **Service-Oriented Architecture (Erl, 2008):** Loose coupling, reusability, composability
4. **12-Factor App Methodology:** Best practices for scalable cloud-native applications

---

# CHAPTER 3: SYSTEM ANALYSIS

## 3.1 Existing System Analysis

### 3.1.1 Traditional Call Centers

**Architecture:**
- Human agents answering phone calls
- CRM systems for customer data
- Call routing via PBX/ACD systems
- Quality monitoring and recording

**Limitations:**
- High labor costs ($15-25/hour per agent)
- Limited scalability during peak hours
- Inconsistent quality across agents
- 24/7 availability requires shift management
- Language limitations based on agent skills

### 3.1.2 IVR Systems

**Architecture:**
- DTMF tone-based menu navigation
- Pre-recorded voice prompts
- Limited speech recognition
- Database integration for account lookup

**Limitations:**
- Frustrating menu trees
- No natural language understanding
- Cannot handle complex queries
- High abandonment rates (30-40%)

### 3.1.3 Existing Voice AI Platforms

**Vapi.ai:**
- Strengths: Easy integration, good documentation
- Weaknesses: No memory, US-centric, expensive for India

**Bland.ai:**
- Strengths: Human-like voices
- Weaknesses: No memory, voice-only, no Indian languages

**Retell AI:**
- Strengths: Low latency
- Weaknesses: No memory, limited customization

## 3.2 Proposed System Overview

Voicory addresses all identified limitations through:

1. **AI-Powered Conversations:** Natural language understanding via LLMs
2. **Persistent Memory:** Customer context maintained across interactions
3. **Multi-Channel:** Single AI serves voice and WhatsApp
4. **Self-Service:** No-code builder for non-technical users
5. **Cost-Effective:** Indian pricing for Indian market

### 3.2.1 Key Differentiators

| Aspect | Existing Systems | Voicory |
|--------|------------------|---------|
| Memory | Stateless | Full conversation history |
| Setup | Weeks | Minutes |
| Languages | English-centric | 15+ Indian languages |
| Channels | Single | Voice + WhatsApp |
| Pricing | $0.10-0.20/min | ₹1.50/min |

## 3.3 Requirements Analysis

### 3.3.1 Functional Requirements

**FR1: User Authentication**
- FR1.1: Users shall register using email/password
- FR1.2: Users shall login via email/password or OAuth
- FR1.3: Users shall reset password via email link
- FR1.4: System shall support session management

**FR2: AI Assistant Management**
- FR2.1: Users shall create new AI assistants
- FR2.2: Users shall configure assistant properties (name, prompt, voice)
- FR2.3: Users shall select LLM provider (OpenAI, Claude, Groq)
- FR2.4: Users shall activate/deactivate assistants
- FR2.5: Users shall delete assistants

**FR3: Voice Configuration**
- FR3.1: Users shall browse voice library
- FR3.2: Users shall preview voices before selection
- FR3.3: Users shall filter voices by language, gender, accent
- FR3.4: Users shall assign voices to assistants

**FR4: Phone Number Management**
- FR4.1: Users shall import phone numbers from Twilio
- FR4.2: Users shall import phone numbers from Vonage
- FR4.3: Users shall assign phone numbers to assistants
- FR4.4: Users shall configure inbound call handling

**FR5: Knowledge Base**
- FR5.1: Users shall create knowledge bases
- FR5.2: Users shall upload documents (txt, md, json)
- FR5.3: Users shall crawl websites for content
- FR5.4: Users shall input text directly
- FR5.5: System shall process and embed content

**FR6: Customer Memory**
- FR6.1: System shall store conversation transcripts
- FR6.2: System shall generate conversation summaries
- FR6.3: System shall extract customer insights
- FR6.4: System shall track sentiment over time
- FR6.5: System shall provide memory to AI during calls

**FR7: WhatsApp Integration**
- FR7.1: Users shall connect WhatsApp Business Account
- FR7.2: Users shall assign WhatsApp to assistants
- FR7.3: System shall handle incoming WhatsApp messages
- FR7.4: System shall send AI responses via WhatsApp

**FR8: Call Logging**
- FR8.1: System shall log all voice calls
- FR8.2: System shall record call duration and cost
- FR8.3: Users shall view call history
- FR8.4: Users shall export call logs

**FR9: Billing**
- FR9.1: Users shall add credits via Stripe/Razorpay
- FR9.2: System shall deduct credits per call minute
- FR9.3: Users shall view transaction history
- FR9.4: System shall send low balance alerts

**FR10: Admin Dashboard**
- FR10.1: Admins shall view platform analytics
- FR10.2: Admins shall manage users
- FR10.3: Admins shall create/manage coupons
- FR10.4: Admins shall view revenue reports

### 3.3.2 Non-Functional Requirements

**NFR1: Performance**
- NFR1.1: API response time < 500ms (p95)
- NFR1.2: Voice latency < 800ms end-to-end
- NFR1.3: System shall support 1000 concurrent users
- NFR1.4: Database queries < 100ms

**NFR2: Security**
- NFR2.1: All data encrypted in transit (TLS 1.3)
- NFR2.2: Sensitive data encrypted at rest (AES-256)
- NFR2.3: Multi-tenant isolation via RLS
- NFR2.4: Rate limiting on all endpoints
- NFR2.5: Input validation on all user data

**NFR3: Reliability**
- NFR3.1: System uptime > 99.9%
- NFR3.2: Automated failover for critical services
- NFR3.3: Daily database backups
- NFR3.4: Graceful degradation on third-party failures

**NFR4: Scalability**
- NFR4.1: Horizontal scaling via container replicas
- NFR4.2: Database read replicas for load distribution
- NFR4.3: Caching for frequently accessed data

**NFR5: Usability**
- NFR5.1: No-code interface for assistant creation
- NFR5.2: Mobile-responsive design
- NFR5.3: Page load time < 3 seconds
- NFR5.4: Accessibility compliance (WCAG 2.1 AA)

**NFR6: Maintainability**
- NFR6.1: TypeScript for type safety
- NFR6.2: Automated testing with > 80% coverage
- NFR6.3: CI/CD pipeline for deployments
- NFR6.4: Structured logging for debugging

## 3.4 Feasibility Study

### 3.4.1 Technical Feasibility

**Assessment: FEASIBLE ✅**

All required technologies are mature and well-documented:

| Technology | Maturity | Documentation | Community |
|------------|----------|---------------|-----------|
| React 19 | Stable | Excellent | Very Large |
| Node.js | Stable | Excellent | Very Large |
| PostgreSQL | Stable | Excellent | Very Large |
| Supabase | Growing | Good | Growing |
| OpenAI API | Stable | Good | Large |

**Technical Risks:**
- Third-party API rate limits → Mitigation: Queue management, caching
- LLM latency spikes → Mitigation: Fallback providers
- Voice quality issues → Mitigation: Multiple TTS providers

### 3.4.2 Economic Feasibility

**Development Costs:**
| Item | Cost |
|------|------|
| Development (6 months) | ₹0 (self-developed) |
| Domain (voicory.com) | ₹1,000/year |
| Supabase Pro | ₹2,000/month |
| Railway | ₹1,500/month |
| Vercel | ₹0 (free tier) |
| Total Monthly | ₹3,500 |

**Revenue Projections:**
| Users | Monthly Revenue | Monthly Profit |
|-------|-----------------|----------------|
| 10 | ₹15,000 | ₹11,500 |
| 50 | ₹75,000 | ₹71,500 |
| 100 | ₹1,50,000 | ₹1,46,500 |

**Assessment: FEASIBLE ✅**

Break-even at 3 paying users.

### 3.4.3 Operational Feasibility

**Assessment: FEASIBLE ✅**

- Target users are business owners and marketers
- No-code interface minimizes training requirements
- Dashboard provides self-service capabilities
- Documentation and support via chat

### 3.4.4 Schedule Feasibility

**Assessment: FEASIBLE ✅**

| Phase | Duration | Status |
|-------|----------|--------|
| Requirements | 2 weeks | ✅ Complete |
| Design | 3 weeks | ✅ Complete |
| Development | 16 weeks | ✅ Complete |
| Testing | 3 weeks | ✅ Complete |
| Deployment | 2 weeks | ✅ Complete |
| Total | 26 weeks | ✅ Complete |

## 3.5 Use Case Diagrams

### 3.5.1 Actor Identification

| Actor | Description |
|-------|-------------|
| User | Business owner using the platform |
| Admin | Platform administrator |
| Customer | End customer calling/messaging |
| System | Automated background processes |

### 3.5.2 Primary Use Cases

**UC1: Create AI Assistant**
- Actor: User
- Precondition: User is logged in
- Main Flow:
  1. User clicks "Create Assistant"
  2. User enters assistant name
  3. User writes system prompt
  4. User selects voice from library
  5. User selects LLM provider
  6. User saves assistant
- Postcondition: Assistant is created and ready

**UC2: Handle Incoming Call**
- Actor: Customer, System
- Precondition: Phone number assigned to assistant
- Main Flow:
  1. Customer dials phone number
  2. System identifies assistant
  3. System retrieves customer memory
  4. System starts voice conversation
  5. AI responds to customer queries
  6. System logs call and updates memory
- Postcondition: Call logged, memory updated

**UC3: Manage Knowledge Base**
- Actor: User
- Precondition: User is logged in
- Main Flow:
  1. User creates knowledge base
  2. User uploads documents OR enters URL OR types text
  3. System processes content
  4. System generates embeddings
  5. Knowledge base is ready for RAG
- Postcondition: Knowledge searchable during calls

---

*[Continued in PROJECT_REPORT_PART2.md]*
